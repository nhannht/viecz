import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal, Component, input } from '@angular/core';
import { TaskCardComponent } from './task-card.component';
import { AuthService } from '../../core/auth.service';
import { Task, User } from '../../core/models';

const mockTask: Task = {
  id: 1,
  requester_id: 1,
  category_id: 2,
  title: 'Deliver lunch from cafeteria',
  description: 'Need someone to pick up 2 lunch boxes from the cafeteria near the main gate.',
  price: 20000,
  location: 'Cafeteria near main gate',
  status: 'open',
  deadline: '2026-12-15T12:00:00Z',
  created_at: '2026-02-14T10:00:00Z',
  updated_at: '2026-02-14T10:00:00Z',
};

const longDescTask: Task = {
  ...mockTask,
  description: 'A'.repeat(200),
};

const noDeadlineTask: Task = {
  ...mockTask,
  deadline: undefined,
};

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  university: 'DHQG-HCM',
  is_verified: false,
  rating: 0,
  total_tasks_completed: 0,
  total_tasks_posted: 0,
  total_earnings: 0,
  is_tasker: false,
  auth_provider: 'email',
  email_verified: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// Wrapper component to supply required input
@Component({
  standalone: true,
  imports: [TaskCardComponent],
  template: `<app-task-card [task]="task" />`,
})
class TestHostComponent {
  task: Task = mockTask;
}

describe('TaskCardComponent', () => {
  let authService: { currentUser: ReturnType<typeof signal<User | null>> };

  function createFixture(task: Task = mockTask) {
    authService = { currentUser: signal<User | null>(null) };

    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: authService },
      ],
    });
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.task = task;
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the task title', () => {
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Deliver lunch from cafeteria');
  });

  it('should display the task price formatted as VND', () => {
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('20.000');
    expect(el.textContent).toContain('₫');
  });

  it('should display the task location', () => {
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Cafeteria near main gate');
  });

  it('should display the task status', () => {
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('OPEN');
  });

  it('should truncate long descriptions', () => {
    const fixture = createFixture(longDescTask);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('...');
  });

  it('should NOT show "YOUR TASK" badge when user is not the owner', () => {
    const fixture = createFixture();
    authService.currentUser.set({ ...mockUser, id: 999 });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('YOUR TASK');
  });

  it('should show "YOUR TASK" badge when user is the owner', () => {
    const fixture = createFixture();
    authService.currentUser.set(mockUser); // id: 1 matches requester_id: 1
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('YOUR TASK');
  });

  it('should show deadline when present', () => {
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;
    const icons = el.querySelectorAll('nhannht-metro-icon');
    const scheduleIcon = Array.from(icons).find(i => i.textContent?.includes('schedule'));
    expect(scheduleIcon).toBeTruthy();
  });

  it('should not show deadline when absent', () => {
    const fixture = createFixture(noDeadlineTask);
    const el = fixture.nativeElement as HTMLElement;
    const icons = el.querySelectorAll('nhannht-metro-icon');
    const scheduleIcon = Array.from(icons).find(i => i.textContent?.includes('schedule'));
    expect(scheduleIcon).toBeFalsy();
  });
});
