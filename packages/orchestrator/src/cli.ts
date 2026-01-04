#!/usr/bin/env node
import { Command } from 'commander';
import { ProcessManager } from './process-manager.js';
import type { ServiceName } from '@youtuber/shared';

const program = new Command();
const manager = new ProcessManager();

program
  .name('youtuber')
  .description('YouTube 스트리밍 시스템 제어')
  .version('2.0.0');

program
  .command('start')
  .description('서비스 시작')
  .option('--only <service>', '특정 서비스만 시작 (stream-server | chat-bot)')
  .action(async (options) => {
    if (options.only) {
      const serviceName = options.only as ServiceName;
      if (!['stream-server', 'chat-bot'].includes(serviceName)) {
        console.error(`Unknown service: ${serviceName}`);
        process.exit(1);
      }
      await manager.startService(serviceName);
    } else {
      await manager.startAll();
    }

    // 프로세스 유지
    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT, stopping all services...');
      await manager.stopAll();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM, stopping all services...');
      await manager.stopAll();
      process.exit(0);
    });
  });

program
  .command('stop')
  .description('서비스 종료')
  .option('--only <service>', '특정 서비스만 종료')
  .action(async (options) => {
    if (options.only) {
      await manager.stopService(options.only as ServiceName);
    } else {
      await manager.stopAll();
    }
    process.exit(0);
  });

program
  .command('status')
  .description('서비스 상태 확인')
  .action(async () => {
    // 헬스체크 실행
    for (const status of manager.getStatuses()) {
      if (status.running) {
        await manager.checkHealth(status.name);
      }
    }

    const statuses = manager.getStatuses();
    console.log('\n=== Service Status ===\n');
    console.table(
      statuses.map((s) => ({
        Service: s.name,
        Running: s.running ? 'Yes' : 'No',
        PID: s.pid || '-',
        Port: s.port || '-',
        Health: s.health,
        Started: s.startedAt ? new Date(s.startedAt).toLocaleTimeString() : '-',
      }))
    );
    process.exit(0);
  });

program
  .command('health')
  .description('헬스체크 실행')
  .action(async () => {
    console.log('Checking health...');
    for (const status of manager.getStatuses()) {
      const healthy = await manager.checkHealth(status.name);
      console.log(`${status.name}: ${healthy ? 'healthy' : 'unhealthy'}`);
    }
    process.exit(0);
  });

program.parse();
