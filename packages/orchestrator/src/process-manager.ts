import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ServiceName, ServiceStatus } from '@youtuber/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ProcessManager {
  private processes: Map<ServiceName, ChildProcess> = new Map();
  private statuses: Map<ServiceName, ServiceStatus> = new Map();

  private readonly serviceConfigs: Record<
    ServiceName,
    { script: string; port: number }
  > = {
    'stream-server': {
      script: path.resolve(__dirname, '../../../dist/server/index.js'),
      port: 3001,
    },
    'chat-bot': {
      script: path.resolve(__dirname, '../../chat-bot/dist/index.js'),
      port: 3002,
    },
  };

  constructor() {
    // 초기 상태 설정
    for (const name of Object.keys(this.serviceConfigs) as ServiceName[]) {
      this.statuses.set(name, {
        name,
        running: false,
        health: 'unknown',
      });
    }
  }

  async startService(name: ServiceName): Promise<boolean> {
    if (this.processes.has(name)) {
      console.log(`[Orchestrator] ${name} is already running`);
      return false;
    }

    const config = this.serviceConfigs[name];

    try {
      const child = spawn('node', [config.script], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, SERVICE_NAME: name },
        shell: true,
      });

      child.stdout?.on('data', (data) => {
        console.log(`[${name}] ${data.toString().trim()}`);
      });

      child.stderr?.on('data', (data) => {
        console.error(`[${name}:ERROR] ${data.toString().trim()}`);
      });

      child.on('exit', (code) => {
        console.log(`[Orchestrator] ${name} exited with code ${code}`);
        this.processes.delete(name);
        this.updateStatus(name, { running: false, health: 'unknown' });
      });

      child.on('error', (err) => {
        console.error(`[Orchestrator] Failed to start ${name}:`, err.message);
        this.processes.delete(name);
        this.updateStatus(name, { running: false, health: 'unhealthy' });
      });

      this.processes.set(name, child);
      this.updateStatus(name, {
        running: true,
        pid: child.pid,
        port: config.port,
        startedAt: new Date().toISOString(),
        health: 'unknown',
      });

      console.log(`[Orchestrator] Started ${name} (PID: ${child.pid})`);
      return true;
    } catch (error) {
      console.error(`[Orchestrator] Error starting ${name}:`, error);
      return false;
    }
  }

  async stopService(name: ServiceName): Promise<boolean> {
    const child = this.processes.get(name);
    if (!child) {
      console.log(`[Orchestrator] ${name} is not running`);
      return false;
    }

    return new Promise((resolve) => {
      child.on('exit', () => {
        this.processes.delete(name);
        this.updateStatus(name, { running: false, health: 'unknown' });
        console.log(`[Orchestrator] Stopped ${name}`);
        resolve(true);
      });

      // Windows에서는 SIGTERM 대신 kill 사용
      child.kill();

      // 5초 후 강제 종료
      setTimeout(() => {
        if (this.processes.has(name)) {
          child.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  async startAll(): Promise<void> {
    console.log('[Orchestrator] Starting all services...');

    // stream-server 먼저 시작
    await this.startService('stream-server');

    // 잠시 대기 후 chat-bot 시작
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // chat-bot이 존재하면 시작
    const chatBotExists = await this.checkServiceExists('chat-bot');
    if (chatBotExists) {
      await this.startService('chat-bot');
    } else {
      console.log('[Orchestrator] chat-bot not found, skipping');
    }

    console.log('[Orchestrator] All services started');
  }

  async stopAll(): Promise<void> {
    console.log('[Orchestrator] Stopping all services...');

    const services = Array.from(this.processes.keys());
    for (const name of services) {
      await this.stopService(name);
    }

    console.log('[Orchestrator] All services stopped');
  }

  private async checkServiceExists(name: ServiceName): Promise<boolean> {
    const config = this.serviceConfigs[name];
    try {
      const fs = await import('fs');
      await fs.promises.access(config.script);
      return true;
    } catch {
      return false;
    }
  }

  private updateStatus(name: ServiceName, partial: Partial<ServiceStatus>): void {
    const current = this.statuses.get(name) || {
      name,
      running: false,
      health: 'unknown',
    };
    this.statuses.set(name, { ...current, ...partial });
  }

  async checkHealth(name: ServiceName): Promise<boolean> {
    const status = this.statuses.get(name);
    if (!status?.running || !status.port) {
      return false;
    }

    try {
      const response = await fetch(`http://localhost:${status.port}/health`);
      const isHealthy = response.ok;
      this.updateStatus(name, {
        health: isHealthy ? 'healthy' : 'unhealthy',
        lastHealthCheck: new Date().toISOString(),
      });
      return isHealthy;
    } catch {
      this.updateStatus(name, {
        health: 'unhealthy',
        lastHealthCheck: new Date().toISOString(),
      });
      return false;
    }
  }

  getStatuses(): ServiceStatus[] {
    return Array.from(this.statuses.values());
  }

  getStatus(name: ServiceName): ServiceStatus | undefined {
    return this.statuses.get(name);
  }

  isRunning(name: ServiceName): boolean {
    return this.processes.has(name);
  }
}
