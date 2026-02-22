import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
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
  imports: [NhannhtMetroSpinnerComponent, TimeAgoPipe, EmptyStateComponent, ErrorFallbackComponent],
  template: `
    <div class="max-w-[600px] mx-auto p-4 font-body">
      <h2 class="font-display text-[13px] tracking-[2px] text-fg mb-4">> MESSAGES<span class="animate-pulse">_</span></h2>

      @if (loading()) {
        <div class="flex items-center justify-center min-h-[200px]">
          <nhannht-metro-spinner [size]="36" />
        </div>
      } @else if (error()) {
        <app-error-fallback title="Failed to load conversations"
          message="Please try again later." [retryFn]="retryLoad" />
      } @else if (conversations().length === 0) {
        <app-empty-state icon="chat_bubble_outline" title="No conversations yet"
          message="Apply to tasks to start chatting"
          actionLabel="Browse Marketplace" [action]="goToMarketplace" />
      } @else {
        <div class="flex flex-col">
          @for (conv of conversations(); track conv.id; let last = $last) {
            <button class="w-full text-left bg-transparent px-3 py-2.5
                           cursor-pointer hover:bg-card transition-colors duration-100 border-none"
                    (click)="openConversation(conv)">
              <div class="text-[13px] text-fg font-bold truncate">
                #{{ conv.task_id }} {{ conv.task?.title || 'Untitled task' }}
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
  `,
})
export class ConversationListComponent implements OnInit {
  private chatService = inject(ChatService);
  private auth = inject(AuthService);
  private router = inject(Router);

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
    if (!conv.last_message) return '~ no messages yet';
    const myId = this.auth.currentUser()?.id;
    const otherName = this.getOtherName(conv);
    // Determine who sent the last message based on available info
    // We show "you>" or "otherName>" prefix
    return `${otherName}> ${conv.last_message}`;
  }

  getOtherName(conv: Conversation): string {
    const myId = this.auth.currentUser()?.id;
    if (conv.poster_id === myId) {
      return conv.tasker?.name || 'user';
    }
    return conv.poster?.name || 'user';
  }

  goToMarketplace = () => this.router.navigate(['/']);
  retryLoad = () => this.load();

  openConversation(conv: Conversation) {
    this.router.navigate(['/messages', conv.id]);
  }
}
