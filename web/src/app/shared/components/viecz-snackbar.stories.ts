import type { Meta, StoryObj } from '@storybook/angular';
import { VieczSnackbarComponent } from './viecz-snackbar.component';

const meta: Meta<VieczSnackbarComponent> = {
  title: 'viecz/Snackbar',
  component: VieczSnackbarComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczSnackbarComponent>;

export const Default: Story = {
  args: { visible: true, message: 'Task created successfully' },
};

export const WithAction: Story = {
  args: { visible: true, message: 'Task deleted', actionLabel: 'UNDO' },
};

export const Error: Story = {
  args: { visible: true, message: 'Failed to save changes' },
};
