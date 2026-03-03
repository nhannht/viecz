import {
  Component,
  input,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';

/**
 * ASCII rotating cube spinner in the nhannht-metro retro style.
 *
 * Renders a 3D wireframe cube using ASCII characters inside a `<pre>` element.
 * Each face displays a different label with a unique color from the design palette.
 * Edges and corners are drawn with `@` characters.
 *
 * Based on the CodePen by Un1T3G (raBYzMG), adapted for Angular signals
 * and the nhannht-metro-meow design system.
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
  `,
})
export class NhannhtMetroSpinnerComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  /**
   * Spinner size preset.
   * - `'sm'` — 40x20 buffer, cube 16, font 6px
   * - `'md'` — 60x30 buffer, cube 28, font 7px (default)
   * - `'lg'` — 70x35 buffer, cube 40, font 8px
   */
  size = input<'sm' | 'md' | 'lg'>('md');

  /** Accessible label for screen readers. */
  label = input('Loading');

  @ViewChild('cubeEl', { static: true }) cubeEl!: ElementRef<HTMLPreElement>;

  private interval: ReturnType<typeof setInterval> | null = null;

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
  private readonly FACE_COLORS = [
    '#1a1a1a', // fg
    '#6b6b6b', // muted
    '#1a1a1a', // fg
    '#6b6b6b', // muted
    '#1a1a1a', // fg
    '#6b6b6b', // muted
  ];
  private readonly CORNER_COLOR = '#1a1a1a';
  private readonly BG_COLOR = 'transparent';

  // Face labels
  private readonly FACE_LABELS = [
    'Viecz ',
    'Loading ',
    'Metro ',
    'Meow ',
    'Tasks ',
    'Ready ',
  ];

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
      case 'sm':
        return 6;
      case 'lg':
        return 8;
      default:
        return 7;
    }
  }

  ngOnInit(): void {
    const { bufferWidth, bufferHeight } = this.config;
    const total = bufferWidth * bufferHeight;
    this.zBuffer = new Array(total).fill(0);
    this.textBuffer = new Array(total).fill(this.BG_CHAR);
  }

  ngAfterViewInit(): void {
    this.start();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private start(): void {
    this.stop();
    this.interval = setInterval(() => {
      this.update();
      this.cubeEl.nativeElement.innerHTML = this.render();
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
    const { _bufferWidth, _bufferHeight, cubeSize } = this.config;
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
