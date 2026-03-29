import type { Meta, StoryObj } from '@storybook/angular';
import { MessageBubbleComponent } from './message-bubble.component';
import type { Message } from '../../core/models';

const myMessage: Message = {
  id: 1,
  conversation_id: 1,
  sender_id: 10,
  content: 'Hi! I can help you with that task. When would be a good time?',
  is_read: true,
  created_at: '2026-02-20T15:30:00Z',
  updated_at: '2026-02-20T15:30:00Z',
};

const theirMessage: Message = {
  id: 2,
  conversation_id: 1,
  sender_id: 5,
  content: 'Great! How about Saturday morning at 9am? The parking lot is right next to building A.',
  is_read: false,
  created_at: '2026-02-20T15:32:00Z',
  updated_at: '2026-02-20T15:32:00Z',
  sender: { id: 5, name: 'Minh Tran' },
};

const meta: Meta<MessageBubbleComponent> = {
  title: 'viecz/MessageBubble',
  component: MessageBubbleComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<MessageBubbleComponent>;

export const Mine: Story = {
  args: { message: myMessage, isMine: true },
};

export const Theirs: Story = {
  args: { message: theirMessage, isMine: false },
};

export const WithSenderName: Story = {
  args: { message: theirMessage, isMine: false, senderName: 'Minh Tran' },
};

export const Conversation: Story = {
  render: () => ({
    template: `
      <div style="max-width: 600px;">
        <app-message-bubble [message]="their1" [isMine]="false" senderName="Minh Tran" />
        <app-message-bubble [message]="my1" [isMine]="true" />
        <app-message-bubble [message]="their2" [isMine]="false" senderName="Minh Tran" />
        <app-message-bubble [message]="my2" [isMine]="true" />
      </div>
    `,
    props: {
      their1: { ...theirMessage, content: 'Hey, is the task still available?' },
      my1: myMessage,
      their2: theirMessage,
      my2: { ...myMessage, id: 3, content: 'See you there!', created_at: '2026-02-20T15:35:00Z' },
    },
  }),
};
