import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { NhannhtMetroSnackbarComponent } from './nhannht-metro-snackbar.component';

@Component({
  standalone: true,
  imports: [NhannhtMetroSnackbarComponent],
  template: `<nhannht-metro-snackbar
    [visible]="visible()"
    [message]="message()"
    [actionLabel]="actionLabel()"
    (actionClicked)="actionClicked = true"
  />`,
})
class TestHostComponent {
  visible = signal(false);
  message = signal('Test message');
  actionLabel = signal('');
  actionClicked = false;
}

describe('NhannhtMetroSnackbarComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should not render when not visible', () => {
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });

  it('should render when visible', () => {
    host.visible.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
  });

  it('should display message', () => {
    host.visible.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Test message');
  });

  it('should not show action button when actionLabel is empty', () => {
    host.visible.set(true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).toBeNull();
  });

  it('should show action button when actionLabel is provided', () => {
    host.visible.set(true);
    host.actionLabel.set('Undo');
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn.textContent.trim()).toBe('Undo');
  });

  it('should emit actionClicked when action button is clicked', () => {
    host.visible.set(true);
    host.actionLabel.set('Undo');
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    btn.click();
    expect(host.actionClicked).toBe(true);
  });

  it('should toggle visible from true to false (destroys snackbar block)', () => {
    host.visible.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();

    host.visible.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle visible from false to true (creates snackbar block)', () => {
      expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();

      host.visible.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
    });

    it('should toggle actionLabel from empty to provided (creates action button)', () => {
      host.visible.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button')).toBeNull();

      host.actionLabel.set('Undo');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
    });

    it('should toggle actionLabel from provided to empty (destroys action button)', () => {
      host.visible.set(true);
      host.actionLabel.set('Undo');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button')).toBeTruthy();

      host.actionLabel.set('');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button')).toBeNull();
    });

    it('should update message when message input changes', () => {
      host.visible.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Test message');

      host.message.set('Task saved');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Task saved');
    });
  });
});
