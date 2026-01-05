import { describe, it, expect } from 'vitest';
import { config, isProduction, isDevelopment, isTest, getServerUrl } from '../packages/stream-server/src/config';

describe('Config Module', () => {

  describe('Environment Variable Validation', () => {
    it('should have valid NODE_ENV', () => {
      expect(['development', 'production', 'test']).toContain(config.NODE_ENV);
    });

    it('should have PORT as number in valid range', () => {
      expect(typeof config.PORT).toBe('number');
      expect(config.PORT).toBeGreaterThanOrEqual(1);
      expect(config.PORT).toBeLessThanOrEqual(65535);
    });

    it('should have HOST as string', () => {
      expect(typeof config.HOST).toBe('string');
      expect(config.HOST.length).toBeGreaterThan(0);
    });

    it('should have OBS_WS_HOST as string', () => {
      expect(typeof config.OBS_WS_HOST).toBe('string');
      expect(config.OBS_WS_HOST.length).toBeGreaterThan(0);
    });

    it('should have OBS_WS_PORT as number in valid range', () => {
      expect(typeof config.OBS_WS_PORT).toBe('number');
      expect(config.OBS_WS_PORT).toBeGreaterThanOrEqual(1);
      expect(config.OBS_WS_PORT).toBeLessThanOrEqual(65535);
    });

    it('should have OBS_WS_PASSWORD as non-empty string', () => {
      expect(typeof config.OBS_WS_PASSWORD).toBe('string');
      expect(config.OBS_WS_PASSWORD.length).toBeGreaterThan(0);
    });

    it('should have GITHUB_WEBHOOK_SECRET as non-empty string', () => {
      expect(typeof config.GITHUB_WEBHOOK_SECRET).toBe('string');
      expect(config.GITHUB_WEBHOOK_SECRET.length).toBeGreaterThan(0);
    });

    it('should have GITHUB_USERNAME as string', () => {
      expect(typeof config.GITHUB_USERNAME).toBe('string');
      expect(config.GITHUB_USERNAME.length).toBeGreaterThan(0);
    });

    it('should have optional YouTube settings as string or undefined', () => {
      if (config.YOUTUBE_API_KEY !== undefined) {
        expect(typeof config.YOUTUBE_API_KEY).toBe('string');
      }
      if (config.YOUTUBE_CHANNEL_ID !== undefined) {
        expect(typeof config.YOUTUBE_CHANNEL_ID).toBe('string');
      }
    });
  });

  describe('Environment Helpers', () => {
    it('should have exactly one environment flag set to true', () => {
      const flags = [isProduction, isDevelopment, isTest];
      const trueCount = flags.filter(Boolean).length;
      expect(trueCount).toBe(1);
    });

    it('should match NODE_ENV value with environment flags', () => {
      if (config.NODE_ENV === 'production') {
        expect(isProduction).toBe(true);
        expect(isDevelopment).toBe(false);
        expect(isTest).toBe(false);
      } else if (config.NODE_ENV === 'development') {
        expect(isProduction).toBe(false);
        expect(isDevelopment).toBe(true);
        expect(isTest).toBe(false);
      } else if (config.NODE_ENV === 'test') {
        expect(isProduction).toBe(false);
        expect(isDevelopment).toBe(false);
        expect(isTest).toBe(true);
      }
    });
  });

  describe('Server URL Generation', () => {
    it('should return a valid URL string', () => {
      const url = getServerUrl();
      expect(typeof url).toBe('string');
      expect(url).toMatch(/^https?:\/\/.+:\d+$/);
    });

    it('should use http in development/test and https in production', () => {
      const url = getServerUrl();
      if (isProduction) {
        expect(url).toMatch(/^https:\/\//);
      } else {
        expect(url).toMatch(/^http:\/\//);
      }
    });

    it('should include the configured port', () => {
      const url = getServerUrl();
      expect(url).toContain(`:${config.PORT}`);
    });

    it('should replace 0.0.0.0 with localhost', () => {
      const url = getServerUrl();
      if (config.HOST === '0.0.0.0') {
        expect(url).toContain('localhost');
        expect(url).not.toContain('0.0.0.0');
      }
    });

    it('should preserve custom hosts', () => {
      const url = getServerUrl();
      if (config.HOST !== '0.0.0.0') {
        expect(url).toContain(config.HOST);
      }
    });
  });
});
