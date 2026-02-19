import {
  Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatListItem, MatNavList } from '@angular/material/list';
import { MatDivider } from '@angular/material/divider';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { ChatService } from '../core/chat.service';
import { WebSocketService, WsMessage } from '../core/websocket.service';
import { AuthService } from '../core/auth.service';
import { Conversation, Message } from '../core/models';
import { TimeAgoPipe } from '../core/pipes';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule,
    MatIconButton,
    MatIcon,
    MatFormField,
    MatInput,
    MatListItem,
    MatNavList,
    MatDivider,
    MatProgressSpinner,
    TimeAgoPipe,
  ],
  template: `
    <div class="chat-container">
      <div class="conv-list" [class.hidden-mobile]="activeConversation()">
        <div class="conv-header">
          <h3>Conversations</h3>
        </div>
        @if (loadingConvs()) {
          <div class="loading"><mat-spinner diameter="30"></mat-spinner></div>
        } @else if (conversations().length === 0) {
          <div class="empty">
            <mat-icon>chat_bubble_outline</mat-icon>
            <p>No conversations yet</p>
          </div>
        } @else {
          <mat-nav-list>
            @for (conv of conversations(); track conv.id) {
              <a mat-list-item (click)="selectConversation(conv)"
                 [class.active-conv]="activeConversation()?.id === conv.id">
                <div class="conv-item">
                  <div class="conv-name">Task #{{ conv.task_id }}</div>
                  <div class="conv-preview">{{ conv.last_message || 'No messages' }}</div>
                  <div class="conv-time">{{ conv.last_message_at | timeAgo }}</div>
                </div>
              </a>
              <mat-divider></mat-divider>
            }
          </mat-nav-list>
        }
      </div>

      <div class="message-area" [class.hidden-mobile]="!activeConversation()">
        @if (!activeConversation()) {
          <div class="no-conv-selected">
            <mat-icon>forum</mat-icon>
            <p>Select a conversation to start chatting</p>
          </div>
        } @else {
          <div class="msg-header">
            <button mat-icon-button class="back-btn" (click)="activeConversation.set(null)">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <span>Task #{{ activeConversation()!.task_id }}</span>
          </div>
          <div class="msg-list" #messageList>
            @for (msg of messages(); track msg.id) {
              <div class="msg-bubble" [class.mine]="msg.sender_id === myId()"
                   [class.theirs]="msg.sender_id !== myId()">
                <div class="msg-content">{{ msg.content }}</div>
                <div class="msg-time">
                  {{ msg.created_at | timeAgo }}
                  @if (msg.is_read && msg.sender_id === myId()) {
                    <mat-icon class="read-icon">done_all</mat-icon>
                  }
                </div>
              </div>
            }
            @if (isTyping()) {
              <div class="typing-indicator">Typing...</div>
            }
          </div>
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
      </div>
    </div>
  `,
  styles: `
    .chat-container {
      display: flex;
      height: calc(100vh - 96px);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      overflow: hidden;
      background: var(--mat-sys-surface);
    }
    .conv-list {
      width: 320px;
      min-width: 320px;
      border-right: 1px solid var(--mat-sys-outline-variant);
      overflow-y: auto;
    }
    .conv-header {
      padding: 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .conv-header h3 { margin: 0; }
    .message-area { flex: 1; display: flex; flex-direction: column; }
    .loading, .empty, .no-conv-selected {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%; gap: 8px;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty mat-icon, .no-conv-selected mat-icon {
      font-size: 48px; width: 48px; height: 48px; opacity: 0.5;
    }
    .conv-item { width: 100%; }
    .conv-name { font-weight: 500; font-size: 0.875rem; }
    .conv-preview {
      font-size: 0.8rem; color: var(--mat-sys-on-surface-variant);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .conv-time { font-size: 0.7rem; color: var(--mat-sys-on-surface-variant); }
    .active-conv { background: var(--mat-sys-secondary-container) !important; }
    .msg-header {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      font-weight: 500;
    }
    .back-btn { display: none; }
    .msg-list {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .msg-bubble { max-width: 70%; padding: 10px 14px; border-radius: 16px; }
    .msg-bubble.mine {
      align-self: flex-end;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      border-bottom-right-radius: 4px;
    }
    .msg-bubble.theirs {
      align-self: flex-start;
      background: var(--mat-sys-surface-container-high);
      border-bottom-left-radius: 4px;
    }
    .msg-content { font-size: 0.875rem; line-height: 1.4; }
    .msg-time {
      font-size: 0.65rem; opacity: 0.7; margin-top: 4px;
      display: flex; align-items: center; gap: 4px;
    }
    .read-icon { font-size: 12px; width: 12px; height: 12px; }
    .typing-indicator {
      font-size: 0.8rem; color: var(--mat-sys-on-surface-variant);
      font-style: italic; padding: 4px 16px;
    }
    .msg-input {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .msg-field { flex: 1; margin-bottom: -22px; }
    @media (max-width: 768px) {
      .conv-list { width: 100%; min-width: 100%; }
      .hidden-mobile { display: none !important; }
      .back-btn { display: inline-flex !important; }
      .message-area { width: 100%; }
    }
  `,
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageList') messageList?: ElementRef<HTMLDivElement>;

  private chatService = inject(ChatService);
  private wsService = inject(WebSocketService);
  private auth = inject(AuthService);
  private wsSub?: Subscription;

  conversations = signal<Conversation[]>([]);
  activeConversation = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  loadingConvs = signal(true);
  isTyping = signal(false);
  newMessage = '';
  private shouldScroll = false;
  private typingTimeout?: ReturnType<typeof setTimeout>;

  myId() {
    return this.auth.currentUser()?.id ?? 0;
  }

  ngOnInit() {
    this.wsService.connect();
    this.chatService.listConversations().subscribe({
      next: convs => {
        this.conversations.set(convs);
        this.loadingConvs.set(false);
      },
      error: () => this.loadingConvs.set(false),
    });
    this.wsSub = this.wsService.messages$.subscribe(msg => this.handleWsMessage(msg));
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  selectConversation(conv: Conversation) {
    this.activeConversation.set(conv);
    this.messages.set([]);
    this.wsService.joinConversation(conv.id);
    this.wsService.markRead(conv.id);
    this.chatService.getMessages(conv.id).subscribe({
      next: msgs => {
        this.messages.set(msgs);
        this.shouldScroll = true;
      },
    });
  }

  sendMessage() {
    const text = this.newMessage.trim();
    if (!text || !this.activeConversation()) return;
    this.wsService.sendMessage(this.activeConversation()!.id, text);
    this.newMessage = '';
  }

  onTyping() {
    if (this.activeConversation()) {
      this.wsService.sendTyping(this.activeConversation()!.id);
    }
  }

  private handleWsMessage(msg: WsMessage) {
    if (msg.type === 'message' || msg.type === 'message_sent') {
      if (msg.conversation_id === this.activeConversation()?.id) {
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
      if (msg.conversation_id === this.activeConversation()?.id && msg.sender_id !== this.myId()) {
        this.isTyping.set(true);
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => this.isTyping.set(false), 3000);
      }
    }
  }

  private scrollToBottom() {
    const el = this.messageList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
