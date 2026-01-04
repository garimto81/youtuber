import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketManager } from '../packages/stream-server/src/websocket';
import { Server } from 'http';
import type { ServerMessage } from '@youtuber/shared';

describe('WebSocketManager', () => {
  let mockServer: Server;
  let wsManager: WebSocketManager;

  beforeEach(() => {
    mockServer = {
      on: vi.fn(),
      listen: vi.fn(),
      removeListener: vi.fn(),
      addListener: vi.fn(),
    } as unknown as Server;
  });

  afterEach(() => {
    if (wsManager) {
      wsManager.close();
    }
  });

  describe('Constructor', () => {
    it('should create WebSocketManager instance', () => {
      wsManager = new WebSocketManager(mockServer);
      expect(wsManager).toBeDefined();
      expect(wsManager.getClientCount()).toBe(0);
    });
  });

  describe('Client Management', () => {
    it('should return initial client count as 0', () => {
      wsManager = new WebSocketManager(mockServer);
      expect(wsManager.getClientCount()).toBe(0);
    });

    it('should track client count correctly', () => {
      wsManager = new WebSocketManager(mockServer);
      const initialCount = wsManager.getClientCount();
      expect(initialCount).toBe(0);
    });
  });

  describe('Broadcasting', () => {
    it('should have broadcast method', () => {
      wsManager = new WebSocketManager(mockServer);
      expect(typeof wsManager.broadcast).toBe('function');
    });

    it('should have broadcastAll method', () => {
      wsManager = new WebSocketManager(mockServer);
      expect(typeof wsManager.broadcastAll).toBe('function');
    });

    it('should broadcast message without errors', () => {
      wsManager = new WebSocketManager(mockServer);
      const message: ServerMessage = {
        type: 'github:commit',
        timestamp: Date.now(),
        data: {
          repo: 'test/repo',
          branch: 'main',
          message: 'test commit',
          sha: 'abc123',
          author: 'Test Author',
          url: 'https://github.com/test/repo/commit/abc123',
        },
      };

      expect(() => {
        wsManager.broadcast('github', message);
      }).not.toThrow();
    });

    it('should broadcast to all clients without errors', () => {
      wsManager = new WebSocketManager(mockServer);
      const message: ServerMessage = {
        type: 'session:start',
        timestamp: Date.now(),
        data: {
          startTime: Date.now(),
        },
      };

      expect(() => {
        wsManager.broadcastAll(message);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should close gracefully', () => {
      wsManager = new WebSocketManager(mockServer);
      expect(() => {
        wsManager.close();
      }).not.toThrow();
    });

    it('should reset client count after close', () => {
      wsManager = new WebSocketManager(mockServer);
      wsManager.close();
      expect(wsManager.getClientCount()).toBe(0);
    });
  });
});
