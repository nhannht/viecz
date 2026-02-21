import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroSnackbarComponent } from './nhannht-metro-snackbar.component';

const meta: Meta<NhannhtMetroSnackbarComponent> = {
  title: 'nhannht-metro/Snackbar',
  component: NhannhtMetroSnackbarComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<NhannhtMetroSnackbarComponent>;

export const Default: Story = {
  args: { visible: true, message: 'Task created successfully' },
};

export const WithAction: Story = {
  args: { visible: true, message: 'Task deleted', actionLabel: 'UNDO' },
};

export const Error: Story = {
  args: { visible: true, message: 'Failed to save changes' },
};
