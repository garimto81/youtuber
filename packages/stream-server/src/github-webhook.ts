import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import crypto from 'crypto';
import type { WebSocketManager } from './websocket.js';
import type {
  CommitPayload,
  PRPayload,
  IssuePayload,
  CIPayload,
  ActivityItem,
} from '@youtuber/shared';

// GitHub Webhook 이벤트 타입
interface GitHubPushEvent {
  ref: string;
  commits: Array<{
    id: string;
    message: string;
    author: { name: string };
    timestamp: string;
  }>;
  repository: { name: string; full_name: string };
}

interface GitHubPREvent {
  action: string;
  pull_request: {
    number: number;
    title: string;
    state: string;
    merged: boolean;
    user: { login: string };
  };
  repository: { name: string };
}

interface GitHubIssueEvent {
  action: string;
  issue: {
    number: number;
    title: string;
    state: string;
    labels: Array<{ name: string }>;
  };
  repository: { name: string };
}

interface GitHubCheckRunEvent {
  action: string;
  check_run: {
    name: string;
    conclusion: string | null;
    html_url: string;
  };
  repository: { name: string };
}

export function createGitHubWebhookRouter(
  wsManager: WebSocketManager,
  webhookSecret?: string
): Router {
  const router = createRouter();

  // Webhook 서명 검증
  function verifySignature(
    req: Request,
    secret: string
  ): boolean {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) return false;

    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  }

  // Activity 아이템 생성 헬퍼
  function createActivityItem(
    type: ActivityItem['type'],
    repo: string,
    content: string
  ): ActivityItem {
    const typeConfig = {
      commit: { icon: '📝', color: '#8957e5' },
      pr: { icon: '🔀', color: '#58a6ff' },
      issue: { icon: '🎯', color: '#3fb950' },
      ci: { icon: '✅', color: '#3fb950' },
      prd: { icon: '📝', color: '#58a6ff' },
    };

    const config = typeConfig[type];
    return {
      id: crypto.randomUUID(),
      type,
      repo,
      content: content.slice(0, 50), // 50자 제한
      timestamp: new Date().toISOString(),
      icon: config.icon,
      color: config.color,
    };
  }

  router.post('/github', (req: Request, res: Response) => {
    // 서명 검증 (secret 설정 시)
    if (webhookSecret && !verifySignature(req, webhookSecret)) {
      console.error('[Webhook] Invalid signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const event = req.headers['x-github-event'] as string;
    const payload = req.body;

    console.log(`[Webhook] Received: ${event}`);

    switch (event) {
      case 'push':
        handlePush(payload as GitHubPushEvent);
        break;
      case 'pull_request':
        handlePullRequest(payload as GitHubPREvent);
        break;
      case 'issues':
        handleIssue(payload as GitHubIssueEvent);
        break;
      case 'check_run':
        handleCheckRun(payload as GitHubCheckRunEvent);
        break;
      default:
        console.log(`[Webhook] Unhandled event: ${event}`);
    }

    res.status(200).json({ received: true });
  });

  function handlePush(payload: GitHubPushEvent): void {
    const commits = payload.commits || [];
    const repo = payload.repository.name;

    commits.forEach((commit) => {
      const commitPayload: CommitPayload = {
        sha: commit.id.slice(0, 7),
        message: commit.message.split('\n')[0], // 첫 줄만
        author: commit.author.name,
        repo,
        timestamp: commit.timestamp,
      };

      // GitHub 채널로 브로드캐스트
      wsManager.broadcast('github', {
        type: 'github:commit',
        payload: commitPayload,
        timestamp: new Date().toISOString(),
      });

      // 활동 피드용
      const activity = createActivityItem(
        'commit',
        repo,
        commit.message.split('\n')[0]
      );
      wsManager.broadcastAll({
        type: 'github:commit',
        payload: { commit: commitPayload, activity },
        timestamp: new Date().toISOString(),
      });

      console.log(`[Webhook] Commit: ${repo} - ${commitPayload.message}`);
    });
  }

  function handlePullRequest(payload: GitHubPREvent): void {
    const pr = payload.pull_request;
    const repo = payload.repository.name;

    const prPayload: PRPayload = {
      repo,
      number: pr.number,
      title: pr.title,
      state: pr.merged ? 'merged' : (pr.state as 'open' | 'closed'),
      author: pr.user.login,
    };

    wsManager.broadcast('github', {
      type: 'github:pr',
      payload: prPayload,
      timestamp: new Date().toISOString(),
    });

    const activity = createActivityItem(
      'pr',
      repo,
      `#${pr.number} ${pr.title}`
    );
    wsManager.broadcastAll({
      type: 'github:pr',
      payload: { pr: prPayload, activity },
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[Webhook] PR #${pr.number}: ${payload.action} - ${pr.title}`
    );
  }

  function handleIssue(payload: GitHubIssueEvent): void {
    const issue = payload.issue;
    const repo = payload.repository.name;

    const issuePayload: IssuePayload = {
      repo,
      number: issue.number,
      title: issue.title,
      state: issue.state as 'open' | 'closed',
      labels: issue.labels.map((l) => l.name),
    };

    wsManager.broadcast('github', {
      type: 'github:issue',
      payload: issuePayload,
      timestamp: new Date().toISOString(),
    });

    const activity = createActivityItem(
      'issue',
      repo,
      `#${issue.number} ${issue.title}`
    );
    wsManager.broadcastAll({
      type: 'github:issue',
      payload: { issue: issuePayload, activity },
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[Webhook] Issue #${issue.number}: ${payload.action} - ${issue.title}`
    );
  }

  function handleCheckRun(payload: GitHubCheckRunEvent): void {
    const checkRun = payload.check_run;
    const repo = payload.repository.name;

    if (payload.action !== 'completed') return;

    const ciPayload: CIPayload = {
      repo,
      workflow: checkRun.name,
      status:
        checkRun.conclusion === 'success'
          ? 'success'
          : checkRun.conclusion === 'failure'
            ? 'failure'
            : 'pending',
      url: checkRun.html_url,
    };

    wsManager.broadcast('github', {
      type: 'github:ci',
      payload: ciPayload,
      timestamp: new Date().toISOString(),
    });

    const icon = ciPayload.status === 'success' ? '✅' : '❌';
    const activity = createActivityItem(
      'ci',
      repo,
      `${icon} ${checkRun.name}`
    );
    activity.icon = icon;
    activity.color =
      ciPayload.status === 'success' ? '#3fb950' : '#f85149';

    wsManager.broadcastAll({
      type: 'github:ci',
      payload: { ci: ciPayload, activity },
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[Webhook] CI: ${repo} - ${checkRun.name} - ${ciPayload.status}`
    );
  }

  return router;
}
