import { Component, input } from '@angular/core';
import { VieczIconComponent } from './viecz-icon.component';
import { TimeAgoPipe } from '../../core/pipes';
import type { Message } from '../../core/models';

/**
 * Chat message bubble with mine/theirs alignment.
 *
 * - **Mine**: right-aligned, `--fg` background, `--bg` text
 * - **Theirs**: left-aligned, `--card` background with `--border` border
 *
 * Shows read receipt icon (double check) for sent messages.
 *
 * Replaces the Material-themed message bubble component.
 *
 * @example
 * ```html
 * <viecz-chat-bubble [message]="msg" [isMine]="true" />
 * ```
 */
@Component({
  selector: 'viecz-chat-bubble',
  standalone: true,
  imports: [VieczIconComponent, TimeAgoPipe],
  template: `
    <div class="flex mb-3"
         [class.justify-end]="isMine()"
         [class.justify-start]="!isMine()">
      <div class="max-w-[70%] px-4 py-3 font-body text-[13px] leading-[1.7]"
           [class]="isMine()
             ? 'bg-fg text-bg border border-fg'
             : 'bg-card text-fg border border-border'">
        <p>{{ message().content }}</p>
        <div class="flex items-center gap-1 mt-1"
             [class.justify-end]="isMine()">
          <span class="text-[10px] opacity-60">{{ message().created_at | timeAgo }}</span>
          @if (isMine() && message().is_read) {
            <viecz-icon name="done_all" [size]="12" />
          }
        </div>
      </div>
    </div>
  `,
})
export class VieczChatBubbleComponent {
  /** Message data object. */
  message = input.required<Message>();

  /** When true, renders as sent message (right-aligned, dark background). */
  isMine = input(false);
}
