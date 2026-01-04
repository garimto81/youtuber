import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Overlay Server', () => {
  const BASE_URL = 'http://localhost:3001';

  describe('Health Endpoint', () => {
    it('should return ok status', async () => {
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data).toHaveProperty('wsClients');
      expect(data).toHaveProperty('obsConnected');
      expect(data).toHaveProperty('session');
    });
  });

  describe('Session API', () => {
    it('should start a session', async () => {
      const response = await fetch(`${BASE_URL}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.startTime).toBeDefined();
    });

    it('should get session stats', async () => {
      const response = await fetch(`${BASE_URL}/api/session/stats`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.running).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.commits).toBeDefined();
    });

    it('should end a session', async () => {
      const response = await fetch(`${BASE_URL}/api/session/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('TDD Status API', () => {
    it('should accept TDD status update', async () => {
      const response = await fetch(`${BASE_URL}/api/tdd/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'green',
          testsPassed: 5,
          testsTotal: 5,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Project API', () => {
    it('should switch project', async () => {
      const response = await fetch(`${BASE_URL}/api/project/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'test-project',
          repo: 'test-project',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should update active projects', async () => {
      const response = await fetch(`${BASE_URL}/api/project/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects: [
            {
              name: 'youtuber',
              repo: 'youtuber',
              lastActivity: new Date().toISOString(),
              isActive: true,
            },
            {
              name: 'claude',
              repo: 'claude',
              lastActivity: new Date().toISOString(),
              isActive: false,
            },
          ],
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Webhook Endpoint', () => {
    it('should accept GitHub push webhook', async () => {
      const response = await fetch(`${BASE_URL}/webhook/github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'push',
        },
        body: JSON.stringify({
          ref: 'refs/heads/main',
          commits: [
            {
              id: 'abc1234567890',
              message: 'test: add webhook test',
              author: { name: 'Test User' },
              timestamp: new Date().toISOString(),
            },
          ],
          repository: { name: 'test-repo', full_name: 'user/test-repo' },
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });
  });
});
