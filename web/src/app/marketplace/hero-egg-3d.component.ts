import {
  Component,
  ElementRef,
  ViewChild,
  PLATFORM_ID,
  inject,
  afterNextRender,
  OnDestroy,
  ChangeDetectionStrategy,
  input,
  output,
  isDevMode,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

const BLOOM_LAYER = 1;
// SWIM_RANGE computed dynamically from camera frustum — see initThree()
const DESIRED_HALF_HEIGHT = 3.0; // ±3.0 = bigger tank, camera further back
const CAMERA_FOV = 45;

// Debug visualizations: auto-enabled in dev mode (ng serve), off in production
const DEBUG_3D = isDevMode();
const TRAIL_MAX_POINTS = 600; // ~10s at 60fps
const TRAIL_COLOR = 0xff4444;

// Direction animation names matching the GLB
const DIR_ANIMS = {
  forward: 'move f',
  left: 'move l',
  right: 'move r',
  up: 'move u',
  down: 'move d',
} as const;
type Direction = keyof typeof DIR_ANIMS;

const GULP_ANIM = 'gulp';
const SURFACE_ANIM = 'surface';
const BLEND_SPEED = 0.6;        // weight change per second (full transition ≈ 1.7s)
const DIR_HOLD_TIME = 2000;     // ms — must look in a direction for 2s before switching

@Component({
  selector: 'app-hero-egg-3d',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #threeCanvas (click)="onCanvasClick($event)"></canvas>`,
  styles: `
    :host { display: block; width: 100%; height: 100%; }
    canvas { display: block; width: 100%; height: 100%; cursor: pointer; }
  `,
})
export class HeroEgg3dComponent implements OnDestroy {
  @ViewChild('threeCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  mousePos = input<{ x: number; y: number } | null>(null);
  whaleClicked = output<void>();

  private platformId = inject(PLATFORM_ID);
  private animationId = 0;
  private renderer: THREE.WebGLRenderer | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private raycaster = new THREE.Raycaster();
  private resizeObserver: ResizeObserver | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clock = new THREE.Clock();

  // All directional actions — pre-played at weight 0 so crossfade is seamless
  private dirActions: Record<Direction, THREE.AnimationAction | null> = {
    forward: null, left: null, right: null, up: null, down: null,
  };
  private activeDir: Direction = 'forward';
  private gulpAction: THREE.AnimationAction | null = null;
  private surfaceAction: THREE.AnimationAction | null = null;
  private isReacting = false;

  // Direction hold — only switch after sustained look in one direction
  private pendingDir: Direction = 'forward';
  private pendingDirSince = 0;

  // Frustum-based swim ranges (set in initThree)
  private swimRangeX = 1;
  private swimRangeY = 1;
  private swimRangeZ = 0.5;

  // 3D movement
  private modelGroup: THREE.Group | null = null;
  private whalePos = new THREE.Vector3(-2, 0, 0); // start off-screen left (updated in initThree)
  private whaleTarget = new THREE.Vector3(0, 0, 0);
  private whaleVelocity = new THREE.Vector3(0, 0, 0);
  private swimSpeed = 0.002; // randomized per waypoint: 0.001–0.004
  private enteringScene = true;
  private entranceStartTime = 0;
  private readonly ENTRANCE_DURATION = 5000; // 5 seconds — lazy drift

  // Rotation — 3 second turn
  private targetRotationY = 0;
  private targetRotationX = 0;
  private readonly TURN_LERP = 0.01; // ~5 second turn

  // Free-swim
  private freeSwimTarget = new THREE.Vector3(0, 0, 0);
  private freeSwimTimer = 0;
  private freeSwimInterval = 8000; // variable, randomized each waypoint
  private readonly VELOCITY_LERP = 0.06; // how quickly whale changes direction
  // Organic wobble — gentle sinusoidal sway
  private wobblePhase = Math.random() * Math.PI * 2;
  // User-directed swim — click-to-swim target takes priority over free-swim
  private userDirected = false;
  private userDirectedTarget = new THREE.Vector3(0, 0, 0);

  // Debug
  private lastDebugLog = 0;
  private readonly DEBUG_LOG_INTERVAL = 500; // log every 500ms

  // Debug visualizations (only when DEBUG_3D = true)
  private debugGui: GUI | null = null;
  private debugTrailLine: THREE.Line | null = null;
  private debugTrailPositions: Float32Array | null = null;
  private debugTrailIndex = 0;
  private debugTrailCount = 0;
  private debugVelocityArrow: THREE.ArrowHelper | null = null;
  private debugAxes: THREE.AxesHelper | null = null;
  private debugSkeletonHelper: THREE.SkeletonHelper | null = null;
  private debugGuiParams = {
    // Position (read-only, updated each frame)
    posX: 0, posY: 0, posZ: 0,
    // Velocity
    velX: 0, velY: 0, velZ: 0,
    // Rotation
    rotY: 0, rotX: 0,
    // Animation state
    activeDir: 'forward',
    enteringScene: true,
    isReacting: false,
    timeScale: 0.7,
    // Weights (updated each frame)
    wForward: 0, wLeft: 0, wRight: 0, wUp: 0, wDown: 0,
    wSurface: 0, wGulp: 0,
    // Trail toggle
    showTrail: true,
    showVelocity: true,
    showSkeleton: false,
    showAxes: true,
    showMinimap: true,
    showLogPanel: true,
    openDebugWindow: () => { this.initDebugPopup(); },
    clearTrail: () => { this.clearDebugTrail(); },
    clearLog: () => { this.debugLogEntries = []; if (this.debugLogContent) this.debugLogContent.textContent = ''; },
    replayEntrance: () => { this.replayEntrance(); },
  }

  // Debug minimap (3D inset viewport)
  private debugMiniScene: THREE.Scene | null = null;
  private debugMiniCam: THREE.OrthographicCamera | null = null;
  private debugMiniWhaleDot: THREE.Mesh | null = null;
  private debugMiniTrailLine: THREE.Line | null = null;
  private debugMiniBoundsBox: THREE.LineSegments | null = null;

  // Debug popup window (detached)
  private debugPopupWindow: Window | null = null;
  private debugLogPanel: HTMLDivElement | null = null;
  private debugLogContent: HTMLDivElement | null = null;
  private debugLogEntries: Record<string, unknown>[] = [];
  private debugLogLastSample = 0;
  private readonly DEBUG_LOG_SAMPLE_MS = 500;
  private readonly DEBUG_LOG_MAX_ENTRIES = 200;

  // Debug 3D plot (in popup)
  private debugPlotRenderer: THREE.WebGLRenderer | null = null;
  private debugPlotScene: THREE.Scene | null = null;
  private debugPlotCamera: THREE.PerspectiveCamera | null = null;
  private debugPlotControls: OrbitControls | null = null;
  private debugPlotWhaleDot: THREE.Mesh | null = null;
  private debugPlotTrailLine: THREE.Line | null = null;
  private debugPlotAnimId = 0;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.initThree();
    });

    // Whale does not follow mouse — only click triggers gulp reaction
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
    this.mixer?.removeEventListener('finished', this.onGulpFinished);
    this.renderer?.dispose();
    this.destroyDebug();
  }

  onCanvasClick(event: MouseEvent): void {
    if (!this.camera || !this.modelGroup) return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast against whale model
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = this.raycaster.intersectObject(this.modelGroup, true);

    if (hits.length > 0) {
      // Clicked on the whale — trigger gulp via weight blend (all anims run parallel)
      this.whaleClicked.emit();
      if (this.isReacting || !this.gulpAction) return;
      this.isReacting = true;
      // reset() clears Three.js internal "finished" state so the action can advance again
      this.gulpAction.reset();
      this.gulpAction.setEffectiveWeight(0); // blend loop will lerp this up smoothly
      console.log(`[whale:click] gulp triggered, active=${this.activeDir}`);
    } else {
      // Clicked on background — swim toward that point
      const clickWorld = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(this.camera);
      const camPos = this.camera.position.clone();
      const dir = clickWorld.sub(camPos).normalize();
      // Intersect with z=0 plane
      const t = -camPos.z / dir.z;
      const targetX = camPos.x + dir.x * t;
      const targetY = camPos.y + dir.y * t;

      // Set user-directed target — takes priority over free-swim
      this.userDirected = true;
      this.userDirectedTarget.set(
        Math.max(-this.swimRangeX * 0.9, Math.min(this.swimRangeX * 0.9, targetX)),
        Math.max(-this.swimRangeY * 0.9, Math.min(this.swimRangeY * 0.9, targetY)),
        this.whalePos.z,
      );
      console.log(`[whale:click] swim to (${this.userDirectedTarget.x.toFixed(2)}, ${this.userDirectedTarget.y.toFixed(2)})`);
    }
  }

  private onGulpFinished = (): void => {
    if (!this.isReacting) return;
    this.isReacting = false;
    // Reset clears the clamped last-frame pose so it doesn't contaminate blend-out
    if (this.gulpAction) {
      this.gulpAction.reset();
      this.gulpAction.setEffectiveWeight(0); // immediately zero — no lingering clamped pose
    }
    console.log(`[whale:gulp-done] returning to ${this.activeDir}`);
  };

  /** Switch directional animation — weights blended each frame in animate loop */
  private switchDirection(newDir: Direction): void {
    if (newDir === this.activeDir || this.isReacting) return;
    console.log(`[whale:switch] ${this.activeDir} → ${newDir}`);
    this.activeDir = newDir;
  }

  /** Determine desired direction from look vector */
  private computeDesiredDirection(lookDx: number, lookDy: number, lookDz: number): Direction {
    const ax = Math.abs(lookDx);
    const ay = Math.abs(lookDy);
    const az = Math.abs(lookDz);

    // Near target — keep current
    if (ax < 0.1 && ay < 0.1 && az < 0.1) return this.activeDir;

    // Swimming mainly in depth (Z) — use forward animation
    if (az > ax && az > ay) return 'forward';

    if (ax > ay) {
      return lookDx > 0 ? 'right' : 'left';
    } else {
      return lookDy > 0 ? 'up' : 'down';
    }
  }

  private replayEntrance(): void {
    this.enteringScene = true;
    this.entranceStartTime = 0;
    this.whalePos.set(-this.swimRangeX * 1.3, 0, 0);
    this.whaleVelocity.set(0, 0, 0);
    this.clearDebugTrail();
    console.log('[whale] replaying entrance');
  }

  private pickFreeSwimWaypoint(): void {
    // Heading-biased waypoint: pick within a ±60° cone of current velocity
    // This creates natural arcing turns instead of ping-ponging
    const speed = this.whaleVelocity.length();
    const CONE_HALF_ANGLE = Math.PI / 3; // 60°

    if (speed > 0.00005) {
      // We have a meaningful heading — bias toward it
      const headingAngleXZ = Math.atan2(this.whaleVelocity.x, this.whaleVelocity.z);
      const headingAngleY = Math.atan2(this.whaleVelocity.y, Math.sqrt(
        this.whaleVelocity.x * this.whaleVelocity.x + this.whaleVelocity.z * this.whaleVelocity.z
      ));

      // Random angle within cone
      const deviationXZ = (Math.random() - 0.5) * 2 * CONE_HALF_ANGLE;
      const deviationY = (Math.random() - 0.5) * 2 * CONE_HALF_ANGLE * 0.5; // less vertical deviation

      const newAngleXZ = headingAngleXZ + deviationXZ;
      const newAngleY = headingAngleY + deviationY;

      // Project forward at a random distance (40-90% of swim range)
      const distFactor = 0.4 + Math.random() * 0.5;
      const dist = Math.max(this.swimRangeX, this.swimRangeZ) * distFactor;

      const candidateX = this.whalePos.x + Math.sin(newAngleXZ) * Math.cos(newAngleY) * dist;
      const candidateY = this.whalePos.y + Math.sin(newAngleY) * dist * 0.6;
      const candidateZ = this.whalePos.z + Math.cos(newAngleXZ) * Math.cos(newAngleY) * dist;

      // Clamp to swim range (with 10% margin so whale doesn't hug walls)
      this.freeSwimTarget.set(
        Math.max(-this.swimRangeX * 0.9, Math.min(this.swimRangeX * 0.9, candidateX)),
        Math.max(-this.swimRangeY * 0.9, Math.min(this.swimRangeY * 0.9, candidateY)),
        Math.max(-this.swimRangeZ * 0.9, Math.min(this.swimRangeZ * 0.9, candidateZ)),
      );
    } else {
      // No velocity yet — pick random (initial state)
      this.freeSwimTarget.set(
        (Math.random() - 0.5) * 2 * this.swimRangeX * 0.7,
        (Math.random() - 0.5) * 2 * this.swimRangeY * 0.5,
        (Math.random() - 0.5) * 2 * this.swimRangeZ * 0.7,
      );
    }

    // Randomize next interval: 6-12 seconds
    this.freeSwimInterval = 6000 + Math.random() * 6000;
    // Randomize speed: 0.001–0.004
    this.swimSpeed = 0.001 + Math.random() * 0.003;
  }

  // ── Debug visualization setup ──

  private initDebugGui(): void {
    this.debugGui = new GUI({ title: '🐋 Whale Debug', width: 320 });

    const posFolder = this.debugGui.addFolder('Position');
    posFolder.add(this.debugGuiParams, 'posX').listen().disable();
    posFolder.add(this.debugGuiParams, 'posY').listen().disable();
    posFolder.add(this.debugGuiParams, 'posZ').listen().disable();

    const velFolder = this.debugGui.addFolder('Velocity');
    velFolder.add(this.debugGuiParams, 'velX').listen().disable();
    velFolder.add(this.debugGuiParams, 'velY').listen().disable();
    velFolder.add(this.debugGuiParams, 'velZ').listen().disable();

    const rotFolder = this.debugGui.addFolder('Rotation');
    rotFolder.add(this.debugGuiParams, 'rotY').listen().disable();
    rotFolder.add(this.debugGuiParams, 'rotX').listen().disable();

    const animFolder = this.debugGui.addFolder('Animation');
    animFolder.add(this.debugGuiParams, 'activeDir').listen().disable();
    animFolder.add(this.debugGuiParams, 'enteringScene').listen().disable();
    animFolder.add(this.debugGuiParams, 'isReacting').listen().disable();
    animFolder.add(this.debugGuiParams, 'timeScale').listen().disable();

    const weightsFolder = this.debugGui.addFolder('Weights');
    weightsFolder.add(this.debugGuiParams, 'wForward', 0, 1).listen().disable();
    weightsFolder.add(this.debugGuiParams, 'wLeft', 0, 1).listen().disable();
    weightsFolder.add(this.debugGuiParams, 'wRight', 0, 1).listen().disable();
    weightsFolder.add(this.debugGuiParams, 'wUp', 0, 1).listen().disable();
    weightsFolder.add(this.debugGuiParams, 'wDown', 0, 1).listen().disable();
    weightsFolder.add(this.debugGuiParams, 'wSurface', 0, 1).listen().disable();
    weightsFolder.add(this.debugGuiParams, 'wGulp', 0, 1).listen().disable();

    const toggleFolder = this.debugGui.addFolder('Toggles');
    toggleFolder.add(this.debugGuiParams, 'showTrail').onChange((v: boolean) => {
      if (this.debugTrailLine) this.debugTrailLine.visible = v;
    });
    toggleFolder.add(this.debugGuiParams, 'showVelocity').onChange((v: boolean) => {
      if (this.debugVelocityArrow) this.debugVelocityArrow.visible = v;
    });
    toggleFolder.add(this.debugGuiParams, 'showSkeleton').onChange((v: boolean) => {
      if (this.debugSkeletonHelper) this.debugSkeletonHelper.visible = v;
    });
    toggleFolder.add(this.debugGuiParams, 'showAxes').onChange((v: boolean) => {
      if (this.debugAxes) this.debugAxes.visible = v;
    });
    toggleFolder.add(this.debugGuiParams, 'showMinimap').name('3D Minimap');
    toggleFolder.add(this.debugGuiParams, 'showLogPanel').name('Log Panel').onChange((v: boolean) => {
      if (this.debugLogPanel) this.debugLogPanel.style.display = v ? 'flex' : 'none';
    });
    toggleFolder.add(this.debugGuiParams, 'openDebugWindow').name('Open Debug Window');
    toggleFolder.add(this.debugGuiParams, 'clearTrail');
    toggleFolder.add(this.debugGuiParams, 'clearLog').name('Clear Log');
    toggleFolder.add(this.debugGuiParams, 'replayEntrance').name('Replay Entrance');
  }

  private initDebugTrail(scene: THREE.Scene): void {
    this.debugTrailPositions = new Float32Array(TRAIL_MAX_POINTS * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.debugTrailPositions, 3));
    geometry.setDrawRange(0, 0);
    const material = new THREE.LineBasicMaterial({ color: TRAIL_COLOR, linewidth: 2 });
    this.debugTrailLine = new THREE.Line(geometry, material);
    this.debugTrailLine.frustumCulled = false;
    scene.add(this.debugTrailLine);
  }

  private updateDebugTrail(): void {
    if (!this.debugTrailPositions || !this.debugTrailLine) return;
    const i = this.debugTrailIndex * 3;
    this.debugTrailPositions[i] = this.whalePos.x;
    this.debugTrailPositions[i + 1] = this.whalePos.y;
    this.debugTrailPositions[i + 2] = this.whalePos.z;
    this.debugTrailIndex = (this.debugTrailIndex + 1) % TRAIL_MAX_POINTS;
    this.debugTrailCount = Math.min(this.debugTrailCount + 1, TRAIL_MAX_POINTS);
    const attr = this.debugTrailLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
    this.debugTrailLine.geometry.setDrawRange(0, this.debugTrailCount);
  }

  private clearDebugTrail(): void {
    this.debugTrailIndex = 0;
    this.debugTrailCount = 0;
    if (this.debugTrailPositions) this.debugTrailPositions.fill(0);
    if (this.debugTrailLine) this.debugTrailLine.geometry.setDrawRange(0, 0);
  }

  private initDebugVelocityArrow(scene: THREE.Scene): void {
    const dir = new THREE.Vector3(1, 0, 0);
    this.debugVelocityArrow = new THREE.ArrowHelper(dir, new THREE.Vector3(), 0.5, 0x00ff00, 0.1, 0.05);
    scene.add(this.debugVelocityArrow);
  }

  private updateDebugVelocityArrow(vx: number, vy: number, vz: number): void {
    if (!this.debugVelocityArrow) return;
    this.debugVelocityArrow.position.copy(this.whalePos);
    const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (len > 0.0001) {
      const dir = new THREE.Vector3(vx, vy, vz).normalize();
      this.debugVelocityArrow.setDirection(dir);
      // Scale arrow length for visibility (velocity values are small)
      this.debugVelocityArrow.setLength(Math.min(len * 2000, 1.5), 0.15, 0.08);
    }
  }

  private initDebugHelpers(scene: THREE.Scene, model: THREE.Object3D): void {
    // Axes helper at whale position
    this.debugAxes = new THREE.AxesHelper(0.5);
    scene.add(this.debugAxes);

    // Skeleton helper — shows bone wireframe
    this.debugSkeletonHelper = new THREE.SkeletonHelper(model);
    this.debugSkeletonHelper.visible = false; // off by default, toggle in GUI
    scene.add(this.debugSkeletonHelper);
  }

  private updateDebugHelpers(): void {
    if (this.debugAxes) {
      this.debugAxes.position.copy(this.whalePos);
    }
  }

  private updateDebugGui(vx: number, vy: number, vz: number): void {
    const p = this.debugGuiParams;
    p.posX = +this.whalePos.x.toFixed(3);
    p.posY = +this.whalePos.y.toFixed(3);
    p.posZ = +this.whalePos.z.toFixed(3);
    p.velX = +vx.toFixed(5);
    p.velY = +vy.toFixed(5);
    p.velZ = +vz.toFixed(5);
    if (this.modelGroup) {
      p.rotY = +(this.modelGroup.rotation.y * 180 / Math.PI).toFixed(1);
      p.rotX = +(this.modelGroup.rotation.x * 180 / Math.PI).toFixed(1);
    }
    p.activeDir = this.activeDir;
    p.enteringScene = this.enteringScene;
    p.isReacting = this.isReacting;
    p.timeScale = +(this.dirActions[this.activeDir]?.timeScale ?? 0).toFixed(2);
    p.wForward = +(this.dirActions.forward?.getEffectiveWeight() ?? 0).toFixed(3);
    p.wLeft = +(this.dirActions.left?.getEffectiveWeight() ?? 0).toFixed(3);
    p.wRight = +(this.dirActions.right?.getEffectiveWeight() ?? 0).toFixed(3);
    p.wUp = +(this.dirActions.up?.getEffectiveWeight() ?? 0).toFixed(3);
    p.wDown = +(this.dirActions.down?.getEffectiveWeight() ?? 0).toFixed(3);
    p.wSurface = +(this.surfaceAction?.getEffectiveWeight() ?? 0).toFixed(3);
    p.wGulp = +(this.gulpAction?.getEffectiveWeight() ?? 0).toFixed(3);
  }

  private initDebugMinimap(): void {
    this.debugMiniScene = new THREE.Scene();
    this.debugMiniScene.background = new THREE.Color(0x111122);

    // Top-down orthographic camera looking along -Y
    const range = Math.max(this.swimRangeX, this.swimRangeZ) * 1.3;
    this.debugMiniCam = new THREE.OrthographicCamera(-range, range, range, -range, 0.1, 100);
    this.debugMiniCam.position.set(0, 20, 0);
    this.debugMiniCam.lookAt(0, 0, 0);

    // Swim bounds box (wireframe)
    const PAD = 1.15;
    const boxGeo = new THREE.BoxGeometry(
      this.swimRangeX * 2 * PAD,
      this.swimRangeY * 2 * PAD,
      this.swimRangeZ * 2 * PAD,
    );
    const edges = new THREE.EdgesGeometry(boxGeo);
    this.debugMiniBoundsBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x444488 }));
    this.debugMiniScene.add(this.debugMiniBoundsBox);

    // Axes helper
    this.debugMiniScene.add(new THREE.AxesHelper(range * 0.3));

    // Whale position dot (green sphere)
    const dotGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.debugMiniWhaleDot = new THREE.Mesh(dotGeo, dotMat);
    this.debugMiniScene.add(this.debugMiniWhaleDot);

    // Shared trail line for minimap (copies positions from main trail)
    const trailPositions = new Float32Array(TRAIL_MAX_POINTS * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setDrawRange(0, 0);
    this.debugMiniTrailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: TRAIL_COLOR }));
    this.debugMiniTrailLine.frustumCulled = false;
    this.debugMiniScene.add(this.debugMiniTrailLine);
  }

  private updateDebugMinimap(): void {
    if (!this.debugMiniScene || !this.debugMiniWhaleDot || !this.debugMiniTrailLine) return;

    // Update whale dot position
    this.debugMiniWhaleDot.position.set(this.whalePos.x, this.whalePos.y, this.whalePos.z);

    // Sync trail data from main trail
    if (this.debugTrailPositions && this.debugMiniTrailLine.geometry) {
      const miniAttr = this.debugMiniTrailLine.geometry.getAttribute('position') as THREE.BufferAttribute;
      miniAttr.array.set(this.debugTrailPositions);
      miniAttr.needsUpdate = true;
      this.debugMiniTrailLine.geometry.setDrawRange(0, Math.min(this.debugTrailCount, TRAIL_MAX_POINTS));
    }
  }

  private renderDebugMinimap(renderer: THREE.WebGLRenderer, containerW: number, containerH: number): void {
    if (!this.debugMiniScene || !this.debugMiniCam || !this.debugGuiParams.showMinimap) return;

    const size = 200;
    const pr = renderer.getPixelRatio();
    const x = (containerW - size) * pr;
    const y = (containerH - size) * pr;
    const s = size * pr;

    renderer.autoClear = false;
    renderer.setScissorTest(true);
    renderer.setViewport(x, y, s, s);
    renderer.setScissor(x, y, s, s);
    renderer.setClearColor(0x111122, 0.85);
    renderer.clearColor();
    renderer.render(this.debugMiniScene, this.debugMiniCam);

    // Restore
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, containerW * pr, containerH * pr);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
  }

  private initDebugPopup(): void {
    // If already open and ours, just focus it
    if (this.debugPopupWindow && !this.debugPopupWindow.closed) {
      this.debugPopupWindow.focus();
      return;
    }

    // Reuse existing popup window by name (survives hot reload)
    const popup = window.open('', 'whale-debug', 'width=1000,height=700,resizable=yes,scrollbars=yes');
    if (!popup) {
      console.warn('[whale:debug] Popup blocked — allow popups for localhost');
      return;
    }

    // Clean up stale content from previous instance (hot reload / re-open)
    if (this.debugPlotAnimId) cancelAnimationFrame(this.debugPlotAnimId);
    this.debugPlotRenderer?.dispose();
    this.debugPlotRenderer = null;
    this.debugPlotScene = null;
    this.debugPlotCamera = null;
    this.debugPlotControls = null;
    this.debugPlotWhaleDot = null;
    this.debugPlotTrailLine = null;
    this.debugLogPanel = null;
    this.debugLogContent = null;

    // Clear the popup document completely
    const doc = popup.document;
    doc.open();
    doc.close();

    this.debugPopupWindow = popup;
    doc.title = 'Whale 3D Debug';
    doc.body.style.cssText =
      'margin:0;padding:0;background:#0d0d1a;color:#aabbdd;' +
      'font-family:monospace;font-size:11px;display:flex;flex-direction:column;height:100vh;overflow:hidden;';

    // Top bar
    const topBar = doc.createElement('div');
    topBar.style.cssText =
      'padding:8px 12px;background:#161630;border-bottom:1px solid #444488;' +
      'font-size:13px;font-weight:bold;color:#8888cc;flex-shrink:0;';
    topBar.textContent = 'Whale 3D Debug — Interactive Plot + Structured Log';
    doc.body.appendChild(topBar);

    // Main layout: left = 3D plot, right = log
    const main = doc.createElement('div');
    main.style.cssText = 'display:flex;flex:1;min-height:0;overflow:hidden;';

    // Left column: interactive 3D plot
    const leftCol = doc.createElement('div');
    leftCol.style.cssText =
      'width:50%;flex-shrink:0;border-right:1px solid #444488;position:relative;';
    this.initDebug3DPlot(doc, leftCol);
    main.appendChild(leftCol);

    // Right column: structured log
    const rightCol = doc.createElement('div');
    rightCol.style.cssText = 'flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;';
    this.initDebugLogPanel(doc);
    if (this.debugLogPanel) {
      rightCol.appendChild(this.debugLogPanel);
    }
    main.appendChild(rightCol);

    doc.body.appendChild(main);
  }

  private initDebug3DPlot(doc: Document, container: HTMLElement): void {
    const canvas = doc.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d1a);
    this.debugPlotScene = scene;

    // Grid + axes
    const range = Math.max(this.swimRangeX, this.swimRangeY, this.swimRangeZ) * 1.3;
    const grid = new THREE.GridHelper(range * 2, 20, 0x333366, 0x222244);
    scene.add(grid);
    const axes = new THREE.AxesHelper(range * 0.6);
    scene.add(axes);

    // Axis labels (X=red, Y=green, Z=blue sprites)
    const makeLabel = (text: string, color: string, pos: THREE.Vector3) => {
      const c = doc.createElement('canvas');
      c.width = 64; c.height = 32;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(text, 32, 24);
      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.scale.set(range * 0.15, range * 0.075, 1);
      scene.add(sprite);
    };
    makeLabel('X', '#ff4444', new THREE.Vector3(range * 0.65, 0, 0));
    makeLabel('Y', '#44ff44', new THREE.Vector3(0, range * 0.65, 0));
    makeLabel('Z', '#4444ff', new THREE.Vector3(0, 0, range * 0.65));

    // Swim bounds wireframe box
    const PAD = 1.15;
    const boxGeo = new THREE.BoxGeometry(
      this.swimRangeX * 2 * PAD,
      this.swimRangeY * 2 * PAD,
      this.swimRangeZ * 2 * PAD,
    );
    const edges = new THREE.EdgesGeometry(boxGeo);
    scene.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x555588, transparent: true, opacity: 0.5 })));

    // Whale position dot (green sphere)
    const dotGeo = new THREE.SphereGeometry(range * 0.03, 12, 12);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.debugPlotWhaleDot = new THREE.Mesh(dotGeo, dotMat);
    scene.add(this.debugPlotWhaleDot);

    // Trail line
    const trailPositions = new Float32Array(TRAIL_MAX_POINTS * 3);
    const trailColors = new Float32Array(TRAIL_MAX_POINTS * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    trailGeo.setDrawRange(0, 0);
    this.debugPlotTrailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true }));
    this.debugPlotTrailLine.frustumCulled = false;
    scene.add(this.debugPlotTrailLine);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
    camera.position.set(range * 1.2, range * 0.8, range * 1.2);
    camera.lookAt(0, 0, 0);
    this.debugPlotCamera = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.debugPlotRenderer = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(0, 0, 0);
    this.debugPlotControls = controls;

    // Resize handling
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    new ResizeObserver(onResize).observe(container);
    // Initial size (defer to let layout settle)
    setTimeout(onResize, 50);

    // Own render loop for the plot (independent of main scene)
    const animatePlot = () => {
      if (this.debugPopupWindow?.closed) {
        this.debugPlotRenderer = null;
        return;
      }
      this.debugPlotAnimId = requestAnimationFrame(animatePlot);
      controls.update();
      renderer.render(scene, camera);
    };
    animatePlot();
  }

  private updateDebug3DPlot(): void {
    if (!this.debugPlotScene || !this.debugPlotWhaleDot || !this.debugPlotTrailLine) return;
    if (this.debugPopupWindow?.closed) return;

    // Update whale dot
    this.debugPlotWhaleDot.position.set(this.whalePos.x, this.whalePos.y, this.whalePos.z);

    // Sync trail data
    if (this.debugTrailPositions && this.debugPlotTrailLine.geometry) {
      const posAttr = this.debugPlotTrailLine.geometry.getAttribute('position') as THREE.BufferAttribute;
      posAttr.array.set(this.debugTrailPositions);
      posAttr.needsUpdate = true;

      // Color gradient: old=dim red → new=bright yellow
      const colorAttr = this.debugPlotTrailLine.geometry.getAttribute('color') as THREE.BufferAttribute;
      const count = Math.min(this.debugTrailCount, TRAIL_MAX_POINTS);
      for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 1;
        colorAttr.setXYZ(i, 0.4 + t * 0.6, 0.1 + t * 0.5, 0.1 * (1 - t));
      }
      colorAttr.needsUpdate = true;
      this.debugPlotTrailLine.geometry.setDrawRange(0, count);
    }
  }

  private initDebugLogPanel(doc: Document): void {
    const panel = doc.createElement('div');
    panel.style.cssText =
      'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;';

    const header = doc.createElement('div');
    header.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;' +
      'padding:8px 10px;border-bottom:1px solid #444488;flex-shrink:0;';

    const title = doc.createElement('span');
    title.textContent = 'Structured Log (every 500ms)';
    title.style.cssText = 'color:#8888cc;font-weight:bold;';
    header.appendChild(title);

    const btnGroup = doc.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:6px;';

    const copyBtn = doc.createElement('button');
    copyBtn.textContent = 'Copy JSON';
    copyBtn.style.cssText = this.debugLogBtnStyle();
    copyBtn.addEventListener('click', () => this.copyDebugLog());

    const exportBtn = doc.createElement('button');
    exportBtn.textContent = 'Export .json';
    exportBtn.style.cssText = this.debugLogBtnStyle();
    exportBtn.addEventListener('click', () => this.exportDebugLog());

    const clearBtn = doc.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = this.debugLogBtnStyle();
    clearBtn.addEventListener('click', () => {
      this.debugLogEntries = [];
      if (this.debugLogContent) this.debugLogContent.textContent = '';
    });

    btnGroup.appendChild(copyBtn);
    btnGroup.appendChild(exportBtn);
    btnGroup.appendChild(clearBtn);
    header.appendChild(btnGroup);
    panel.appendChild(header);

    const content = doc.createElement('div');
    content.style.cssText =
      'overflow-y:auto;padding:6px 10px;flex:1;min-height:0;' +
      'white-space:pre;line-height:1.5;';
    panel.appendChild(content);

    this.debugLogPanel = panel;
    this.debugLogContent = content;
  }

  private debugLogBtnStyle(): string {
    return 'padding:2px 8px;background:#333366;color:#aabbdd;border:1px solid #555588;' +
      'border-radius:3px;cursor:pointer;font-family:monospace;font-size:10px;';
  }

  private updateDebugLogPanel(vx: number, vy: number, vz: number): void {
    if (!this.debugLogContent || !this.debugGuiParams.showLogPanel || this.debugPopupWindow?.closed) return;

    const now = performance.now();
    if (now - this.debugLogLastSample < this.DEBUG_LOG_SAMPLE_MS) return;
    this.debugLogLastSample = now;

    const doc = this.debugPopupWindow?.document ?? document;

    const entry: Record<string, unknown> = {
      t: +(now / 1000).toFixed(2),
      pos: { x: +this.whalePos.x.toFixed(3), y: +this.whalePos.y.toFixed(3), z: +this.whalePos.z.toFixed(3) },
      vel: { x: +vx.toFixed(5), y: +vy.toFixed(5), z: +vz.toFixed(5) },
      rot: this.modelGroup ? {
        y: +(this.modelGroup.rotation.y * 180 / Math.PI).toFixed(1),
        x: +(this.modelGroup.rotation.x * 180 / Math.PI).toFixed(1),
      } : null,
      dir: this.activeDir,
      entering: this.enteringScene,
      reacting: this.isReacting,
      weights: {
        fwd: +(this.dirActions.forward?.getEffectiveWeight() ?? 0).toFixed(3),
        left: +(this.dirActions.left?.getEffectiveWeight() ?? 0).toFixed(3),
        right: +(this.dirActions.right?.getEffectiveWeight() ?? 0).toFixed(3),
        up: +(this.dirActions.up?.getEffectiveWeight() ?? 0).toFixed(3),
        down: +(this.dirActions.down?.getEffectiveWeight() ?? 0).toFixed(3),
        surface: +(this.surfaceAction?.getEffectiveWeight() ?? 0).toFixed(3),
        gulp: +(this.gulpAction?.getEffectiveWeight() ?? 0).toFixed(3),
      },
      swimRange: { x: +this.swimRangeX.toFixed(2), y: +this.swimRangeY.toFixed(2), z: +this.swimRangeZ.toFixed(2) },
      target: { x: +this.whaleTarget.x.toFixed(3), y: +this.whaleTarget.y.toFixed(3), z: +this.whaleTarget.z.toFixed(3) },
    };

    this.debugLogEntries.push(entry);
    if (this.debugLogEntries.length > this.DEBUG_LOG_MAX_ENTRIES) {
      this.debugLogEntries.shift();
    }

    const line = doc.createElement('div');
    line.textContent = JSON.stringify(entry);
    line.style.borderBottom = '1px solid #222244';
    line.style.padding = '2px 0';
    this.debugLogContent.appendChild(line);

    while (this.debugLogContent.childNodes.length > this.DEBUG_LOG_MAX_ENTRIES) {
      this.debugLogContent.removeChild(this.debugLogContent.firstChild!);
    }

    this.debugLogContent.scrollTop = this.debugLogContent.scrollHeight;
  }

  private copyDebugLog(): void {
    const json = JSON.stringify(this.debugLogEntries, null, 2);
    const doc = this.debugPopupWindow?.document ?? document;
    const ta = doc.createElement('textarea');
    ta.value = json;
    ta.style.cssText = 'position:fixed;left:-9999px;';
    doc.body.appendChild(ta);
    ta.select();
    doc.execCommand('copy');
    ta.remove();
    console.log(`[whale:debug] Copied ${this.debugLogEntries.length} log entries to clipboard`);
  }

  private exportDebugLog(): void {
    const json = JSON.stringify(this.debugLogEntries, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const doc = this.debugPopupWindow?.document ?? document;
    const a = doc.createElement('a');
    a.href = url;
    a.download = `whale-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    doc.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private destroyDebug(): void {
    this.debugGui?.destroy();
    this.debugGui = null;

    // 3D minimap cleanup
    this.debugMiniScene = null;
    this.debugMiniCam = null;
    this.debugMiniWhaleDot = null;
    this.debugMiniTrailLine = null;
    this.debugMiniBoundsBox = null;

    // Close popup window (cleans up 3D plot + log panel)
    if (this.debugPlotAnimId) cancelAnimationFrame(this.debugPlotAnimId);
    this.debugPlotRenderer?.dispose();
    this.debugPlotRenderer = null;
    this.debugPlotScene = null;
    this.debugPlotCamera = null;
    this.debugPlotControls = null;
    this.debugPlotWhaleDot = null;
    this.debugPlotTrailLine = null;
    if (this.debugPopupWindow && !this.debugPopupWindow.closed) {
      this.debugPopupWindow.close();
    }
    this.debugPopupWindow = null;
    this.debugLogPanel = null;
    this.debugLogContent = null;
    this.debugLogEntries = [];
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement!;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();

    scene.add(new THREE.AmbientLight(0x303050, 0.6));
    const keyLight = new THREE.DirectionalLight(0xddeeff, 1.5);
    keyLight.position.set(2, 4, 3);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    fillLight.position.set(-2, -1, -2);
    scene.add(fillLight);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 3.0;
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;

    // Selective bloom
    const bloomLayer = new THREE.Layers();
    bloomLayer.set(BLOOM_LAYER);
    const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const storedMaterials: Record<string, THREE.Material | THREE.Material[]> = {};

    function darkenNonBloomed(obj: THREE.Object3D): void {
      if ((obj as THREE.Mesh).isMesh && !bloomLayer.test(obj.layers)) {
        const mesh = obj as THREE.Mesh;
        storedMaterials[mesh.uuid] = mesh.material;
        mesh.material = darkMaterial;
      }
    }
    function restoreMaterial(obj: THREE.Object3D): void {
      if (storedMaterials[obj.uuid]) {
        (obj as THREE.Mesh).material = storedMaterials[obj.uuid];
        delete storedMaterials[obj.uuid];
      }
    }

    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(new RenderPass(scene, camera));
    bloomComposer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0, 1.0, 0.0));

    const hBlurShader = {
      uniforms: { tDiffuse: { value: null }, h: { value: 2.0 / w } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float h; varying vec2 vUv;
        void main() {
          vec4 s = vec4(0.0);
          s += texture2D(tDiffuse, vec2(vUv.x - 4.0*h, vUv.y)) * 0.051;
          s += texture2D(tDiffuse, vec2(vUv.x - 3.0*h, vUv.y)) * 0.0918;
          s += texture2D(tDiffuse, vec2(vUv.x - 2.0*h, vUv.y)) * 0.12245;
          s += texture2D(tDiffuse, vec2(vUv.x - 1.0*h, vUv.y)) * 0.1531;
          s += texture2D(tDiffuse, vec2(vUv.x,          vUv.y)) * 0.1633;
          s += texture2D(tDiffuse, vec2(vUv.x + 1.0*h, vUv.y)) * 0.1531;
          s += texture2D(tDiffuse, vec2(vUv.x + 2.0*h, vUv.y)) * 0.12245;
          s += texture2D(tDiffuse, vec2(vUv.x + 3.0*h, vUv.y)) * 0.0918;
          s += texture2D(tDiffuse, vec2(vUv.x + 4.0*h, vUv.y)) * 0.051;
          gl_FragColor = s;
        }`,
    };
    const vBlurShader = {
      uniforms: { tDiffuse: { value: null }, v: { value: 2.0 / h } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float v; varying vec2 vUv;
        void main() {
          vec4 s = vec4(0.0);
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 4.0*v)) * 0.051;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 3.0*v)) * 0.0918;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 2.0*v)) * 0.12245;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 1.0*v)) * 0.1531;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y         )) * 0.1633;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 1.0*v)) * 0.1531;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 2.0*v)) * 0.12245;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 3.0*v)) * 0.0918;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 4.0*v)) * 0.051;
          gl_FragColor = s;
        }`,
    };
    for (let i = 0; i < 2; i++) {
      bloomComposer.addPass(new ShaderPass(hBlurShader));
      bloomComposer.addPass(new ShaderPass(vBlurShader));
    }

    const additiveBlendShader = {
      uniforms: { baseTexture: { value: null }, bloomTexture: { value: null } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv;
        void main() { gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv); }`,
    };
    const finalComposer = new EffectComposer(renderer);
    finalComposer.addPass(new RenderPass(scene, camera));
    const blendPass = new ShaderPass(additiveBlendShader, 'baseTexture');
    blendPass.needsSwap = true;
    blendPass.uniforms['bloomTexture'].value = bloomComposer.renderTarget2.texture;
    finalComposer.addPass(blendPass);
    finalComposer.addPass(new OutputPass());

    const onResize = () => {
      const rw = container.clientWidth;
      const rh = container.clientHeight;
      if (rw === 0 || rh === 0) return;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
      bloomComposer.setSize(rw, rh);
      finalComposer.setSize(rw, rh);
    };
    this.resizeObserver = new ResizeObserver(onResize);
    this.resizeObserver.observe(container);

    // Load whale
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('assets/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load('assets/models/glow_whale_final.glb', (gltf) => {
      const modelGroup = new THREE.Group();
      this.modelGroup = modelGroup;

      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(center);

      // Position camera so visible area at z=0 = ±DESIRED_HALF_HEIGHT vertically
      const vFov = (CAMERA_FOV * Math.PI) / 180;
      const camZ = DESIRED_HALF_HEIGHT / Math.tan(vFov / 2);
      camera.position.set(0, 0, camZ);
      camera.lookAt(0, 0, 0);

      // Compute swim ranges from actual frustum
      this.swimRangeY = DESIRED_HALF_HEIGHT;
      this.swimRangeX = DESIRED_HALF_HEIGHT * camera.aspect;
      this.swimRangeZ = camZ * 0.7; // depth range = 70% — leaves gap for whale body at scale=6

      // Set whale start position now that we know the range
      this.whalePos.set(-this.swimRangeX * 1.3, 0, 0);
      console.log(`[whale:camera] camZ=${camZ.toFixed(2)} swimRangeX=${this.swimRangeX.toFixed(2)} swimRangeY=${this.swimRangeY.toFixed(2)} swimRangeZ=${this.swimRangeZ.toFixed(2)} startPos=(${this.whalePos.x.toFixed(2)},${this.whalePos.y.toFixed(2)},${this.whalePos.z.toFixed(2)})`);

      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat.emissiveIntensity > 1.0) {
            child.layers.enable(BLOOM_LAYER);
          }
        }
      });

      modelGroup.add(gltf.scene);
      modelGroup.scale.set(6, 6, 6);
      scene.add(modelGroup);

      // --- Set up animations ---
      console.log(`[whale:init] ${gltf.animations.length} animations found: ${gltf.animations.map(a => a.name).join(', ')}`);
      this.mixer = new THREE.AnimationMixer(gltf.scene);
      this.mixer.addEventListener('finished', this.onGulpFinished);

      // Pre-play ALL directional actions at weight 0 — we blend weights manually each frame
      for (const [dir, animName] of Object.entries(DIR_ANIMS)) {
        const clip = gltf.animations.find(c => c.name === animName);
        if (clip) {
          const action = this.mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.timeScale = 0.7;
          action.enabled = true;
          action.setEffectiveWeight(0); // all start at 0; surface plays during entrance
          action.play();
          this.dirActions[dir as Direction] = action;
          console.log(`[whale:init] action '${dir}' (${animName}): weight=${action.getEffectiveWeight()}, enabled=${action.enabled}, duration=${clip.duration.toFixed(2)}s`);
        } else {
          console.warn(`[whale:init] MISSING clip for '${dir}' (${animName})`);
        }
      }
      this.activeDir = 'forward';

      // Gulp
      const gulpClip = gltf.animations.find(c => c.name === GULP_ANIM);
      if (gulpClip) {
        this.gulpAction = this.mixer.clipAction(gulpClip);
        this.gulpAction.setLoop(THREE.LoopOnce, 1);
        this.gulpAction.clampWhenFinished = true;
        this.gulpAction.enabled = true;
        this.gulpAction.setEffectiveWeight(0);
        this.gulpAction.play();
        console.log(`[whale:init] gulp action: duration=${gulpClip.duration.toFixed(2)}s`);
      } else {
        console.warn(`[whale:init] MISSING gulp clip`);
      }

      // Surface — plays during entrance, weight managed manually
      const surfaceClip = gltf.animations.find(c => c.name === SURFACE_ANIM);
      if (surfaceClip) {
        this.surfaceAction = this.mixer.clipAction(surfaceClip);
        this.surfaceAction.setLoop(THREE.LoopRepeat, Infinity);
        this.surfaceAction.enabled = true;
        this.surfaceAction.setEffectiveWeight(1); // plays during entrance, blends to 0 after
        this.surfaceAction.play();
        console.log(`[whale:init] surface action: duration=${surfaceClip.duration.toFixed(2)}s, weight=1`);
      } else {
        console.warn(`[whale:init] MISSING surface clip`);
      }

      this.pickFreeSwimWaypoint();

      // Debug visualizations
      if (DEBUG_3D) {
        this.initDebugGui();
        this.initDebugTrail(scene);
        this.initDebugVelocityArrow(scene);
        this.initDebugHelpers(scene, gltf.scene);
        this.initDebugMinimap();
      }
    });

    // Animation loop
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();

      // Manual weight blending — every frame, lerp weights toward target
      // NOTE: weights set BEFORE mixer.update() so skeleton uses current-frame values
      // activeDir=1 always (entrance + free-swim), surface=0
      // After entrance: active dir=1, surface=0, others=0
      const blendStep = BLEND_SPEED * delta;
      const lerpFactor = Math.min(blendStep * 4, 1);

      for (const [dir, action] of Object.entries(this.dirActions)) {
        if (!action) continue;
        const targetWeight = (dir === this.activeDir && !this.isReacting) ? 1 : 0;
        const currentWeight = action.getEffectiveWeight();
        const newWeight = currentWeight + (targetWeight - currentWeight) * lerpFactor;
        action.enabled = true;
        action.setEffectiveTimeScale(action.timeScale);
        action.setEffectiveWeight(newWeight);
      }

      // Surface weight: 1 during entrance, blend to 0 after
      if (this.surfaceAction) {
        const surfaceTarget = this.enteringScene ? 1 : 0;
        const surfaceCurrent = this.surfaceAction.getEffectiveWeight();
        const surfaceNew = surfaceCurrent + (surfaceTarget - surfaceCurrent) * lerpFactor;
        this.surfaceAction.enabled = true;
        this.surfaceAction.setEffectiveTimeScale(this.surfaceAction.timeScale);
        this.surfaceAction.setEffectiveWeight(surfaceNew);
      }

      // Gulp weight
      if (this.gulpAction) {
        const gulpTarget = this.isReacting ? 1 : 0;
        const gulpCurrent = this.gulpAction.getEffectiveWeight();
        const gulpNew = gulpCurrent + (gulpTarget - gulpCurrent) * lerpFactor;
        this.gulpAction.enabled = true;
        this.gulpAction.setEffectiveTimeScale(1);
        this.gulpAction.setEffectiveWeight(gulpNew);
        if (this.isReacting && this.gulpAction.time >= this.gulpAction.getClip().duration * 0.95) {
          this.onGulpFinished();
        }
      }

      // Advance animation AFTER weights are set — skeleton uses current-frame values
      if (this.mixer) this.mixer.update(delta);

      const now = performance.now();

      if (this.modelGroup) {
        // Entrance phase
        if (this.enteringScene) {
          if (this.entranceStartTime === 0) {
            this.entranceStartTime = now;
            this.targetRotationY = Math.PI / 2;
            this.modelGroup.rotation.y = Math.PI / 2;
            this.whaleTarget.set(this.swimRangeX * 0.3, 0, 0);
          }
          const distToTarget = this.whalePos.distanceTo(this.whaleTarget);
          if (distToTarget < 0.2 || (now - this.entranceStartTime > this.ENTRANCE_DURATION)) {
            this.enteringScene = false;
            this.pickFreeSwimWaypoint();
            this.freeSwimTimer = now;
            console.log(`[whale:entrance-end] active=${this.activeDir}`);
          }
        } else if (this.userDirected) {
          // User clicked a point — swim there, ignore free-swim timer
          this.whaleTarget.copy(this.userDirectedTarget);
          const distToClick = this.whalePos.distanceTo(this.userDirectedTarget);
          if (distToClick < 0.15) {
            // Arrived at click target — return to free-swim
            this.userDirected = false;
            this.freeSwimTimer = now;
            this.pickFreeSwimWaypoint();
            console.log(`[whale:click] arrived at click target, resuming free-swim`);
          }
        } else {
          // Free-swim: pick new waypoints periodically
          if (now - this.freeSwimTimer > this.freeSwimInterval) {
            this.freeSwimTimer = now;
            this.pickFreeSwimWaypoint();
            console.log(`[whale:freeswim] new waypoint: (${this.freeSwimTarget.x.toFixed(2)},${this.freeSwimTarget.y.toFixed(2)},${this.freeSwimTarget.z.toFixed(2)})`);
          }
          this.whaleTarget.copy(this.freeSwimTarget);
        }

        // Throttled debug
        if (!this.enteringScene && now - this.lastDebugLog > this.DEBUG_LOG_INTERVAL * 4) {
          this.lastDebugLog = now;
          const activeAction = this.dirActions[this.activeDir];
          console.log(
            `[whale:${this.userDirected ? 'user' : 'freeswim'}] pos=(${this.whalePos.x.toFixed(2)},${this.whalePos.y.toFixed(2)},${this.whalePos.z.toFixed(2)})` +
            ` vel=(${this.whaleVelocity.x.toFixed(4)},${this.whaleVelocity.y.toFixed(4)},${this.whaleVelocity.z.toFixed(4)})` +
            ` dir=${this.activeDir} w=${activeAction?.getEffectiveWeight().toFixed(2)} reacting=${this.isReacting}`
          );
        }

        // Same movement for both phases — swim toward waypoint
        const dx = this.whaleTarget.x - this.whalePos.x;
        const dy = this.whaleTarget.y - this.whalePos.y;
        const dz = this.whaleTarget.z - this.whalePos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist > 0.01) {
          const moveX = (dx / dist) * this.swimSpeed;
          const moveY = (dy / dist) * this.swimSpeed;
          const moveZ = (dz / dist) * this.swimSpeed;
          this.whaleVelocity.x += (moveX - this.whaleVelocity.x) * this.VELOCITY_LERP;
          this.whaleVelocity.y += (moveY - this.whaleVelocity.y) * this.VELOCITY_LERP;
          this.whaleVelocity.z += (moveZ - this.whaleVelocity.z) * this.VELOCITY_LERP;
        } else {
          this.whaleVelocity.x *= 0.98;
          this.whaleVelocity.y *= 0.98;
          this.whaleVelocity.z *= 0.98;
        }

        // Organic wobble — gentle sinusoidal sway perpendicular to heading
        this.wobblePhase += 0.015; // ~4s period at 60fps
        const wobbleAmount = 0.00002;
        const headingAngle = Math.atan2(this.whaleVelocity.x, this.whaleVelocity.z || 0.001);
        // Sway perpendicular to heading (cross product with up = rotate 90°)
        this.whalePos.x += this.whaleVelocity.x + Math.cos(headingAngle) * Math.sin(this.wobblePhase) * wobbleAmount;
        this.whalePos.y += this.whaleVelocity.y + Math.sin(this.wobblePhase * 0.7) * wobbleAmount * 0.5;
        this.whalePos.z += this.whaleVelocity.z + Math.sin(headingAngle) * Math.sin(this.wobblePhase) * wobbleAmount;

        // Soft boundary steering — gradually push velocity away from edges
        // Starts at 80% of range, gets stronger as whale approaches 100%
        const BOUNDARY_START = 0.8; // start steering at 80% of range
        const STEER_STRENGTH = 0.0008;
        const steerAxis = (pos: number, range: number) => {
          const ratio = pos / range; // -1..+1 within range
          if (Math.abs(ratio) > BOUNDARY_START) {
            // Strength ramps up quadratically as whale nears edge
            const overshoot = (Math.abs(ratio) - BOUNDARY_START) / (1 - BOUNDARY_START);
            return -Math.sign(ratio) * overshoot * overshoot * STEER_STRENGTH;
          }
          return 0;
        };
        this.whaleVelocity.x += steerAxis(this.whalePos.x, this.swimRangeX);
        this.whaleVelocity.y += steerAxis(this.whalePos.y, this.swimRangeY);
        this.whaleVelocity.z += steerAxis(this.whalePos.z, this.swimRangeZ);

        // Pick a new inward waypoint if whale is near edge (once per boundary approach)
        const nearEdge = Math.abs(this.whalePos.x) > this.swimRangeX * 0.9
          || Math.abs(this.whalePos.y) > this.swimRangeY * 0.9
          || Math.abs(this.whalePos.z) > this.swimRangeZ * 0.9;
        if (nearEdge && !this.userDirected && (now - this.freeSwimTimer > 2000)) {
          // Point waypoint toward center (only if 2s since last waypoint change)
          this.freeSwimTarget.set(
            (Math.random() - 0.5) * this.swimRangeX * 0.5,
            (Math.random() - 0.5) * this.swimRangeY * 0.3,
            (Math.random() - 0.5) * this.swimRangeZ * 0.5,
          );
          this.freeSwimTimer = now;
        }

        // Hard clamp as safety net (should rarely trigger now)
        const TANK_PAD = 1.05;
        this.whalePos.x = Math.max(-this.swimRangeX * TANK_PAD, Math.min(this.swimRangeX * TANK_PAD, this.whalePos.x));
        this.whalePos.y = Math.max(-this.swimRangeY * TANK_PAD, Math.min(this.swimRangeY * TANK_PAD, this.whalePos.y));
        this.whalePos.z = Math.max(-this.swimRangeZ * TANK_PAD, Math.min(this.swimRangeZ * TANK_PAD, this.whalePos.z));

        this.modelGroup.position.x = this.whalePos.x;
        this.modelGroup.position.y = this.whalePos.y;
        this.modelGroup.position.z = this.whalePos.z;

        // Rotation — look toward target using all 3 axes for depth perception
        const lookDx = this.whaleTarget.x - this.whalePos.x;
        const lookDy = this.whaleTarget.y - this.whalePos.y;
        const lookDz = this.whaleTarget.z - this.whalePos.z;
        const lookDistXZ = Math.sqrt(lookDx * lookDx + lookDz * lookDz);
        const lookDist3D = Math.sqrt(lookDx * lookDx + lookDy * lookDy + lookDz * lookDz);

        if (lookDist3D > 0.05) {
          // Y rotation: face toward target in XZ plane (gives depth movement)
          this.targetRotationY = Math.atan2(lookDx, lookDz + 0.001);
          // X rotation: pitch up/down
          this.targetRotationX = -Math.atan2(lookDy, lookDistXZ + 0.1) * 0.6;
        }

        this.modelGroup.rotation.y += (this.targetRotationY - this.modelGroup.rotation.y) * this.TURN_LERP;
        this.modelGroup.rotation.x += (this.targetRotationX - this.modelGroup.rotation.x) * this.TURN_LERP;

        // Direction animation (same for both phases)
        if (!this.isReacting) {
          const desired = this.computeDesiredDirection(lookDx, lookDy, lookDz);
          if (desired !== this.pendingDir) {
            this.pendingDir = desired;
            this.pendingDirSince = now;
          }
          if (this.pendingDir !== this.activeDir && now - this.pendingDirSince >= DIR_HOLD_TIME) {
            this.switchDirection(this.pendingDir);
          }
        }
      }

      // Debug updates
      if (DEBUG_3D) {
        const debugVx = this.enteringScene ? (this.whalePos.x - (this.debugTrailCount > 0 && this.debugTrailPositions
          ? this.debugTrailPositions[((this.debugTrailIndex - 1 + TRAIL_MAX_POINTS) % TRAIL_MAX_POINTS) * 3] : this.whalePos.x)) : this.whaleVelocity.x;
        const debugVy = this.enteringScene ? (this.whalePos.y - (this.debugTrailCount > 0 && this.debugTrailPositions
          ? this.debugTrailPositions[((this.debugTrailIndex - 1 + TRAIL_MAX_POINTS) % TRAIL_MAX_POINTS) * 3 + 1] : this.whalePos.y)) : this.whaleVelocity.y;
        const debugVz = this.enteringScene ? (this.whalePos.z - (this.debugTrailCount > 0 && this.debugTrailPositions
          ? this.debugTrailPositions[((this.debugTrailIndex - 1 + TRAIL_MAX_POINTS) % TRAIL_MAX_POINTS) * 3 + 2] : this.whalePos.z)) : this.whaleVelocity.z;
        this.updateDebugTrail();
        this.updateDebugVelocityArrow(debugVx, debugVy, debugVz);
        this.updateDebugHelpers();
        this.updateDebugGui(debugVx, debugVy, debugVz);
        this.updateDebugMinimap();
        this.updateDebug3DPlot();
        this.updateDebugLogPanel(debugVx, debugVy, debugVz);
      }

      // Render
      scene.traverse(darkenNonBloomed);
      bloomComposer.render();
      scene.traverse(restoreMaterial);
      finalComposer.render();

      // Debug minimap inset (rendered after bloom pipeline)
      if (DEBUG_3D) {
        this.renderDebugMinimap(renderer, container.clientWidth, container.clientHeight);
      }
    };
    animate();
  }
}
