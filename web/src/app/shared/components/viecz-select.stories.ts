import type { Meta, StoryObj } from '@storybook/angular';
import { VieczSelectComponent } from './viecz-select.component';

const meta: Meta<VieczSelectComponent> = {
  title: 'viecz/Select',
  component: VieczSelectComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczSelectComponent>;

export const Default: Story = {
  args: {
    label: 'Category',
    placeholder: 'Select a category',
    options: [
      { value: 'design', label: 'Design' },
      { value: 'dev', label: 'Development' },
      { value: 'writing', label: 'Writing' },
    ],
  },
};

export const WithError: Story = {
  args: {
    label: 'Category',
    placeholder: 'Select...',
    options: [
      { value: 'design', label: 'Design' },
      { value: 'dev', label: 'Development' },
    ],
    error: 'Category is required',
  },
};
