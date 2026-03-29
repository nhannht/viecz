import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { VieczSpinnerComponent } from './viecz-spinner.component';

@Component({
  standalone: true,
  imports: [VieczSpinnerComponent],
  template: `<viecz-spinner [size]="size()" [label]="label()" />`,
})
class TestHostComponent {
  size = signal<'sm' | 'md' | 'lg'>('md');
  label = signal('Loading');
}

describe('VieczSpinnerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
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

  it('should render a pre element for the ASCII cube', () => {
    const pre = fixture.nativeElement.querySelector('pre');
    expect(pre).toBeTruthy();
  });

  it('should populate innerHTML after animation starts', async () => {
    await new Promise((r) => setTimeout(r, 50));
    const pre = fixture.nativeElement.querySelector('pre');
    expect(pre.innerHTML.length).toBeGreaterThan(0);
  });

  it('should apply small font size for sm', () => {
    host.size.set('sm');
    fixture.detectChanges();
    const pre = fixture.nativeElement.querySelector('pre');
    expect(pre.style.fontSize).toBe('6px');
  });

  it('should apply medium font size for md', () => {
    host.size.set('md');
    fixture.detectChanges();
    const pre = fixture.nativeElement.querySelector('pre');
    expect(pre.style.fontSize).toBe('7px');
  });

  it('should apply large font size for lg', () => {
    host.size.set('lg');
    fixture.detectChanges();
    const pre = fixture.nativeElement.querySelector('pre');
    expect(pre.style.fontSize).toBe('8px');
  });

  it('should toggle size from sm to lg', () => {
    host.size.set('sm');
    fixture.detectChanges();
    let pre = fixture.nativeElement.querySelector('pre');
    expect(pre.style.fontSize).toBe('6px');

    host.size.set('lg');
    fixture.detectChanges();
    pre = fixture.nativeElement.querySelector('pre');
    expect(pre.style.fontSize).toBe('8px');
  });

  it('should toggle label', () => {
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
