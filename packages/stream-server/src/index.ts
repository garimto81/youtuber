import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketManager } from './websocket.js';
import { createGitHubWebhookRouter } from './github-webhook.js';
import { OBSController } from './obs-controller.js';
import type {
  TDDStatusPayload,
  ActiveProject,
  SessionStatsPayload,
} from '@youtuber/shared';

// 환경 변수 로드
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0'; // 외부 접근 허용

// Express 앱 설정
const app = express();
app.use(express.json());

// CORS 설정 (외부 접근 허용)
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 정적 파일 서빙 (오버레이 HTML/CSS/JS)
// packages/overlay/public (HTML, CSS) + packages/overlay/dist (JS)
const overlayPublicPath = path.resolve(__dirname, '../../overlay/public');
const overlayDistPath = path.resolve(__dirname, '../../overlay/dist');
app.use('/overlay', express.static(overlayPublicPath));
app.use('/overlay', express.static(overlayDistPath));

// HTTP 서버 생성
const server = createServer(app);

// WebSocket 매니저
const wsManager = new WebSocketManager(server);

// OBS 컨트롤러
const obsController = new OBSController(
  process.env.OBS_WS_HOST || 'localhost',
  parseInt(process.env.OBS_WS_PORT || '4455', 10),
  process.env.OBS_WS_PASSWORD
);

// GitHub Webhook 라우터
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
app.use('/webhook', createGitHubWebhookRouter(wsManager, webhookSecret));

// 세션 상태 관리
interface SessionState {
  startTime: Date | null;
  commits: number;
  testsRun: number;
  issuesClosed: number;
  currentProject: string | null;
  activeProjects: ActiveProject[];
}

const sessionState: SessionState = {
  startTime: null,
  commits: 0,
  testsRun: 0,
  issuesClosed: 0,
  currentProject: null,
  activeProjects: [],
};

// API 엔드포인트

// 헬스 체크
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    wsClients: wsManager.getClientCount(),
    obsConnected: obsController.isConnected(),
    session: sessionState.startTime
      ? {
          running: true,
          duration: Math.floor(
            (Date.now() - sessionState.startTime.getTime()) / 1000
          ),
        }
      : { running: false },
  });
});

// 세션 시작
app.post('/api/session/start', (_req, res) => {
  sessionState.startTime = new Date();
  sessionState.commits = 0;
  sessionState.testsRun = 0;
  sessionState.issuesClosed = 0;

  wsManager.broadcastAll({
    type: 'session:start',
    payload: { startTime: sessionState.startTime.toISOString() },
    timestamp: new Date().toISOString(),
  });

  console.log('[Session] Started');
  res.json({ success: true, startTime: sessionState.startTime });
});

// 세션 종료
app.post('/api/session/end', (_req, res) => {
  if (!sessionState.startTime) {
    res.status(400).json({ error: 'No active session' });
    return;
  }

  const stats: SessionStatsPayload = {
    startTime: sessionState.startTime.toISOString(),
    duration: Math.floor(
      (Date.now() - sessionState.startTime.getTime()) / 1000
    ),
    commits: sessionState.commits,
    testsRun: sessionState.testsRun,
    issuesClosed: sessionState.issuesClosed,
  };

  wsManager.broadcastAll({
    type: 'session:end',
    payload: stats,
    timestamp: new Date().toISOString(),
  });

  console.log('[Session] Ended:', stats);
  sessionState.startTime = null;
  res.json({ success: true, stats });
});

// 세션 통계 조회
app.get('/api/session/stats', (_req, res) => {
  if (!sessionState.startTime) {
    res.json({ running: false });
    return;
  }

  const stats: SessionStatsPayload = {
    startTime: sessionState.startTime.toISOString(),
    duration: Math.floor(
      (Date.now() - sessionState.startTime.getTime()) / 1000
    ),
    commits: sessionState.commits,
    testsRun: sessionState.testsRun,
    issuesClosed: sessionState.issuesClosed,
  };

  res.json({ running: true, stats });
});

