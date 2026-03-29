import type { Meta, StoryObj } from '@storybook/angular';
import { VieczInputComponent } from './viecz-input.component';

const meta: Meta<VieczInputComponent> = {
  title: 'viecz/Input',
  component: VieczInputComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczInputComponent>;

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
