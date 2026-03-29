import type { Meta, StoryObj } from '@storybook/angular';
import { VieczTextareaComponent } from './viecz-textarea.component';

const meta: Meta<VieczTextareaComponent> = {
  title: 'viecz/Textarea',
  component: VieczTextareaComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczTextareaComponent>;

export const Default: Story = {
  args: { label: 'Description', placeholder: 'Describe your task...' },
};

export const WithError: Story = {
  args: { label: 'Description', placeholder: 'Describe...', error: 'Description is required' },
};
