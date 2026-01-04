# AI Coding Stream - OBS 설정 가이드
# 이 스크립트는 OBS 설정 방법을 안내합니다.

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OBS Studio Setup Guide" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. SCENE COLLECTION 생성" -ForegroundColor Yellow
Write-Host "   - Scene Collection > New > 'AI Coding Stream'" -ForegroundColor White
Write-Host ""

Write-Host "2. SCENES 생성 (4개)" -ForegroundColor Yellow
Write-Host "   [+] Intro   - 방송 시작 전" -ForegroundColor White
Write-Host "   [+] Coding  - 메인 코딩 화면" -ForegroundColor White
Write-Host "   [+] Break   - 휴식 화면" -ForegroundColor White
Write-Host "   [+] Ending  - 방송 종료" -ForegroundColor White
Write-Host ""

Write-Host "3. CODING SCENE 소스 설정" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Layer 1 (Bottom): Window Capture" -ForegroundColor Green
Write-Host "   - Source: Terminal (Claude Code)" -ForegroundColor White
Write-Host "   - Position: 0, 0" -ForegroundColor White
Write-Host "   - Size: 1600 x 900" -ForegroundColor White
Write-Host ""
Write-Host "   Layer 2: Browser Source (Overlay)" -ForegroundColor Green
Write-Host "   - URL: http://localhost:3001/overlay/" -ForegroundColor Cyan
Write-Host "   - Width: 1920" -ForegroundColor White
Write-Host "   - Height: 1080" -ForegroundColor White
Write-Host "   - [x] Shutdown source when not visible" -ForegroundColor White
Write-Host "   - [x] Refresh browser when scene becomes active" -ForegroundColor White
Write-Host ""
Write-Host "   Layer 3 (Top): Video Capture Device" -ForegroundColor Green
Write-Host "   - Source: Webcam" -ForegroundColor White
Write-Host "   - Position: 1600, 0" -ForegroundColor White
Write-Host "   - Size: 320 x 180" -ForegroundColor White
Write-Host ""

Write-Host "4. WEBSOCKET 설정 (OBS 28+)" -ForegroundColor Yellow
Write-Host "   - Tools > WebSocket Server Settings" -ForegroundColor White
Write-Host "   - [x] Enable WebSocket server" -ForegroundColor White
Write-Host "   - Port: 4455" -ForegroundColor White
Write-Host "   - Password: (설정 후 .env에 저장)" -ForegroundColor White
Write-Host ""

Write-Host "5. STREAMING 설정" -ForegroundColor Yellow
Write-Host "   - Settings > Stream" -ForegroundColor White
Write-Host "   - Service: YouTube - RTMPS" -ForegroundColor White
Write-Host "   - Server: Primary YouTube ingest server" -ForegroundColor White
Write-Host "   - Stream Key: (YouTube Studio에서 복사)" -ForegroundColor White
Write-Host ""

Write-Host "6. OUTPUT 설정 (권장)" -ForegroundColor Yellow
Write-Host "   - Settings > Output" -ForegroundColor White
Write-Host "   - Video Bitrate: 4500 Kbps" -ForegroundColor White
Write-Host "   - Encoder: x264 or NVENC" -ForegroundColor White
Write-Host "   - Audio Bitrate: 160" -ForegroundColor White
Write-Host ""

Write-Host "7. VIDEO 설정" -ForegroundColor Yellow
Write-Host "   - Settings > Video" -ForegroundColor White
Write-Host "   - Base Resolution: 1920x1080" -ForegroundColor White
Write-Host "   - Output Resolution: 1920x1080" -ForegroundColor White
Write-Host "   - FPS: 30" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "After setup, run:" -ForegroundColor Cyan
Write-Host "  .\scripts\start-stream.ps1" -ForegroundColor White
Write-Host ""

# .env 파일 확인
$envFile = Join-Path (Split-Path -Parent $PSScriptRoot) ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "Note: .env file not found. Copy .env.example to .env and configure:" -ForegroundColor Yellow
    Write-Host "  copy .env.example .env" -ForegroundColor White
}
