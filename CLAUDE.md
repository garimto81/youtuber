# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

AI Coding YouTube 방송용 OBS 오버레이 시스템 - Claude Code (CLI) 기반 AI 코딩 작업을 YouTube에서 실시간 스트리밍하는 오버레이입니다.

**Monorepo 구조**: pnpm workspace 기반 (overlay + stream-server + shared)

**기술 스택**: Node.js 20+, TypeScript 5.x, Express 4.x, WebSocket (ws 8.x), obs-websocket-js 5.x, Vitest

## 빌드/테스트 명령

### 전체 워크스페이스

```powershell
pnpm install             # 모든 패키지 의존성 설치
pnpm build               # 전체 빌드 (모든 패키지)
pnpm dev                 # 모든 패키지 개발 모드 (병렬 실행)
pnpm start               # stream-server 시작
```

### 개별 패키지 작업

```powershell
pnpm dev:server          # stream-server 개발 모드 (tsx watch)
pnpm dev:overlay         # overlay 개발 모드 (tsc --watch)
pnpm build:server        # stream-server만 빌드
pnpm build:overlay       # overlay만 빌드
pnpm build:shared        # shared 패키지만 빌드 (다른 패키지가 의존)
```

### 개발 워크플로우

```powershell
# 1. shared 패키지 수정 시
pnpm --filter @youtuber/shared build  # shared를 먼저 빌드

# 2. stream-server나 overlay에서 자동으로 최신 타입 사용
pnpm dev

# 3. 특정 패키지만 개발
pnpm --filter @youtuber/stream-server dev
```

### 테스트/린트

```powershell
pnpm test                # Vitest 실행 (루트의 tests/ 폴더)
pnpm test:watch          # Vitest 감시 모드
pnpm lint                # ESLint 검사 (src/ 폴더)
pnpm lint:fix            # ESLint 자동 수정
```

**중요**:
- 테스트는 `http://localhost:3001`에 서버가 실행 중이어야 통과합니다
- shared 패키지 수정 후 다른 패키지에서 사용하려면 반드시 `pnpm build:shared` 실행 필요

## 아키텍처

### 패키지 구조

```
youtuber/
├── packages/
│   ├── shared/              # 공유 타입 및 유틸리티 (@youtuber/shared)
│   ├── stream-server/       # 메인 서버 및 WebSocket (@youtuber/stream-server, Port 3001)
│   └── overlay/             # OBS Browser Source (@youtuber/overlay)
├── archive/                 # 아카이브 (orchestrator, chatbot)
├── tasks/                   # PRD, 작업 문서
└── docs/                    # 문서 및 목업
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

### 핵심 컴포넌트

| 파일 | 역할 |
|------|------|
| `packages/stream-server/src/index.ts` | Express + WebSocket 메인 서버 |
| `packages/stream-server/src/websocket.ts` | WebSocketManager - 채널 구독 기반 pub/sub |
| `packages/stream-server/src/github-webhook.ts` | GitHub Webhook 처리 |
| `packages/stream-server/src/obs-controller.ts` | OBS WebSocket 제어 |
| `packages/overlay/src/app.ts` | OBS Browser Source용 프론트엔드 |
| `packages/shared/src/types/index.ts` | 공유 TypeScript 타입 정의 |

### WebSocket 통신

**구조**: 채널 기반 pub/sub 패턴 (WebSocketManager 클래스)

| 채널 | 메시지 타입 | 설명 |
|------|------------|------|
| `github` | `github:commit`, `github:pr`, `github:issue`, `github:ci` | GitHub 이벤트 |
| `tdd` | `tdd:status` | TDD 상태 (red/green/refactor) |
| `session` | `session:start`, `session:end`, `session:stats` | 세션 관리 |
| `project` | `project:switch`, `project:active` | 프로젝트 전환 |
| `chat` | `chat:message`, `chat:command`, `chat:response` | 채팅 메시지 |

**클라이언트 구독 방식**:
```typescript
// 클라이언트는 관심 있는 채널을 구독
{ type: 'subscribe', channel: 'github' }
{ type: 'unsubscribe', channel: 'github' }
```

**서버 브로드캐스트**:
- `broadcast(channel, message)`: 특정 채널 구독자에게만 전송
- `broadcastAll(message)`: 모든 클라이언트에게 전송

## 주요 API 엔드포인트

| 경로 | 메서드 | 용도 |
|------|--------|------|
| `/health` | GET | 서버 상태 |
| `/api/session/start` | POST | 세션 시작 |
| `/api/session/end` | POST | 세션 종료 |
| `/api/session/stats` | GET | 현재 세션 통계 |
| `/api/tdd/status` | POST | TDD 상태 업데이트 |
| `/api/project/switch` | POST | 현재 작업 프로젝트 변경 |
| `/webhook/github` | POST | GitHub Webhook 수신 |

## 환경 변수

프로젝트 루트에 `.env` 파일 생성 (`.env.example` 참고):

```env
PORT=3001                      # 서버 포트
HOST=localhost                 # 서버 호스트
OBS_WS_HOST=localhost          # OBS WebSocket 호스트
OBS_WS_PORT=4455               # OBS WebSocket 포트
OBS_WS_PASSWORD=your_password  # OBS WebSocket 비밀번호
GITHUB_WEBHOOK_SECRET=secret   # GitHub Webhook 비밀키
GITHUB_USERNAME=garimto81      # GitHub 사용자명
```

## 오버레이 접근

개발 서버 실행 후: `http://localhost:3001/overlay/`

OBS Browser Source 설정:
- URL: `http://localhost:3001/overlay/`
- Width: 1920, Height: 1080
- FPS: 30

## 문제 해결

### 서비스가 시작되지 않을 때

```powershell
# 1. 포트 충돌 확인
netstat -ano | findstr :3001

# 2. 빌드 재실행
pnpm build
```

### TypeScript 타입 오류

```powershell
# shared 패키지 먼저 재빌드
pnpm build:shared

# 전체 재설치 (최후의 수단)
rm -rf node_modules
pnpm install
pnpm build
```

## TypeScript 설정

### Monorepo 패키지 의존성

```
@youtuber/stream-server  →  @youtuber/shared
@youtuber/overlay        →  @youtuber/shared
```

**중요**: shared 패키지는 타입 정의만 제공하므로 변경 시 반드시 빌드 필요

### 공유 타입 사용

```typescript
// stream-server나 overlay에서 shared 타입 import
import type { ServerMessage, CommitPayload } from '@youtuber/shared';
```

## 중요 문서

- `docs/PRD-0001-stream-system.md` - 스트림 시스템 PRD (v5 레이아웃)
- `README.md` - 프로젝트 소개 및 빠른 시작 가이드
- `packages/shared/src/types/index.ts` - 모든 타입 정의의 중심
