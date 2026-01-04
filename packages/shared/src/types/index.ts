// ============================================
// WebSocket 메시지 타입 정의
// ============================================

export type MessageType =
  // GitHub 이벤트
  | 'github:commit'
  | 'github:ci'
  | 'github:pr'
  | 'github:issue'
  // TDD 상태
  | 'tdd:status'
  // 세션 관리
  | 'session:stats'
  | 'session:start'
  | 'session:end'
  // 프로젝트 관리
  | 'project:active'
  | 'project:switch'
  // 오버레이 설정
  | 'overlay:config'
  | 'overlay:amount'
  // [신규] 채팅 관련
  | 'chat:message'
  | 'chat:command'
  | 'chat:response';

export type SubscriptionChannel =
  | 'github'
  | 'tdd'
  | 'session'
  | 'project'
  // [신규] 채팅 채널
  | 'chat';

// ============================================
// 클라이언트-서버 메시지
// ============================================

export interface ClientMessage {
  type: 'subscribe' | 'unsubscribe';
  channel: SubscriptionChannel;
}

export interface ServerMessage<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: string;
}

// ============================================
// GitHub 이벤트 페이로드
// ============================================

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

// ============================================
// TDD 상태
// ============================================

export type TDDPhase = 'red' | 'green' | 'refactor' | 'idle';

export interface TDDStatusPayload {
  phase: TDDPhase;
  testsPassed: number;
  testsTotal: number;
  currentTest?: string;
}

// ============================================
// 세션 통계
// ============================================

export interface SessionStatsPayload {
  startTime: string;
  duration: number; // 초 단위
  commits: number;
  testsRun: number;
  issuesClosed: number;
}

// ============================================
// 활성 프로젝트
// ============================================

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

// ============================================
// 활동 피드 아이템
// ============================================

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

// ============================================
// 오버레이 설정
// ============================================

export interface OverlayConfigPayload {
  title?: string;
  goalAmount?: number;
}

export interface OverlayAmountPayload {
  amount: number;
}

// ============================================
// [신규] 채팅 관련 타입
// ============================================

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  content: string;
  timestamp: string;
  isModerator: boolean;
  isOwner: boolean;
}

export interface ChatCommand {
  name: string;
  args: string[];
  author: string;
  authorId: string;
}

export interface ChatResponse {
  targetMessageId?: string;
  content: string;
  isAI: boolean;
}

export interface ChatMessagePayload extends ChatMessage {}

export interface ChatCommandPayload extends ChatCommand {}

export interface ChatResponsePayload extends ChatResponse {}

// ============================================
// [신규] 오케스트레이터 타입
// ============================================

export type ServiceName = 'stream-server' | 'chat-bot';

export interface ServiceStatus {
  name: ServiceName;
  running: boolean;
  pid?: number;
  port?: number;
  startedAt?: string;
  health: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck?: string;
}

export interface OrchestratorState {
  services: ServiceStatus[];
  sessionActive: boolean;
  startedAt?: string;
}

export interface IPCMessage {
  type: 'status' | 'command' | 'event';
  service: ServiceName;
  payload: unknown;
  timestamp: string;
}
