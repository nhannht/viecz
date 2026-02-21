import { Component, input } from '@angular/core';
import { NhannhtMetroIconComponent } from './nhannht-metro-icon.component';
import { Message } from '../../core/models';
import { TimeAgoPipe } from '../../core/pipes';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [NhannhtMetroIconComponent, TimeAgoPipe],
  template: `
    <div class="max-w-[70%] px-3.5 py-2.5 break-words"
         [class]="isMine()
           ? 'self-end bg-fg text-bg'
           : 'self-start bg-card text-fg border border-border'">
      <div class="font-body text-[13px] leading-[1.6]">{{ message().content }}</div>
      <div class="flex items-center gap-1 mt-1 opacity-70 font-body text-[11px]">
        {{ message().created_at | timeAgo }}
        @if (message().is_read && isMine()) {
          <nhannht-metro-icon name="done_all" [size]="12" />
        }
      </div>
    </div>
  `,
})
export class MessageBubbleComponent {
  message = input.required<Message>();
  isMine = input.required<boolean>();
}
