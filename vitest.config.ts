import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'packages/stream-server/src/**/*.ts',
        'packages/shared/src/**/*.ts',
      ],
      exclude: [
        'node_modules/**',
        'dist/**',
        'packages/overlay/**', // 브라우저 코드 제외
        'archive/**', // 아카이브 제외
        '**/*.config.*',
        '**/*.d.ts',
      ],
    },
  },
});
