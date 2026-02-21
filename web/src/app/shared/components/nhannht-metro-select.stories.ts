import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroSelectComponent } from './nhannht-metro-select.component';

const meta: Meta<NhannhtMetroSelectComponent> = {
  title: 'nhannht-metro/Select',
  component: NhannhtMetroSelectComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<NhannhtMetroSelectComponent>;

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
