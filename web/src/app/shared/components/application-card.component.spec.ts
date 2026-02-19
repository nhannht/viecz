import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, Component } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ApplicationCardComponent } from './application-card.component';
import { TaskApplication } from '../../core/models';

const mockApplication: TaskApplication = {
  id: 42,
  task_id: 10,
  tasker_id: 7,
  proposed_price: 50000,
  message: 'I can do this task quickly',
  status: 'pending',
  created_at: '2026-02-19T08:00:00Z',
  updated_at: '2026-02-19T08:00:00Z',
};

@Component({
  standalone: true,
  imports: [ApplicationCardComponent],
  template: `<app-application-card [application]="app" [showAccept]="showAccept" (acceptClick)="onAccept($event)" />`,
})
class TestHostComponent {
  app: TaskApplication = mockApplication;
  showAccept = false;
  accepted: number | null = null;
  onAccept(id: number) { this.accepted = id; }
}

describe('ApplicationCardComponent', () => {
  function createFixture(overrides: Partial<TaskApplication> = {}, showAccept = false) {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.app = { ...mockApplication, ...overrides };
    fixture.componentInstance.showAccept = showAccept;
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render tasker ID', () => {
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Tasker #7');
  });

  it('should render status badge with correct class', () => {
    const fixture = createFixture({ status: 'pending' });
    const el = fixture.nativeElement as HTMLElement;
    const chip = el.querySelector('.status-chip');
    expect(chip).toBeTruthy();
    expect(chip!.textContent!.trim()).toBe('pending');
    expect(chip!.classList).toContain('pending');
  });

  it('should render accepted status with accepted class', () => {
    const fixture = createFixture({ status: 'accepted' });
    const el = fixture.nativeElement as HTMLElement;
    const chip = el.querySelector('.status-chip');
    expect(chip!.textContent!.trim()).toBe('accepted');
    expect(chip!.classList).toContain('accepted');
  });

  it('should show proposed price when present', () => {
    const fixture = createFixture({ proposed_price: 50000 });
    const el = fixture.nativeElement as HTMLElement;
    const priceEl = el.querySelector('.app-price');
    expect(priceEl).toBeTruthy();
    expect(priceEl!.textContent).toContain('50.000');
    expect(priceEl!.textContent).toContain('₫');
  });

  it('should hide proposed price when not present', () => {
    const fixture = createFixture({ proposed_price: undefined });
    const el = fixture.nativeElement as HTMLElement;
    const priceEl = el.querySelector('.app-price');
    expect(priceEl).toBeNull();
  });

  it('should show message when present', () => {
    const fixture = createFixture({ message: 'I can do this task quickly' });
    const el = fixture.nativeElement as HTMLElement;
    const msgEl = el.querySelector('.app-message');
    expect(msgEl).toBeTruthy();
    expect(msgEl!.textContent).toContain('I can do this task quickly');
  });

  it('should hide message when not present', () => {
    const fixture = createFixture({ message: undefined });
    const el = fixture.nativeElement as HTMLElement;
    const msgEl = el.querySelector('.app-message');
    expect(msgEl).toBeNull();
  });

  it('should show Accept button when showAccept=true and status=pending', () => {
    const fixture = createFixture({ status: 'pending' }, true);
    const el = fixture.nativeElement as HTMLElement;
    const btn = el.querySelector('button[mat-raised-button]');
    expect(btn).toBeTruthy();
    expect(btn!.textContent).toContain('Accept');
  });

  it('should hide Accept button when showAccept=false', () => {
    const fixture = createFixture({ status: 'pending' }, false);
    const el = fixture.nativeElement as HTMLElement;
    const btn = el.querySelector('button[mat-raised-button]');
    expect(btn).toBeNull();
  });

  it('should hide Accept button when status=accepted', () => {
    const fixture = createFixture({ status: 'accepted' }, true);
    const el = fixture.nativeElement as HTMLElement;
    const btn = el.querySelector('button[mat-raised-button]');
    expect(btn).toBeNull();
  });

  it('should emit acceptClick with application id when Accept button clicked', () => {
    const fixture = createFixture({ status: 'pending', id: 42 }, true);
    const el = fixture.nativeElement as HTMLElement;
    const btn = el.querySelector('button[mat-raised-button]') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.accepted).toBe(42);
  });
});
