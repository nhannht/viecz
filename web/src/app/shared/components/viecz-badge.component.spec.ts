import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { VieczBadgeComponent } from './viecz-badge.component';

@Component({
  standalone: true,
  imports: [VieczBadgeComponent],
  template: `<viecz-badge [label]="label()" [status]="status()" />`,
})
class TestHostComponent {
  label = signal('OPEN');
  status = signal<'open' | 'in_progress' | 'completed' | 'cancelled' | 'default'>('default');
}

describe('VieczBadgeComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render label text', () => {
    expect(fixture.nativeElement.textContent).toContain('OPEN');
  });

  it('should apply open status classes', () => {
    host.status.set('open');
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('bg-fg');
    expect(span.className).toContain('text-bg');
  });

  it('should apply in_progress status classes', () => {
    host.status.set('in_progress');
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('bg-transparent');
    expect(span.className).toContain('text-fg');
    expect(span.className).toContain('border-fg');
  });

  it('should apply completed status classes', () => {
    host.status.set('completed');
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('bg-muted');
    expect(span.className).toContain('text-bg');
  });

  it('should apply cancelled status classes', () => {
    host.status.set('cancelled');
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('line-through');
    expect(span.className).toContain('text-muted');
  });

  it('should apply default status classes', () => {
    host.status.set('default');
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('bg-transparent');
    expect(span.className).toContain('border-border');
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles — status class switching', () => {
    it('should toggle from open to in_progress status classes', () => {
      host.status.set('open');
      fixture.detectChanges();
      let span = fixture.nativeElement.querySelector('span');
      expect(span.className).toContain('bg-fg');

      host.status.set('in_progress');
      fixture.detectChanges();
      span = fixture.nativeElement.querySelector('span');
      expect(span.className).toContain('bg-transparent');
      expect(span.className).toContain('border-fg');
    });

    it('should toggle from in_progress to completed status classes', () => {
      host.status.set('in_progress');
      fixture.detectChanges();
      let span = fixture.nativeElement.querySelector('span');
      expect(span.className).toContain('border-fg');

      host.status.set('completed');
      fixture.detectChanges();
      span = fixture.nativeElement.querySelector('span');
      expect(span.className).toContain('bg-muted');
    });

    it('should toggle from completed to cancelled status classes', () => {
      host.status.set('completed');
      fixture.detectChanges();
      let span = fixture.nativeElement.querySelector('span');
      expect(span.className).toContain('bg-muted');

      host.status.set('cancelled');
      fixture.detectChanges();
      span = fixture.nativeElement.querySelector('span');
      expect(span.className).toContain('line-through');
    });

    it('should toggle from cancelled to default status classes', () => {
      host.status.set('cancelled');
      fixture.detectChanges();
      let span = fixture.nativeElement.querySelector('span');
      expect(span.className).toContain('line-through');

      host.status.set('default');
      fixture.detectChanges();
      span = fixture.nativeElement.querySelector('span');
      expect(span.className).toContain('border-border');
      expect(span.className).not.toContain('line-through');
    });

    it('should update label when label input changes', () => {
      expect(fixture.nativeElement.textContent).toContain('OPEN');

      host.label.set('CLOSED');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('CLOSED');
    });
  });
});
