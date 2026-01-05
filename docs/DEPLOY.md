# Railway 배포 가이드

## 1. Railway 프로젝트 생성

1. [Railway](https://railway.app) 접속 및 로그인
2. **New Project** 클릭
3. **Deploy from GitHub repo** 선택
4. `garimto81/youtuber` 저장소 선택

## 2. 배포 설정

Railway가 자동으로 `railway.toml`을 감지합니다.

### 환경 변수 (선택)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 3001 | Railway가 자동 설정 |
| `HOST` | 0.0.0.0 | 외부 접근용 |
| `OBS_WS_PASSWORD` | - | OBS 연동 시 필요 |
| `GITHUB_WEBHOOK_SECRET` | - | Webhook 검증용 |

## 3. 배포 완료 후

배포 URL 예시: `https://youtuber-production-xxxx.up.railway.app`

### 배포 버전 확인

오버레이 상단 제목에 자동으로 **버전**과 **커밋 해시**가 표시됩니다:

```
AI Coding v2.1.0 (4ec3610)
           ↑        ↑
         버전    커밋해시
```

API로 확인:
```bash
curl https://your-app.up.railway.app/api/overlay/config
# {"title":"AI Coding v2.1.0 (4ec3610)","goalAmount":...}
```

### 테스트

```bash
# Health 체크
curl https://your-app.up.railway.app/health

# Overlay 접근
https://your-app.up.railway.app/overlay/
```

## 4. GitHub Webhook 설정 (선택)

1. GitHub 저장소 Settings > Webhooks
2. Add webhook
3. Payload URL: `https://your-app.up.railway.app/webhook/github`
4. Content type: `application/json`
5. Events: Push, Pull requests, Issues

## 5. 오버레이 설정 API

### 기본 제목

배포 시 기본 제목은 자동으로 설정됩니다:
- 형식: `AI Coding v{version} ({commit_hash})`
- 버전: `package.json`에서 읽음
- 커밋 해시: Railway의 `RAILWAY_GIT_COMMIT_SHA` 환경 변수 사용

### 제목 커스터마이징

```bash
# 제목 및 목표 금액 설정 (선택사항)
curl -X POST https://your-app.up.railway.app/api/overlay/config \
  -H "Content-Type: application/json" \
  -d '{"title": "커스텀 제목", "goalAmount": 10000000000}'

# 현재 설정 조회
curl https://your-app.up.railway.app/api/overlay/config
```

### 금액 업데이트

```bash
curl -X POST https://your-app.up.railway.app/api/overlay/amount \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000000}'
```

WebSocket `overlay:config` 및 `overlay:amount` 메시지로 실시간 반영됩니다.

## 6. 커스텀 도메인 (선택)

Railway Dashboard > Settings > Domains에서 커스텀 도메인 설정 가능
