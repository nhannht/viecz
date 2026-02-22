import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { NhannhtMetroIconComponent } from './nhannht-metro-icon.component';

@Component({
  standalone: true,
  imports: [NhannhtMetroIconComponent],
  template: `<nhannht-metro-icon [name]="name()" [size]="size()" [ariaHidden]="ariaHidden()" />`,
})
class TestHostComponent {
  name = signal('home');
  size = signal(24);
  ariaHidden = signal(true);
}

describe('NhannhtMetroIconComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render icon name as text content', () => {
    const span = fixture.nativeElement.querySelector('span');
    expect(span.textContent.trim()).toBe('home');
  });

  it('should apply custom size', () => {
    host.size.set(32);
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span');
    expect(span.style.fontSize).toBe('32px');
    expect(span.style.width).toBe('32px');
  });

  it('should set aria-hidden true by default', () => {
    const span = fixture.nativeElement.querySelector('span');
    expect(span.getAttribute('aria-hidden')).toBe('true');
  });

  it('should set aria-label when ariaHidden is false', () => {
    host.ariaHidden.set(false);
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span');
    expect(span.getAttribute('aria-hidden')).toBe('false');
    expect(span.getAttribute('aria-label')).toBe('home');
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle ariaHidden from true to false (changes aria-hidden and adds aria-label)', () => {
      const span = fixture.nativeElement.querySelector('span');
      expect(span.getAttribute('aria-hidden')).toBe('true');
      expect(span.getAttribute('aria-label')).toBeNull();

      host.ariaHidden.set(false);
      fixture.detectChanges();
      const spanAfter = fixture.nativeElement.querySelector('span');
      expect(spanAfter.getAttribute('aria-hidden')).toBe('false');
      expect(spanAfter.getAttribute('aria-label')).toBe('home');
    });

    it('should toggle ariaHidden from false to true (removes aria-label)', () => {
      host.ariaHidden.set(false);
      fixture.detectChanges();
      const span = fixture.nativeElement.querySelector('span');
      expect(span.getAttribute('aria-label')).toBe('home');

      host.ariaHidden.set(true);
      fixture.detectChanges();
      const spanAfter = fixture.nativeElement.querySelector('span');
      expect(spanAfter.getAttribute('aria-hidden')).toBe('true');
      expect(spanAfter.getAttribute('aria-label')).toBeNull();
    });

    it('should update icon name when name changes', () => {
      const span = fixture.nativeElement.querySelector('span');
      expect(span.textContent.trim()).toBe('home');

      host.name.set('search');
      fixture.detectChanges();
      const spanAfter = fixture.nativeElement.querySelector('span');
      expect(spanAfter.textContent.trim()).toBe('search');
    });

    it('should update size when size changes', () => {
      host.size.set(16);
      fixture.detectChanges();
      const span = fixture.nativeElement.querySelector('span');
      expect(span.style.fontSize).toBe('16px');

      host.size.set(48);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('span').style.fontSize).toBe('48px');
    });
  });
});
