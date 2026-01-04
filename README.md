# AI Coding YouTube 방송 시스템

Claude Code (CLI) 기반 AI 코딩 작업 과정을 YouTube에서 실시간으로 스트리밍하는 시스템입니다.

## 기능

- **실시간 오버레이**: GitHub 활동, TDD 상태, 세션 타이머 표시
- **멀티 프로젝트 지원**: 최대 5개 프로젝트 동시 추적
- **GitHub 연동**: Webhook을 통한 커밋, PR, 이슈, CI 상태 실시간 반영
- **OBS 연동**: WebSocket을 통한 Scene 자동 전환
- **자동화 스크립트**: 방송 시작/종료 원클릭

## 빠른 시작

```powershell
# 의존성 설치
npm install

# 환경 설정
copy .env.example .env
# .env 파일을 편집하여 설정 입력

# 개발 서버 시작
npm run dev

# 오버레이 확인
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

```
youtuber/
├── src/
│   ├── server/           # Express + WebSocket 서버
│   │   ├── index.ts      # 메인 엔트리
│   │   ├── websocket.ts  # WebSocket 관리
│   │   ├── github-webhook.ts
│   │   └── obs-controller.ts
│   ├── overlay/          # OBS Browser Source
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── types/            # TypeScript 타입 정의
├── scripts/              # PowerShell 자동화 스크립트
├── hooks/                # Claude Code Hook
├── tests/                # 테스트
└── docs/                 # 문서 및 PRD
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

```env
PORT=3001
HOST=localhost
OBS_WS_HOST=localhost
OBS_WS_PORT=4455
OBS_WS_PASSWORD=your_password
GITHUB_WEBHOOK_SECRET=your_secret
```

## 기술 스택

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.x
- **Server**: Express 4.x
- **WebSocket**: ws 8.x
- **OBS**: obs-websocket-js 5.x
- **Test**: Vitest

## 라이선스

MIT
