# AI Coding Stream - 방송 시작 스크립트
# 사용법: .\scripts\start-stream.ps1

param(
    [switch]$NoOBS,      # OBS 실행 건너뛰기
    [switch]$NoServer,   # 서버 시작 건너뛰기
    [int]$Countdown = 30 # Intro 카운트다운 (초)
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI Coding Stream - Starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 오버레이 서버 시작
if (-not $NoServer) {
    Write-Host "[1/4] Starting overlay server..." -ForegroundColor Yellow

    # 기존 프로세스 확인
    $existingServer = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    if ($existingServer) {
        Write-Host "  Server already running on port 3001" -ForegroundColor Green
    } else {
        # 백그라운드에서 서버 시작
        $serverProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $ProjectDir -PassThru -WindowStyle Minimized
        Write-Host "  Server started (PID: $($serverProcess.Id))" -ForegroundColor Green

        # 서버 준비 대기
        Write-Host "  Waiting for server to be ready..."
        $maxRetries = 10
        $retry = 0
        while ($retry -lt $maxRetries) {
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 2
                if ($response.status -eq "ok") {
                    Write-Host "  Server is ready!" -ForegroundColor Green
                    break
                }
            } catch {
                Start-Sleep -Seconds 1
                $retry++
            }
        }
        if ($retry -ge $maxRetries) {
            Write-Host "  Warning: Server may not be ready" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "[1/4] Skipping server start (--NoServer)" -ForegroundColor Gray
}

# 2. OBS 실행 확인
if (-not $NoOBS) {
    Write-Host "[2/4] Checking OBS Studio..." -ForegroundColor Yellow

    $obsProcess = Get-Process -Name "obs64" -ErrorAction SilentlyContinue
    if (-not $obsProcess) {
        Write-Host "  Starting OBS Studio..."
        $obsPath = "C:\Program Files\obs-studio\bin\64bit\obs64.exe"
        if (Test-Path $obsPath) {
            Start-Process -FilePath $obsPath
            Start-Sleep -Seconds 5
            Write-Host "  OBS Studio started" -ForegroundColor Green
        } else {
            Write-Host "  Warning: OBS not found at default path" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  OBS already running" -ForegroundColor Green
    }
} else {
    Write-Host "[2/4] Skipping OBS (--NoOBS)" -ForegroundColor Gray
}

# 3. 세션 시작 API 호출
Write-Host "[3/4] Starting session..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/session/start" -Method POST -ContentType "application/json"
    Write-Host "  Session started at: $($response.startTime)" -ForegroundColor Green
} catch {
    Write-Host "  Warning: Failed to start session" -ForegroundColor Yellow
}

# 4. Intro 카운트다운 (선택)
if ($Countdown -gt 0) {
    Write-Host "[4/4] Intro countdown: $Countdown seconds..." -ForegroundColor Yellow

    # OBS Scene 전환 시도 (Intro)
    try {
        Invoke-RestMethod -Uri "http://localhost:3001/api/obs/scene" -Method POST -Body '{"scene":"Intro"}' -ContentType "application/json" -TimeoutSec 2 | Out-Null
    } catch {
        # 무시
    }

    for ($i = $Countdown; $i -gt 0; $i--) {
        Write-Host "`r  Starting in $i seconds..." -NoNewline
        Start-Sleep -Seconds 1
    }
    Write-Host ""

    # Coding Scene으로 전환
    try {
        Invoke-RestMethod -Uri "http://localhost:3001/api/obs/scene" -Method POST -Body '{"scene":"Coding"}' -ContentType "application/json" -TimeoutSec 2 | Out-Null
        Write-Host "  Switched to Coding scene" -ForegroundColor Green
    } catch {
        Write-Host "  Note: Could not switch OBS scene (manual switch required)" -ForegroundColor Yellow
    }
} else {
    Write-Host "[4/4] Skipping countdown" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Stream Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Overlay URL: http://localhost:3001/overlay/" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Endpoints:"
Write-Host "  Health:    GET  http://localhost:3001/health"
Write-Host "  Session:   POST http://localhost:3001/api/session/start"
Write-Host "  TDD:       POST http://localhost:3001/api/tdd/status"
Write-Host "  Project:   POST http://localhost:3001/api/project/switch"
Write-Host ""
Write-Host "Press Ctrl+C to stop the stream" -ForegroundColor Yellow
