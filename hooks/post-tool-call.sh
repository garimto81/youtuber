#!/bin/bash
# Claude Code Post-Tool-Call Hook
# TDD 상태 및 커밋 이벤트를 오버레이 서버로 전송

SERVER_URL="http://localhost:3001"

# stdin에서 JSON 읽기
read -r INPUT_JSON

# jq 사용 가능 여부 확인
if ! command -v jq &> /dev/null; then
    exit 0
fi

TOOL_NAME=$(echo "$INPUT_JSON" | jq -r '.tool_name // empty')
TOOL_INPUT=$(echo "$INPUT_JSON" | jq -r '.tool_input.command // empty')
TOOL_RESULT=$(echo "$INPUT_JSON" | jq -r '.tool_result.stdout // empty')
TOOL_STDERR=$(echo "$INPUT_JSON" | jq -r '.tool_result.stderr // empty')

# TDD 상태 감지
if [[ "$TOOL_NAME" == "Bash" ]]; then
    if [[ "$TOOL_INPUT" =~ (pytest|vitest|npm\ test|npm\ run\ test) ]]; then
        RESULT="$TOOL_RESULT$TOOL_STDERR"

        PASSED=0
        FAILED=0
        PHASE="idle"

        # pytest 결과
        if [[ "$RESULT" =~ ([0-9]+)\ passed ]]; then
            PASSED="${BASH_REMATCH[1]}"
        fi
        if [[ "$RESULT" =~ ([0-9]+)\ failed ]]; then
            FAILED="${BASH_REMATCH[1]}"
        fi

        TOTAL=$((PASSED + FAILED))

        if [[ $TOTAL -gt 0 ]]; then
            if [[ $FAILED -gt 0 ]]; then
                PHASE="red"
            elif [[ $PASSED -gt 0 ]]; then
                PHASE="green"
            fi

            curl -s -X POST "$SERVER_URL/api/tdd/status" \
                -H "Content-Type: application/json" \
                -d "{\"phase\":\"$PHASE\",\"testsPassed\":$PASSED,\"testsTotal\":$TOTAL}" \
                --connect-timeout 2 \
                > /dev/null 2>&1 || true
        fi
    fi
fi

# Git 커밋 감지
if [[ "$TOOL_NAME" == "Bash" && "$TOOL_INPUT" =~ "git commit" ]]; then
    REPO_NAME=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null)
    if [[ -n "$REPO_NAME" ]]; then
        curl -s -X POST "$SERVER_URL/api/project/switch" \
            -H "Content-Type: application/json" \
            -d "{\"name\":\"$REPO_NAME\",\"repo\":\"$REPO_NAME\"}" \
            --connect-timeout 2 \
            > /dev/null 2>&1 || true
    fi
fi
