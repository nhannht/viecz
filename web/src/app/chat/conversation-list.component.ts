import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { NhannhtMetroDividerComponent } from '../shared/components/nhannht-metro-divider.component';
import { ChatService } from '../core/chat.service';
import { Conversation } from '../core/models';
import { TimeAgoPipe } from '../core/pipes';
import { EmptyStateComponent } from '../shared/components/empty-state.component';
import { ErrorFallbackComponent } from '../shared/components/error-fallback.component';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [NhannhtMetroSpinnerComponent, NhannhtMetroDividerComponent, TimeAgoPipe, EmptyStateComponent, ErrorFallbackComponent],
  template: `
    <div class="max-w-[600px] mx-auto p-4">
      <h2 class="font-display text-[13px] tracking-[2px] text-fg mb-4">MESSAGES</h2>

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
        <div class="border border-border">
          @for (conv of conversations(); track conv.id) {
            <button class="w-full text-left bg-card px-4 py-3 flex justify-between items-center gap-3
                           cursor-pointer hover:bg-bg transition-colors duration-150 border-none"
                    (click)="openConversation(conv)">
              <div class="flex flex-col min-w-0 flex-1">
                <span class="font-body text-[13px] font-bold text-fg">Task #{{ conv.task_id }}</span>
                <span class="font-body text-[12px] text-muted truncate">
                  {{ conv.last_message || 'No messages yet' }}
                </span>
              </div>
              <span class="font-body text-[11px] text-muted whitespace-nowrap">
                {{ conv.last_message_at | timeAgo }}
              </span>
            </button>
            <nhannht-metro-divider />
          }
        </div>
      }
    </div>
  `,
})
export class ConversationListComponent implements OnInit {
  private chatService = inject(ChatService);
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

  goToMarketplace = () => this.router.navigate(['/']);
  retryLoad = () => this.load();

  openConversation(conv: Conversation) {
    this.router.navigate(['/messages', conv.id]);
  }
}
