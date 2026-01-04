# AI Coding YouTube 방송 시스템

Claude Code (CLI) 기반 AI 코딩 작업 과정을 YouTube에서 실시간으로 스트리밍하는 시스템입니다.

**아키텍처**: pnpm workspace 기반 Monorepo (shared, stream-server, overlay)

## 기능

- **실시간 오버레이**: GitHub 활동, TDD 상태, 세션 타이머 표시
- **멀티 프로젝트 지원**: 최대 5개 프로젝트 동시 추적
- **GitHub 연동**: Webhook을 통한 커밋, PR, 이슈, CI 상태 실시간 반영
- **OBS 연동**: WebSocket을 통한 Scene 자동 전환
- **자동화 스크립트**: 방송 시작/종료 원클릭
- **타입 안전성**: TypeScript + 공유 타입 패키지

## 빠른 시작

### 방법 1: Docker (권장)

```bash
# 1. 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 OBS 설정 등 입력

# 2. Docker Compose로 실행
docker-compose up -d

# 3. 오버레이 확인
# http://localhost:3001/overlay/
```

**Docker 상세 가이드**: [docs/DOCKER_GUIDE.md](docs/DOCKER_GUIDE.md)

### 방법 2: 로컬 개발

```powershell
# 1. 의존성 설치 (pnpm workspace)
pnpm install

# 2. 환경 설정
copy .env.example .env
# .env 파일을 편집하여 OBS 설정 등 입력

# 3. 전체 빌드
pnpm build

# 4. 개발 서버 시작 (모든 패키지 watch 모드)
pnpm dev

# 또는 서버만 시작
pnpm dev:server

# 5. 오버레이 확인
# http://localhost:3001/overlay/
```

## 방송 시작

```powershell
# OBS 설정 가이드 확인
.\scripts\setup-obs.ps1

# 방송 시작
.\scripts\start-stream.ps1

# 방송 종료
.\scripts\stop-stream.ps1
```

## 프로젝트 구조

### Monorepo 패키지

```
youtuber/
├── packages/
│   ├── shared/                    # 공유 타입 및 유틸리티 (@youtuber/shared)
│   │   ├── src/types/index.ts    # 모든 타입 정의
│   │   └── package.json
│   ├── stream-server/             # 메인 서버 (@youtuber/stream-server)
│   │   ├── src/
│   │   │   ├── index.ts          # Express 서버 엔트리
│   │   │   ├── websocket.ts      # WebSocket Manager (pub/sub)
│   │   │   ├── github-webhook.ts # GitHub Webhook 처리
│   │   │   └── obs-controller.ts # OBS WebSocket 제어
│   │   └── package.json
│   └── overlay/                   # OBS Browser Source (@youtuber/overlay)
│       ├── src/app.ts            # 오버레이 프론트엔드
│       ├── index.html
│       └── package.json
├── scripts/                       # PowerShell 자동화 스크립트
├── tests/                         # Vitest 테스트
├── docs/                          # PRD 및 문서
└── pnpm-workspace.yaml           # pnpm workspace 설정
```

### 패키지 의존성

```
stream-server  →  shared (타입 사용)
overlay        →  shared (타입 사용)
```

## 레이아웃 (1920x1080)

```
┌──────────────────────────────────────────────┬────────────────────┐
│                                              │     얼굴 캠        │
│                                              │   (320 x 180)     │
│    [화면 캡처 영역 - OBS Window Capture]       ├────────────────────┤
│         (1600 x 900)                         │   Active Projects  │
│                                              │   (320 x 900)      │
├──────────────────────────────────────────────┤                    │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ...  │                    │
│ │ 프로젝트1 │ │ 프로젝트2 │ │ 프로젝트3 │      │                    │
│ │  활동    │ │  활동    │ │  활동    │      │                    │
│ └──────────┘ └──────────┘ └──────────┘      │                    │
│    멀티 프로젝트 활동 카드 (1600 x 180)        │                    │
└──────────────────────────────────────────────┴────────────────────┘
```

## API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/health` | GET | 서버 상태 확인 |
| `/api/session/start` | POST | 세션 시작 |
| `/api/session/end` | POST | 세션 종료 |
| `/api/session/stats` | GET | 세션 통계 |
| `/api/tdd/status` | POST | TDD 상태 업데이트 |
| `/api/project/switch` | POST | 현재 프로젝트 전환 |
| `/api/project/active` | POST | 활성 프로젝트 목록 |
| `/api/obs/scene` | POST | OBS Scene 전환 |
| `/api/obs/status` | GET | OBS 상태 확인 |
| `/webhook/github` | POST | GitHub Webhook |

## 환경 변수

프로젝트 루트에 `.env` 파일 생성 (`.env.example` 참고):

```env
# 서버 설정
PORT=3001
HOST=localhost

# OBS WebSocket
OBS_WS_HOST=localhost
OBS_WS_PORT=4455
OBS_WS_PASSWORD=your_password

# GitHub 연동
GITHUB_WEBHOOK_SECRET=your_secret
GITHUB_USERNAME=garimto81

# YouTube (선택 사항)
YOUTUBE_API_KEY=your_api_key
YOUTUBE_CHANNEL_ID=your_channel_id
```

## 기술 스택

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.x
- **Package Manager**: pnpm (workspace)
- **Server**: Express 4.x
- **WebSocket**: ws 8.x
- **OBS**: obs-websocket-js 5.x
- **Test**: Vitest
- **Build**: tsc (TypeScript Compiler)
- **Container**: Docker + Docker Compose
- **Security**: Helmet.js, express-rate-limit

## 개발

### 개별 패키지 빌드

```powershell
# shared 타입만 빌드 (다른 패키지에서 사용)
pnpm build:shared

# 서버만 빌드
pnpm build:server

# 오버레이만 빌드
pnpm build:overlay
```

### 테스트

```powershell
# 테스트 실행 (서버가 localhost:3001에서 실행 중이어야 함)
pnpm test

# Watch 모드
pnpm test:watch
```

### Lint

```powershell
# ESLint 검사
pnpm lint

# 자동 수정
pnpm lint:fix
```

## 문서

- `CLAUDE.md` - Claude Code를 위한 개발 가이드
- `docs/DOCKER_GUIDE.md` - Docker 배포 가이드
- `docs/DEPLOYMENT_IMPROVEMENT_PROPOSAL.md` - 배포 개선 제안서
- `docs/PRD-0001-stream-system.md` - 스트림 시스템 PRD (v5 레이아웃)
- `packages/shared/src/types/index.ts` - 전체 타입 정의

## 라이선스

MIT
