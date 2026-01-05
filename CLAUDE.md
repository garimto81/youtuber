# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

AI Coding YouTube 방송용 OBS 오버레이 시스템 - Claude Code (CLI) 기반 AI 코딩 작업을 YouTube에서 실시간 스트리밍하는 오버레이입니다.

**Monorepo 구조**: pnpm workspace 기반 (overlay + stream-server + shared)

**기술 스택**: Node.js 20+, TypeScript 5.x, Express 4.x, WebSocket (ws 8.x), obs-websocket-js 5.x, Vitest

## 빌드/테스트 명령

```powershell
# 전체 빌드 및 실행
pnpm install             # 의존성 설치
pnpm build               # 전체 빌드
pnpm dev                 # 모든 패키지 개발 모드 (병렬)
pnpm start               # stream-server 프로덕션 시작

# 개별 패키지
pnpm dev:server          # stream-server 개발 모드 (tsx watch)
pnpm dev:overlay         # overlay 개발 모드 (tsc --watch)
pnpm build:shared        # shared 먼저 빌드 (다른 패키지가 의존)
pnpm --filter @youtuber/stream-server dev  # 특정 패키지만

# 테스트 (서버가 localhost:3001에서 실행 중이어야 함)
pnpm test                # Vitest 전체 테스트
pnpm test:watch          # Vitest 감시 모드
npx vitest run tests/server.test.ts  # 개별 테스트 파일 실행

# 린트
pnpm lint                # ESLint 검사
pnpm lint:fix            # 자동 수정
```

**중요**: shared 패키지 수정 후 다른 패키지에서 사용하려면 `pnpm build:shared` 필수

## 아키텍처

### 패키지 구조

```
youtuber/
├── packages/
│   ├── shared/              # 공유 타입 (@youtuber/shared)
│   ├── stream-server/       # Express + WebSocket 서버 (Port 3001)
│   └── overlay/             # OBS Browser Source 프론트엔드
├── tests/                   # Vitest 통합 테스트 (루트)
└── archive/                 # 아카이브 (orchestrator, chatbot)
```

### 시스템 흐름

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│ Claude Code │──────│  stream-server   │──────│    OBS      │
│   (Hook)    │      │   (Port 3001)    │      │   Studio    │
└──────┬──────┘      └────────┬─────────┘      └──────┬──────┘
       │                      │                       │
       ▼                      ▼                       ▼
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   GitHub    │──────│   WebSocket      │──────│   Overlay   │
│  Webhooks   │      │   (pub/sub)      │      │  (Browser)  │
└─────────────┘      └──────────────────┘      └─────────────┘
```

### 핵심 파일

| 파일 | 역할 |
|------|------|
| `packages/stream-server/src/index.ts` | Express 서버, API 엔드포인트, 세션 상태 관리 |
| `packages/stream-server/src/websocket.ts` | WebSocketManager - 채널 기반 pub/sub |
| `packages/stream-server/src/github-webhook.ts` | GitHub Webhook 처리 |
| `packages/stream-server/src/obs-controller.ts` | OBS WebSocket 제어 |
| `packages/overlay/src/app.ts` | OBS Browser Source 프론트엔드 |
| `packages/shared/src/types/index.ts` | 모든 공유 타입 정의 |

### WebSocket 채널 구독

클라이언트는 관심 있는 채널만 구독:

```typescript
// 구독/해제
{ type: 'subscribe', channel: 'github' }
{ type: 'unsubscribe', channel: 'github' }

// 채널: github, tdd, session, project, chat
```

서버 브로드캐스트:
- `broadcast(channel, message)`: 특정 채널 구독자에게만
- `broadcastAll(message)`: 모든 클라이언트에게

### 메시지 타입

| 채널 | 메시지 타입 |
|------|------------|
| `github` | `github:commit`, `github:pr`, `github:issue`, `github:ci` |
| `tdd` | `tdd:status` (phase: red/green/refactor/idle) |
| `session` | `session:start`, `session:end`, `session:stats` |
| `project` | `project:switch`, `project:active` |
| `chat` | `chat:message`, `chat:command`, `chat:response` |

## 주요 API 엔드포인트

| 경로 | 메서드 | 용도 |
|------|--------|------|
| `/health` | GET | 서버 상태 (wsClients, obsConnected, session) |
| `/api/session/start` | POST | 세션 시작 |
| `/api/session/end` | POST | 세션 종료 |
| `/api/session/stats` | GET | 현재 세션 통계 |
| `/api/tdd/status` | POST | TDD 상태 업데이트 (Claude Code Hook에서 호출) |
| `/api/project/switch` | POST | 현재 작업 프로젝트 변경 |
| `/api/project/active` | POST | 활성 프로젝트 목록 업데이트 |
| `/api/github/recent-projects` | GET | GitHub API로 최근 활동 프로젝트 조회 |
| `/webhook/github` | POST | GitHub Webhook 수신 |

## 환경 변수

`.env.example` 참고:

```env
PORT=3001
HOST=localhost
OBS_WS_HOST=localhost
OBS_WS_PORT=4455
OBS_WS_PASSWORD=your_password
GITHUB_WEBHOOK_SECRET=secret
GITHUB_USERNAME=garimto81
```

## 오버레이 접근

- 개발: `http://localhost:3001/overlay/`
- OBS Browser Source: Width 1920, Height 1080, FPS 30

## 문제 해결

```powershell
# 포트 충돌 확인
netstat -ano | findstr :3001

# shared 타입 오류 시
pnpm build:shared

# 전체 재설치
rm -rf node_modules && pnpm install && pnpm build
```
