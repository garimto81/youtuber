# Monorepo 전환 완료 - 작업 지시사항

## 현재 구조

```
D:\AI\claude01\youtuber\
├── packages/
│   ├── shared/           # [완료] 공유 타입 - 관리자 담당
│   ├── orchestrator/     # [완료] 중앙 제어 - 관리자 담당
│   ├── stream-server/    # [TODO] 오버레이 서버 - 터미널 A
│   ├── overlay/          # [TODO] 오버레이 프론트엔드 - 터미널 A
│   └── chat-bot/         # [TODO] 채팅 봇 - 터미널 B
├── src/                  # 기존 코드 (마이그레이션 필요)
├── pnpm-workspace.yaml   # 워크스페이스 설정
└── tsconfig.base.json    # 공유 TS 설정
```

---

## 터미널 A 지시사항 (오버레이 시스템)

### 1단계: 패키지 구조 생성
```powershell
# 디렉토리 생성
mkdir -p packages/stream-server/src
mkdir -p packages/overlay/src

# package.json 생성 필요:
# - packages/stream-server/package.json
# - packages/overlay/package.json
```

### 2단계: 기존 코드 이동
| 원본 | 대상 |
|------|------|
| `src/server/*` | `packages/stream-server/src/` |
| `src/overlay/*` | `packages/overlay/src/` |

### 3단계: 타입 import 변경
```typescript
// 변경 전
import type { MessageType } from '../types/index.js';

// 변경 후
import type { MessageType } from '@youtuber/shared';
```

### 4단계: package.json 예시
```json
{
  "name": "@youtuber/stream-server",
  "version": "1.0.0",
  "dependencies": {
    "@youtuber/shared": "workspace:*",
    "express": "^4.21.0",
    "ws": "^8.18.0",
    "obs-websocket-js": "^5.0.6"
  }
}
```

### 5단계: WebSocket 채널 확장
`chat` 채널을 WebSocketManager에 추가:
```typescript
const DEFAULT_CHANNELS: SubscriptionChannel[] = [
  'github', 'tdd', 'session', 'project', 'chat'  // chat 추가
];
```

---

## 터미널 B 지시사항 (채팅 봇)

### 1단계: 패키지 생성
```powershell
mkdir -p packages/chat-bot/src
```

### 2단계: package.json 생성
```json
{
  "name": "@youtuber/chat-bot",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@youtuber/shared": "workspace:*",
    "googleapis": "^131.0.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "tsx": "^4.15.6",
    "typescript": "^5.5.0"
  }
}
```

### 3단계: 핵심 파일 구조
```
packages/chat-bot/
├── src/
│   ├── index.ts              # 메인 진입점
│   ├── youtube-client.ts     # YouTube API 클라이언트
│   ├── chat-poller.ts        # 채팅 폴링
│   ├── chat-sender.ts        # 채팅 전송
│   ├── command-handler.ts    # 명령어 처리 (!help 등)
│   └── stream-connector.ts   # stream-server WebSocket 연결
├── package.json
└── tsconfig.json
```

### 4단계: stream-server 연결
```typescript
import { WebSocket } from 'ws';
import type { ChatMessage, ServerMessage } from '@youtuber/shared';

class StreamConnector {
  private ws: WebSocket;

  connect(): void {
    this.ws = new WebSocket('ws://localhost:3001');

    this.ws.on('open', () => {
      // 채널 구독
      this.ws.send(JSON.stringify({ type: 'subscribe', channel: 'chat' }));
      this.ws.send(JSON.stringify({ type: 'subscribe', channel: 'session' }));
    });
  }

  // 채팅 메시지를 오버레이로 전달
  sendChatMessage(message: ChatMessage): void {
    const serverMsg: ServerMessage<ChatMessage> = {
      type: 'chat:message',
      payload: message,
      timestamp: new Date().toISOString(),
    };
    this.ws.send(JSON.stringify(serverMsg));
  }
}
```

### 5단계: 사용 가능한 타입
```typescript
// @youtuber/shared에서 import
import type {
  ChatMessage,
  ChatCommand,
  ChatResponse,
  SubscriptionChannel,  // 'chat' 포함
  MessageType,          // 'chat:message' | 'chat:command' | 'chat:response' 포함
} from '@youtuber/shared';
```

---

## 공통 명령어

```powershell
# 의존성 설치
pnpm install

# 특정 패키지 개발
pnpm --filter @youtuber/stream-server dev
pnpm --filter @youtuber/chat-bot dev

# 전체 빌드
pnpm build

# 특정 패키지 빌드
pnpm --filter @youtuber/shared build
```

---

## 포트 할당

| 서비스 | 포트 |
|--------|------|
| Orchestrator | 3000 |
| Stream Server | 3001 |
| Chat Bot | 3002 |

---

## 통신 규약

### WebSocket 채널
| 채널 | 발신자 | 수신자 | 메시지 타입 |
|------|--------|--------|-------------|
| `chat` | chat-bot | overlay | `chat:message` |
| `session` | stream-server | all | `session:start/end` |

### 새 메시지 타입
- `chat:message` - 채팅 메시지
- `chat:command` - 명령어 (예: !help)
- `chat:response` - 봇 응답
