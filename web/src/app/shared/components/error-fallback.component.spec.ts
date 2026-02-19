import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorFallbackComponent } from './error-fallback.component';

describe('ErrorFallbackComponent', () => {
  let fixture: ComponentFixture<ErrorFallbackComponent>;
  let component: ErrorFallbackComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorFallbackComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ErrorFallbackComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display default title and message', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h3').textContent).toContain('Something went wrong');
    expect(fixture.nativeElement.querySelector('p').textContent).toContain('Please try again');
  });

  it('should show retry button when retryFn is provided', () => {
    let called = false;
    const fn = () => { called = true; };
    fixture.componentRef.setInput('retryFn', fn);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).toBeTruthy();
    btn.click();
    expect(called).toBe(true);
  });

  it('should not show retry button when retryFn is null', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).toBeFalsy();
  });

  it('should display custom title and message', () => {
    fixture.componentRef.setInput('title', 'Network Error');
    fixture.componentRef.setInput('message', 'Check connection');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h3').textContent).toContain('Network Error');
    expect(fixture.nativeElement.querySelector('p').textContent).toContain('Check connection');
  });
});
