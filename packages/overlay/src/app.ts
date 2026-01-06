// AI Coding Stream Overlay - 메인 앱
import type {
  ServerMessage,
  CommitPayload,
  PRPayload,
  IssuePayload,
  CIPayload,
  TDDStatusPayload,
  ActiveProject,
  ActivityItem,
  SubscriptionChannel,
  OverlayConfigPayload,
  OverlayAmountPayload,
} from '@youtuber/shared';

// ========================================
// WebSocket 연결 관리
// ========================================
class OverlayWebSocket {
  private ws: WebSocket | null = null;
  private reconnectInterval = 3000;
  private maxReconnectAttempts = 10;
  private reconnectAttempts = 0;
  private url: string;
  private onMessage: (message: ServerMessage) => void;

  constructor(url: string, onMessage: (message: ServerMessage) => void) {
    this.url = url;
    this.onMessage = onMessage;
  }

  connect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
        this.subscribe(['github', 'tdd', 'session', 'project']);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          this.onMessage(message);
        } catch (error) {
          console.error('[WS] Parse error:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    } catch (error) {
      console.error('[WS] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private subscribe(channels: SubscriptionChannel[]): void {
    channels.forEach((channel) => {
      this.send({ type: 'subscribe', channel });
    });
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `[WS] Reconnecting in ${this.reconnectInterval}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      console.error('[WS] Max reconnect attempts reached');
    }
  }
}

// ========================================
// 상태 관리
// ========================================
interface OverlayState {
  projects: ActiveProject[];
  activities: ActivityItem[];
  tdd: TDDStatusPayload | null;
  sessionStart: Date | null;
  streamTitle: string;
  currentAmount: number;
  goalAmount: number;
}

const state: OverlayState = {
  projects: [],
  activities: [],
  tdd: null,
  sessionStart: null,
  streamTitle: '오늘의 코딩',
  currentAmount: 0,
  goalAmount: 10000000000,
};

const MAX_ACTIVITIES = 8;
const MAX_PROJECTS = 5;

// ========================================
// DOM 요소
// ========================================
const projectListEl = document.getElementById('project-list')!;
const activityFeedEl = document.getElementById('activity-feed')!;
const timerValueEl = document.getElementById('timer-value')!;
const streamTitleEl = document.getElementById('stream-title')!;
const currentAmountEl = document.getElementById('current-amount')!;
const goalAmountEl = document.getElementById('goal-amount')!;

// ========================================
// 렌더링 함수
// ========================================

function renderProjects(): void {
  if (state.projects.length === 0) {
    projectListEl.innerHTML = `
      <div class="project-card placeholder">
        <div class="project-name">프로젝트 로딩 중...</div>
        <div class="project-commit">GitHub에서 최근 활동을 조회합니다</div>
      </div>
    `;
    return;
  }

  projectListEl.innerHTML = state.projects
    .slice(0, MAX_PROJECTS)
    .map(
      (project) => `
      <div class="project-card ${project.isActive ? 'active' : ''}">
        <div class="project-header">
          <span class="project-name">${project.name}</span>
          <span class="now-badge">NOW</span>
        </div>
        <div class="project-commit">${project.lastCommit?.message || '커밋 없음'}</div>
        <div class="project-time">${formatRelativeTime(project.lastActivity)}</div>
      </div>
    `
    )
    .join('');
}

function getActivityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    commit: 'Commit',
    pr: 'Pull Request',
    issue: 'Issue',
    ci: 'CI/CD',
    prd: 'PRD',
  };
  return labels[type] || type.toUpperCase();
}

function renderActivities(): void {
  if (state.activities.length === 0) {
    activityFeedEl.innerHTML = `
      <div class="activity-card placeholder">
        <div class="activity-repo">세션 대기</div>
        <div class="activity-type">WAITING</div>
        <div class="activity-summary">커밋, PR, 이슈 활동이 표시됩니다</div>
        <div class="activity-time">--:--</div>
      </div>
    `;
    return;
  }

  activityFeedEl.innerHTML = state.activities
    .slice(0, MAX_ACTIVITIES)
    .map(
      (activity) => `
      <div class="activity-card ${getActivityClass(activity.type)}">
        <div class="activity-repo">${activity.repo}</div>
        <div class="activity-type">${activity.icon} ${getActivityTypeLabel(activity.type)}</div>
        <div class="activity-summary">${activity.content}</div>
        <div class="activity-time">${formatRelativeTime(activity.timestamp)}</div>
      </div>
    `
    )
    .join('');

  // 새 활동 시 스크롤을 우측(최신)으로
  activityFeedEl.scrollLeft = activityFeedEl.scrollWidth;
}

function renderTDD(): void {
  let tddBadgeEl = document.querySelector('.tdd-badge') as HTMLElement | null;

  if (!state.tdd || state.tdd.phase === 'idle') {
    if (tddBadgeEl) tddBadgeEl.classList.add('hidden');
    return;
  }

  if (!tddBadgeEl) {
    tddBadgeEl = document.createElement('div');
    tddBadgeEl.className = 'tdd-badge';
    document.body.appendChild(tddBadgeEl);
  }

  tddBadgeEl.className = `tdd-badge ${state.tdd.phase}`;
  tddBadgeEl.innerHTML = `
    <span class="tdd-phase">${state.tdd.phase.toUpperCase()}</span>
    <span class="tdd-stats">${state.tdd.testsPassed}/${state.tdd.testsTotal}</span>
  `;
}

function updateSessionTimer(): void {
  if (!state.sessionStart) {
    timerValueEl.textContent = '00:00:00';
    return;
  }

  const elapsed = Math.floor((Date.now() - state.sessionStart.getTime()) / 1000);
  timerValueEl.textContent = formatDuration(elapsed);
}

function renderHeader(): void {
  streamTitleEl.textContent = state.streamTitle;
  currentAmountEl.textContent = formatAmount(state.currentAmount);
  goalAmountEl.textContent = formatAmount(state.goalAmount);
}

function formatAmount(num: number): string {
  return num.toLocaleString('ko-KR');
}

// ========================================
// 유틸리티 함수
// ========================================

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
}

function getActivityClass(type: string): string {
  const classMap: Record<string, string> = {
    commit: 'commit',
    pr: 'pr',
    issue: 'issue',
    ci: 'ci-success',
    prd: 'prd',
  };
  return classMap[type] || '';
}


function addActivity(activity: ActivityItem): void {
  // 중복 방지
  if (state.activities.some((a) => a.id === activity.id)) return;

  state.activities.unshift(activity);
  if (state.activities.length > MAX_ACTIVITIES * 2) {
    state.activities = state.activities.slice(0, MAX_ACTIVITIES * 2);
  }
  renderActivities();
}

function updateProject(commit: CommitPayload): void {
  const existing = state.projects.find((p) => p.name === commit.repo);

  if (existing) {
    existing.lastCommit = commit;
    existing.lastActivity = commit.timestamp;
  } else {
    state.projects.unshift({
      name: commit.repo,
      repo: commit.repo,
      lastCommit: commit,
      lastActivity: commit.timestamp,
      isActive: state.projects.length === 0, // 첫 프로젝트는 active
    });
  }

  // 최근 활동순 정렬
  state.projects.sort(
    (a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );

  renderProjects();
}

// ========================================
// 메시지 핸들러
// ========================================

function handleMessage(message: ServerMessage): void {
  console.log('[MSG]', message.type, message.payload);

  switch (message.type) {
    case 'session:start':
      state.sessionStart = new Date();
      updateSessionTimer();
      break;

    case 'session:end':
      state.sessionStart = null;
      updateSessionTimer();
      break;

    case 'github:commit': {
      const payload = message.payload as {
        commit?: CommitPayload;
        activity?: ActivityItem;
      };
      if (payload.commit) updateProject(payload.commit);
      if (payload.activity) addActivity(payload.activity);
      break;
    }

    case 'github:pr': {
      const payload = message.payload as {
        pr?: PRPayload;
        activity?: ActivityItem;
      };
      if (payload.activity) addActivity(payload.activity);
      break;
    }

    case 'github:issue': {
      const payload = message.payload as {
        issue?: IssuePayload;
        activity?: ActivityItem;
      };
      if (payload.activity) addActivity(payload.activity);
      break;
    }

    case 'github:ci': {
      const payload = message.payload as {
        ci?: CIPayload;
        activity?: ActivityItem;
      };
      if (payload.activity) {
        const activity = payload.activity;
        if (payload.ci?.status === 'failure') {
          activity.icon = '❌';
          activity.color = '#f85149';
        }
        addActivity(activity);
      }
      break;
    }

    case 'tdd:status':
      state.tdd = message.payload as TDDStatusPayload;
      renderTDD();
      break;

    case 'project:active': {
      const payload = message.payload as { projects: ActiveProject[] };
      state.projects = payload.projects;
      renderProjects();
      break;
    }

    case 'project:switch': {
      const payload = message.payload as { name: string };
      state.projects = state.projects.map((p) => ({
        ...p,
        isActive: p.name === payload.name,
      }));
      renderProjects();
      break;
    }

    case 'overlay:config': {
      const payload = message.payload as OverlayConfigPayload;
      if (payload.title) state.streamTitle = payload.title;
      if (payload.goalAmount) state.goalAmount = payload.goalAmount;
      renderHeader();
      break;
    }

    case 'overlay:amount': {
      const payload = message.payload as OverlayAmountPayload;
      state.currentAmount = payload.amount;
      renderHeader();
      break;
    }
  }
}

// ========================================
// 초기화
// ========================================

async function fetchOverlayConfig(): Promise<void> {
  try {
    const response = await fetch('/api/overlay/config');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    state.streamTitle = data.title || '오늘의 코딩';
    state.goalAmount = data.goalAmount || 10000000000;
    state.currentAmount = data.currentAmount || 0;
    renderHeader();
    console.log(`[Overlay] Config loaded: ${state.streamTitle}`);
  } catch (error) {
    console.error('[Overlay] Failed to fetch config:', error);
  }
}

async function fetchRecentProjects(): Promise<void> {
  try {
    const response = await fetch('/api/github/recent-projects');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (data.success && data.projects) {
      state.projects = data.projects;
      renderProjects();
      console.log(`[Overlay] Loaded ${data.projects.length} recent projects`);
    }
  } catch (error) {
    console.error('[Overlay] Failed to fetch recent projects:', error);
  }
}

function init(): void {
  console.log('[Overlay] Initializing...');

  // WebSocket 연결 (프로토콜과 호스트 자동 감지)
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}`;
  const ws = new OverlayWebSocket(wsUrl, handleMessage);
  ws.connect();

  // 타이머 업데이트 (1초마다)
  setInterval(updateSessionTimer, 1000);

  // 초기 렌더링
  renderHeader();
  renderProjects();
  renderActivities();

  // 초기 설정 및 프로젝트 로드
  fetchOverlayConfig();
  fetchRecentProjects();

  // 주기적으로 최근 프로젝트 갱신 (5분마다)
  setInterval(fetchRecentProjects, 5 * 60 * 1000);

  console.log('[Overlay] Ready');
}

// DOM 로드 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
