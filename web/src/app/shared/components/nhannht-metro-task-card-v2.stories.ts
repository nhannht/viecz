import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { TaskCardComponent } from './task-card.component';
import { AuthService } from '../../core/auth.service';
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
};

const meta: Meta<TaskCardComponent> = {
  title: 'shared/TaskCard',
  component: TaskCardComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: { currentUser: () => ({ id: 99 }) } },
      ],
    }),
  ],
};

export default meta;
type Story = StoryObj<TaskCardComponent>;

export const OpenTask: Story = {
  args: { task: { ...mockTask, status: 'open' } },
};

export const YourTask: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        { provide: AuthService, useValue: { currentUser: () => ({ id: 10 }) } },
      ],
    }),
  ],
  args: { task: mockTask },
};

export const InProgress: Story = {
  args: {
    task: { ...mockTask, status: 'in_progress', title: 'DELIVER DOCUMENTS TO OFFICE' },
  },
};

export const Completed: Story = {
  args: { task: { ...mockTask, status: 'completed' } },
};
