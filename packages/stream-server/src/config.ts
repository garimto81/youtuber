import { z } from 'zod';
import dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

/**
 * 환경 변수 검증 스키마
 *
 * 런타임에 환경 변수를 검증하여 타입 안전성을 보장합니다.
 * 잘못된 설정으로 인한 런타임 오류를 사전에 방지합니다.
 */
const envSchema = z.object({
  // Node 환경
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('실행 환경'),

  // 서버 설정
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .default('3001')
    .describe('서버 포트 (1-65535)'),

  HOST: z
    .string()
    .default('0.0.0.0')
    .describe('바인딩 호스트'),

  // OBS WebSocket 설정
  OBS_WS_HOST: z
    .string()
    .default('localhost')
    .describe('OBS WebSocket 호스트'),

  OBS_WS_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .default('4455')
    .describe('OBS WebSocket 포트'),

  OBS_WS_PASSWORD: z
    .string()
    .min(1, 'OBS WebSocket 비밀번호는 필수입니다')
    .describe('OBS WebSocket 비밀번호'),

  // GitHub 설정
  GITHUB_WEBHOOK_SECRET: z
    .string()
    .min(1, 'GitHub Webhook 비밀키는 필수입니다')
    .describe('GitHub Webhook 검증용 비밀키'),

  GITHUB_USERNAME: z
    .string()
    .default('garimto81')
    .describe('GitHub 사용자명'),

  // YouTube 설정 (선택사항)
  YOUTUBE_API_KEY: z
    .string()
    .optional()
    .describe('YouTube Data API v3 키'),

  YOUTUBE_CHANNEL_ID: z
    .string()
    .optional()
    .describe('YouTube 채널 ID'),
});

/**
 * 환경 변수 파싱 및 검증
 *
 * @throws {ZodError} 환경 변수가 유효하지 않은 경우
 */
function parseEnv() {
  try {
    return envSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HOST: process.env.HOST,
      OBS_WS_HOST: process.env.OBS_WS_HOST,
      OBS_WS_PORT: process.env.OBS_WS_PORT,
      OBS_WS_PASSWORD: process.env.OBS_WS_PASSWORD,
      GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
      GITHUB_USERNAME: process.env.GITHUB_USERNAME,
      YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
      YOUTUBE_CHANNEL_ID: process.env.YOUTUBE_CHANNEL_ID,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ 환경 변수 검증 실패:');
      if (error.errors && Array.isArray(error.errors)) {
        error.errors.forEach((err) => {
          const field = err.path.join('.');
          const message = err.message;
          console.error(`  - ${field}: ${message}`);
        });
      }
      console.error('\n💡 .env 파일을 확인하거나 .env.example을 참고하세요.');

      // 테스트 환경에서는 에러를 throw하고, 프로덕션에서는 process.exit
      if (process.env.NODE_ENV === 'test') {
        throw error;
      }
      process.exit(1);
    }
    throw error;
  }
}

/**
 * 검증된 환경 변수 설정
 *
 * 타입 안전성이 보장된 환경 변수를 내보냅니다.
 *
 * @example
 * import { config } from './config.js';
 *
 * app.listen(config.PORT, config.HOST, () => {
 *   console.log(`Server running on ${config.HOST}:${config.PORT}`);
 * });
 */
export const config = parseEnv();

/**
 * 환경 변수 타입
 */
export type Config = z.infer<typeof envSchema>;

/**
 * 환경 변수 검증 여부 확인
 *
 * @returns true if production environment
 */
export const isProduction = config.NODE_ENV === 'production';

/**
 * 환경 변수 검증 여부 확인
 *
 * @returns true if development environment
 */
export const isDevelopment = config.NODE_ENV === 'development';

/**
 * 환경 변수 검증 여부 확인
 *
 * @returns true if test environment
 */
export const isTest = config.NODE_ENV === 'test';

/**
 * 서버 URL 생성
 *
 * @returns 서버 전체 URL
 */
export function getServerUrl(): string {
  const protocol = isProduction ? 'https' : 'http';
  const host = config.HOST === '0.0.0.0' ? 'localhost' : config.HOST;
  return `${protocol}://${host}:${config.PORT}`;
}
