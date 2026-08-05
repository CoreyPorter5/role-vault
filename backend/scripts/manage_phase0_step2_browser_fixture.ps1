param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Create", "Verify", "Delete")]
    [string]$Action,
    [string]$UserId,
    [string]$JobId
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

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

function Invoke-JsonRequest([string]$Method, [string]$Url, [hashtable]$Headers, $Body = $null) {
    $client = [System.Net.Http.HttpClient]::new()
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($Method), $Url)
    try {
        foreach ($entry in $Headers.GetEnumerator()) {
            [void]$request.Headers.TryAddWithoutValidation($entry.Key, [string]$entry.Value)
        }
        if ($null -ne $Body) {
            $json = $Body | ConvertTo-Json -Depth 20 -Compress
            $request.Content = [System.Net.Http.StringContent]::new($json, [System.Text.Encoding]::UTF8, "application/json")
        }
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        try {
            $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            $parsed = $null
            if (-not [string]::IsNullOrWhiteSpace($text)) {
                try {
                    $parsed = $text | ConvertFrom-Json
                } catch {
                    $parsed = $text
                }
            }
            return [pscustomobject]@{Status = [int]$response.StatusCode; Json = $parsed; Text = $text}
        } finally {
            $response.Dispose()
        }
    } finally {
        $request.Dispose()
        $client.Dispose()
    }
}

function Assert-Status($Response, [int[]]$Expected, [string]$Operation) {
    if ($Response.Status -notin $Expected) {
        throw "$Operation returned HTTP $($Response.Status): $($Response.Text)"
    }
}

$backendEnv = Read-EnvFile (Join-Path $PSScriptRoot "../.env")
$supabaseUrl = $backendEnv["SUPABASE_URL"].TrimEnd('/')
$secretKey = $backendEnv["SUPABASE_SECRET_API_KEY"]
if ([string]::IsNullOrWhiteSpace($supabaseUrl) -or [string]::IsNullOrWhiteSpace($secretKey)) {
    throw "Supabase browser-fixture configuration is incomplete."
}

$serviceHeaders = @{
    "apikey" = $secretKey
    "Authorization" = "Bearer $secretKey"
    "Prefer" = "return=minimal"
}

if ($Action -eq "Verify") {
    if ([string]::IsNullOrWhiteSpace($UserId) -or [string]::IsNullOrWhiteSpace($JobId)) {
        throw "UserId and JobId are required for Verify."
    }

    $profileResponse = Invoke-JsonRequest "GET" "$supabaseUrl/rest/v1/profiles?user_id=eq.$UserId&select=resume_generations_used,resume_generations_limit" $serviceHeaders
    Assert-Status $profileResponse @(200) "Read disposable browser usage"
    $profiles = @($profileResponse.Json)
    if ($profiles.Count -ne 1 -or $profiles[0].resume_generations_used -ne 1 -or $profiles[0].resume_generations_limit -ne 3) {
        throw "Disposable browser usage was not exactly 1/3 after one successful generation."
    }

    $attemptResponse = Invoke-JsonRequest "GET" "$supabaseUrl/rest/v1/resume_generation_attempts?user_id=eq.$UserId&seek_job_id=eq.$JobId&select=id,status,result_json,credit_charged,attempt_count" $serviceHeaders
    Assert-Status $attemptResponse @(200) "Read disposable browser generation ledger"
    $attempts = @($attemptResponse.Json)
    if ($attempts.Count -ne 1 -or $attempts[0].status -ne "succeeded" -or $null -eq $attempts[0].result_json -or -not $attempts[0].credit_charged) {
        throw "Disposable browser generation ledger did not contain one charged success."
    }

    $draftResponse = Invoke-JsonRequest "GET" "$supabaseUrl/rest/v1/user_generated_resume_drafts?user_id=eq.$UserId&seek_job_id=eq.$JobId&select=id,resume_json,expires_at" $serviceHeaders
    Assert-Status $draftResponse @(200) "Read disposable browser draft"
    $drafts = @($draftResponse.Json)
    if ($drafts.Count -ne 1 -or $null -eq $drafts[0].resume_json) {
        throw "Disposable browser generation did not persist exactly one draft."
    }

    [pscustomobject]@{
        usage = "1/3"
        generation_status = $attempts[0].status
        draft_count = $drafts.Count
    } | ConvertTo-Json -Compress
    exit 0
}

if ($Action -eq "Delete") {
    if ([string]::IsNullOrWhiteSpace($UserId)) {
        throw "UserId is required for Delete."
    }
    $deleted = Invoke-JsonRequest "DELETE" "$supabaseUrl/auth/v1/admin/users/$UserId" $serviceHeaders
    Assert-Status $deleted @(200, 204) "Delete disposable browser user"
    Write-Output "Disposable browser fixture deleted."
    exit 0
}

$email = "phase0-step2-browser-$([guid]::NewGuid().ToString('N'))@example.test"
$password = "Browser!$([guid]::NewGuid().ToString('N').Substring(0, 10))"
$jobId = [string](Get-Random -Minimum 100000000 -Maximum 999999999)
$createdUserId = $null

try {
    $created = Invoke-JsonRequest "POST" "$supabaseUrl/auth/v1/admin/users" $serviceHeaders @{
        email = $email
        password = $password
        email_confirm = $true
    }
    Assert-Status $created @(200) "Create disposable browser user"
    $createdUserId = $created.Json.id

    $now = [DateTimeOffset]::UtcNow
    $profile = Invoke-JsonRequest "POST" "$supabaseUrl/rest/v1/profiles" $serviceHeaders @{
        user_id = $createdUserId
        email = $email
        first_name = "Browser"
        last_name = "Test"
        plan = "free"
        subscription_status = "inactive"
        resume_generations_used = 0
        resume_generations_limit = 3
        resume_usage_period_start = $now.ToString("o")
        resume_usage_period_end = $now.AddDays(30).ToString("o")
    }
    Assert-Status $profile @(201) "Create disposable browser profile"

    $job = Invoke-JsonRequest "POST" "$supabaseUrl/rest/v1/jobs" $serviceHeaders @{
        user_id = $createdUserId
        seek_job_id = $jobId
        job_title = "Senior Software Engineer"
        company_name = "Phase Zero Test Company"
        location = "Sydney NSW"
        job_description = "Build reliable Go services and accessible React applications. Collaborate with product teams and improve production reliability."
        status = "Saved"
    }
    Assert-Status $job @(201) "Create disposable browser job"

    $masterResume = Invoke-JsonRequest "POST" "$supabaseUrl/rest/v1/user_master_resumes" $serviceHeaders @{
        user_id = $createdUserId
        storage_path = "$createdUserId/master.pdf"
        mime_type = "application/pdf"
        original_filename = "master.pdf"
        plaintext = "Browser Test is a software engineer in Sydney. Experienced with Go, TypeScript, React, PostgreSQL, reliable APIs, automated testing, and production incident response. Led delivery of web applications and mentored engineers."
    }
    Assert-Status $masterResume @(201) "Create disposable browser master resume"

    [pscustomobject]@{
        user_id = $createdUserId
        email = $email
        password = $password
        job_id = $jobId
    } | ConvertTo-Json -Compress
} catch {
    if (-not [string]::IsNullOrWhiteSpace($createdUserId)) {
        try {
            [void](Invoke-JsonRequest "DELETE" "$supabaseUrl/auth/v1/admin/users/$createdUserId" $serviceHeaders)
        } catch {
        }
    }
    throw
}
