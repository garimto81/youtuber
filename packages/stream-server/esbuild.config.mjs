import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';

async function bundle() {
  try {
    await build({
      entryPoints: [resolve(__dirname, 'src/index.ts')],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: resolve(__dirname, 'dist/server.js'),

      // 외부 패키지 (node_modules에서 로드)
      external: [
        // 네이티브 모듈
        'obs-websocket-js',
        'ws',
        'express',
        'dotenv',
        'helmet',
        'express-rate-limit',
        // 워크스페이스 패키지
        '@youtuber/shared',
      ],

      // 소스맵 (개발 시에만)
      sourcemap: isDev ? 'inline' : 'external',

      // 압축 (프로덕션만)
      minify: !isDev,

      // 트리 셰이킹
      treeShaking: true,

      // 메타파일 생성 (분석용)
      metafile: true,

      // 로그
      logLevel: 'info',

      // 배너: require() 지원 (ESM에서 CommonJS 모듈 로드용)
      // 참고: __filename/__dirname은 소스 코드에서 이미 정의
      banner: {
        js: `import { createRequire as _createRequire } from 'module';
const require = _createRequire(import.meta.url);`,
      },
    });

    console.log('✅ Build succeeded!');

    // 메타파일 저장 (분석용)
    if (process.env.ANALYZE) {
      const fs = await import('fs/promises');
      const metaPath = resolve(__dirname, 'dist/meta.json');
      await fs.writeFile(metaPath, JSON.stringify(build.metafile, null, 2));
      console.log(`📊 Metafile saved to: ${metaPath}`);
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

bundle();
