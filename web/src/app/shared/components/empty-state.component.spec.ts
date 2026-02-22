import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;
  let component: EmptyStateComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display default title', () => {
    fixture.detectChanges();
    const h3 = fixture.nativeElement.querySelector('h3');
    expect(h3.textContent).toContain('Nothing here');
  });

  it('should display custom icon and title', () => {
    fixture.componentRef.setInput('icon', 'search');
    fixture.componentRef.setInput('title', 'No results');
    fixture.componentRef.setInput('message', 'Try a different search');
    fixture.detectChanges();
    const h3 = fixture.nativeElement.querySelector('h3');
    expect(h3.textContent).toContain('No results');
  });

  it('should show action button when actionLabel is set', () => {
    fixture.componentRef.setInput('actionLabel', 'Retry');
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Retry');
  });

  it('should not show action button by default', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).toBeFalsy();
  });

  it('should call action function when button clicked', () => {
    let called = false;
    const fn = () => { called = true; };
    fixture.componentRef.setInput('actionLabel', 'Retry');
    fixture.componentRef.setInput('action', fn);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    expect(called).toBe(true);
  });

  it('should toggle action button visibility (destroys button block)', () => {
    fixture.componentRef.setInput('actionLabel', 'Retry');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy();

    fixture.componentRef.setInput('actionLabel', '');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeFalsy();
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle actionLabel from empty to provided (creates button block)', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button')).toBeFalsy();

      fixture.componentRef.setInput('actionLabel', 'Try Again');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
    });

    it('should update title when title input changes', () => {
      fixture.componentRef.setInput('title', 'No results');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h3').textContent).toContain('No results');

      fixture.componentRef.setInput('title', 'Empty');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h3').textContent).toContain('Empty');
    });

    it('should update message when message input changes', () => {
      fixture.componentRef.setInput('message', 'No data available');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('p').textContent).toContain('No data available');

      fixture.componentRef.setInput('message', '');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('p').textContent.trim()).toBe('');
    });

    it('should update icon when icon input changes', () => {
      fixture.componentRef.setInput('icon', 'search');
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('nhannht-metro-icon');
      expect(icon.textContent.trim()).toBe('search');

      fixture.componentRef.setInput('icon', 'inbox');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-icon').textContent.trim()).toBe('inbox');
    });

    it('should toggle actionLabel empty→set→empty→set covering button block cycle', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button')).toBeFalsy();

      fixture.componentRef.setInput('actionLabel', 'Retry');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button')).toBeTruthy();

      fixture.componentRef.setInput('actionLabel', '');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button')).toBeFalsy();

      fixture.componentRef.setInput('actionLabel', 'Go');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
    });

    it('should not call action when action fn is undefined', () => {
      fixture.componentRef.setInput('actionLabel', 'Click');
      fixture.detectChanges();
      // action is not set — onAction should handle undefined gracefully
      fixture.nativeElement.querySelector('button').click();
      expect(component).toBeTruthy(); // no error thrown
    });

    it('should render all default values correctly', () => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('h3')!.textContent).toContain('Nothing here');
      expect(el.querySelector('nhannht-metro-icon')!.textContent!.trim()).toBe('inbox');
      expect(el.querySelector('button')).toBeFalsy();
    });
  });
});
