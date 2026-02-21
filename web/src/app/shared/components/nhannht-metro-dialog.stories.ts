import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroDialogComponent } from './nhannht-metro-dialog.component';

const meta: Meta<NhannhtMetroDialogComponent> = {
  title: 'nhannht-metro/Dialog',
  component: NhannhtMetroDialogComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<NhannhtMetroDialogComponent>;

export const Default: Story = {
  render: (args) => ({
    props: { ...args, open: true, title: 'CONFIRM ACTION', confirmLabel: 'Yes', cancelLabel: 'No' },
    template: `
      <nhannht-metro-dialog [open]="open" [title]="title" [confirmLabel]="confirmLabel" [cancelLabel]="cancelLabel">
        Are you sure you want to proceed? This action cannot be undone.
      </nhannht-metro-dialog>
    `,
  }),
};

export const DeleteConfirmation: Story = {
  render: (args) => ({
    props: { ...args, open: true, title: 'DELETE TASK', confirmLabel: 'Delete', cancelLabel: 'Cancel' },
    template: `
      <nhannht-metro-dialog [open]="open" [title]="title" [confirmLabel]="confirmLabel" [cancelLabel]="cancelLabel">
        This will permanently delete the task and all associated data.
      </nhannht-metro-dialog>
    `,
  }),
};
