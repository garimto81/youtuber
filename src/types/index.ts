// WebSocket 메시지 타입 정의

export type MessageType =
  | 'github:commit'
  | 'github:ci'
  | 'github:pr'
  | 'github:issue'
  | 'tdd:status'
  | 'session:stats'
  | 'session:start'
  | 'session:end'
  | 'project:active'
  | 'project:switch';

export type SubscriptionChannel = 'github' | 'tdd' | 'session' | 'project';

// 클라이언트 → 서버 메시지
export interface ClientMessage {
  type: 'subscribe' | 'unsubscribe';
  channel: SubscriptionChannel;
}

// 서버 → 클라이언트 메시지
export interface ServerMessage<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: string;
}

// GitHub 이벤트 페이로드
export interface CommitPayload {
  sha: string;
  message: string;
  author: string;
  repo: string;
  timestamp: string;
}

export interface CIPayload {
  repo: string;
  workflow: string;
  status: 'success' | 'failure' | 'pending';
  url: string;
}

export interface PRPayload {
  repo: string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
}

export interface IssuePayload {
  repo: string;
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: string[];
}

// TDD 상태
export type TDDPhase = 'red' | 'green' | 'refactor' | 'idle';

export interface TDDStatusPayload {
  phase: TDDPhase;
  testsPassed: number;
  testsTotal: number;
  currentTest?: string;
}

// 세션 통계
export interface SessionStatsPayload {
  startTime: string;
  duration: number; // 초 단위
  commits: number;
  testsRun: number;
  issuesClosed: number;
}

// 활성 프로젝트
export interface ActiveProject {
  name: string;
  repo: string;
  lastCommit?: CommitPayload;
  lastActivity: string;
  isActive: boolean; // NOW 배지 표시 여부
}

export interface ProjectActivePayload {
  projects: ActiveProject[];
}

// 활동 피드 아이템 (하단 바)
export type ActivityType = 'commit' | 'pr' | 'issue' | 'ci' | 'prd';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  repo: string;
  content: string;
  timestamp: string;
  icon: string;
  color: string;
}
