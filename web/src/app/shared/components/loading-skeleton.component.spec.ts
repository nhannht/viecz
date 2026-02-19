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
    const cards = fixture.nativeElement.querySelectorAll('.skeleton-card');
    expect(cards.length).toBe(3);
  });

  it('should render list skeletons when variant is list', () => {
    fixture.componentRef.setInput('variant', 'list');
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.skeleton-list-item');
    expect(items.length).toBe(3);
  });

  it('should render correct count', () => {
    fixture.componentRef.setInput('count', 5);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.skeleton-card');
    expect(cards.length).toBe(5);
  });

  it('should render line variant', () => {
    fixture.componentRef.setInput('variant', 'line');
    fixture.detectChanges();
    const lines = fixture.nativeElement.querySelectorAll('.skeleton-line.body');
    expect(lines.length).toBe(3);
  });
});
