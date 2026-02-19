import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';

export interface WsMessage {
  type: string;
  conversation_id?: number;
  message_id?: number;
  sender_id?: number;
  content?: string;
  created_at?: string;
  error?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private maxRetries = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  messages$ = new Subject<WsMessage>();
  connectionStatus = signal<ConnectionStatus>('disconnected');

  connect() {
    if (!isPlatformBrowser(this.platformId)) return;
    const token = this.auth.getAccessToken();
    if (!token || this.ws) return;

    this.connectionStatus.set(this.retryCount > 0 ? 'reconnecting' : 'connecting');

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${proto}//${location.host}/api/v1/ws?token=${token}`);

    this.ws.onopen = () => {
      this.retryCount = 0;
      this.connectionStatus.set('connected');
    };

    this.ws.onmessage = (ev) => {
      try {
        this.messages$.next(JSON.parse(ev.data));
      } catch { /* ignore */ }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.connectionStatus.set('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect() {
    if (this.retryCount >= this.maxRetries) return;
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
    this.retryCount++;
    this.connectionStatus.set('reconnecting');
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  send(msg: WsMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  joinConversation(id: number) {
    this.send({ type: 'join', conversation_id: id });
  }

  sendMessage(conversationId: number, content: string) {
    this.send({ type: 'message', conversation_id: conversationId, content });
  }

  sendTyping(conversationId: number) {
    this.send({ type: 'typing', conversation_id: conversationId });
  }

  markRead(conversationId: number) {
    this.send({ type: 'read', conversation_id: conversationId });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.retryCount = this.maxRetries; // prevent reconnect
    this.ws?.close();
    this.ws = null;
    this.connectionStatus.set('disconnected');
  }
}
