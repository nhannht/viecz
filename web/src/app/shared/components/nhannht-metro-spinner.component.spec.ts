import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { NhannhtMetroSpinnerComponent } from './nhannht-metro-spinner.component';

@Component({
  standalone: true,
  imports: [NhannhtMetroSpinnerComponent],
  template: `<nhannht-metro-spinner [size]="size()" [label]="label()" />`,
})
class TestHostComponent {
  size = signal(24);
  label = signal('Loading');
}

describe('NhannhtMetroSpinnerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should apply custom size', () => {
    host.size.set(48);
    fixture.detectChanges();
    const div = fixture.nativeElement.querySelector('[role="progressbar"]');
    expect(div.style.width).toBe('48px');
    expect(div.style.height).toBe('48px');
  });

  it('should have role progressbar', () => {
    const div = fixture.nativeElement.querySelector('[role="progressbar"]');
    expect(div).toBeTruthy();
  });

  it('should set aria-label to default "Loading"', () => {
    const div = fixture.nativeElement.querySelector('[role="progressbar"]');
    expect(div.getAttribute('aria-label')).toBe('Loading');
  });

  it('should set custom aria-label', () => {
    host.label.set('Saving');
    fixture.detectChanges();
    const div = fixture.nativeElement.querySelector('[role="progressbar"]');
    expect(div.getAttribute('aria-label')).toBe('Saving');
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle size from default to custom and back', () => {
      host.size.set(24);
      fixture.detectChanges();
      let div = fixture.nativeElement.querySelector('[role="progressbar"]');
      expect(div.style.width).toBe('24px');

      host.size.set(64);
      fixture.detectChanges();
      div = fixture.nativeElement.querySelector('[role="progressbar"]');
      expect(div.style.width).toBe('64px');

      host.size.set(16);
      fixture.detectChanges();
      div = fixture.nativeElement.querySelector('[role="progressbar"]');
      expect(div.style.width).toBe('16px');
    });

    it('should toggle label from default to custom and back', () => {
      host.label.set('Loading');
      fixture.detectChanges();
      let div = fixture.nativeElement.querySelector('[role="progressbar"]');
      expect(div.getAttribute('aria-label')).toBe('Loading');

      host.label.set('Processing');
      fixture.detectChanges();
      div = fixture.nativeElement.querySelector('[role="progressbar"]');
      expect(div.getAttribute('aria-label')).toBe('Processing');

      host.label.set('');
      fixture.detectChanges();
      div = fixture.nativeElement.querySelector('[role="progressbar"]');
      expect(div.getAttribute('aria-label')).toBe('');
    });
  });
});
