import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroDatepickerComponent } from './nhannht-metro-datepicker.component';

const meta: Meta<NhannhtMetroDatepickerComponent> = {
  title: 'nhannht-metro/Datepicker',
  component: NhannhtMetroDatepickerComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<NhannhtMetroDatepickerComponent>;

export const Default: Story = {
  args: { label: 'Deadline' },
};

export const WithMinDate: Story = {
  args: { label: 'Start Date', min: '2026-01-01' },
};

export const WithError: Story = {
  args: { label: 'Deadline', error: 'Deadline is required' },
};
