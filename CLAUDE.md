# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

AI Coding YouTube 방송 시스템 - Claude Code (CLI) 기반 AI 코딩 작업을 YouTube에서 실시간 스트리밍하는 오버레이 시스템입니다.

## 빌드/테스트 명령

```powershell
npm install              # 의존성 설치
npm run dev              # 개발 서버 (tsx watch, 핫 리로드)
npm run build            # 전체 빌드 (서버 + 오버레이)
npm run build:server     # 서버만 빌드
npm run build:overlay    # 오버레이만 빌드
npm run start            # 프로덕션 서버 실행
npm run lint             # ESLint 검사
npm run lint:fix         # ESLint 자동 수정
npm run test             # Vitest 실행 (단일 실행)
npm run test:watch       # Vitest 감시 모드
```

**중요**: 테스트는 서버가 실행 중이어야 통과합니다 (`http://localhost:3001`).

## 아키텍처

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ Claude Code │──────│ Local Server│──────│    OBS      │
│   (Hook)    │      │ (Port 3001) │      │   Studio    │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   GitHub    │──────│  WebSocket  │──────│  Overlay    │
│  Webhooks   │      │   Clients   │      │ (Browser)   │
└─────────────┘      └─────────────┘      └─────────────┘
```

### 핵심 컴포넌트

| 파일 | 역할 |
|------|------|
| `src/server/index.ts` | Express + WebSocket 메인 서버, API 엔드포인트 |
| `src/server/websocket.ts` | WebSocketManager - 채널 구독 기반 pub/sub |
| `src/server/github-webhook.ts` | GitHub Webhook 처리 (push, PR, issue, check_run) |
| `src/server/obs-controller.ts` | OBS WebSocket 제어 (Scene 전환, 스트림 제어) |
| `src/overlay/app.ts` | OBS Browser Source용 프론트엔드 |
| `src/types/index.ts` | 공유 TypeScript 타입 정의 |

### 데이터 흐름

1. **GitHub → 오버레이**: GitHub Webhook → `/webhook/github` → WebSocket `broadcast('github', ...)` → 오버레이 업데이트
2. **TDD 상태**: Claude Code Hook → `/api/tdd/status` → WebSocket `broadcast('tdd', ...)` → 오버레이 업데이트
3. **세션 관리**: `/api/session/start|end|stats` → WebSocket `broadcastAll(...)` → 전체 클라이언트 알림

### WebSocket 채널

| 채널 | 메시지 타입 |
|------|------------|
| `github` | `github:commit`, `github:pr`, `github:issue`, `github:ci` |
| `tdd` | `tdd:status` |
| `session` | `session:start`, `session:end`, `session:stats` |
| `project` | `project:switch`, `project:active` |

## 주요 API 엔드포인트

| 경로 | 메서드 | 용도 |
|------|--------|------|
| `/health` | GET | 서버 상태 (wsClients, obsConnected, session) |
| `/api/session/start` | POST | 세션 시작 |
| `/api/session/end` | POST | 세션 종료 + 통계 반환 |
| `/api/tdd/status` | POST | TDD 상태 업데이트 (Hook에서 호출) |
| `/api/project/switch` | POST | 현재 작업 프로젝트 변경 |
| `/api/project/active` | POST | 활성 프로젝트 목록 설정 |
| `/api/obs/scene` | POST | OBS Scene 전환 |
| `/webhook/github` | POST | GitHub Webhook 수신 |

## 환경 변수

```env
PORT=3001                      # 서버 포트
HOST=localhost                 # 서버 호스트
OBS_WS_HOST=localhost          # OBS WebSocket 호스트
OBS_WS_PORT=4455               # OBS WebSocket 포트
OBS_WS_PASSWORD=your_password  # OBS WebSocket 비밀번호
GITHUB_WEBHOOK_SECRET=secret   # Webhook 검증 시크릿 (선택)
```

## 두 개의 tsconfig

- `tsconfig.json`: 서버 코드 빌드 (output: `dist/`)
- `tsconfig.overlay.json`: 오버레이 클라이언트 빌드 (output: `src/overlay/`)

## Claude Code Hook

`hooks/post-tool-call.ps1` - 테스트 실행과 git commit 감지:

- `pytest`/`vitest` 실행 시 결과를 파싱하여 `/api/tdd/status`로 전송
- `git commit` 감지 시 `/api/project/switch`로 프로젝트 전환 알림

## 방송 스크립트

```powershell
.\scripts\setup-obs.ps1    # OBS 설정 가이드
.\scripts\start-stream.ps1 # 방송 시작
.\scripts\stop-stream.ps1  # 방송 종료
```

## 오버레이 접근

개발 서버 실행 후: `http://localhost:3001/overlay/`

OBS Browser Source로 추가하여 사용합니다.
