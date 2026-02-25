import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { NhannhtMetroTaskCardComponent } from './nhannht-metro-task-card.component';
import type { Task } from '../../core/models';

const mockTask: Task = {
  id: 1,
  requester_id: 10,
  category_id: 1,
  title: 'HELP MOVE FURNITURE TO DORM ROOM',
  description: 'Need someone to help carry furniture from the parking lot to my dorm room on the 5th floor. About 4 boxes and a desk. Should take around 2 hours.',
  price: 200000,
  location: 'HCMUS Linh Trung',
  status: 'open',
  deadline: '2026-03-15T00:00:00Z',
  created_at: '2026-02-20T10:00:00Z',
  updated_at: '2026-02-20T10:00:00Z',
  category: { id: 1, name: 'Delivery', name_vi: 'Giao hàng', is_active: true },
  application_count: 3,
};

const meta: Meta<NhannhtMetroTaskCardComponent> = {
  title: 'nhannht-metro/TaskCard',
  component: NhannhtMetroTaskCardComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [RouterTestingModule] }),
  ],
};

export default meta;
type Story = StoryObj<NhannhtMetroTaskCardComponent>;

export const Open: Story = {
  args: { task: { ...mockTask, status: 'open' } },
};

export const InProgress: Story = {
  args: { task: { ...mockTask, status: 'in_progress', title: 'DELIVER DOCUMENTS TO OFFICE' } },
};

export const Completed: Story = {
  args: { task: { ...mockTask, status: 'completed' } },
};

export const OwnTask: Story = {
  args: { task: mockTask, isOwner: true },
};

export const NoApplications: Story = {
  args: { task: { ...mockTask, application_count: 0, title: 'TUTOR FOR CALCULUS EXAM' } },
};

export const NoCategory: Story = {
  args: { task: { ...mockTask, category: undefined, title: 'CLEAN APARTMENT BEFORE CHECKOUT' } },
};
