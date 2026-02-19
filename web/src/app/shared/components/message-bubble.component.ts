import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Message } from '../../core/models';
import { TimeAgoPipe } from '../../core/pipes';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [MatIcon, TimeAgoPipe],
  template: `
    <div class="msg-bubble" [class.mine]="isMine()" [class.theirs]="!isMine()">
      <div class="msg-content">{{ message().content }}</div>
      <div class="msg-time">
        {{ message().created_at | timeAgo }}
        @if (message().is_read && isMine()) {
          <mat-icon class="read-icon">done_all</mat-icon>
        }
      </div>
    </div>
  `,
  styles: `
    .msg-bubble {
      max-width: 70%;
      padding: 10px 14px;
      border-radius: 16px;
      word-wrap: break-word;
    }
    .msg-bubble.mine {
      align-self: flex-end;
      background: var(--mat-sys-primary, #6750a4);
      color: var(--mat-sys-on-primary, #fff);
      border-bottom-right-radius: 4px;
    }
    .msg-bubble.theirs {
      align-self: flex-start;
      background: var(--mat-sys-surface-container-high, #e6e0e9);
      border-bottom-left-radius: 4px;
    }
    .msg-content {
      font-size: 0.875rem;
      line-height: 1.4;
    }
    .msg-time {
      font-size: 0.65rem;
      opacity: 0.7;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .read-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }
  `,
})
export class MessageBubbleComponent {
  message = input.required<Message>();
  isMine = input.required<boolean>();
}
