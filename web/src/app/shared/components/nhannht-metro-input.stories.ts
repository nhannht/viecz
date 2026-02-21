import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroInputComponent } from './nhannht-metro-input.component';

const meta: Meta<NhannhtMetroInputComponent> = {
  title: 'nhannht-metro/Input',
  component: NhannhtMetroInputComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<NhannhtMetroInputComponent>;

export const Default: Story = {
  args: { label: 'Email', placeholder: 'you@example.com', type: 'email' },
};

export const Password: Story = {
  args: { label: 'Password', placeholder: 'Enter password', type: 'password' },
};

export const WithError: Story = {
  args: { label: 'Email', placeholder: 'you@example.com', error: 'Email is required' },
};

export const NoLabel: Story = {
  args: { placeholder: 'Search tasks...' },
};
