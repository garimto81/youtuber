import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type {
  ClientMessage,
  ServerMessage,
  SubscriptionChannel,
} from '@youtuber/shared';

interface ExtendedWebSocket extends WebSocket {
  subscriptions: Set<SubscriptionChannel>;
  isAlive: boolean;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Set<ExtendedWebSocket> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const client = ws as ExtendedWebSocket;
      client.subscriptions = new Set();
      client.isAlive = true;
      this.clients.add(client);

      console.log(
        `[WS] Client connected. Total: ${this.clients.size}`
      );

      client.on('pong', () => {
        client.isAlive = true;
      });

      client.on('message', (data: Buffer) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          this.handleClientMessage(client, message);
        } catch (error) {
          console.error('[WS] Invalid message format:', error);
        }
      });

      client.on('close', () => {
        this.clients.delete(client);
        console.log(
          `[WS] Client disconnected. Total: ${this.clients.size}`
        );
      });

      client.on('error', (error) => {
        console.error('[WS] Client error:', error);
        this.clients.delete(client);
      });

      // 연결 확인 메시지 전송 (session:stats로 현재 상태 알림)
      this.sendToClient(client, {
        type: 'session:stats',
        payload: { connected: true },
        timestamp: new Date().toISOString(),
      });
    });
  }

  private handleClientMessage(
    client: ExtendedWebSocket,
    message: ClientMessage
  ): void {
    switch (message.type) {
      case 'subscribe':
        client.subscriptions.add(message.channel);
        console.log(
          `[WS] Client subscribed to: ${message.channel}`
        );
        break;
      case 'unsubscribe':
        client.subscriptions.delete(message.channel);
        console.log(
          `[WS] Client unsubscribed from: ${message.channel}`
        );
        break;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (!client.isAlive) {
          client.terminate();
          this.clients.delete(client);
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000); // 30초마다 heartbeat
  }

  private sendToClient<T>(
    client: ExtendedWebSocket,
    message: ServerMessage<T>
  ): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  // 특정 채널 구독자에게 브로드캐스트
  public broadcast<T>(
    channel: SubscriptionChannel,
    message: ServerMessage<T>
  ): void {
    this.clients.forEach((client) => {
      if (
        client.subscriptions.has(channel) &&
        client.readyState === WebSocket.OPEN
      ) {
        this.sendToClient(client, message);
      }
    });
  }

  // 모든 클라이언트에게 브로드캐스트
  public broadcastAll<T>(message: ServerMessage<T>): void {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, message);
      }
    });
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }
}
