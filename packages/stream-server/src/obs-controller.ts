import OBSWebSocket from 'obs-websocket-js';

export type SceneName = 'Intro' | 'Coding' | 'Break' | 'Ending';

export class OBSController {
  private obs: OBSWebSocket;
  private connected: boolean = false;
  private host: string;
  private port: number;
  private password?: string;

  constructor(
    host: string = 'localhost',
    port: number = 4455,
    password?: string
  ) {
    this.obs = new OBSWebSocket();
    this.host = host;
    this.port = port;
    this.password = password;
  }

  async connect(): Promise<boolean> {
    try {
      const url = `ws://${this.host}:${this.port}`;
      await this.obs.connect(url, this.password);
      this.connected = true;
      console.log('[OBS] Connected to OBS WebSocket');

      // 연결 끊김 이벤트 처리
      this.obs.on('ConnectionClosed', () => {
        this.connected = false;
        console.log('[OBS] Connection closed');
      });

      return true;
    } catch (error) {
      console.error('[OBS] Connection failed:', error);
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.obs.disconnect();
      this.connected = false;
      console.log('[OBS] Disconnected');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async switchScene(sceneName: SceneName): Promise<boolean> {
    if (!this.connected) {
      console.error('[OBS] Not connected');
      return false;
    }

    try {
      await this.obs.call('SetCurrentProgramScene', {
        sceneName,
      });
      console.log(`[OBS] Switched to scene: ${sceneName}`);
      return true;
    } catch (error) {
      console.error(`[OBS] Failed to switch scene: ${error}`);
      return false;
    }
  }

  async getCurrentScene(): Promise<string | null> {
    if (!this.connected) return null;

    try {
      const response = await this.obs.call('GetCurrentProgramScene');
      return response.currentProgramSceneName;
    } catch (error) {
      console.error('[OBS] Failed to get current scene:', error);
      return null;
    }
  }

  async getSceneList(): Promise<string[]> {
    if (!this.connected) return [];

    try {
      const response = await this.obs.call('GetSceneList');
      return response.scenes.map((scene) => scene.sceneName as string);
    } catch (error) {
      console.error('[OBS] Failed to get scene list:', error);
      return [];
    }
  }

  async startStreaming(): Promise<boolean> {
    if (!this.connected) return false;

    try {
      await this.obs.call('StartStream');
      console.log('[OBS] Streaming started');
      return true;
    } catch (error) {
      console.error('[OBS] Failed to start streaming:', error);
      return false;
    }
  }

  async stopStreaming(): Promise<boolean> {
    if (!this.connected) return false;

    try {
      await this.obs.call('StopStream');
      console.log('[OBS] Streaming stopped');
      return true;
    } catch (error) {
      console.error('[OBS] Failed to stop streaming:', error);
      return false;
    }
  }

  async getStreamStatus(): Promise<{
    active: boolean;
    duration: number;
  } | null> {
    if (!this.connected) return null;

    try {
      const response = await this.obs.call('GetStreamStatus');
      return {
        active: response.outputActive,
        duration: response.outputDuration,
      };
    } catch (error) {
      console.error('[OBS] Failed to get stream status:', error);
      return null;
    }
  }

  // 브라우저 소스 리프레시 (오버레이 업데이트용)
  async refreshBrowserSource(sourceName: string): Promise<boolean> {
    if (!this.connected) return false;

    try {
      await this.obs.call('PressInputPropertiesButton', {
        inputName: sourceName,
        propertyName: 'refreshnocache',
      });
      console.log(`[OBS] Refreshed browser source: ${sourceName}`);
      return true;
    } catch (error) {
      console.error('[OBS] Failed to refresh browser source:', error);
      return false;
    }
  }
}
