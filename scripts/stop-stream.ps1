# AI Coding Stream - 방송 종료 스크립트
# 사용법: .\scripts\stop-stream.ps1

param(
    [switch]$KeepServer,  # 서버 유지
    [int]$EndingTime = 60 # Ending Scene 표시 시간 (초)
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI Coding Stream - Ending..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ending Scene 전환
Write-Host "[1/4] Switching to Ending scene..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/obs/scene" -Method POST -Body '{"scene":"Ending"}' -ContentType "application/json" -TimeoutSec 2 | Out-Null
    Write-Host "  Switched to Ending scene" -ForegroundColor Green
} catch {
    Write-Host "  Note: Could not switch OBS scene" -ForegroundColor Yellow
}

# 2. 세션 종료 및 통계 저장
Write-Host "[2/4] Ending session and saving stats..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/session/end" -Method POST -ContentType "application/json"
    $stats = $response.stats

    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────┐" -ForegroundColor Cyan
    Write-Host "  │        Session Statistics           │" -ForegroundColor Cyan
    Write-Host "  ├─────────────────────────────────────┤" -ForegroundColor Cyan
    Write-Host "  │  Duration:       $('{0:hh\:mm\:ss}' -f [TimeSpan]::FromSeconds($stats.duration))" -ForegroundColor White
    Write-Host "  │  Commits:        $($stats.commits)" -ForegroundColor White
    Write-Host "  │  Tests Run:      $($stats.testsRun)" -ForegroundColor White
    Write-Host "  │  Issues Closed:  $($stats.issuesClosed)" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────┘" -ForegroundColor Cyan
    Write-Host ""

    # 통계를 파일로 저장
    $logDir = Join-Path $ProjectDir "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir | Out-Null
    }

    $logFile = Join-Path $logDir "session-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').json"
    $stats | ConvertTo-Json | Out-File -FilePath $logFile -Encoding utf8
    Write-Host "  Stats saved to: $logFile" -ForegroundColor Green

} catch {
    Write-Host "  Warning: Failed to end session properly" -ForegroundColor Yellow
}

# 3. Ending Scene 표시 (시간 대기)
if ($EndingTime -gt 0) {
    Write-Host "[3/4] Showing ending screen for $EndingTime seconds..." -ForegroundColor Yellow
    for ($i = $EndingTime; $i -gt 0; $i -= 5) {
        Write-Host "`r  Ending in $i seconds..." -NoNewline
        Start-Sleep -Seconds 5
    }
    Write-Host ""
}

# 4. 서버 종료 (옵션)
if (-not $KeepServer) {
    Write-Host "[4/4] Stopping overlay server..." -ForegroundColor Yellow

    # tsx watch 프로세스 찾기 및 종료
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowTitle -like "*youtuber*" -or $_.Path -like "*youtuber*" }

    if ($nodeProcesses) {
        foreach ($proc in $nodeProcesses) {
            try {
                Stop-Process -Id $proc.Id -Force
                Write-Host "  Stopped process: $($proc.Id)" -ForegroundColor Green
            } catch {
                Write-Host "  Warning: Could not stop process $($proc.Id)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  No server process found" -ForegroundColor Gray
    }
} else {
    Write-Host "[4/4] Keeping server running (--KeepServer)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Stream Ended Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Thank you for streaming!" -ForegroundColor Cyan
