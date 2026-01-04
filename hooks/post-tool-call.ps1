# Claude Code Post-Tool-Call Hook
# TDD 상태 및 커밋 이벤트를 오버레이 서버로 전송

param(
    [Parameter(ValueFromPipeline=$true)]
    [string]$InputJson
)

$SERVER_URL = "http://localhost:3001"

# JSON 파싱
try {
    $event = $InputJson | ConvertFrom-Json
} catch {
    exit 0
}

$toolName = $event.tool_name
$toolInput = $event.tool_input
$toolResult = $event.tool_result

# TDD 상태 감지 (테스트 실행 감지)
if ($toolName -eq "Bash") {
    $command = $toolInput.command

    # pytest 또는 vitest 실행 감지
    if ($command -match "pytest|vitest|npm test|npm run test") {
        $result = $toolResult.stdout + $toolResult.stderr

        # 테스트 결과 파싱
        $passed = 0
        $failed = 0
        $total = 0
        $phase = "idle"

        # pytest 결과 파싱
        if ($result -match "(\d+) passed") {
            $passed = [int]$Matches[1]
        }
        if ($result -match "(\d+) failed") {
            $failed = [int]$Matches[1]
        }

        # vitest 결과 파싱
        if ($result -match "Tests\s+(\d+)\s+passed") {
            $passed = [int]$Matches[1]
        }
        if ($result -match "Tests\s+(\d+)\s+failed") {
            $failed = [int]$Matches[1]
        }

        $total = $passed + $failed

        if ($total -gt 0) {
            if ($failed -gt 0) {
                $phase = "red"
            } elseif ($passed -gt 0) {
                $phase = "green"
            }

            $body = @{
                phase = $phase
                testsPassed = $passed
                testsTotal = $total
            } | ConvertTo-Json

            try {
                Invoke-RestMethod -Uri "$SERVER_URL/api/tdd/status" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 2 | Out-Null
            } catch {
                # 서버 연결 실패 무시
            }
        }
    }
}

# Git 커밋 감지
if ($toolName -eq "Bash" -and $toolInput.command -match "git commit") {
    # 커밋 후 프로젝트 상태 업데이트
    try {
        $repoName = Split-Path -Leaf (git rev-parse --show-toplevel 2>$null)
        if ($repoName) {
            $body = @{
                name = $repoName
                repo = $repoName
            } | ConvertTo-Json

            Invoke-RestMethod -Uri "$SERVER_URL/api/project/switch" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 2 | Out-Null
        }
    } catch {
        # 오류 무시
    }
}
