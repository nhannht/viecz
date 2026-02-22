import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSkeletonComponent } from './loading-skeleton.component';

describe('LoadingSkeletonComponent', () => {
  let fixture: ComponentFixture<LoadingSkeletonComponent>;
  let component: LoadingSkeletonComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSkeletonComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(LoadingSkeletonComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render card skeletons by default', () => {
    fixture.detectChanges();
    const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
    // 3 cards × 4 lines each = 12
    expect(lines.length).toBe(12);
  });

  it('should render list skeletons when variant is list', () => {
    fixture.componentRef.setInput('variant', 'list');
    fixture.detectChanges();
    const circles = fixture.nativeElement.querySelectorAll('.skeleton-circle');
    expect(circles.length).toBe(3);
  });

  it('should render correct count', () => {
    fixture.componentRef.setInput('count', 5);
    fixture.detectChanges();
    const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
    // 5 cards × 4 lines each = 20
    expect(lines.length).toBe(20);
  });

  it('should render line variant', () => {
    fixture.componentRef.setInput('variant', 'line');
    fixture.detectChanges();
    const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
    expect(lines.length).toBe(3);
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle variant from card to list (destroys card block, creates list block)', () => {
      // Default is card variant
      fixture.componentRef.setInput('variant', 'card');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.skeleton-circle').length).toBe(0);
      expect(fixture.nativeElement.querySelectorAll('.skeleton-line').length).toBeGreaterThan(0);

      fixture.componentRef.setInput('variant', 'list');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.skeleton-circle').length).toBe(3);
    });

    it('should toggle variant from list to line (destroys list block, creates line block)', () => {
      fixture.componentRef.setInput('variant', 'list');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.skeleton-circle').length).toBe(3);

      fixture.componentRef.setInput('variant', 'line');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.skeleton-circle').length).toBe(0);
      const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
      expect(lines.length).toBe(3);
    });

    it('should toggle variant from line to card (destroys line block, creates card block)', () => {
      fixture.componentRef.setInput('variant', 'line');
      fixture.detectChanges();
      const linesBefore = fixture.nativeElement.querySelectorAll('.skeleton-line').length;
      expect(linesBefore).toBe(3);

      fixture.componentRef.setInput('variant', 'card');
      fixture.detectChanges();
      // card has 4 lines per item, 3 items = 12
      const linesAfter = fixture.nativeElement.querySelectorAll('.skeleton-line').length;
      expect(linesAfter).toBe(12);
    });
  });
});
