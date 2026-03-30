import type { Meta, StoryObj } from '@storybook/angular';
import { GuideCalloutComponent } from './guide-callout.component';

const meta: Meta<GuideCalloutComponent> = {
  title: 'guide/GuideCallout',
  component: GuideCalloutComponent,
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['tip', 'warning', 'note'] },
  },
};

export default meta;
type Story = StoryObj<GuideCalloutComponent>;

export const Tip: Story = {
  args: { type: 'tip' },
  render: (args) => ({
    props: args,
    template: `<guide-callout [type]="type">Bạn có thể dùng tài khoản Google để đăng nhập nhanh hơn.</guide-callout>`,
  }),
};

export const Warning: Story = {
  args: { type: 'warning' },
  render: (args) => ({
    props: args,
    template: `<guide-callout [type]="type">Không chia sẻ mã OTP với bất kỳ ai. Viecz sẽ không bao giờ hỏi mã OTP của bạn.</guide-callout>`,
  }),
};

export const Note: Story = {
  args: { type: 'note' },
  render: (args) => ({
    props: args,
    template: `<guide-callout [type]="type">Số dư ví tối đa là 200.000 VND trong giai đoạn beta.</guide-callout>`,
  }),
};
