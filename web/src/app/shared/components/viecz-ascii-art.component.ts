import {
  Component,
  input,
  ElementRef,
  viewChild,
  afterNextRender,
  OnDestroy,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'viecz-ascii-art',
  standalone: true,
  template: `
    <img
      #sourceImg
      [src]="src()"
      [alt]="alt()"
      style="display: none"
      (load)="onImageLoad()"
    />
    <canvas
      #canvas
      [attr.width]="width()"
      [attr.height]="height()"
      role="img"
      [attr.aria-label]="alt()"
      (mouseenter)="onHover()"
      class="block max-w-full h-auto"
    ></canvas>
  `,
})
export class VieczAsciiArtComponent implements OnDestroy {
  src = input.required<string>();
  width = input(452);
  height = input(380);
  alt = input('');

  sourceImg = viewChild<ElementRef<HTMLImageElement>>('sourceImg');
  canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  private offscreen: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private oCtx: CanvasRenderingContext2D | null = null;
  private imgReady = false;
  private animId = 0;
  private time = 0;
  private glitchIntensity = 0;
  private nextGlitch = 60 + Math.random() * 120;
  private reducedMotion = false;
  private isBrowser: boolean;

  constructor() {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    afterNextRender(() => {
      if (!this.isBrowser) return;
      this.reducedMotion = typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.setupCanvas();
    });
  }

  onImageLoad() {
    if (!this.isBrowser) return;
    this.rasterize();
  }

  onHover() {
    if (this.reducedMotion) return;
    this.glitchIntensity = 0.7 + Math.random() * 0.3;
  }

  ngOnDestroy() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
  }

  private setupCanvas() {
    const canvasEl = this.canvas()?.nativeElement;
    if (!canvasEl) return;

    const W = this.width();
    const H = this.height();

    this.ctx = canvasEl.getContext('2d');
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = W;
    this.offscreen.height = H;
    this.oCtx = this.offscreen.getContext('2d');

    // If image already loaded (cached), rasterize now
    const imgEl = this.sourceImg()?.nativeElement;
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      this.rasterize();
    }
  }

  private rasterize() {
    const imgEl = this.sourceImg()?.nativeElement;
    if (!imgEl || !this.oCtx || !this.offscreen) return;

    const W = this.width();
    const H = this.height();
    this.oCtx.drawImage(imgEl, 0, 0, W, H);
    this.imgReady = true;

    if (this.reducedMotion) {
      this.drawStatic();
    } else if (!this.animId) {
      this.animId = requestAnimationFrame(() => this.render());
    }
  }

  private drawStatic() {
    if (!this.ctx || !this.offscreen) return;
    const W = this.width();
    const H = this.height();
    this.ctx.clearRect(0, 0, W, H);
    this.ctx.drawImage(this.offscreen, 0, 0);

    // Static scanlines only
    this.ctx.fillStyle = 'rgba(240, 237, 232, 0.25)';
    for (let y = 0; y < H; y += 4) {
      this.ctx.fillRect(0, y, W, 1);
    }
  }

  private render() {
    if (!this.ctx || !this.offscreen || !this.imgReady) {
      this.animId = requestAnimationFrame(() => this.render());
      return;
    }

    const W = this.width();
    const H = this.height();

    this.time++;
    this.ctx.clearRect(0, 0, W, H);

    // Periodic glitch bursts
    if (this.time >= this.nextGlitch) {
      this.glitchIntensity = 0.5 + Math.random() * 0.5;
      this.nextGlitch = this.time + 120 + Math.random() * 180;
    }
    if (this.glitchIntensity > 0) {
      this.glitchIntensity *= 0.93;
      if (this.glitchIntensity < 0.02) this.glitchIntensity = 0;
    }

    // Breathing
    const breathAmp = Math.sin(this.time * 0.03) * 1.5;

    // Draw mascot in horizontal slices with glitch + breathing
    const sliceH = 3;
    for (let y = 0; y < H; y += sliceH) {
      let offsetX = 0;
      if (this.glitchIntensity > 0 && Math.random() < this.glitchIntensity * 0.3) {
        offsetX = (Math.random() - 0.5) * 60 * this.glitchIntensity;
      }
      offsetX += Math.sin(y * 0.02 + this.time * 0.025) * 1.2; // Wave distortion
      const breathY = breathAmp * (1 - y / H);
      this.ctx.drawImage(this.offscreen, 0, y, W, sliceH, offsetX, y + breathY, W, sliceH);
    }

    // Scanlines
    this.ctx.fillStyle = 'rgba(240, 237, 232, 0.25)';
    for (let y = 0; y < H; y += 4) {
      this.ctx.fillRect(0, y, W, 1);
    }

    // Thick glitch bands
    if (this.glitchIntensity > 0.1) {
      for (let i = 0; i < 4; i++) {
        const by = Math.random() * H;
        const bh = 2 + Math.random() * 6;
        this.ctx.fillStyle = `rgba(240, 237, 232, ${0.25 + this.glitchIntensity * 0.35})`;
        this.ctx.fillRect(0, by, W, bh);
      }
    }

    // Vignette
    const grad = this.ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
    grad.addColorStop(0, 'rgba(240,237,232,0)');
    grad.addColorStop(1, 'rgba(240,237,232,0.4)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, W, H);

    this.animId = requestAnimationFrame(() => this.render());
  }
}
