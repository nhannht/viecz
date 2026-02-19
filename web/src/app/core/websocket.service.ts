import { Injectable, inject, PLATFORM_ID } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private ws: WebSocket | null = null;

  messages$ = new Subject<WsMessage>();

  connect() {
    if (!isPlatformBrowser(this.platformId)) return;
    const token = this.auth.getAccessToken();
    if (!token || this.ws) return;

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${proto}//${location.host}/api/v1/ws?token=${token}`);

    this.ws.onmessage = (ev) => {
      try {
        this.messages$.next(JSON.parse(ev.data));
      } catch { /* ignore */ }
    };

    this.ws.onclose = () => {
      this.ws = null;
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
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
    this.ws?.close();
    this.ws = null;
  }
}
