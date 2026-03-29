import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { VieczButtonComponent } from './viecz-button.component';

@Component({
  standalone: true,
  imports: [VieczButtonComponent],
  template: `<viecz-button
    [variant]="variant()"
    [label]="label()"
    [disabled]="disabled()"
    [fullWidth]="fullWidth()"
    (clicked)="clicks = clicks + 1"
  />`,
})
class TestHostComponent {
  variant = signal<'primary' | 'secondary'>('primary');
  label = signal('Submit');
  disabled = signal(false);
  fullWidth = signal(false);
  clicks = 0;
}

describe('VieczButtonComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render primary button with label', () => {
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.textContent).toContain('Submit');
    expect(btn.className).toContain('bg-fg');
  });

  it('should render secondary button with > suffix', () => {
    host.variant.set('secondary');
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.textContent).toContain('>');
    expect(btn.className).toContain('text-muted');
  });

  it('should disable button when disabled is true', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('should enable button when disabled is false', () => {
    host.disabled.set(false);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('should apply fullWidth class for primary variant', () => {
    host.fullWidth.set(true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.classList.contains('w-full')).toBe(true);
  });

  it('should not apply fullWidth class for secondary variant', () => {
    host.variant.set('secondary');
    host.fullWidth.set(true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.classList.contains('w-full')).toBe(false);
  });

  it('should emit clicked on click', () => {
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    btn.click();
    expect(host.clicks).toBe(1);
  });

  it('should have button type by default', () => {
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.type).toBe('button');
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle variant from primary to secondary (destroys > span for secondary, then adds it)', () => {
      // primary: no > in button text as separate span
      let btn = fixture.nativeElement.querySelector('button');
      expect(btn.className).toContain('bg-fg');

      host.variant.set('secondary');
      fixture.detectChanges();
      btn = fixture.nativeElement.querySelector('button');
      expect(btn.className).toContain('text-muted');
      expect(btn.textContent).toContain('>');
    });

    it('should toggle variant from secondary to primary (destroys > span)', () => {
      host.variant.set('secondary');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button').textContent).toContain('>');

      host.variant.set('primary');
      fixture.detectChanges();
      // primary variant does not show > suffix
      expect(fixture.nativeElement.querySelector('button').className).toContain('bg-fg');
    });

    it('should toggle disabled from false to true', () => {
      expect((fixture.nativeElement.querySelector('button') as HTMLButtonElement).disabled).toBe(false);

      host.disabled.set(true);
      fixture.detectChanges();
      expect((fixture.nativeElement.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    });

    it('should toggle disabled from true to false', () => {
      host.disabled.set(true);
      fixture.detectChanges();
      expect((fixture.nativeElement.querySelector('button') as HTMLButtonElement).disabled).toBe(true);

      host.disabled.set(false);
      fixture.detectChanges();
      expect((fixture.nativeElement.querySelector('button') as HTMLButtonElement).disabled).toBe(false);
    });

    it('should toggle fullWidth from false to true for primary variant', () => {
      expect(fixture.nativeElement.querySelector('button').classList.contains('w-full')).toBe(false);

      host.fullWidth.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button').classList.contains('w-full')).toBe(true);
    });

    it('should toggle fullWidth from true to false for primary variant', () => {
      host.fullWidth.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button').classList.contains('w-full')).toBe(true);

      host.fullWidth.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button').classList.contains('w-full')).toBe(false);
    });

    it('should toggle variant primary→secondary→primary→secondary covering btnClass computed', () => {
      let btn = fixture.nativeElement.querySelector('button');
      expect(btn.className).toContain('bg-fg');

      host.variant.set('secondary');
      fixture.detectChanges();
      btn = fixture.nativeElement.querySelector('button');
      expect(btn.className).toContain('text-muted');

      host.variant.set('primary');
      fixture.detectChanges();
      btn = fixture.nativeElement.querySelector('button');
      expect(btn.className).toContain('bg-fg');

      host.variant.set('secondary');
      fixture.detectChanges();
      btn = fixture.nativeElement.querySelector('button');
      expect(btn.className).toContain('text-muted');
    });

    it('should show > suffix only for secondary variant via @if block', () => {
      const btn = fixture.nativeElement.querySelector('button');
      // Primary - the > span should not be present for secondary
      const spans = btn.querySelectorAll('span');
      // Check secondary
      host.variant.set('secondary');
      fixture.detectChanges();
      const secBtn = fixture.nativeElement.querySelector('button');
      expect(secBtn.textContent).toContain('>');

      // Switch back to primary
      host.variant.set('primary');
      fixture.detectChanges();
      const priBtn = fixture.nativeElement.querySelector('button');
      // Primary does not have separate > span
      expect(priBtn.className).toContain('bg-fg');
    });

    it('should toggle disabled and fullWidth together', () => {
      host.disabled.set(true);
      host.fullWidth.set(true);
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      expect(btn.classList.contains('w-full')).toBe(true);

      host.disabled.set(false);
      host.fullWidth.set(false);
      fixture.detectChanges();
      const btn2 = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      expect(btn2.disabled).toBe(false);
      expect(btn2.classList.contains('w-full')).toBe(false);
    });

    it('should not apply block class for secondary with fullWidth', () => {
      host.variant.set('secondary');
      host.fullWidth.set(true);
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('button');
      expect(btn.classList.contains('block')).toBe(false);
    });

    it('should apply block class for primary with fullWidth', () => {
      host.variant.set('primary');
      host.fullWidth.set(true);
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('button');
      expect(btn.classList.contains('block')).toBe(true);
    });
  });
});
