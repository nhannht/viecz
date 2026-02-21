import {
  Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
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
    FormsModule, NhannhtMetroIconComponent,
    NhannhtMetroSpinnerComponent, MessageBubbleComponent,
  ],
  template: `
    <div class="flex flex-col h-[calc(100vh-96px)] border border-border overflow-hidden bg-card">
      <div class="chat-header flex items-center gap-2 px-4 py-2 border-b border-border">
        <button class="bg-transparent border-none cursor-pointer text-fg p-1 hover:opacity-70 transition-opacity"
                (click)="goBack()">
          <nhannht-metro-icon name="arrow_back" [size]="20" />
        </button>
        <span class="chat-title flex-1 font-display text-[11px] tracking-[1px] text-fg">
          Conversation #{{ conversationId() }}
        </span>
        <span class="connection-status font-body text-[10px] px-2 py-0.5 border"
              [class]="wsService.connectionStatus()">
          {{ connectionLabel() }}
        </span>
      </div>

      @if (chatClosed()) {
        <div class="flex items-center gap-2 px-4 py-2 bg-bg border-b border-border font-body text-[13px] text-muted">
          <nhannht-metro-icon name="lock" [size]="16" />
          <span>This chat is closed</span>
        </div>
      }

      @if (loading()) {
        <div class="flex items-center justify-center flex-1">
          <nhannht-metro-spinner [size]="30" />
        </div>
      } @else {
        <div class="msg-list flex-1 overflow-y-auto p-4 flex flex-col gap-2" #messageList>
          @if (messages().length === 0) {
            <div class="flex flex-col items-center justify-center flex-1 gap-2 text-muted">
              <nhannht-metro-icon name="chat" [size]="48" />
              <p class="font-body text-[13px]">No messages yet. Say hello!</p>
            </div>
          }
          @for (msg of messages(); track msg.id) {
            <app-message-bubble [message]="msg" [isMine]="msg.sender_id === myId()" />
          }
          @if (isTyping()) {
            <div class="typing-indicator font-body text-[12px] text-muted italic py-1">Typing...</div>
          }
        </div>

        @if (!chatClosed()) {
          <div class="flex items-center gap-2 px-4 py-2 border-t border-border">
            <div class="flex-1">
              <input class="w-full px-4 py-3 bg-card border border-border font-body text-[13px] text-fg
                            placeholder:text-muted focus:border-fg focus:outline-none transition-colors duration-200"
                     [(ngModel)]="newMessage"
                     placeholder="Type a message..."
                     (keyup.enter)="sendMessage()"
                     (input)="onTyping()">
            </div>
            <button class="bg-fg text-bg border-2 border-fg p-2 cursor-pointer
                           hover:bg-transparent hover:text-fg transition-all duration-200
                           disabled:opacity-40 disabled:cursor-not-allowed"
                    (click)="sendMessage()"
                    [disabled]="!newMessage.trim()">
              <nhannht-metro-icon name="send" [size]="20" />
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .connection-status.connected { background: #c8e6c9; color: #2e7d32; border-color: #2e7d32; }
    .connection-status.connecting, .connection-status.reconnecting { background: #fff9c4; color: #f57f17; border-color: #f57f17; }
    .connection-status.disconnected { background: #ffcdd2; color: #c62828; border-color: #c62828; }
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
