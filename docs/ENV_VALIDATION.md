# 환경 변수 검증 가이드

**버전**: 2.1.0
**작성일**: 2026-01-05
**검증 도구**: zod

---

## 📋 목차

1. [개요](#개요)
2. [검증 스키마](#검증-스키마)
3. [사용 방법](#사용-방법)
4. [오류 처리](#오류-처리)
5. [베스트 프랙티스](#베스트-프랙티스)

---

## 개요

### 왜 환경 변수 검증이 필요한가?

환경 변수는 런타임에 주입되므로 타입 안전성이 보장되지 않습니다. 잘못된 설정으로 인한 런타임 오류를 방지하기 위해 **zod 스키마 검증**을 도입했습니다.

### 장점

| 장점 | 설명 |
|------|------|
| **타입 안전성** | TypeScript 타입 추론 지원 |
| **조기 오류 발견** | 서버 시작 시점에 검증 |
| **명확한 오류 메시지** | 어떤 환경 변수가 잘못되었는지 명확히 표시 |
| **기본값 지원** | 선택적 환경 변수에 기본값 자동 적용 |
| **변환 지원** | 문자열 → 숫자 자동 변환 |

---

## 검증 스키마

### `config.ts` 구조

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Node 환경
  NODE_ENV: z.enum(['development', 'production', 'test'])
    .default('development'),

  // 서버 설정
  PORT: z.string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .default('3001'),

  HOST: z.string().default('0.0.0.0'),

  // OBS WebSocket (필수)
  OBS_WS_PASSWORD: z.string()
    .min(1, 'OBS WebSocket 비밀번호는 필수입니다'),

  // GitHub (필수)
  GITHUB_WEBHOOK_SECRET: z.string()
    .min(1, 'GitHub Webhook 비밀키는 필수입니다'),

  // YouTube (선택)
  YOUTUBE_API_KEY: z.string().optional(),
});

export const config = envSchema.parse(process.env);
```

---

## 사용 방법

### 1. 환경 변수 import

```typescript
import { config } from './config.js';

// 타입 안전하게 사용
app.listen(config.PORT, config.HOST, () => {
  console.log(`Server running on ${config.HOST}:${config.PORT}`);
});
```

### 2. 환경별 유틸리티

```typescript
import { isProduction, isDevelopment, getServerUrl } from './config.js';

if (isProduction) {
  // 프로덕션 전용 로직
  console.log('Running in production mode');
}

const serverUrl = getServerUrl();
// http://localhost:3001 (개발)
// https://api.example.com:3001 (프로덕션)
```

### 3. 타입 안전성

```typescript
// ✅ TypeScript가 타입을 추론
const port: number = config.PORT;  // OK
const host: string = config.HOST;  // OK

// ❌ 타입 오류 방지
const invalid: string = config.PORT;  // Error: Type 'number' is not assignable to type 'string'
```

---

## 오류 처리

### 검증 실패 시 출력 예시

```bash
❌ 환경 변수 검증 실패:
  - OBS_WS_PASSWORD: Required
  - PORT: Number must be less than or equal to 65535
  - GITHUB_WEBHOOK_SECRET: String must contain at least 1 character(s)

💡 .env 파일을 확인하거나 .env.example을 참고하세요.
```

**동작**: 검증 실패 시 서버가 시작되지 않고 `process.exit(1)`로 종료됩니다.

### 일반적인 오류

| 오류 메시지 | 원인 | 해결 방법 |
|------------|------|-----------|
| `Required` | 필수 환경 변수 누락 | `.env`에 해당 변수 추가 |
| `Expected number, received string` | 숫자 변환 실패 | 유효한 숫자 값 입력 |
| `Invalid enum value` | 허용되지 않는 값 | `NODE_ENV`를 `development`, `production`, `test` 중 하나로 설정 |
| `String must contain at least 1 character(s)` | 빈 문자열 | 유효한 값 입력 |

---

## 검증 규칙

### 필수 환경 변수

| 변수 | 타입 | 검증 규칙 |
|------|------|-----------|
| `OBS_WS_PASSWORD` | string | 최소 1자 이상 |
| `GITHUB_WEBHOOK_SECRET` | string | 최소 1자 이상 |

### 선택적 환경 변수

| 변수 | 타입 | 기본값 |
|------|------|--------|
| `NODE_ENV` | enum | `'development'` |
| `PORT` | number | `3001` |
| `HOST` | string | `'0.0.0.0'` |
| `OBS_WS_HOST` | string | `'localhost'` |
| `OBS_WS_PORT` | number | `4455` |
| `GITHUB_USERNAME` | string | `'garimto81'` |
| `YOUTUBE_API_KEY` | string | `undefined` |
| `YOUTUBE_CHANNEL_ID` | string | `undefined` |

### 변환 규칙

```typescript
// PORT: 문자열 → 숫자 자동 변환
PORT=3001 → config.PORT === 3001 (number)

// OBS_WS_PORT: 문자열 → 숫자 자동 변환
OBS_WS_PORT=4455 → config.OBS_WS_PORT === 4455 (number)
```

---

## 베스트 프랙티스

### 1. .env 파일 관리

```bash
# .env (로컬 개발)
NODE_ENV=development
OBS_WS_PASSWORD=my_local_password
GITHUB_WEBHOOK_SECRET=dev_secret_123

# .env.production (프로덕션)
NODE_ENV=production
OBS_WS_PASSWORD=${{ secrets.OBS_PASSWORD }}
GITHUB_WEBHOOK_SECRET=${{ secrets.WEBHOOK_SECRET }}
```

### 2. Docker 환경에서

**docker-compose.yml**:
```yaml
environment:
  - NODE_ENV=production
  - OBS_WS_PASSWORD=${OBS_WS_PASSWORD}
  - GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}
```

**실행**:
```bash
# .env 파일 자동 로드
docker-compose up -d

# 또는 명시적으로 지정
docker-compose --env-file .env.production up -d
```

### 3. CI/CD 환경에서

**GitHub Actions**:
```yaml
- name: Build and test
  env:
    NODE_ENV: test
    OBS_WS_PASSWORD: ${{ secrets.OBS_PASSWORD }}
    GITHUB_WEBHOOK_SECRET: ${{ secrets.WEBHOOK_SECRET }}
  run: |
    pnpm build
    pnpm test
```

### 4. 환경 변수 추가 시

1. **스키마 업데이트** (`config.ts`):
   ```typescript
   const envSchema = z.object({
     // 기존 스키마...
     NEW_VARIABLE: z.string().default('default_value'),
   });
   ```

2. **타입 자동 추론**:
   ```typescript
   config.NEW_VARIABLE  // TypeScript가 자동으로 타입 추론
   ```

3. **.env.example 업데이트**:
   ```bash
   # 새 환경 변수
   NEW_VARIABLE=example_value
   ```

### 5. 보안 고려사항

```typescript
// ❌ 절대 로그에 출력하지 마세요
console.log(config.OBS_WS_PASSWORD);  // 위험!
console.log(config.GITHUB_WEBHOOK_SECRET);  // 위험!

// ✅ 안전한 로깅
console.log('OBS password configured:', !!config.OBS_WS_PASSWORD);
console.log('Webhook secret configured:', !!config.GITHUB_WEBHOOK_SECRET);
```

---

## 테스트

### 단위 테스트에서

```typescript
// tests/config.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('Config', () => {
  beforeEach(() => {
    // 환경 변수 모킹
    process.env.OBS_WS_PASSWORD = 'test_password';
    process.env.GITHUB_WEBHOOK_SECRET = 'test_secret';
  });

  it('should parse environment variables', () => {
    // config.ts를 동적으로 재로드
    const { config } = await import('./config.js');

    expect(config.PORT).toBe(3001);
    expect(config.OBS_WS_PASSWORD).toBe('test_password');
  });
});
```

---

## 문제 해결

### 문제 1: 서버가 시작되지 않음

**증상**:
```
❌ 환경 변수 검증 실패:
  - OBS_WS_PASSWORD: Required
```

**해결**:
```bash
# .env 파일 확인
cat .env

# 없으면 생성
cp .env.example .env
# .env 파일 편집
```

### 문제 2: Docker 컨테이너에서 환경 변수 인식 안 됨

**증상**:
```
Error: Required environment variable missing
```

**해결**:
```yaml
# docker-compose.yml
environment:
  - OBS_WS_PASSWORD=${OBS_WS_PASSWORD}  # .env 파일에서 로드
```

### 문제 3: 타입 오류

**증상**:
```typescript
config.PORT.toFixed(2);  // Error: Property 'toFixed' does not exist
```

**원인**: PORT는 이미 number 타입으로 변환됨

**해결**:
```typescript
// ✅ 올바른 사용
config.PORT.toString();
```

---

## 참고 자료

- [zod Documentation](https://github.com/colinhacks/zod)
- [Environment Variables Best Practices](https://12factor.net/config)
- [TypeScript Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)

---

**다음 단계**: [모니터링 설정](./MONITORING.md)
