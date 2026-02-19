import {
  Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { ChatService } from '../core/chat.service';
import { WebSocketService, WsMessage } from '../core/websocket.service';
import { AuthService } from '../core/auth.service';
import { Message } from '../core/models';
import { MessageBubbleComponent } from '../shared/components/message-bubble.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule, MatIconButton, MatIcon, MatFormField, MatInput,
    MatProgressSpinner, MessageBubbleComponent,
  ],
  template: `
    <div class="chat-page">
      <div class="chat-header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <span class="chat-title">Conversation #{{ conversationId() }}</span>
        <span class="connection-status" [class]="wsService.connectionStatus()">
          {{ connectionLabel() }}
        </span>
      </div>

      @if (chatClosed()) {
        <div class="chat-closed-banner">
          <mat-icon>lock</mat-icon>
          <span>This chat is closed</span>
        </div>
      }

      @if (loading()) {
        <div class="center"><mat-spinner diameter="30"></mat-spinner></div>
      } @else {
        <div class="msg-list" #messageList>
          @if (messages().length === 0) {
            <div class="center empty">
              <mat-icon>chat</mat-icon>
              <p>No messages yet. Say hello!</p>
            </div>
          }
          @for (msg of messages(); track msg.id) {
            <app-message-bubble [message]="msg" [isMine]="msg.sender_id === myId()" />
          }
          @if (isTyping()) {
            <div class="typing-indicator">Typing...</div>
          }
        </div>

        @if (!chatClosed()) {
          <div class="msg-input">
            <mat-form-field appearance="outline" class="msg-field">
              <input matInput [(ngModel)]="newMessage" placeholder="Type a message..."
                     (keyup.enter)="sendMessage()" (input)="onTyping()">
            </mat-form-field>
            <button mat-icon-button (click)="sendMessage()" [disabled]="!newMessage.trim()">
              <mat-icon>send</mat-icon>
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .chat-page {
      display: flex; flex-direction: column;
      height: calc(100vh - 96px);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      overflow: hidden;
      background: var(--mat-sys-surface);
    }
    .chat-header {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      font-weight: 500;
    }
    .chat-title { flex: 1; }
    .connection-status {
      font-size: 0.7rem; padding: 2px 8px; border-radius: 10px;
    }
    .connection-status.connected { background: #c8e6c9; color: #2e7d32; }
    .connection-status.connecting, .connection-status.reconnecting { background: #fff9c4; color: #f57f17; }
    .connection-status.disconnected { background: #ffcdd2; color: #c62828; }
    .chat-closed-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; background: var(--mat-sys-surface-variant);
      color: var(--mat-sys-on-surface-variant); font-size: 0.85rem;
    }
    .center {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; flex: 1; gap: 8px;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.5; }
    .msg-list {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .typing-indicator {
      font-size: 0.8rem; color: var(--mat-sys-on-surface-variant);
      font-style: italic; padding: 4px 0;
    }
    .msg-input {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .msg-field { flex: 1; margin-bottom: -22px; }
  `,
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageList') messageList?: ElementRef<HTMLDivElement>;

  private chatService = inject(ChatService);
  wsService = inject(WebSocketService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wsSub?: Subscription;

  conversationId = signal(0);
  messages = signal<Message[]>([]);
  loading = signal(true);
  isTyping = signal(false);
  chatClosed = signal(false);
  newMessage = '';
  private shouldScroll = false;
  private typingTimeout?: ReturnType<typeof setTimeout>;

  myId() {
    return this.auth.currentUser()?.id ?? 0;
  }

  connectionLabel() {
    const s = this.wsService.connectionStatus();
    if (s === 'connected') return '● Connected';
    if (s === 'connecting') return '○ Connecting...';
    if (s === 'reconnecting') return '○ Reconnecting...';
    return '○ Disconnected';
  }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('conversationId'));
    this.conversationId.set(id);

    this.wsService.connect();
    this.wsService.joinConversation(id);
    this.wsService.markRead(id);

    this.chatService.getMessages(id).subscribe({
      next: msgs => {
        this.messages.set(msgs);
        this.loading.set(false);
        this.shouldScroll = true;
      },
      error: () => this.loading.set(false),
    });

    this.wsSub = this.wsService.messages$.subscribe(msg => this.handleWsMessage(msg));
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  sendMessage() {
    const text = this.newMessage.trim();
    if (!text) return;
    this.wsService.sendMessage(this.conversationId(), text);
    this.newMessage = '';
  }

  onTyping() {
    this.wsService.sendTyping(this.conversationId());
  }

  goBack() {
    this.router.navigate(['/messages']);
  }

  private handleWsMessage(msg: WsMessage) {
    if (msg.type === 'message' || msg.type === 'message_sent') {
      if (msg.conversation_id === this.conversationId()) {
        this.messages.update(msgs => [
          ...msgs,
          {
            id: msg.message_id ?? 0,
            conversation_id: msg.conversation_id!,
            sender_id: msg.sender_id ?? 0,
            content: msg.content ?? '',
            is_read: false,
            created_at: msg.created_at ?? new Date().toISOString(),
            updated_at: msg.created_at ?? new Date().toISOString(),
          },
        ]);
        this.shouldScroll = true;
        this.isTyping.set(false);
      }
    } else if (msg.type === 'typing') {
      if (msg.conversation_id === this.conversationId() && msg.sender_id !== this.myId()) {
        this.isTyping.set(true);
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => this.isTyping.set(false), 3000);
      }
    } else if (msg.type === 'chat_closed') {
      if (msg.conversation_id === this.conversationId()) {
        this.chatClosed.set(true);
      }
    }
  }

  private scrollToBottom() {
    const el = this.messageList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
