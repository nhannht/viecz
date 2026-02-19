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
});
