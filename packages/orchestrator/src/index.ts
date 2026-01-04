// Orchestrator 메인 진입점
// CLI로 사용하거나 프로그래밍 방식으로 import하여 사용

export { ProcessManager } from './process-manager.js';

// CLI 모드로 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  import('./cli.js');
}
