import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { ChatService } from '../core/chat.service';
import { AuthService } from '../core/auth.service';
import { Conversation } from '../core/models';
import { TimeAgoPipe } from '../core/pipes';
import { EmptyStateComponent } from '../shared/components/empty-state.component';
import { ErrorFallbackComponent } from '../shared/components/error-fallback.component';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [TranslocoDirective, NhannhtMetroSpinnerComponent, TimeAgoPipe, EmptyStateComponent, ErrorFallbackComponent],
  template: `
    <ng-container *transloco="let t">
      <div class="max-w-[600px] mx-auto p-4 font-body">
        <h2 class="font-display text-[13px] tracking-[2px] text-fg mb-4">{{ t('conversationList.title') }}<span class="animate-pulse">_</span></h2>

        @if (loading()) {
          <div class="flex items-center justify-center min-h-[200px]">
            <nhannht-metro-spinner [size]="36" />
          </div>
        } @else if (error()) {
          <app-error-fallback [title]="t('conversationList.failedToLoadTitle')"
            [message]="t('common.tryAgainLater')" [retryFn]="retryLoad" />
        } @else if (conversations().length === 0) {
          <app-empty-state icon="chat_bubble_outline" [title]="t('conversationList.noConversations')"
            [message]="t('conversationList.noConversationsHint')"
            [actionLabel]="t('conversationList.browseMarketplace')" [action]="goToMarketplace" />
        } @else {
          <div class="flex flex-col">
            @for (conv of conversations(); track conv.id; let last = $last) {
              <button class="w-full text-left bg-transparent px-3 py-2.5
                             cursor-pointer hover:bg-card transition-colors duration-100 border-none"
                      (click)="openConversation(conv)">
                <div class="text-[13px] text-fg font-bold truncate">
                  #{{ conv.task_id }} {{ conv.task?.title || t('conversationList.untitledTask') }}
                </div>
                <div class="flex justify-between items-center gap-2 mt-0.5">
                  <span class="text-[12px] text-muted truncate">
                    {{ getLastMessageLabel(conv) }}
                  </span>
                  <span class="text-[11px] text-muted whitespace-nowrap shrink-0">
                    {{ conv.last_message_at | timeAgo }}
                  </span>
                </div>
              </button>
              @if (!last) {
                <div class="border-t border-border mx-3"></div>
              }
            }
          </div>
        }
      </div>
    </ng-container>
  `,
})
export class ConversationListComponent implements OnInit {
  private chatService = inject(ChatService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private transloco = inject(TranslocoService);

  conversations = signal<Conversation[]>([]);
  loading = signal(true);
  error = signal(false);

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.error.set(false);
    this.chatService.listConversations().subscribe({
      next: convs => {
        this.conversations.set(convs);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  getLastMessageLabel(conv: Conversation): string {
    if (!conv.last_message) return this.transloco.translate('conversationList.noMessagesYet');
    const otherName = this.getOtherName(conv);
    return `${otherName}> ${conv.last_message}`;
  }

  getOtherName(conv: Conversation): string {
    const myId = this.auth.currentUser()?.id;
    if (conv.poster_id === myId) {
      return conv.tasker?.name || this.transloco.translate('messageBubble.defaultUser');
    }
    return conv.poster?.name || this.transloco.translate('messageBubble.defaultUser');
  }

  goToMarketplace = () => this.router.navigate(['/']);
  retryLoad = () => this.load();

  openConversation(conv: Conversation) {
    this.router.navigate(['/messages', conv.id]);
  }
}
