# ==============================================================================
# Stage 1: Builder - 의존성 설치 및 빌드
# ==============================================================================
FROM node:20-alpine AS builder

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# 의존성 파일 복사 (레이어 캐싱 최적화)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/stream-server/package.json ./packages/stream-server/
COPY packages/overlay/package.json ./packages/overlay/

# 의존성 설치 (개발 의존성 포함)
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY packages/ ./packages/
COPY tsconfig*.json ./

# 빌드 실행
RUN pnpm build

# ==============================================================================
# Stage 2: Production - 프로덕션 이미지
# ==============================================================================
FROM node:20-alpine AS production

# 보안: non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# 소유권 변경
RUN chown -R nodejs:nodejs /app

# non-root 사용자로 전환
USER nodejs

# 의존성 파일 복사
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=nodejs:nodejs packages/shared/package.json ./packages/shared/
COPY --chown=nodejs:nodejs packages/stream-server/package.json ./packages/stream-server/

# 프로덕션 의존성만 설치
RUN pnpm install --prod --frozen-lockfile

# 빌드 결과물 복사 (번들된 파일만)
COPY --from=builder --chown=nodejs:nodejs /app/packages/stream-server/dist/server.js ./packages/stream-server/dist/
COPY --from=builder --chown=nodejs:nodejs /app/packages/overlay/dist ./packages/overlay/dist

# 오버레이 정적 파일 복사 (public 폴더)
COPY --chown=nodejs:nodejs packages/overlay/public ./packages/overlay/public

# shared 패키지는 번들에 포함되어 있으므로 복사 불필요

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# 포트 노출
EXPOSE 3001

# 실행 명령
CMD ["pnpm", "start"]
