import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { NhannhtMetroDialogComponent } from './nhannht-metro-dialog.component';

@Component({
  standalone: true,
  imports: [NhannhtMetroDialogComponent],
  template: `
    <nhannht-metro-dialog
      [open]="open()"
      [title]="title()"
      [confirmLabel]="confirmLabel()"
      [cancelLabel]="cancelLabel()"
      (confirmed)="confirmed = true"
      (cancelled)="cancelled = true">
      <p>Dialog body</p>
    </nhannht-metro-dialog>
  `,
})
class TestHostComponent {
  open = signal(false);
  title = signal('DELETE TASK');
  confirmLabel = signal('Delete');
  cancelLabel = signal('Cancel');
  confirmed = false;
  cancelled = false;
}

describe('NhannhtMetroDialogComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should not render when open is false', () => {
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('should render when open is true', () => {
    host.open.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('should display title', () => {
    host.open.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('DELETE TASK');
  });

  it('should display projected content', () => {
    host.open.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Dialog body');
  });

  it('should set aria-modal and aria-label', () => {
    host.open.set(true);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('DELETE TASK');
  });

  it('should emit confirmed when confirm button clicked', () => {
    host.open.set(true);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    // Last button is confirm (primary)
    const confirmBtn = Array.from(buttons).find((b: any) => b.textContent.includes('Delete')) as HTMLButtonElement;
    confirmBtn.click();
    expect(host.confirmed).toBe(true);
  });

  it('should emit cancelled when cancel button clicked', () => {
    host.open.set(true);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const cancelBtn = Array.from(buttons).find((b: any) => b.textContent.includes('Cancel')) as HTMLButtonElement;
    cancelBtn.click();
    expect(host.cancelled).toBe(true);
  });

  it('should emit cancelled on backdrop click', () => {
    host.open.set(true);
    fixture.detectChanges();
    const backdrop = fixture.nativeElement.querySelector('.fixed');
    backdrop.click();
    expect(host.cancelled).toBe(true);
  });

  it('should NOT emit cancelled when clicking inside dialog content', () => {
    host.open.set(true);
    fixture.detectChanges();
    const inner = fixture.nativeElement.querySelector('.relative');
    inner.click();
    expect(host.cancelled).toBe(false);
  });

  it('should hide confirm button when confirmLabel is empty', () => {
    host.open.set(true);
    host.confirmLabel.set('');
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('nhannht-metro-button');
    expect(buttons.length).toBe(1); // only cancel
  });

  it('should toggle open from true to false (destroys dialog block)', () => {
    host.open.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();

    host.open.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle open from false to true (creates dialog block)', () => {
      expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();

      host.open.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    });

    it('should toggle title from provided to empty (destroys title block)', () => {
      host.open.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h2')).toBeTruthy();

      host.title.set('');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h2')).toBeNull();
    });

    it('should toggle title from empty to provided (creates title block)', () => {
      host.open.set(true);
      host.title.set('');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h2')).toBeNull();

      host.title.set('CONFIRM');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h2')).toBeTruthy();
    });

    it('should toggle cancelLabel from provided to empty (destroys cancel button)', () => {
      host.open.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Cancel');

      host.cancelLabel.set('');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Cancel');
    });

    it('should toggle confirmLabel from provided to empty (destroys confirm button)', () => {
      host.open.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Delete');

      host.confirmLabel.set('');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Delete');
    });

    it('should toggle confirmLabel from empty to provided (creates confirm button)', () => {
      host.open.set(true);
      host.confirmLabel.set('');
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('nhannht-metro-button');
      expect(buttons.length).toBe(1); // only cancel

      host.confirmLabel.set('OK');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('OK');
    });
  });
});
