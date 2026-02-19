import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatListItem, MatNavList } from '@angular/material/list';
import { MatDivider } from '@angular/material/divider';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ChatService } from '../core/chat.service';
import { Conversation } from '../core/models';
import { TimeAgoPipe } from '../core/pipes';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [MatIcon, MatListItem, MatNavList, MatDivider, MatProgressSpinner, TimeAgoPipe],
  template: `
    <div class="conv-list-page">
      <h2 class="page-title">Messages</h2>

      @if (loading()) {
        <div class="center">
          <mat-spinner diameter="36"></mat-spinner>
        </div>
      } @else if (conversations().length === 0) {
        <div class="center empty">
          <mat-icon>chat_bubble_outline</mat-icon>
          <p>No conversations yet</p>
        </div>
      } @else {
        <mat-nav-list>
          @for (conv of conversations(); track conv.id) {
            <a mat-list-item (click)="openConversation(conv)">
              <div class="conv-card">
                <div class="conv-info">
                  <span class="conv-task">Task #{{ conv.task_id }}</span>
                  <span class="conv-preview">{{ conv.last_message || 'No messages yet' }}</span>
                </div>
                <span class="conv-time">{{ conv.last_message_at | timeAgo }}</span>
              </div>
            </a>
            <mat-divider></mat-divider>
          }
        </mat-nav-list>
      }
    </div>
  `,
  styles: `
    .conv-list-page { padding: 16px; max-width: 600px; margin: 0 auto; }
    .page-title { margin: 0 0 16px; }
    .center {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 200px; gap: 8px;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.5; }
    .conv-card {
      display: flex; justify-content: space-between; align-items: center;
      width: 100%; gap: 12px;
    }
    .conv-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .conv-task { font-weight: 500; font-size: 0.9rem; }
    .conv-preview {
      font-size: 0.8rem; color: var(--mat-sys-on-surface-variant);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .conv-time { font-size: 0.7rem; color: var(--mat-sys-on-surface-variant); white-space: nowrap; }
  `,
})
export class ConversationListComponent implements OnInit {
  private chatService = inject(ChatService);
  private router = inject(Router);

  conversations = signal<Conversation[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.chatService.listConversations().subscribe({
      next: convs => {
        this.conversations.set(convs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openConversation(conv: Conversation) {
    this.router.navigate(['/messages', conv.id]);
  }
}
