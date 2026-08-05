param(
    [string]$ApiBaseUrl = "http://127.0.0.1:18080",
    [string]$InternalApiSecret = "0123456789abcdef0123456789abcdef"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$userId = $null

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

function New-HttpRequest([string]$Method, [string]$Url, [hashtable]$Headers, $Body = $null) {
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($Method), $Url)
    foreach ($entry in $Headers.GetEnumerator()) {
        [void]$request.Headers.TryAddWithoutValidation($entry.Key, [string]$entry.Value)
    }
    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 30 -Compress
        $request.Content = [System.Net.Http.StringContent]::new($json, [System.Text.Encoding]::UTF8, "application/json")
    }
    return $request
}

function Read-HttpResponse($Response) {
    $text = $Response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $json = $null
    if (-not [string]::IsNullOrWhiteSpace($text)) {
        try {
            $json = $text | ConvertFrom-Json
        } catch {
            $json = $text
        }
    }
    return [pscustomobject]@{
        Status = [int]$Response.StatusCode
        Json = $json
        Text = $text
    }
}

function Invoke-HttpJson([string]$Method, [string]$Url, [hashtable]$Headers, $Body = $null) {
    $request = New-HttpRequest $Method $Url $Headers $Body
    try {
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        try {
            return Read-HttpResponse $response
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

$backendEnv = Read-EnvFile (Join-Path $PSScriptRoot "../.env")
$frontendEnv = Read-EnvFile (Join-Path $PSScriptRoot "../../frontend/.env.local")
$supabaseUrl = $backendEnv["SUPABASE_URL"].TrimEnd('/')
$secretKey = $backendEnv["SUPABASE_SECRET_API_KEY"]
$publishableKey = $frontendEnv["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]

if ([string]::IsNullOrWhiteSpace($supabaseUrl) -or [string]::IsNullOrWhiteSpace($secretKey) -or [string]::IsNullOrWhiteSpace($publishableKey)) {
    throw "Supabase integration-test configuration is incomplete."
}

$serviceHeaders = @{
    "apikey" = $secretKey
    "Authorization" = "Bearer $secretKey"
    "Prefer" = "return=minimal"
}
$email = "phase0-step2-$([guid]::NewGuid().ToString('N'))@example.test"
$password = "T3st!$([guid]::NewGuid().ToString('N'))"
$jobId = [string](Get-Random -Minimum 100000000 -Maximum 999999999)

try {
    $createUser = Invoke-HttpJson "POST" "$supabaseUrl/auth/v1/admin/users" $serviceHeaders @{
        email = $email
        password = $password
        email_confirm = $true
    }
    Assert-Equal $createUser.Status 200 "Temporary Supabase user creation failed"
    $userId = $createUser.Json.id
    Assert-True (-not [string]::IsNullOrWhiteSpace($userId)) "Temporary Supabase user ID was missing"

    $now = [DateTimeOffset]::UtcNow
    $profile = Invoke-HttpJson "POST" "$supabaseUrl/rest/v1/profiles" $serviceHeaders @{
        user_id = $userId
        email = $email
        first_name = "Phase"
        last_name = "Test"
        plan = "free"
        subscription_status = "inactive"
        resume_generations_used = 0
        resume_generations_limit = 3
        resume_usage_period_start = $now.ToString("o")
        resume_usage_period_end = $now.AddDays(30).ToString("o")
    }
    Assert-Equal $profile.Status 201 "Temporary profile creation failed"

    $job = Invoke-HttpJson "POST" "$supabaseUrl/rest/v1/jobs" $serviceHeaders @{
        user_id = $userId
        seek_job_id = $jobId
        job_title = "Software Engineer"
        company_name = "Example Company"
        location = "Sydney"
        job_description = "Build reliable Go and React software."
        status = "Saved"
    }
    Assert-Equal $job.Status 201 "Temporary job creation failed"

    $masterResume = Invoke-HttpJson "POST" "$supabaseUrl/rest/v1/user_master_resumes" $serviceHeaders @{
        user_id = $userId
        storage_path = "$userId/master.pdf"
        mime_type = "application/pdf"
        original_filename = "master.pdf"
        plaintext = "Corey Test. Software engineer experienced with Go and React. Built reliable web applications."
    }
    Assert-Equal $masterResume.Status 201 "Temporary master resume creation failed"

    $signIn = Invoke-HttpJson "POST" "$supabaseUrl/auth/v1/token?grant_type=password" @{"apikey" = $publishableKey} @{
        email = $email
        password = $password
    }
    Assert-Equal $signIn.Status 200 "Temporary user sign-in failed"
    $accessToken = $signIn.Json.access_token
    Assert-True (-not [string]::IsNullOrWhiteSpace($accessToken)) "Temporary user access token was missing"

    $userHeaders = @{
        "Authorization" = "Bearer $accessToken"
        "X-Seek-Sync-Internal-Key" = $InternalApiSecret
    }
    $browserHeaders = @{"Authorization" = "Bearer $accessToken"}

    $usage = Invoke-HttpJson "GET" "$ApiBaseUrl/api/v1/usage/resume-generations" $browserHeaders
    Assert-Equal $usage.Status 200 "Initial usage request failed"
    Assert-Equal $usage.Json.used 0 "Initial usage was not zero"
    Assert-Equal $usage.Json.limit 3 "Initial free limit was not three"

    $wrongSecret = Invoke-HttpJson "POST" "$ApiBaseUrl/api/v1/internal/resume-generations/reserve" @{
        "Authorization" = "Bearer $accessToken"
        "X-Seek-Sync-Internal-Key" = "wrong-secret"
    } @{
        generation_id = [guid]::NewGuid().ToString()
        job_id = $jobId
        model = "gpt-5-nano"
    }
    Assert-Equal $wrongSecret.Status 401 "Wrong internal secret was not rejected"

    $removedConsume = Invoke-HttpJson "POST" "$ApiBaseUrl/api/v1/usage/resume-generations/consume" $browserHeaders
    Assert-Equal $removedConsume.Status 404 "Legacy consume endpoint is still reachable"

    $generationOne = [guid]::NewGuid().ToString()
    $reserveOneBody = @{generation_id = $generationOne; job_id = $jobId; model = "gpt-5-nano"}
    $reserveOne = Invoke-HttpJson "POST" "$ApiBaseUrl/api/v1/internal/resume-generations/reserve" $userHeaders $reserveOneBody
    Assert-Equal $reserveOne.Status 201 "Initial generation reservation failed"
    Assert-Equal $reserveOne.Json.usage.used 1 "Initial reservation did not consume one credit"

    $duplicateReserve = Invoke-HttpJson "POST" "$ApiBaseUrl/api/v1/internal/resume-generations/reserve" $userHeaders $reserveOneBody
    Assert-Equal $duplicateReserve.Status 202 "Duplicate in-flight reservation was not idempotent"
    Assert-Equal $duplicateReserve.Json.usage.used 1 "Duplicate reservation consumed another credit"

    $failureBody = @{
        failure_code = "provider_request_failed"
        failure_detail = "Injected integration-test failure."
        token_usage = @{calls = @()}
        attempt_count = 1
        repair_attempted = $false
    }
    $refundOne = Invoke-HttpJson "POST" "$ApiBaseUrl/api/v1/internal/resume-generations/$generationOne/fail" $userHeaders $failureBody
    Assert-Equal $refundOne.Status 200 "Generation refund failed"
    Assert-Equal $refundOne.Json.usage.used 0 "Refund did not restore the credit"

    $duplicateRefund = Invoke-HttpJson "POST" "$ApiBaseUrl/api/v1/internal/resume-generations/$generationOne/fail" $userHeaders $failureBody
    Assert-Equal $duplicateRefund.Status 200 "Duplicate refund was not idempotent"
    Assert-Equal $duplicateRefund.Json.usage.used 0 "Duplicate refund changed usage"

    $generationTwo = [guid]::NewGuid().ToString()
    $reserveTwo = Invoke-HttpJson "POST" "$ApiBaseUrl/api/v1/internal/resume-generations/reserve" $userHeaders @{
        generation_id = $generationTwo
        job_id = $jobId
        model = "gpt-5-nano"
    }
    Assert-Equal $reserveTwo.Status 201 "Successful generation reservation failed"

    $resume = @{
        fullName = "Corey Test"
        professionalTitle = "Software Engineer"
        contact = @{location = "Sydney"; phone = $null; email = $email; linkedin = $null; github = $null; portfolioSite = $null}
        professionalSummary = "Software engineer experienced in building reliable Go and React applications."
        skills = @("Go", "React")
        experience = @(@{title = "Software Engineer"; company = "Example"; location = "Sydney"; dates = "2025 - Present"; bullets = @("Built reliable Go services", "Developed React user interfaces")})
        projects = $null
        education = @()
    }
    $completeBody = @{
        resume = $resume
        token_usage = @{calls = @(@{attempt = 1; usage = @{inputTokens = 100; outputTokens = 50; totalTokens = 150}})}
        attempt_count = 1
        repair_attempted = $false
    }
    $completeTwo = Invoke-HttpJson "POST" "$ApiBaseUrl/api/v1/internal/resume-generations/$generationTwo/complete" $userHeaders $completeBody
    Assert-Equal $completeTwo.Status 200 "Generation completion failed"
    Assert-Equal $completeTwo.Json.status "succeeded" "Completed generation did not become succeeded"
    Assert-Equal $completeTwo.Json.usage.used 1 "Successful generation usage was incorrect"

    $duplicateComplete = Invoke-HttpJson "POST" "$ApiBaseUrl/api/v1/internal/resume-generations/$generationTwo/complete" $userHeaders $completeBody
    Assert-Equal $duplicateComplete.Status 200 "Duplicate completion was not idempotent"
    Assert-Equal $duplicateComplete.Json.usage.used 1 "Duplicate completion changed usage"

    $refundCompleted = Invoke-HttpJson "POST" "$ApiBaseUrl/api/v1/internal/resume-generations/$generationTwo/fail" $userHeaders $failureBody
    Assert-Equal $refundCompleted.Status 409 "A completed generation was incorrectly refundable"

    $drafts = Invoke-HttpJson "GET" "$ApiBaseUrl/api/v1/generated-resume-drafts" $browserHeaders
    Assert-Equal $drafts.Status 200 "Generated draft lookup failed"
    Assert-Equal @($drafts.Json).Count 1 "Successful generation was not durably saved as one draft"

    $generationThree = [guid]::NewGuid().ToString()
    $reserveThree = Invoke-HttpJson "POST" "$ApiBaseUrl/api/v1/internal/resume-generations/reserve" $userHeaders @{
        generation_id = $generationThree
        job_id = $jobId
        model = "gpt-5-nano"
    }
    Assert-Equal $reserveThree.Status 201 "Second active reservation failed"
    Assert-Equal $reserveThree.Json.usage.used 2 "Usage did not reach two before concurrency test"

    $generationFour = [guid]::NewGuid().ToString()
    $generationFive = [guid]::NewGuid().ToString()
    $requestFour = New-HttpRequest "POST" "$ApiBaseUrl/api/v1/internal/resume-generations/reserve" $userHeaders @{
        generation_id = $generationFour; job_id = $jobId; model = "gpt-5-nano"
    }
    $requestFive = New-HttpRequest "POST" "$ApiBaseUrl/api/v1/internal/resume-generations/reserve" $userHeaders @{
        generation_id = $generationFive; job_id = $jobId; model = "gpt-5-nano"
    }
    try {
        $taskFour = $client.SendAsync($requestFour)
        $taskFive = $client.SendAsync($requestFive)
        $responseFourRaw = $taskFour.GetAwaiter().GetResult()
        $responseFiveRaw = $taskFive.GetAwaiter().GetResult()
        try {
            $responseFour = Read-HttpResponse $responseFourRaw
            $responseFive = Read-HttpResponse $responseFiveRaw
        } finally {
            $responseFourRaw.Dispose()
            $responseFiveRaw.Dispose()
        }
    } finally {
        $requestFour.Dispose()
        $requestFive.Dispose()
    }
    $concurrentStatuses = @($responseFour.Status, $responseFive.Status) | Sort-Object
    Assert-Equal ($concurrentStatuses -join ',') "201,402" "Concurrent final-credit reservations were not atomic"

    $expiredStart = [DateTimeOffset]::UtcNow.AddDays(-31)
    $expiredEnd = [DateTimeOffset]::UtcNow.AddMinutes(-1)
    $expireProfile = Invoke-HttpJson "PATCH" "$supabaseUrl/rest/v1/profiles?user_id=eq.$userId" $serviceHeaders @{
        resume_generations_used = 3
        resume_generations_limit = 3
        resume_usage_period_start = $expiredStart.ToString("o")
        resume_usage_period_end = $expiredEnd.ToString("o")
        plan = "free"
    }
    Assert-Equal $expireProfile.Status 204 "Could not prepare expired free-period test"

    $resetUsage = Invoke-HttpJson "GET" "$ApiBaseUrl/api/v1/usage/resume-generations" $browserHeaders
    Assert-Equal $resetUsage.Status 200 "Expired free-period usage request failed"
    Assert-Equal $resetUsage.Json.used 0 "Expired free period did not reset usage"
    Assert-Equal $resetUsage.Json.limit 3 "Expired free period did not restore free limit"
    Assert-True ([DateTimeOffset]::Parse($resetUsage.Json.period_end) -gt [DateTimeOffset]::UtcNow) "Reset period end is not in the future"

    $generationSix = [guid]::NewGuid().ToString()
    $reserveSix = Invoke-HttpJson "POST" "$ApiBaseUrl/api/v1/internal/resume-generations/reserve" $userHeaders @{
        generation_id = $generationSix
        job_id = $jobId
        model = "gpt-5-nano"
    }
    Assert-Equal $reserveSix.Status 201 "Stale-attempt reservation failed"
    Assert-Equal $reserveSix.Json.usage.used 1 "Stale-attempt setup did not consume a credit"

    $makeStale = Invoke-HttpJson "PATCH" "$supabaseUrl/rest/v1/resume_generation_attempts?id=eq.$generationSix" $serviceHeaders @{
        created_at = [DateTimeOffset]::UtcNow.AddMinutes(-20).ToString("o")
    }
    Assert-Equal $makeStale.Status 204 "Could not age the temporary generation attempt"

    $reconciledUsage = Invoke-HttpJson "GET" "$ApiBaseUrl/api/v1/usage/resume-generations" $browserHeaders
    Assert-Equal $reconciledUsage.Status 200 "Stale-attempt reconciliation request failed"
    Assert-Equal $reconciledUsage.Json.used 0 "Stale generation did not restore its current-period credit"

    $databaseUrl = $backendEnv["DATABASE_URL"]
    if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
        throw "DATABASE_URL is required for the Stripe lifecycle integration check."
    }
    $previousDatabaseUrl = $env:DATABASE_URL
    $previousTestUserId = $env:STEP2_TEST_USER_ID
    try {
        $env:DATABASE_URL = $databaseUrl
        $env:STEP2_TEST_USER_ID = $userId
        & go test -tags=integration ./internal/db -run '^TestStripeSubscriptionLifecycleIntegration$' -count=1
        if ($LASTEXITCODE -ne 0) {
            throw "Stripe lifecycle database integration check failed."
        }
    } finally {
        if ($null -eq $previousDatabaseUrl) {
            Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
        } else {
            $env:DATABASE_URL = $previousDatabaseUrl
        }
        if ($null -eq $previousTestUserId) {
            Remove-Item Env:STEP2_TEST_USER_ID -ErrorAction SilentlyContinue
        } else {
            $env:STEP2_TEST_USER_ID = $previousTestUserId
        }
    }

    Write-Output "Phase 0 Step 2 API/database integration checks passed."
} finally {
    if (-not [string]::IsNullOrWhiteSpace($userId)) {
        $cleanup = Invoke-HttpJson "DELETE" "$supabaseUrl/auth/v1/admin/users/$userId" $serviceHeaders
        if ($cleanup.Status -notin @(200, 204)) {
            Write-Warning "Temporary Supabase user cleanup returned HTTP $($cleanup.Status)."
        }
    }
    $client.Dispose()
}
