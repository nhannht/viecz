import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { VieczApplicationCardComponent } from './viecz-application-card.component';
import type { TaskApplication } from '../../core/models';

const mockApp: TaskApplication = {
  id: 1,
  task_id: 10,
  tasker_id: 5,
  tasker: { id: 5, name: 'Tran Minh B', email: 'b@test.com', university: 'ĐHQG-HCM', is_verified: true, rating: 4.5, total_tasks_completed: 12, total_tasks_posted: 0, total_earnings: 0, auth_provider: 'email', email_verified: true, phone_verified: false, created_at: '' } as any,
  proposed_price: 180000,
  message: 'I can help with this! I have experience moving heavy items and I am free this Saturday afternoon.',
  status: 'pending',
  created_at: '2026-02-20T14:30:00Z',
  updated_at: '2026-02-20T14:30:00Z',
};

const meta: Meta<VieczApplicationCardComponent> = {
  title: 'viecz/ApplicationCard',
  component: VieczApplicationCardComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [RouterTestingModule] }),
  ],
};

export default meta;
type Story = StoryObj<VieczApplicationCardComponent>;

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
