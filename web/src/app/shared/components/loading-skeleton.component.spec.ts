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

  it('should render card skeletons by default with braille spinners', () => {
    fixture.detectChanges();
    const braille = fixture.nativeElement.querySelectorAll('.ascii-braille');
    expect(braille.length).toBe(3);
  });

  it('should render list skeletons with chunky and bar loaders', () => {
    fixture.componentRef.setInput('variant', 'list');
    fixture.detectChanges();
    const chunky = fixture.nativeElement.querySelectorAll('.ascii-chunky');
    const bar = fixture.nativeElement.querySelectorAll('.ascii-bar');
    expect(chunky.length).toBe(3);
    expect(bar.length).toBe(3);
  });

  it('should render correct count', () => {
    fixture.componentRef.setInput('count', 5);
    fixture.detectChanges();
    const braille = fixture.nativeElement.querySelectorAll('.ascii-braille');
    expect(braille.length).toBe(5);
  });

  it('should render line variant with braille spinners', () => {
    fixture.componentRef.setInput('variant', 'line');
    fixture.detectChanges();
    const braille = fixture.nativeElement.querySelectorAll('.ascii-braille');
    expect(braille.length).toBe(3);
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle variant from card to list', () => {
      fixture.componentRef.setInput('variant', 'card');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.ascii-braille').length).toBe(3);
      expect(fixture.nativeElement.querySelectorAll('.ascii-chunky').length).toBe(0);

      fixture.componentRef.setInput('variant', 'list');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.ascii-chunky').length).toBe(3);
      expect(fixture.nativeElement.querySelectorAll('.ascii-bar').length).toBe(3);
    });

    it('should toggle variant from list to line', () => {
      fixture.componentRef.setInput('variant', 'list');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.ascii-chunky').length).toBe(3);

      fixture.componentRef.setInput('variant', 'line');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.ascii-chunky').length).toBe(0);
      expect(fixture.nativeElement.querySelectorAll('.ascii-braille').length).toBe(3);
    });

    it('should toggle variant from line to card', () => {
      fixture.componentRef.setInput('variant', 'line');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.ascii-braille').length).toBe(3);

      fixture.componentRef.setInput('variant', 'card');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.ascii-braille').length).toBe(3);
    });
  });
});
