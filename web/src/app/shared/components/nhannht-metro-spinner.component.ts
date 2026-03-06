import {
  Component,
  input,
  inject,
  computed,
  effect,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { ThemeService } from '../../core/theme.service';

/**
 * Theme-aware spinner component.
 *
 * Renders a 3D ASCII wireframe cube in metro themes and a pulsing
 * teal glass ring in the frostglass theme.
 *
 * @example
 * ```html
 * <nhannht-metro-spinner />
 * <nhannht-metro-spinner size="lg" label="Saving" />
 * <nhannht-metro-spinner size="sm" />
 * ```
 */
@Component({
  selector: 'nhannht-metro-spinner',
  standalone: true,
  template: `
    @if (isGlass()) {
      <div class="glass-spinner" role="progressbar" [attr.aria-label]="label()"
           [style.width.px]="glassSize()" [style.height.px]="glassSize()">
        <div class="glass-ring" [style.border-width.px]="ringBorder()"></div>
        <div class="glass-ring-glow"></div>
      </div>
    } @else {
      <div
        class="inline-flex items-center justify-center font-display leading-none"
        role="progressbar"
        [attr.aria-label]="label()">
        <pre
          #cubeEl
          class="m-0 p-0 text-fg"
          [style.font-size.px]="fontSize()"
          [style.line-height]="1.0">
        </pre>
      </div>
    }
  `,
  styles: [`
    .glass-spinner {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .glass-ring {
      width: 100%;
      height: 100%;
      border-style: solid;
      border-color: rgba(33, 128, 141, 0.15);
      border-top-color: #21808D;
      border-radius: 50%;
      animation: glass-spin 1.2s linear infinite;
      box-sizing: border-box;
    }
    .glass-ring-glow {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      box-shadow: 0 0 15px rgba(33, 128, 141, 0.3);
      animation: glass-pulse 2s ease-in-out infinite;
    }
    @keyframes glass-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes glass-pulse {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.8; }
    }
    @media (prefers-reduced-motion: reduce) {
      .glass-ring { animation: none; }
      .glass-ring-glow { animation: none; }
    }
  `],
})
export class NhannhtMetroSpinnerComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  /**
   * Spinner size preset.
   * - `'sm'` — 40x20 buffer, cube 16, font 6px / glass 24px
   * - `'md'` — 60x30 buffer, cube 28, font 7px / glass 40px (default)
   * - `'lg'` — 70x35 buffer, cube 40, font 8px / glass 56px
   */
  private el = inject(ElementRef);
  private themeService = inject(ThemeService);
  size = input<'sm' | 'md' | 'lg'>('md');

  /** Accessible label for screen readers. */
  label = input('Loading');

  @ViewChild('cubeEl') cubeEl?: ElementRef<HTMLPreElement>;

  isGlass = computed(() => this.themeService.theme() === 'sang-frostglass');

  glassSize = computed(() => {
    switch (this.size()) {
      case 'sm': return 24;
      case 'lg': return 56;
      default:   return 40;
    }
  });

  ringBorder = computed(() => {
    switch (this.size()) {
      case 'sm': return 2;
      case 'lg': return 4;
      default:   return 3;
    }
  });

  private interval: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  // Cube engine state
  private rotationX = 0;
  private rotationY = 0;
  private rotationZ = 0;
  private speedRotationX = 0.02;
  private speedRotationY = 0.02;
  private speedRotationZ = 0.04;
  private zBuffer: number[] = [];
  private textBuffer: string[] = [];

  private readonly K1 = 40;
  private readonly DISTANCE_FROM_CAMERA = 100;
  private readonly BG_CHAR = ' ';
  private readonly CORNER_CHAR = '@';

  // nhannht-metro palette colors for each face
  private FACE_COLORS = [
    '#1a1a1a', '#6b6b6b', '#1a1a1a', '#6b6b6b', '#1a1a1a', '#6b6b6b',
  ];
  private CORNER_COLOR = '#1a1a1a';
  private readonly BG_COLOR = 'transparent';

  // Face labels
  private readonly FACE_LABELS = [
    'Viecz ', 'Loading ', 'Metro ', 'Meow ', 'Tasks ', 'Ready ',
  ];

  constructor() {
    // Stop/start cube interval when theme changes to avoid wasting CPU
    effect(() => {
      const glass = this.isGlass();
      if (!this.initialized) return;
      if (glass) {
        this.stop();
      } else {
        // Defer start so the <pre> element is rendered by Angular
        queueMicrotask(() => this.startCube());
      }
    });
  }

  private get config() {
    switch (this.size()) {
      case 'sm':
        return { bufferWidth: 40, bufferHeight: 20, cubeSize: 16 };
      case 'lg':
        return { bufferWidth: 70, bufferHeight: 35, cubeSize: 40 };
      default:
        return { bufferWidth: 60, bufferHeight: 30, cubeSize: 28 };
    }
  }

  fontSize(): number {
    switch (this.size()) {
      case 'sm': return 6;
      case 'lg': return 8;
      default:   return 7;
    }
  }

  ngOnInit(): void {
    const { bufferWidth, bufferHeight } = this.config;
    const total = bufferWidth * bufferHeight;
    this.zBuffer = new Array(total).fill(0);
    this.textBuffer = new Array(total).fill(this.BG_CHAR);
  }

  ngAfterViewInit(): void {
    this.initialized = true;
    if (!this.isGlass()) {
      this.startCube();
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private startCube(): void {
    this.stop();
    if (!this.cubeEl) return;
    // Read theme colors from CSS variables
    const style = getComputedStyle(this.el.nativeElement);
    const fg = style.getPropertyValue('--color-fg').trim() || '#1a1a1a';
    const muted = style.getPropertyValue('--color-muted').trim() || '#6b6b6b';
    this.FACE_COLORS = [fg, muted, fg, muted, fg, muted];
    this.CORNER_COLOR = fg;
    const cubeRef = this.cubeEl;
    this.interval = setInterval(() => {
      this.update();
      // Safe: render() generates HTML from internal state only (face labels, colors),
      // no user-supplied content flows into the output.
      cubeRef.nativeElement.innerHTML = this.render();
    }, 1000 / 30);
  }

  private stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private calcX(i: number, j: number, k: number): number {
    return (
      j * Math.sin(this.rotationX) * Math.sin(this.rotationY) * Math.cos(this.rotationZ) -
      k * Math.cos(this.rotationX) * Math.sin(this.rotationY) * Math.cos(this.rotationZ) +
      j * Math.cos(this.rotationX) * Math.sin(this.rotationZ) +
      k * Math.sin(this.rotationX) * Math.sin(this.rotationZ) +
      i * Math.cos(this.rotationY) * Math.cos(this.rotationZ)
    );
  }

  private calcY(i: number, j: number, k: number): number {
    return (
      j * Math.cos(this.rotationX) * Math.cos(this.rotationZ) +
      k * Math.sin(this.rotationX) * Math.cos(this.rotationZ) -
      j * Math.sin(this.rotationX) * Math.sin(this.rotationY) * Math.sin(this.rotationZ) +
      k * Math.cos(this.rotationX) * Math.sin(this.rotationY) * Math.sin(this.rotationZ) -
      i * Math.cos(this.rotationY) * Math.sin(this.rotationZ)
    );
  }

  private calcZ(i: number, j: number, k: number): number {
    return (
      k * Math.cos(this.rotationX) * Math.cos(this.rotationY) -
      j * Math.sin(this.rotationX) * Math.cos(this.rotationY) +
      i * Math.sin(this.rotationY)
    );
  }

  private calculateForSurface(cubeX: number, cubeY: number, cubeZ: number, surfaceIndex: number): void {
    const { bufferWidth, bufferHeight } = this.config;
    const x = this.calcX(cubeX, cubeY, cubeZ);
    const y = this.calcY(cubeX, cubeY, cubeZ);
    const z = this.calcZ(cubeX, cubeY, cubeZ) + this.DISTANCE_FROM_CAMERA;
    const ooz = 1 / z;
    const xp = Math.floor(bufferWidth / 2 + this.K1 * ooz * x * 2);
    const yp = Math.floor(bufferHeight / 2 + this.K1 * ooz * y);
    const idx = xp + yp * bufferWidth;
    const total = bufferWidth * bufferHeight;

    if (idx >= 0 && idx < total && ooz > this.zBuffer[idx]) {
      this.zBuffer[idx] = ooz;
      const half = this.config.cubeSize / 2;
      const ax = Math.abs(cubeX), ay = Math.abs(cubeY), az = Math.abs(cubeZ);
      if ((ax === half && ay === half) || (ay === half && az === half) || (ax === half && az === half)) {
        this.textBuffer[idx] = this.CORNER_CHAR;
      } else {
        this.textBuffer[idx] = surfaceIndex.toString();
      }
    }
  }

  private update(): void {
    const { bufferWidth: _bufferWidth, bufferHeight: _bufferHeight, cubeSize } = this.config;
    this.zBuffer.fill(0);
    this.textBuffer.fill(this.BG_CHAR);
    const half = cubeSize / 2;
    for (let cx = -half; cx <= half; cx++) {
      for (let cy = -half; cy <= half; cy++) {
        this.calculateForSurface(cx, cy, -half, 0);
        this.calculateForSurface(half, cy, cx, 1);
        this.calculateForSurface(-half, cy, -cx, 2);
        this.calculateForSurface(-cx, cy, half, 3);
        this.calculateForSurface(cx, -half, -cy, 4);
        this.calculateForSurface(cx, half, cy, 5);
      }
    }
    this.rotationX += this.speedRotationX;
    this.rotationY += this.speedRotationY;
    this.rotationZ += this.speedRotationZ;
  }

  private render(): string {
    const { bufferWidth, bufferHeight } = this.config;
    let result = '';
    let prevChar = '';
    for (let i = 0; i < bufferHeight; i++) {
      for (let j = 0; j < bufferWidth; j++) {
        const idx = j + i * bufferWidth;
        const ch = this.textBuffer[idx];
        if (ch !== prevChar) {
          result += '</span>';
          if (ch === this.BG_CHAR) {
            result += `<span style="color:${this.BG_COLOR}">`;
          } else if (ch === this.CORNER_CHAR) {
            result += `<span style="color:${this.CORNER_COLOR}">`;
          } else {
            result += `<span style="color:${this.FACE_COLORS[Number(ch)]}">`;
          }
        }
        prevChar = ch;
        if (ch === this.BG_CHAR || ch === this.CORNER_CHAR) {
          result += ch;
        } else {
          const label = this.FACE_LABELS[Number(ch)];
          result += label[idx % label.length];
        }
      }
      result += '\n';
    }
    return result;
  }
}
