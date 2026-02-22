import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NhannhtMetroAsciiArtComponent } from './nhannht-metro-ascii-art.component';

describe('NhannhtMetroAsciiArtComponent', () => {
  let fixture: ComponentFixture<NhannhtMetroAsciiArtComponent>;
  let component: NhannhtMetroAsciiArtComponent;
  let getContextSpy: ReturnType<typeof vi.spyOn>;
  const fakeCtx: any = {
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    fillStyle: '',
    getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(100) }),
  };

  beforeEach(async () => {
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx as any);
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    // Reset fakeCtx mocks
    fakeCtx.drawImage.mockClear();
    fakeCtx.clearRect.mockClear();
    fakeCtx.fillRect.mockClear();
    fakeCtx.createRadialGradient.mockClear();

    await TestBed.configureTestingModule({
      imports: [NhannhtMetroAsciiArtComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(NhannhtMetroAsciiArtComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('src', '/mascot-ascii.svg');
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('should cancelAnimationFrame on destroy when animId is set', () => {
    fixture.detectChanges();
    (component as any).animId = 42;
    component.ngOnDestroy();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42);
    expect((component as any).animId).toBe(0);
  });

  it('should not cancelAnimationFrame when animId is 0', () => {
    fixture.detectChanges();
    (component as any).animId = 0;
    // Clear any prior calls from fixture setup
    (window.cancelAnimationFrame as ReturnType<typeof vi.fn>).mockClear();
    component.ngOnDestroy();
    expect(window.cancelAnimationFrame).not.toHaveBeenCalled();
  });

  it('onHover should set glitchIntensity when reducedMotion is false', () => {
    fixture.detectChanges();
    (component as any).reducedMotion = false;
    component.onHover();
    expect((component as any).glitchIntensity).toBeGreaterThan(0);
  });

  it('onHover should not change glitchIntensity when reducedMotion is true', () => {
    fixture.detectChanges();
    (component as any).reducedMotion = true;
    (component as any).glitchIntensity = 0;
    component.onHover();
    expect((component as any).glitchIntensity).toBe(0);
  });

  it('onImageLoad should call rasterize when isBrowser is true', () => {
    fixture.detectChanges();
    // Setup canvas context manually since afterNextRender doesn't fire in tests
    (component as any).isBrowser = true;
    (component as any).ctx = fakeCtx;
    (component as any).oCtx = fakeCtx;
    const offscreen = document.createElement('canvas');
    offscreen.width = 452;
    offscreen.height = 380;
    (component as any).offscreen = offscreen;

    component.onImageLoad();
    // rasterize draws the image
    expect(fakeCtx.drawImage).toHaveBeenCalled();
  });

  it('onImageLoad should not rasterize when isBrowser is false', () => {
    fixture.detectChanges();
    (component as any).isBrowser = false;
    fakeCtx.drawImage.mockClear();
    component.onImageLoad();
    expect(fakeCtx.drawImage).not.toHaveBeenCalled();
  });

  it('rasterize should call drawStatic when reducedMotion is true', () => {
    fixture.detectChanges();
    (component as any).isBrowser = true;
    (component as any).ctx = fakeCtx;
    (component as any).oCtx = fakeCtx;
    const offscreen = document.createElement('canvas');
    offscreen.width = 452;
    offscreen.height = 380;
    (component as any).offscreen = offscreen;
    (component as any).reducedMotion = true;

    component.onImageLoad();

    // drawStatic draws the offscreen canvas and scanlines
    expect(fakeCtx.clearRect).toHaveBeenCalled();
    // requestAnimationFrame should NOT be called for drawStatic path
    expect((component as any).imgReady).toBe(true);
  });

  it('rasterize should start animation loop when reducedMotion is false', () => {
    fixture.detectChanges();
    (component as any).isBrowser = true;
    (component as any).ctx = fakeCtx;
    (component as any).oCtx = fakeCtx;
    const offscreen = document.createElement('canvas');
    offscreen.width = 452;
    offscreen.height = 380;
    (component as any).offscreen = offscreen;
    (component as any).reducedMotion = false;
    (component as any).animId = 0;

    component.onImageLoad();

    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect((component as any).imgReady).toBe(true);
  });

  it('rasterize should not start second animation loop when animId already set', () => {
    fixture.detectChanges();
    (component as any).isBrowser = true;
    (component as any).ctx = fakeCtx;
    (component as any).oCtx = fakeCtx;
    const offscreen = document.createElement('canvas');
    offscreen.width = 452;
    offscreen.height = 380;
    (component as any).offscreen = offscreen;
    (component as any).reducedMotion = false;
    (component as any).animId = 99; // already running

    (window.requestAnimationFrame as ReturnType<typeof vi.fn>).mockClear();
    component.onImageLoad();

    // Should not start another animation
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('rasterize should early-return if oCtx or offscreen is null', () => {
    fixture.detectChanges();
    (component as any).isBrowser = true;
    (component as any).ctx = fakeCtx;
    (component as any).oCtx = null;
    (component as any).offscreen = null;

    fakeCtx.drawImage.mockClear();
    component.onImageLoad();
    expect(fakeCtx.drawImage).not.toHaveBeenCalled();
  });

  it('setupCanvas should get canvas context and create offscreen canvas', () => {
    fixture.detectChanges();
    // Call setupCanvas directly
    (component as any).isBrowser = true;
    (component as any).setupCanvas();

    expect(getContextSpy).toHaveBeenCalledWith('2d');
    expect((component as any).ctx).toBe(fakeCtx);
    expect((component as any).offscreen).toBeTruthy();
    expect((component as any).oCtx).toBe(fakeCtx);
  });

  it('setupCanvas should rasterize if image already loaded', () => {
    fixture.detectChanges();
    (component as any).isBrowser = true;

    // Mock the sourceImg to return an element that is already complete
    const mockImg = document.createElement('img');
    Object.defineProperty(mockImg, 'complete', { value: true });
    Object.defineProperty(mockImg, 'naturalWidth', { value: 100 });
    vi.spyOn(component, 'sourceImg' as any).mockReturnValue({ nativeElement: mockImg });

    (component as any).setupCanvas();

    // rasterize should have been called (drawImage on offscreen)
    expect(fakeCtx.drawImage).toHaveBeenCalled();
  });

  it('setupCanvas should early-return if canvas element not found', () => {
    fixture.detectChanges();
    // Reset ctx to null so we can verify setupCanvas doesn't set it
    (component as any).ctx = null;
    vi.spyOn(component, 'canvas' as any).mockReturnValue(undefined);
    (component as any).isBrowser = true;

    (component as any).setupCanvas();
    // Should not crash and ctx should remain null
    expect((component as any).ctx).toBeNull();
  });

  it('render should schedule next frame even when imgReady is false', () => {
    fixture.detectChanges();
    (component as any).ctx = fakeCtx;
    (component as any).offscreen = document.createElement('canvas');
    (component as any).imgReady = false;

    (window.requestAnimationFrame as ReturnType<typeof vi.fn>).mockClear();
    (component as any).render();

    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('render should draw with glitch effects when imgReady is true', () => {
    fixture.detectChanges();
    (component as any).ctx = fakeCtx;
    const offscreen = document.createElement('canvas');
    offscreen.width = 452;
    offscreen.height = 380;
    (component as any).offscreen = offscreen;
    (component as any).imgReady = true;
    (component as any).glitchIntensity = 0.5;
    (component as any).time = 0;
    (component as any).nextGlitch = 1000; // won't trigger periodic glitch

    fakeCtx.clearRect.mockClear();
    fakeCtx.drawImage.mockClear();
    fakeCtx.fillRect.mockClear();
    (window.requestAnimationFrame as ReturnType<typeof vi.fn>).mockClear();

    (component as any).render();

    expect(fakeCtx.clearRect).toHaveBeenCalled();
    expect(fakeCtx.drawImage).toHaveBeenCalled();
    expect(fakeCtx.createRadialGradient).toHaveBeenCalled(); // vignette
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('render should trigger periodic glitch burst when time reaches nextGlitch', () => {
    fixture.detectChanges();
    (component as any).ctx = fakeCtx;
    const offscreen = document.createElement('canvas');
    offscreen.width = 452;
    offscreen.height = 380;
    (component as any).offscreen = offscreen;
    (component as any).imgReady = true;
    (component as any).glitchIntensity = 0;
    (component as any).time = 59;
    (component as any).nextGlitch = 60; // will trigger on next render (time becomes 60)

    (component as any).render();

    expect((component as any).glitchIntensity).toBeGreaterThan(0);
    expect((component as any).nextGlitch).toBeGreaterThan(60);
  });

  it('render should decay glitchIntensity', () => {
    fixture.detectChanges();
    (component as any).ctx = fakeCtx;
    const offscreen = document.createElement('canvas');
    offscreen.width = 452;
    offscreen.height = 380;
    (component as any).offscreen = offscreen;
    (component as any).imgReady = true;
    (component as any).glitchIntensity = 1.0;
    (component as any).time = 0;
    (component as any).nextGlitch = 1000;

    (component as any).render();

    expect((component as any).glitchIntensity).toBeLessThan(1.0);
  });

  it('render should zero out glitchIntensity when below threshold', () => {
    fixture.detectChanges();
    (component as any).ctx = fakeCtx;
    const offscreen = document.createElement('canvas');
    offscreen.width = 452;
    offscreen.height = 380;
    (component as any).offscreen = offscreen;
    (component as any).imgReady = true;
    (component as any).glitchIntensity = 0.01; // below 0.02 threshold after decay
    (component as any).time = 0;
    (component as any).nextGlitch = 1000;

    (component as any).render();

    // 0.01 * 0.93 = 0.0093, which is < 0.02, so it should be set to 0
    expect((component as any).glitchIntensity).toBe(0);
  });

  it('drawStatic should draw offscreen canvas and scanlines', () => {
    fixture.detectChanges();
    (component as any).ctx = fakeCtx;
    const offscreen = document.createElement('canvas');
    offscreen.width = 100;
    offscreen.height = 100;
    (component as any).offscreen = offscreen;

    fakeCtx.clearRect.mockClear();
    fakeCtx.drawImage.mockClear();
    fakeCtx.fillRect.mockClear();

    (component as any).drawStatic();

    expect(fakeCtx.clearRect).toHaveBeenCalledWith(0, 0, 452, 380);
    expect(fakeCtx.drawImage).toHaveBeenCalledWith(offscreen, 0, 0);
    // Scanlines
    expect(fakeCtx.fillRect).toHaveBeenCalled();
  });

  it('drawStatic should early-return if ctx is null', () => {
    fixture.detectChanges();
    (component as any).ctx = null;
    fakeCtx.clearRect.mockClear();
    (component as any).drawStatic();
    expect(fakeCtx.clearRect).not.toHaveBeenCalled();
  });

  // --- Template lifecycle toggle tests ---

  it('should handle component destruction (covers template destruction branches)', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  it('should toggle src input (re-renders img and canvas)', () => {
    fixture.detectChanges();
    fixture.componentRef.setInput('src', '/other-image.svg');
    fixture.detectChanges();
    const img: HTMLImageElement = fixture.nativeElement.querySelector('img');
    expect(img.src).toContain('/other-image.svg');
  });

  it('should toggle alt input (updates canvas aria-label)', () => {
    fixture.componentRef.setInput('alt', 'First label');
    fixture.detectChanges();
    const canvas = fixture.nativeElement.querySelector('canvas');
    expect(canvas.getAttribute('aria-label')).toBe('First label');

    fixture.componentRef.setInput('alt', 'Second label');
    fixture.detectChanges();
    expect(canvas.getAttribute('aria-label')).toBe('Second label');
  });

  it('should set isBrowser from PLATFORM_ID injection (covers constructor body)', () => {
    fixture.detectChanges();
    // isBrowser should be true in test environment (browser platform)
    expect((component as any).isBrowser).toBe(true);
  });

  it('constructor sets isBrowser to true in browser environment (covers constructor isBrowser assignment)', () => {
    // The constructor runs: this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID))
    // In the test environment with PLATFORM_ID='browser', this should be true
    // This covers the isPlatformBrowser true branch in the constructor
    fixture.detectChanges();
    expect((component as any).isBrowser).toBe(true);
    // Verify that isBrowser false branch is also covered by the existing
    // "onImageLoad should not rasterize when isBrowser is false" test
    // which sets isBrowser=false and calls onImageLoad
  });

  it('rasterize with reducedMotion=true should not call requestAnimationFrame (covers if reducedMotion branch)', () => {
    fixture.detectChanges();
    (component as any).isBrowser = true;
    (component as any).ctx = fakeCtx;
    (component as any).oCtx = fakeCtx;
    const offscreen = document.createElement('canvas');
    offscreen.width = 452;
    offscreen.height = 380;
    (component as any).offscreen = offscreen;
    (component as any).reducedMotion = true;
    (component as any).animId = 0;

    (window.requestAnimationFrame as ReturnType<typeof vi.fn>).mockClear();
    component.onImageLoad();

    // drawStatic should have been called (clearRect)
    expect(fakeCtx.clearRect).toHaveBeenCalled();
    // requestAnimationFrame should NOT be called for static path
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('rasterize with reducedMotion=false and animId=0 should call requestAnimationFrame (covers else if !animId branch)', () => {
    fixture.detectChanges();
    (component as any).isBrowser = true;
    (component as any).ctx = fakeCtx;
    (component as any).oCtx = fakeCtx;
    const offscreen = document.createElement('canvas');
    offscreen.width = 452;
    offscreen.height = 380;
    (component as any).offscreen = offscreen;
    (component as any).reducedMotion = false;
    (component as any).animId = 0;

    (window.requestAnimationFrame as ReturnType<typeof vi.fn>).mockClear();
    component.onImageLoad();

    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('render should skip heavy drawing when ctx or offscreen is null (covers early return)', () => {
    fixture.detectChanges();
    (component as any).ctx = null;
    (component as any).offscreen = null;
    (component as any).imgReady = true;

    (window.requestAnimationFrame as ReturnType<typeof vi.fn>).mockClear();
    (component as any).render();

    // Should still schedule next frame even without context
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });
});
