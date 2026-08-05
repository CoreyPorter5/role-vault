$ErrorActionPreference = "Stop"

function Import-EnvFile([string]$Path) {
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -notmatch '^[A-Za-z_][A-Za-z0-9_]*=') {
            continue
        }
        $parts = $line -split '=', 2
        [Environment]::SetEnvironmentVariable($parts[0], $parts[1].Trim().Trim('"').Trim("'"), "Process")
    }
}

Import-EnvFile (Join-Path $PSScriptRoot "../.env")

$required = @(
    "DATABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_STORAGE_URL",
    "SUPABASE_SECRET_API_KEY",
    "MASTER_RESUME_STORAGE_BUCKET_ID",
    "GENERATED_RESUME_STORAGE_BUCKET_ID"
)
foreach ($name in $required) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name, "Process"))) {
        throw "Missing required integration-test variable: $name"
    }
}

go test -tags=integration ./internal/db -run '^TestResumeStorageLifecycleIntegration$' -count=1 -v
if ($LASTEXITCODE -ne 0) {
    throw "Phase 0 Step 3 integration test failed."
}
