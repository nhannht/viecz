import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { NhannhtMetroApplicationCardComponent } from './nhannht-metro-application-card.component';
import { TaskApplication } from '../../core/models';
import { provideTranslocoForTesting } from '../../core/transloco-testing';

const mockApp: TaskApplication = {
  id: 1,
  task_id: 1,
  tasker_id: 2,
  proposed_price: 18000,
  message: 'I can do it',
  status: 'pending',
  created_at: '2026-02-14T10:30:00Z',
  updated_at: '2026-02-14T10:30:00Z',
};

@Component({
  standalone: true,
  imports: [NhannhtMetroApplicationCardComponent],
  template: `<nhannht-metro-application-card
    [application]="app()"
    [showAccept]="showAccept()"
    (acceptClick)="acceptedId = $event"
  />`,
})
class TestHostComponent {
  app = signal(mockApp);
  showAccept = signal(false);
  acceptedId = 0;
}

describe('NhannhtMetroApplicationCardComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideRouter([]),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should display tasker link', () => {
    expect(fixture.nativeElement.textContent).toContain('Tasker #2');
  });

  it('should display proposed price when present', () => {
    expect(fixture.nativeElement.textContent).toContain('18.000');
  });

  it('should display message when present', () => {
    expect(fixture.nativeElement.textContent).toContain('I can do it');
  });

  it('should NOT display proposed price when absent', () => {
    host.app.set({ ...mockApp, proposed_price: undefined });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Proposed');
  });

  it('should NOT display message when absent', () => {
    host.app.set({ ...mockApp, message: undefined });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('I can do it');
  });

  it('should show accept button when showAccept is true and status is pending', () => {
    host.showAccept.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Accept');
  });

  it('should NOT show accept button when status is not pending', () => {
    host.showAccept.set(true);
    host.app.set({ ...mockApp, status: 'accepted' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Accept');
  });

  it('should emit acceptClick with application id', () => {
    host.showAccept.set(true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('nhannht-metro-button button') as HTMLButtonElement;
    btn.click();
    expect(host.acceptedId).toBe(1);
  });

  it('should map accepted status to completed badge', () => {
    host.app.set({ ...mockApp, status: 'accepted' });
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('nhannht-metro-badge');
    expect(badge).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('ACCEPTED');
  });

  it('should map rejected status to cancelled badge', () => {
    host.app.set({ ...mockApp, status: 'rejected' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('REJECTED');
  });

  it('should map pending status to in_progress badge', () => {
    expect(fixture.nativeElement.textContent).toContain('PENDING');
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle proposed_price from provided to absent (destroys price block)', () => {
      expect(fixture.nativeElement.textContent).toContain('18.000');

      host.app.set({ ...mockApp, proposed_price: undefined });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('18.000');
    });

    it('should toggle proposed_price from absent to provided (creates price block)', () => {
      host.app.set({ ...mockApp, proposed_price: undefined });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Proposed');

      host.app.set({ ...mockApp, proposed_price: 25000 });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('25.000');
    });

    it('should toggle message from provided to absent (destroys message block)', () => {
      expect(fixture.nativeElement.textContent).toContain('I can do it');

      host.app.set({ ...mockApp, message: undefined });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('I can do it');
    });

    it('should toggle message from absent to provided (creates message block)', () => {
      host.app.set({ ...mockApp, message: undefined });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('I can do it');

      host.app.set({ ...mockApp, message: 'Available now' });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Available now');
    });

    it('should toggle showAccept from false to true for pending status (creates accept button)', () => {
      expect(fixture.nativeElement.textContent).not.toContain('Accept');

      host.showAccept.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Accept');
    });

    it('should toggle showAccept from true to false (destroys accept button)', () => {
      host.showAccept.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Accept');

      host.showAccept.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Accept');
    });
  });
});
