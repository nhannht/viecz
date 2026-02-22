import { Component, input, computed, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Message } from '../../core/models';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  template: `
    <div class="flex gap-0 font-body text-[13px] leading-[1.7]"
         [class.opacity-70]="!isMine()">
      <span class="shrink-0 text-muted">[{{ time() }}]</span>
      <span class="shrink-0 font-bold ml-2" [class.text-fg]="isMine()" [class.text-muted]="!isMine()">{{ senderLabel() }}></span>
      <span class="ml-1 text-fg break-words min-w-0">{{ message().content }}</span>
    </div>
  `,
})
export class MessageBubbleComponent {
  private transloco = inject(TranslocoService);

  message = input.required<Message>();
  isMine = input.required<boolean>();
  senderName = input<string>('');

  time = computed(() => {
    const d = new Date(this.message().created_at);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  });

  senderLabel = computed(() => {
    if (this.isMine()) return this.transloco.translate('messageBubble.you');
    return this.senderName() || this.message().sender?.name || this.transloco.translate('messageBubble.defaultUser');
  });
}
