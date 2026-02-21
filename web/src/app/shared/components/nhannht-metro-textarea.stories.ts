import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroTextareaComponent } from './nhannht-metro-textarea.component';

const meta: Meta<NhannhtMetroTextareaComponent> = {
  title: 'nhannht-metro/Textarea',
  component: NhannhtMetroTextareaComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<NhannhtMetroTextareaComponent>;

export const Default: Story = {
  args: { label: 'Description', placeholder: 'Describe your task...' },
};

export const WithError: Story = {
  args: { label: 'Description', placeholder: 'Describe...', error: 'Description is required' },
};
