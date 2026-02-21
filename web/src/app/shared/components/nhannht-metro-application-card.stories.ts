import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { NhannhtMetroApplicationCardComponent } from './nhannht-metro-application-card.component';
import type { TaskApplication } from '../../core/models';

const mockApp: TaskApplication = {
  id: 1,
  task_id: 10,
  tasker_id: 5,
  proposed_price: 180000,
  message: 'I can help with this! I have experience moving heavy items and I am free this Saturday afternoon.',
  status: 'pending',
  created_at: '2026-02-20T14:30:00Z',
  updated_at: '2026-02-20T14:30:00Z',
};

const meta: Meta<NhannhtMetroApplicationCardComponent> = {
  title: 'nhannht-metro/ApplicationCard',
  component: NhannhtMetroApplicationCardComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [RouterTestingModule] }),
  ],
};

export default meta;
type Story = StoryObj<NhannhtMetroApplicationCardComponent>;

export const Pending: Story = {
  args: { application: mockApp, showAccept: true },
};

export const Accepted: Story = {
  args: { application: { ...mockApp, status: 'accepted' } },
};

export const Rejected: Story = {
  args: { application: { ...mockApp, status: 'rejected' } },
};

export const NoMessage: Story = {
  args: { application: { ...mockApp, message: undefined, proposed_price: undefined } },
};
