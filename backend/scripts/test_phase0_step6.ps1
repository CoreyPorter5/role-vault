$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

$client = [System.Net.Http.HttpClient]::new()
$firstUserId = $null
$secondUserId = $null

function Read-EnvFile([string]$Path) {
    $values = @{}

    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -notmatch '^[A-Za-z_][A-Za-z0-9_]*=') {
            continue
        }

        $parts = $line -split '=', 2
        $values[$parts[0]] = $parts[1].Trim().Trim('"').Trim("'")
    }

    return $values
}

function Invoke-HttpJson(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers,
    $Body = $null
) {
    $request = [System.Net.Http.HttpRequestMessage]::new(
        [System.Net.Http.HttpMethod]::new($Method),
        $Url
    )

    try {
        foreach ($entry in $Headers.GetEnumerator()) {
            [void]$request.Headers.TryAddWithoutValidation(
                $entry.Key,
                [string]$entry.Value
            )
        }

        if ($null -ne $Body) {
            $json = $Body | ConvertTo-Json -Depth 10 -Compress
            $request.Content = [System.Net.Http.StringContent]::new(
                $json,
                [System.Text.Encoding]::UTF8,
                "application/json"
            )
        }

        $response = $client.SendAsync($request).GetAwaiter().GetResult()

        try {
            $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            $json = $null

            if (-not [string]::IsNullOrWhiteSpace($text)) {
                try {
                    $json = $text | ConvertFrom-Json
                } catch {
                    $json = $text
                }
            }

            return [pscustomobject]@{
                Status = [int]$response.StatusCode
                Json = $json
                Text = $text
            }
        } finally {
            $response.Dispose()
        }
    } finally {
        $request.Dispose()
    }
}

function Assert-Equal($Actual, $Expected, [string]$Message) {
    if ($Actual -ne $Expected) {
        throw "$Message. Expected '$Expected', got '$Actual'."
    }
}

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) {
        throw $Message
    }
}

function Assert-Denied($Response, [string]$Message) {
    if ($Response.Status -notin @(401, 403, 404)) {
        throw "$Message. Expected 401, 403, or 404; got '$($Response.Status)'."
    }
}

$backendEnv = Read-EnvFile (Join-Path $PSScriptRoot "../.env")
$frontendEnv = Read-EnvFile (
    Join-Path $PSScriptRoot "../../frontend/.env.local"
)

