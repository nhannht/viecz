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

  it('should toggle retry button visibility (destroys retry block)', () => {
    const fn = () => {};
    fixture.componentRef.setInput('retryFn', fn);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy();

    fixture.componentRef.setInput('retryFn', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeFalsy();
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  it('should not throw when retry() is called with retryFn null (covers if(fn) false branch)', () => {
    fixture.detectChanges();
    // retryFn defaults to null, so calling retry() should hit the false branch
    expect(() => component.retry()).not.toThrow();
  });

  it('should call retryFn when retry() is called with retryFn set (covers if(fn) true branch)', () => {
    let called = false;
    fixture.componentRef.setInput('retryFn', () => { called = true; });
    fixture.detectChanges();
    component.retry();
    expect(called).toBe(true);
  });

  describe('template conditional toggles', () => {
    it('should toggle retryFn from null to provided (creates retry button)', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button')).toBeFalsy();

      fixture.componentRef.setInput('retryFn', () => {});
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
    });

    it('should update title when title input changes', () => {
      fixture.componentRef.setInput('title', 'Connection Error');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h3').textContent).toContain('Connection Error');

      fixture.componentRef.setInput('title', 'Server Error');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h3').textContent).toContain('Server Error');
    });

    it('should update message when message input changes', () => {
      fixture.componentRef.setInput('message', 'Retry later');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('p').textContent).toContain('Retry later');

      fixture.componentRef.setInput('message', 'Contact support');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('p').textContent).toContain('Contact support');
    });
  });
});
