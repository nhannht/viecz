import {
  Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { Subscription } from 'rxjs';
import { ChatService } from '../core/chat.service';
import { WebSocketService, WsMessage } from '../core/websocket.service';
import { AuthService } from '../core/auth.service';
import { Conversation, Message } from '../core/models';
import { MessageBubbleComponent } from '../shared/components/message-bubble.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule, TranslocoDirective, NhannhtMetroSpinnerComponent, MessageBubbleComponent,
  ],
  template: `
    <ng-container *transloco="let t">
      <div class="flex flex-col h-[calc(100vh-96px)] border border-border overflow-hidden bg-card">
        <!-- Header: ← #taskId · taskTitle   ● live -->
        <div class="flex items-center gap-2 px-4 py-2 border-b border-border font-body text-[13px]">
          <button class="bg-transparent border-none cursor-pointer text-muted p-0 hover:text-fg transition-colors"
                  (click)="goBack()">{{ t('chat.backButton') }}</button>
          <span class="flex-1 text-fg font-bold truncate">
            @if (conversation()) {
              #{{ conversation()!.task_id }} · {{ conversation()!.task?.title || t('chat.chatTitle') }}
            } @else {
              #{{ conversationId() }}
            }
          </span>
          <span class="text-[11px] shrink-0"
                [class.text-green-700]="wsService.connectionStatus() === 'connected'"
                [class.text-yellow-600]="wsService.connectionStatus() === 'connecting' || wsService.connectionStatus() === 'reconnecting'"
                [class.text-red-600]="wsService.connectionStatus() === 'disconnected'">
            {{ connectionLabel() }}
          </span>
        </div>

        @if (chatClosed()) {
          <div class="flex items-center gap-2 px-4 py-1.5 bg-bg border-b border-border font-body text-[12px] text-muted">
            <span>{{ t('chat.chatClosed') }}</span>
          </div>
        }

        @if (loading()) {
          <div class="flex items-center justify-center flex-1">
            <nhannht-metro-spinner />
          </div>
        } @else {
          <!-- Message area -->
          <div class="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-0.5" #messageList>
            @if (messages().length === 0) {
              <div class="flex items-center justify-center flex-1 text-muted font-body text-[13px]">
                {{ t('chat.noMessages') }}
              </div>
            }
            @for (msg of messages(); track msg.id) {
              <app-message-bubble
                [message]="msg"
                [isMine]="msg.sender_id === myId()"
                [senderName]="otherName()" />
            }
            @if (isTyping()) {
              <div class="font-body text-[12px] text-muted mt-1">
                {{ otherName() }}{{ t('chat.isTyping') }}<span class="animate-pulse">...</span>
              </div>
            }
          </div>

          <!-- Input area: you> [input] -->
          @if (!chatClosed()) {
            <div class="flex items-center gap-0 px-4 py-2 border-t border-border font-body text-[13px]">
              <span class="text-fg font-bold shrink-0 mr-1">{{ t('chat.you') }}></span>
              <input class="flex-1 bg-transparent border-none text-fg text-[13px] font-body
                            placeholder:text-muted focus:outline-none"
                     [(ngModel)]="newMessage"
                     [placeholder]="t('chat.inputPlaceholder')"
                     (keyup.enter)="sendMessage()"
                     (input)="onTyping()">
              <button class="bg-transparent border border-border text-muted px-2 py-0.5 text-[12px] font-body
                             cursor-pointer hover:text-fg hover:border-fg transition-colors
                             disabled:opacity-30 disabled:cursor-not-allowed"
                      (click)="sendMessage()"
                      [disabled]="!newMessage.trim()">
                {{ t('chat.send') }}
              </button>
            </div>
          }
        }
      </div>
    </ng-container>
  `,
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageList') messageList?: ElementRef<HTMLDivElement>;

  private chatService = inject(ChatService);
  wsService = inject(WebSocketService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private transloco = inject(TranslocoService);
  private wsSub?: Subscription;

  conversationId = signal(0);
  conversation = signal<Conversation | null>(null);
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

  otherName(): string {
    const conv = this.conversation();
    if (!conv) return this.transloco.translate('messageBubble.defaultUser');
    const myId = this.myId();
    if (conv.poster_id === myId) {
      return conv.tasker?.name || this.transloco.translate('messageBubble.defaultUser');
    }
    return conv.poster?.name || this.transloco.translate('messageBubble.defaultUser');
  }

  connectionLabel() {
    const s = this.wsService.connectionStatus();
    if (s === 'connected') return this.transloco.translate('chat.live');
    if (s === 'connecting') return this.transloco.translate('chat.connecting');
    if (s === 'reconnecting') return this.transloco.translate('chat.reconnecting');
    return this.transloco.translate('chat.offline');
  }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('conversationId'));
    this.conversationId.set(id);

    this.wsService.connect();
    this.wsService.joinConversation(id);
    this.wsService.markRead(id);

    this.chatService.getConversation(id).subscribe({
      next: conv => this.conversation.set(conv),
      error: () => {},
    });

    this.chatService.getMessages(id).subscribe({
      next: msgs => {
        this.messages.set(msgs.reverse());
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
