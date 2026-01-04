# Docker 배포 가이드

**버전**: 2.1.0
**작성일**: 2026-01-05

---

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [빠른 시작](#빠른-시작)
3. [빌드 방법](#빌드-방법)
4. [실행 방법](#실행-방법)
5. [환경 변수 설정](#환경-변수-설정)
6. [트러블슈팅](#트러블슈팅)

---

## 사전 요구사항

### 필수 설치

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.0 이상
- [Docker Compose](https://docs.docker.com/compose/install/) v2.0 이상

### 설치 확인

```bash
docker --version
# Docker version 24.0.0 이상

docker-compose --version
# Docker Compose version v2.20.0 이상
```

---

## 빠른 시작

### 1. 환경 변수 설정

`.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일 편집:
```env
PORT=3001
HOST=0.0.0.0
OBS_WS_HOST=host.docker.internal
OBS_WS_PORT=4455
OBS_WS_PASSWORD=your_obs_password
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_USERNAME=garimto81
```

### 2. Docker Compose로 실행

```bash
# 빌드 및 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f stream-server

# 상태 확인
docker-compose ps
```

### 3. 오버레이 접속

브라우저에서 `http://localhost:3001/overlay/` 접속

OBS Studio Browser Source 설정:
- URL: `http://localhost:3001/overlay/`
- Width: 1920
- Height: 1080

---

## 빌드 방법

### Docker Compose 사용 (권장)

```bash
# 이미지 빌드
docker-compose build

# 캐시 없이 빌드
docker-compose build --no-cache

# 빌드 + 시작
docker-compose up -d --build
```

### Docker CLI 사용

```bash
# 이미지 빌드
docker build -t youtuber-stream:latest .

# 특정 태그로 빌드
docker build -t youtuber-stream:2.1.0 .

# 멀티 플랫폼 빌드 (ARM64 + AMD64)
docker buildx build --platform linux/amd64,linux/arm64 -t youtuber-stream:latest .
```

### 빌드 최적화

**레이어 캐싱 활용**:
- `package.json` 변경 없으면 의존성 재설치 스킵
- 소스 코드만 변경 시 빌드 시간 단축

**빌드 시간**:
- 첫 빌드: ~5분
- 캐시 활용 시: ~1분

---

## 실행 방법

### Docker Compose (권장)

```bash
# 백그라운드 실행
docker-compose up -d

# 포그라운드 실행 (로그 출력)
docker-compose up

# 중지
docker-compose down

# 중지 + 볼륨 삭제
docker-compose down -v

# 재시작
docker-compose restart
```

### Docker CLI

```bash
# 컨테이너 실행
docker run -d \
  --name youtuber-stream \
  -p 3001:3001 \
  -e OBS_WS_HOST=host.docker.internal \
  -e OBS_WS_PASSWORD=your_password \
  -e GITHUB_WEBHOOK_SECRET=your_secret \
  youtuber-stream:latest

# 로그 확인
docker logs -f youtuber-stream

# 중지
docker stop youtuber-stream

# 삭제
docker rm youtuber-stream
```

---

## 환경 변수 설정

### 필수 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | 서버 포트 | `3001` |
| `HOST` | 바인딩 호스트 | `0.0.0.0` |
| `OBS_WS_PASSWORD` | OBS WebSocket 비밀번호 | *필수* |
| `GITHUB_WEBHOOK_SECRET` | GitHub Webhook 비밀키 | *필수* |

### 선택 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `OBS_WS_HOST` | OBS WebSocket 호스트 | `host.docker.internal` |
| `OBS_WS_PORT` | OBS WebSocket 포트 | `4455` |
| `GITHUB_USERNAME` | GitHub 사용자명 | `garimto81` |
| `YOUTUBE_API_KEY` | YouTube API 키 | - |
| `YOUTUBE_CHANNEL_ID` | YouTube 채널 ID | - |

### Docker Compose에서 환경 변수 사용

**방법 1**: `.env` 파일 (권장)
```env
OBS_WS_PASSWORD=my_secret_password
GITHUB_WEBHOOK_SECRET=my_webhook_secret
```

**방법 2**: `docker-compose.yml`에 직접 지정
```yaml
environment:
  - OBS_WS_PASSWORD=my_secret_password
```

**방법 3**: 환경 변수 파일 분리
```bash
docker-compose --env-file .env.production up -d
```

---

## 헬스체크

### 엔드포인트

```bash
curl http://localhost:3001/health
```

**응답 예시**:
```json
{
  "status": "ok",
  "wsClients": 2,
  "obsConnected": true,
  "session": {
    "running": true
  }
}
```

### Docker 헬스체크

```bash
# 컨테이너 상태 확인
docker-compose ps

# 헬스체크 로그 확인
docker inspect --format='{{json .State.Health}}' youtuber-stream | jq
```

---

## 로그 관리

### 로그 확인

```bash
# 실시간 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f stream-server

# 최근 100줄
docker-compose logs --tail=100
```

### 로그 로테이션 설정

`docker-compose.yml`에 추가:
```yaml
services:
  stream-server:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 볼륨 관리

### 개발 시 소스 동기화

`docker-compose.yml` 수정:
```yaml
volumes:
  - ./packages/overlay/dist:/app/packages/overlay/dist:ro
  - ./packages/overlay/public:/app/packages/overlay/public:ro
```

재시작:
```bash
docker-compose down
docker-compose up -d
```

---

## 트러블슈팅

### 문제 1: OBS WebSocket 연결 실패

**증상**:
```
[OBS] Connection failed: OBSWebSocketError
```

**해결**:
1. OBS Studio가 실행 중인지 확인
2. OBS WebSocket 플러그인 설치 확인
3. `OBS_WS_HOST` 설정 확인:
   - Windows/Mac: `host.docker.internal`
   - Linux: `172.17.0.1` (Docker bridge IP)

### 문제 2: 포트 이미 사용 중

**증상**:
```
Error: bind: address already in use
```

**해결**:
```bash
# 포트 사용 프로세스 확인
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Mac/Linux

# 다른 포트 사용
PORT=3002 docker-compose up -d
```

### 문제 3: 빌드 실패 (pnpm 오류)

**증상**:
```
ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY
```

**해결**:
```bash
# pnpm-lock.yaml 재생성
pnpm install
git add pnpm-lock.yaml
git commit -m "fix: update pnpm lockfile"

# Docker 빌드 재시도
docker-compose build --no-cache
```

### 문제 4: 헬스체크 실패

**증상**:
```
Status: unhealthy
```

**해결**:
```bash
# 컨테이너 로그 확인
docker-compose logs stream-server

# 수동 헬스체크
docker exec youtuber-stream wget --quiet --tries=1 --spider http://localhost:3001/health
echo $?  # 0이면 정상
```

---

## 프로덕션 배포

### 이미지 레지스트리 푸시

#### Docker Hub
```bash
# 로그인
docker login

# 태그
docker tag youtuber-stream:latest username/youtuber-stream:2.1.0

# 푸시
docker push username/youtuber-stream:2.1.0
```

#### GitHub Container Registry (GHCR)
```bash
# 로그인
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 태그
docker tag youtuber-stream:latest ghcr.io/garimto81/youtuber-stream:2.1.0

# 푸시
docker push ghcr.io/garimto81/youtuber-stream:2.1.0
```

### 프로덕션 환경 실행

```bash
# 프로덕션 compose 파일 사용
docker-compose -f docker-compose.prod.yml up -d

# 또는 이미지 직접 지정
docker run -d \
  --name youtuber-stream \
  --restart always \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e OBS_WS_PASSWORD=${OBS_WS_PASSWORD} \
  ghcr.io/garimto81/youtuber-stream:2.1.0
```

---

## 모니터링

### Docker Stats

```bash
# 실시간 리소스 사용량
docker stats youtuber-stream
```

### Prometheus 메트릭 (선택)

```bash
# /metrics 엔드포인트 추가 필요
curl http://localhost:3001/metrics
```

---

## 참고 자료

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

---

**다음 단계**: [빌드 최적화 가이드](./BUILD_OPTIMIZATION.md)
