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

### 제목 설정

```bash
# 제목 및 목표 금액 설정
curl -X POST https://your-app.up.railway.app/api/overlay/config \
  -H "Content-Type: application/json" \
  -d '{"title": "오늘의 코딩", "goalAmount": 10000000000}'

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
