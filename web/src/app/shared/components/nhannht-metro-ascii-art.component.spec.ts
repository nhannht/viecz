import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NhannhtMetroAsciiArtComponent } from './nhannht-metro-ascii-art.component';

describe('NhannhtMetroAsciiArtComponent', () => {
  let fixture: ComponentFixture<NhannhtMetroAsciiArtComponent>;
  let component: NhannhtMetroAsciiArtComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NhannhtMetroAsciiArtComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(NhannhtMetroAsciiArtComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('src', '/mascot-ascii.svg');
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should bind src to hidden img element', () => {
    fixture.detectChanges();
    const img: HTMLImageElement = fixture.nativeElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toContain('/mascot-ascii.svg');
    expect(img.style.display).toBe('none');
  });

  it('should render canvas with correct dimensions and role', () => {
    fixture.componentRef.setInput('width', 452);
    fixture.componentRef.setInput('height', 380);
    fixture.componentRef.setInput('alt', 'Viecz mascot');
    fixture.detectChanges();
    const canvas: HTMLCanvasElement = fixture.nativeElement.querySelector('canvas');
    expect(canvas).toBeTruthy();
    expect(canvas.getAttribute('width')).toBe('452');
    expect(canvas.getAttribute('height')).toBe('380');
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('Viecz mascot');
  });

  it('should use default dimensions when not provided', () => {
    fixture.detectChanges();
    const canvas: HTMLCanvasElement = fixture.nativeElement.querySelector('canvas');
    expect(canvas.getAttribute('width')).toBe('452');
    expect(canvas.getAttribute('height')).toBe('380');
  });

  it('should not throw on ngOnDestroy', () => {
    fixture.detectChanges();
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
