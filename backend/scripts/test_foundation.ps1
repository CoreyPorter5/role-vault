param(
    [switch]$Integration
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path

function Assert-LastCommand([string]$Name) {
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE."
    }
}

function Import-EnvFile([string]$Path) {
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -notmatch '^[A-Za-z_][A-Za-z0-9_]*=') {
            continue
        }
        $parts = $line -split '=', 2
        [Environment]::SetEnvironmentVariable(
            $parts[0],
            $parts[1].Trim().Trim('"').Trim("'"),
            "Process"
        )
    }
}

Push-Location (Join-Path $repositoryRoot "backend")
try {
    & go test ./...
    Assert-LastCommand "Go unit tests"

    if ($Integration) {
        Import-EnvFile (Join-Path $repositoryRoot "backend/.env")
        & go test -tags=integration ./internal/db -run '^TestAuthQuotaUploadAndJobOwnershipIntegration$' -count=1 -v
        Assert-LastCommand "Auth/quota/upload/job-ownership integration test"
    }
} finally {
    Pop-Location
}

Push-Location (Join-Path $repositoryRoot "frontend")
try {
    & npm.cmd run test:auth
    Assert-LastCommand "Frontend auth tests"

    & npm.cmd run test:generation
    Assert-LastCommand "Frontend generation tests"
} finally {
    Pop-Location
}

Write-Output "Auth, quota, upload, and job-ownership test foundation passed."
