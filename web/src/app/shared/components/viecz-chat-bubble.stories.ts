import type { Meta, StoryObj } from '@storybook/angular';
import { VieczChatBubbleComponent } from './viecz-chat-bubble.component';
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
};

const meta: Meta<VieczChatBubbleComponent> = {
  title: 'viecz/ChatBubble',
  component: VieczChatBubbleComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczChatBubbleComponent>;

export const Mine: Story = {
  args: { message: myMessage, isMine: true },
};

export const Theirs: Story = {
  args: { message: theirMessage, isMine: false },
};

export const ReadReceipt: Story = {
  args: { message: { ...myMessage, is_read: true }, isMine: true },
};

export const Conversation: Story = {
  render: () => ({
    template: `
      <div style="max-width: 500px;">
        <viecz-chat-bubble [message]="their1" [isMine]="false" />
        <viecz-chat-bubble [message]="my1" [isMine]="true" />
        <viecz-chat-bubble [message]="their2" [isMine]="false" />
      </div>
    `,
    props: {
      their1: { ...theirMessage, content: 'Hey, is the task still available?' },
      my1: myMessage,
      their2: theirMessage,
    },
  }),
};