$supabaseUrl = $backendEnv["SUPABASE_URL"].TrimEnd('/')
$secretKey = $backendEnv["SUPABASE_SECRET_API_KEY"]
$publishableKey = $frontendEnv["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]

if (
    [string]::IsNullOrWhiteSpace($supabaseUrl) -or
    [string]::IsNullOrWhiteSpace($secretKey) -or
    [string]::IsNullOrWhiteSpace($publishableKey)
) {
    throw "Supabase integration-test configuration is incomplete."
}

$serviceHeaders = @{
    apikey = $secretKey
    Authorization = "Bearer $secretKey"
    Prefer = "return=minimal"
}

$firstEmail = "phase0-step6-$([guid]::NewGuid().ToString('N'))@example.test"
$secondEmail = "phase0-step6-$([guid]::NewGuid().ToString('N'))@example.test"
$password = "T3st!$([guid]::NewGuid().ToString('N'))"
$jobId = [string](Get-Random -Minimum 100000000 -Maximum 999999999)

try {
    $firstUser = Invoke-HttpJson "POST" "$supabaseUrl/auth/v1/admin/users" $serviceHeaders @{
        email = $firstEmail
        password = $password
        email_confirm = $true
    }
    Assert-Equal $firstUser.Status 200 "First temporary user creation failed"
    $firstUserId = $firstUser.Json.id

    $secondUser = Invoke-HttpJson "POST" "$supabaseUrl/auth/v1/admin/users" $serviceHeaders @{
        email = $secondEmail
        password = $password
        email_confirm = $true
    }
    Assert-Equal $secondUser.Status 200 "Second temporary user creation failed"
    $secondUserId = $secondUser.Json.id

    $secondProfile = Invoke-HttpJson "POST" "$supabaseUrl/rest/v1/profiles" $serviceHeaders @{
        user_id = $secondUserId
        email = $secondEmail
        first_name = "Second"
        last_name = "User"
    }
    Assert-Equal $secondProfile.Status 201 "Second profile setup failed"

    $firstMasterResume = Invoke-HttpJson "POST" "$supabaseUrl/rest/v1/user_master_resumes" $serviceHeaders @{
        user_id = $firstUserId
        storage_path = "$firstUserId/master.docx"
        mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        original_filename = "master.docx"
        plaintext = "First user's private master resume."
    }
    Assert-Equal $firstMasterResume.Status 201 "First master resume setup failed"

    $secondMasterResume = Invoke-HttpJson "POST" "$supabaseUrl/rest/v1/user_master_resumes" $serviceHeaders @{
        user_id = $secondUserId
        storage_path = "$secondUserId/master.docx"
        mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        original_filename = "master.docx"
        plaintext = "Second user's private master resume."
    }
    Assert-Equal $secondMasterResume.Status 201 "Second master resume setup failed"

    $job = Invoke-HttpJson "POST" "$supabaseUrl/rest/v1/jobs" $serviceHeaders @{
        user_id = $firstUserId
        seek_job_id = $jobId
        job_title = "Private Step 6 Job"
        company_name = "Example Company"
        location = "Sydney"
        job_description = "Private test job that must not be available through the Data API."
        status = "Saved"
    }
    Assert-Equal $job.Status 201 "Private job setup failed"

    $signIn = Invoke-HttpJson "POST" "$supabaseUrl/auth/v1/token?grant_type=password" @{
        apikey = $publishableKey
    } @{
        email = $firstEmail
        password = $password
    }
    Assert-Equal $signIn.Status 200 "Temporary user sign-in failed"
    $accessToken = $signIn.Json.access_token
    Assert-True (
        -not [string]::IsNullOrWhiteSpace($accessToken)
    ) "Temporary access token was missing"

    $userHeaders = @{
        apikey = $publishableKey
        Authorization = "Bearer $accessToken"
        Prefer = "return=minimal"
    }
    $anonHeaders = @{apikey = $publishableKey}

    $ownProfileInsert = Invoke-HttpJson "POST" "$supabaseUrl/rest/v1/profiles" $userHeaders @{
        user_id = $firstUserId
        email = $firstEmail
        first_name = "First"
        last_name = "User"
    }
    Assert-Equal $ownProfileInsert.Status 201 "Own safe profile insert failed"

    $ownProfile = Invoke-HttpJson "GET" "$supabaseUrl/rest/v1/profiles?user_id=eq.$firstUserId&select=user_id,plan,resume_generations_limit" $userHeaders
    Assert-Equal $ownProfile.Status 200 "Own profile read failed"
    Assert-Equal @($ownProfile.Json).Count 1 "Own profile was not visible"
    Assert-Equal $ownProfile.Json.plan "free" "Profile plan did not use the database default"
    Assert-Equal $ownProfile.Json.resume_generations_limit 3 "Profile limit did not use the database default"

    $otherProfile = Invoke-HttpJson "GET" "$supabaseUrl/rest/v1/profiles?user_id=eq.$secondUserId&select=user_id" $userHeaders
    Assert-Equal $otherProfile.Status 200 "Other-profile RLS query failed unexpectedly"
    Assert-Equal @($otherProfile.Json).Count 0 "Another user's profile was visible"

    $changePlan = Invoke-HttpJson "PATCH" "$supabaseUrl/rest/v1/profiles?user_id=eq.$firstUserId" $userHeaders @{
        plan = "pro"
    }
    Assert-Denied $changePlan "Authenticated user could change protected profile fields"

    $otherProfileInsert = Invoke-HttpJson "POST" "$supabaseUrl/rest/v1/profiles" $userHeaders @{
        user_id = $secondUserId
        email = "attacker@example.test"
        first_name = "Wrong"
        last_name = "Owner"
    }
    Assert-Denied $otherProfileInsert "Authenticated user could create another user's profile"

    $ownMaster = Invoke-HttpJson "GET" "$supabaseUrl/rest/v1/user_master_resumes?user_id=eq.$firstUserId&select=user_id,original_filename" $userHeaders
    Assert-Equal $ownMaster.Status 200 "Own master-resume metadata read failed"
    Assert-Equal @($ownMaster.Json).Count 1 "Own master-resume metadata was not visible"

    $otherMaster = Invoke-HttpJson "GET" "$supabaseUrl/rest/v1/user_master_resumes?user_id=eq.$secondUserId&select=user_id" $userHeaders
    Assert-Equal $otherMaster.Status 200 "Other master-resume RLS query failed unexpectedly"
    Assert-Equal @($otherMaster.Json).Count 0 "Another user's master resume was visible"

    $anonJobs = Invoke-HttpJson "GET" "$supabaseUrl/rest/v1/jobs?select=seek_job_id" $anonHeaders
    Assert-Denied $anonJobs "Anonymous Data API caller could read jobs"

    $userJobs = Invoke-HttpJson "GET" "$supabaseUrl/rest/v1/jobs?select=seek_job_id" $userHeaders
    Assert-Denied $userJobs "Authenticated Data API caller could bypass the Go jobs API"

    $generatedResumes = Invoke-HttpJson "GET" "$supabaseUrl/rest/v1/user_generated_resumes?select=id" $userHeaders
    Assert-Denied $generatedResumes "Authenticated caller could read generated resumes directly"

    Write-Output "Phase 0 Step 6 Supabase authorization checks passed."
} finally {
    foreach ($userId in @($firstUserId, $secondUserId)) {
        if ([string]::IsNullOrWhiteSpace($userId)) {
            continue
        }

        try {
            [void](Invoke-HttpJson "DELETE" "$supabaseUrl/auth/v1/admin/users/$userId" $serviceHeaders)
        } catch {
            Write-Warning "Failed to remove temporary Supabase user $userId"
        }
    }

    $client.Dispose()
}
