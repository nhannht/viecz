import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroSpinnerComponent } from './nhannht-metro-spinner.component';

const meta: Meta<NhannhtMetroSpinnerComponent> = {
  title: 'nhannht-metro/Spinner',
  component: NhannhtMetroSpinnerComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<NhannhtMetroSpinnerComponent>;

export const Default: Story = {
  args: { size: 24 },
};

export const Large: Story = {
  args: { size: 48 },
};

export const Small: Story = {
  args: { size: 16 },
};
