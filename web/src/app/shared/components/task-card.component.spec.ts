import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal, Component, input } from '@angular/core';
import { TaskCardComponent } from './task-card.component';
import { AuthService } from '../../core/auth.service';
import { Task, User } from '../../core/models';
import { provideTranslocoForTesting } from '../../core/transloco-testing';

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
  phone_verified: false,
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
        provideTranslocoForTesting(),
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

  it('should show deadline as formatted date when present', () => {
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;
    // Deadline '2026-12-15T12:00:00Z' should render as dd/MM/yyyy
    expect(el.textContent).toContain('15/12/2026');
  });

  it('should not show deadline when absent', () => {
    const fixture = createFixture(noDeadlineTask);
    const el = fixture.nativeElement as HTMLElement;
    // The first metadata row should have no schedule icon (deadline absent),
    // but the second row (time ago) always has one — so count schedule icons.
    const scheduleIcons = Array.from(el.querySelectorAll('nhannht-metro-icon'))
      .filter(i => i.textContent?.includes('schedule'));
    // Only the time-ago row's schedule icon should exist (1), not the deadline one (would be 2)
    expect(scheduleIcons.length).toBe(1);
  });

  it('should toggle YOUR TASK badge visibility (destroys badge block)', () => {
    const fixture = createFixture();
    authService.currentUser.set(mockUser); // id: 1 matches requester_id: 1
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('YOUR TASK');

    authService.currentUser.set({ ...mockUser, id: 999 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('YOUR TASK');
  });

  it('should handle component destruction', () => {
    const fixture = createFixture();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should show dash fallback when location is absent', () => {
      const noLocationTask = { ...mockTask, location: undefined };
      const fixture = createFixture(noLocationTask as any);
      const el = fixture.nativeElement as HTMLElement;
      const locationIcon = Array.from(el.querySelectorAll('nhannht-metro-icon'))
        .find(i => i.textContent?.includes('location_on'));
      expect(locationIcon).toBeTruthy();
      expect(el.textContent).toContain('—');
    });

    it('should show location icon when location is present', () => {
      const fixture = createFixture();
      const el = fixture.nativeElement as HTMLElement;
      const icons = el.querySelectorAll('nhannht-metro-icon');
      const locationIcon = Array.from(icons).find(i => i.textContent?.includes('location_on'));
      expect(locationIcon).toBeTruthy();
    });

    it('should toggle isOwner from false to true (creates YOUR TASK badge)', () => {
      const fixture = createFixture();
      authService.currentUser.set(null);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('YOUR TASK');

      authService.currentUser.set(mockUser); // id matches requester_id: 1
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('YOUR TASK');
    });

    it('should not show deadline block when task has no deadline (deadline @if false-branch)', () => {
      const noDeadlineFix = createFixture({ ...mockTask, deadline: undefined });
      const el = noDeadlineFix.nativeElement as HTMLElement;
      const scheduleIcons = Array.from(el.querySelectorAll('nhannht-metro-icon'))
        .filter(i => i.textContent?.includes('schedule'));
      // Only the time-ago row's schedule icon (1), not the deadline one (would be 2)
      expect(scheduleIcons.length).toBe(1);
    });

    it('should show deadline block when task has a deadline (deadline @if true-branch)', () => {
      const withDeadlineFix = createFixture({ ...mockTask, deadline: '2026-12-31T00:00:00Z' });
      const el = withDeadlineFix.nativeElement as HTMLElement;
      const scheduleIcons = Array.from(el.querySelectorAll('nhannht-metro-icon'))
        .filter(i => i.textContent?.includes('schedule'));
      // Both deadline and time-ago rows have schedule icons
      expect(scheduleIcons.length).toBe(2);
    });
  });

  describe('enriched bottom row', () => {
    it('should show category name when category is present', () => {
      const taskWithCategory = { ...mockTask, category: { id: 1, name: 'Delivery', name_vi: 'Giao hàng', is_active: true } };
      const fixture = createFixture(taskWithCategory);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Delivery');
      const categoryIcon = Array.from(el.querySelectorAll('nhannht-metro-icon'))
        .find(i => i.textContent?.includes('category'));
      expect(categoryIcon).toBeTruthy();
    });

    it('should not show category when absent', () => {
      const fixture = createFixture(); // mockTask has no category
      const el = fixture.nativeElement as HTMLElement;
      const categoryIcon = Array.from(el.querySelectorAll('nhannht-metro-icon'))
        .find(i => i.textContent?.includes('category'));
      expect(categoryIcon).toBeFalsy();
    });

    it('should show time ago for created_at', () => {
      // Use a recent created_at (within 7 days) so timeAgo produces "Xd ago"
      const recentTask = { ...mockTask, created_at: new Date(Date.now() - 2 * 86400_000).toISOString() };
      const fixture = createFixture(recentTask);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toMatch(/ago|just now/);
    });

    it('should show application count when present', () => {
      const taskWithApps = { ...mockTask, application_count: 5 };
      const fixture = createFixture(taskWithApps);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('5');
      expect(el.textContent).toContain('applied');
      const groupIcon = Array.from(el.querySelectorAll('nhannht-metro-icon'))
        .find(i => i.textContent?.includes('group'));
      expect(groupIcon).toBeTruthy();
    });

    it('should not show application count when undefined', () => {
      const fixture = createFixture(); // mockTask has no application_count
      const el = fixture.nativeElement as HTMLElement;
      const groupIcon = Array.from(el.querySelectorAll('nhannht-metro-icon'))
        .find(i => i.textContent?.includes('group'));
      expect(groupIcon).toBeFalsy();
    });
  });
});