// TDD 상태 업데이트 (Claude Code Hook에서 호출)
app.post('/api/tdd/status', (req, res) => {
  const status: TDDStatusPayload = req.body;

  wsManager.broadcast('tdd', {
    type: 'tdd:status',
    payload: status,
    timestamp: new Date().toISOString(),
  });

  if (status.testsTotal > 0) {
    sessionState.testsRun = status.testsTotal;
  }

  console.log(`[TDD] ${status.phase}: ${status.testsPassed}/${status.testsTotal}`);
  res.json({ success: true });
});

// 현재 작업 프로젝트 전환
app.post('/api/project/switch', (req, res) => {
  const { name, repo } = req.body;

  sessionState.currentProject = name;

  // activeProjects 업데이트
  sessionState.activeProjects = sessionState.activeProjects.map((p) => ({
    ...p,
    isActive: p.name === name,
  }));

  wsManager.broadcast('project', {
    type: 'project:switch',
    payload: { name, repo },
    timestamp: new Date().toISOString(),
  });

  console.log(`[Project] Switched to: ${name}`);
  res.json({ success: true });
});

// 활성 프로젝트 목록 업데이트
app.post('/api/project/active', (req, res) => {
  const { projects } = req.body as { projects: ActiveProject[] };

  sessionState.activeProjects = projects;

  wsManager.broadcast('project', {
    type: 'project:active',
    payload: { projects },
    timestamp: new Date().toISOString(),
  });

  console.log(`[Project] Active projects: ${projects.length}`);
  res.json({ success: true });
});

// OBS Scene 전환
app.post('/api/obs/scene', async (req, res) => {
  const { scene } = req.body;

  if (!obsController.isConnected()) {
    res.status(503).json({ error: 'OBS not connected' });
    return;
  }

  const success = await obsController.switchScene(scene);
  res.json({ success });
});

// OBS 상태 조회
app.get('/api/obs/status', async (_req, res) => {
  const connected = obsController.isConnected();
  if (!connected) {
    res.json({ connected: false });
    return;
  }

  const currentScene = await obsController.getCurrentScene();
  const streamStatus = await obsController.getStreamStatus();

  res.json({
    connected: true,
    currentScene,
    streaming: streamStatus?.active || false,
    streamDuration: streamStatus?.duration || 0,
  });
});

// 오버레이 설정 업데이트
app.post('/api/overlay/config', (req, res) => {
  const { title, goalAmount } = req.body;

  wsManager.broadcastAll({
    type: 'overlay:config',
    payload: { title, goalAmount },
    timestamp: new Date().toISOString(),
  });

  console.log(`[Overlay] Config updated: ${title || 'no title'}, goal: ${goalAmount || 'no change'}`);
  res.json({ success: true });
});

// 오버레이 금액 업데이트
app.post('/api/overlay/amount', (req, res) => {
  const { amount } = req.body;

  wsManager.broadcastAll({
    type: 'overlay:amount',
    payload: { amount },
    timestamp: new Date().toISOString(),
  });

  console.log(`[Overlay] Amount updated: ${amount}`);
  res.json({ success: true });
});

// 서버 시작
server.listen(PORT, HOST, async () => {
  console.log(`[Server] Running at http://${HOST}:${PORT}`);
  console.log(`[Server] Overlay available at http://${HOST}:${PORT}/overlay/`);
  console.log(`[Server] WebSocket at ws://${HOST}:${PORT}`);

  // OBS 연결 시도
  const obsConnected = await obsController.connect();
  if (!obsConnected) {
    console.log('[OBS] Will retry connection when needed');
  }
});

// 종료 처리
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down...');
  await obsController.disconnect();
  wsManager.close();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Server] Received SIGTERM...');
  await obsController.disconnect();
  wsManager.close();
  server.close();
  process.exit(0);
});
