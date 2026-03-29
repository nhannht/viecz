import type { Meta, StoryObj } from '@storybook/angular';
import { VieczDialogComponent } from './viecz-dialog.component';

const meta: Meta<VieczDialogComponent> = {
  title: 'viecz/Dialog',
  component: VieczDialogComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczDialogComponent>;

export const Default: Story = {
  render: (args) => ({
    props: { ...args, open: true, title: 'CONFIRM ACTION', confirmLabel: 'Yes', cancelLabel: 'No' },
    template: `
      <viecz-dialog [open]="open" [title]="title" [confirmLabel]="confirmLabel" [cancelLabel]="cancelLabel">
        Are you sure you want to proceed? This action cannot be undone.
      </viecz-dialog>
    `,
  }),
};

export const DeleteConfirmation: Story = {
  render: (args) => ({
    props: { ...args, open: true, title: 'DELETE TASK', confirmLabel: 'Delete', cancelLabel: 'Cancel' },
    template: `
      <viecz-dialog [open]="open" [title]="title" [confirmLabel]="confirmLabel" [cancelLabel]="cancelLabel">
        This will permanently delete the task and all associated data.
      </viecz-dialog>
    `,
  }),
};
