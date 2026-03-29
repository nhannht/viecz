import type { Meta, StoryObj } from '@storybook/angular';
import { VieczDatepickerComponent } from './viecz-datepicker.component';

const meta: Meta<VieczDatepickerComponent> = {
  title: 'viecz/Datepicker',
  component: VieczDatepickerComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczDatepickerComponent>;

export const Default: Story = {
  args: { label: 'Deadline' },
};

export const WithMinDate: Story = {
  args: { label: 'Start Date', min: '2026-01-01' },
};

export const WithError: Story = {
  args: { label: 'Deadline', error: 'Deadline is required' },
};
