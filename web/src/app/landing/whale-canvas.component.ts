import {
  Component,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  inject,
  NgZone,
  viewChild,
  ElementRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Unified whale background — single WebGL context, single continuous scroll path.
 * The whale swims in from below as the user scrolls, cruises through the page,
 * and dives out at the bottom. No phase switches, no cuts.
 *
 * All heavy imports (three.js, loaders) are dynamic for code-splitting.
 * No postprocessing library — CSS filter provides glow.
 */
@Component({
  selector: 'app-whale-canvas',
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.6s ease;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
      filter: brightness(1.15) contrast(1.05);
    }
  `],
})
export class WhaleCanvasComponent implements OnDestroy {
  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly hostRef = inject(ElementRef);

  private renderer: any;
  private scene: any;
  private camera: any;
  private whaleGroup: any;
  private resizeObserver: ResizeObserver | null = null;
  private animationId = 0;
  private initialized = false;

  private mixer: any;
  private clock: any;
  private surfaceAction: any;
  private swimAction: any;
  private diveAction: any;

  private _progress = 0;
  private _progressSmooth = 0;
  private _active = true;
  private _baseCamZ = 0;
  private _whaleMeshes: any[] = [];
  private _bgTexture: any = null;

  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId) && !this.initialized) {
        const conn = (navigator as any).connection;
        if (conn && (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.saveData)) {
          return;
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }
        Promise.resolve().then(() => this.init());
      }
    });
  }

  /** Single scroll progress: 0 = top of page, 1 = bottom of page */
  setProgress(p: number): void {
    this._progress = p;
  }

  /** Show/hide the whale canvas */
  setActive(active: boolean): void {
    this._active = active;
    const host = this.hostRef.nativeElement as HTMLElement;
    host.style.opacity = active ? '1' : '0';
  }

  private async init(): Promise<void> {
    const canvasEl = this.canvasRef()?.nativeElement;
    if (!canvasEl) return;
    this.initialized = true;

    const THREE = await import('three');
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');

    this.clock = new THREE.Clock();

    const host = this.hostRef.nativeElement as HTMLElement;
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    this.scene = scene;

    // Gradient env map for PBR reflections + scene background
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = 2;
    gradCanvas.height = 256;
    const gCtx = gradCanvas.getContext('2d')!;
    const grad = gCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#b8e0f0');
    grad.addColorStop(0.15, '#4a8ea8');
    grad.addColorStop(0.4, '#1a5570');
    grad.addColorStop(0.7, '#0c3350');
    grad.addColorStop(1, '#061a28');
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 2, 256);
    const gradTex = new THREE.CanvasTexture(gradCanvas);
    gradTex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = gradTex; // PBR reflections only, no visible background
    this._bgTexture = gradTex;

    // Lights
    scene.add(new THREE.AmbientLight(0x405060, 1.0));
    const keyLight = new THREE.DirectionalLight(0xddeeff, 3.5);
    keyLight.position.set(-3, 8, 2);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x6688cc, 1.0);
    fillLight.position.set(-2, -1, -2);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x88ccff, 1.5);
    rimLight.position.set(3, 2, -3);
    scene.add(rimLight);

    // Camera
    const DESIRED_HALF_HEIGHT = 3.0;
    const FOV = 45;
    const camZ = DESIRED_HALF_HEIGHT / Math.tan((FOV * Math.PI / 180) / 2);
    this._baseCamZ = camZ;

    const camera = new THREE.PerspectiveCamera(FOV, w / h, 0.1, 500);
    camera.position.set(0, 0, camZ);
    camera.lookAt(0, 0, 0);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.renderer = renderer;

    this.resizeObserver = new ResizeObserver(() => {
      const rw = host.clientWidth || window.innerWidth;
      const rh = host.clientHeight || window.innerHeight;
      if (rw === 0 || rh === 0) return;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    });
    this.resizeObserver.observe(host);

    // Load stripped whale
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('assets/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      'assets/models/glow_whale_landing.glb',
      (gltf) => {
        const group = new THREE.Group();
        group.add(gltf.scene);

        // Center + scale
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        group.position.sub(center);

        const targetHeight = DESIRED_HALF_HEIGHT * 2 * 0.3;
        const whaleScale = targetHeight / size.y;
        group.scale.setScalar(whaleScale);

        const box2 = new THREE.Box3().setFromObject(group);
        const center2 = box2.getCenter(new THREE.Vector3());
        group.position.sub(center2);

        // Wet whale material
        this._whaleMeshes = [];
        group.traverse((child: any) => {
          if (child.isMesh && child.material) {
            const mat = child.material;
            if (mat.isMeshStandardMaterial && !mat.isMeshPhysicalMaterial) {
              const phys = new THREE.MeshPhysicalMaterial();
              phys.color.copy(mat.color);
              phys.map = mat.map;
              phys.normalMap = mat.normalMap;
              if (mat.normalScale) phys.normalScale.copy(mat.normalScale);
              phys.emissive.copy(mat.emissive);
              phys.emissiveMap = mat.emissiveMap;
              phys.emissiveIntensity = 12;
              phys.metalness = mat.metalness;
              phys.metalnessMap = mat.metalnessMap;
              phys.roughness = 0.15;
              phys.roughnessMap = mat.roughnessMap;
              phys.aoMap = mat.aoMap;
              phys.side = mat.side;
              phys.transparent = mat.transparent;
              phys.opacity = mat.opacity;
              phys.clearcoat = 1.0;
              phys.clearcoatRoughness = 0.05;
              phys.envMapIntensity = 2.5;
              child.material = phys;
              mat.dispose();
            } else {
              if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 12;
              if (mat.roughness !== undefined) mat.roughness = 0.15;
              if (mat.clearcoat !== undefined) mat.clearcoat = 1.0;
              if (mat.clearcoatRoughness !== undefined) mat.clearcoatRoughness = 0.05;
              if (mat.envMapIntensity !== undefined) mat.envMapIntensity = 2.5;
            }
            this._whaleMeshes.push(child);
          }
        });

        // Animations
        if (gltf.animations.length) {
          const mixer = new THREE.AnimationMixer(gltf.scene);
          const findClip = (name: string) => gltf.animations.find((c: any) => c.name === name);

          const setupAction = (clip: any, weight: number) => {
            if (!clip) return null;
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.timeScale = 0.7;
            action.enabled = true;
            action.setEffectiveWeight(weight);
            action.play();
            return action;
          };

          this.surfaceAction = setupAction(findClip('surface'), 1);
          this.swimAction = setupAction(findClip('move f'), 0);
          this.diveAction = setupAction(findClip('move d'), 0);
          this.mixer = mixer;
        }

        scene.add(group);
        this.whaleGroup = group;
        this.setActive(true);
      },
      undefined,
      (err: any) => console.error('[whale-canvas] failed to load whale GLB:', err),
    );

    // Render loop
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (!this._active) return;

      if (this.mixer) {
        this.mixer.update(this.clock.getDelta());
      }

      // Lerp for smooth motion
      this._progressSmooth += (this._progress - this._progressSmooth) * 0.08;

      this.updateWhale();

      renderer.render(scene, camera);
    };
    this.ngZone.runOutsideAngular(() => animate());
  }

  /** Single continuous update — position, animation, background all driven by one progress value */
  private updateWhale(): void {
    if (!this.whaleGroup) return;
    const p = this._progressSmooth;

    // --- Animation blending ---
    let surfaceW = 0, swimW = 0, diveW = 0;
    if (p < 0.05) {
      surfaceW = 1;
    } else if (p < 0.12) {
      const blend = (p - 0.05) / 0.07;
      surfaceW = 1 - blend; swimW = blend;
    } else if (p < 0.80) {
      swimW = 1;
    } else if (p < 0.92) {
      const blend = (p - 0.80) / 0.12;
      swimW = 1 - blend; diveW = blend;
    } else {
      diveW = 1;
    }
    this.surfaceAction?.setEffectiveWeight(surfaceW);
    this.swimAction?.setEffectiveWeight(swimW);
    this.diveAction?.setEffectiveWeight(diveW);

    // --- Continuous path ---
    const t = p * Math.PI * 2;

    // Smoothstep enter (0→0.03) and exit (0.92→1.0)
    // Whale enters almost immediately so it's visible in the hero section
    let yOffset = 0;
    if (p < 0.03) {
      const e = p / 0.03;
      const smooth = e * e * (3 - 2 * e);
      yOffset = -5 * (1 - smooth);
    } else if (p > 0.92) {
      const e = (p - 0.92) / 0.08;
      const smooth = e * e * (3 - 2 * e);
      yOffset = -5 * smooth;
    }

    this.whaleGroup.position.x = 1.5 * Math.sin(t);
    this.whaleGroup.position.y = 0.4 * Math.sin(2 * t) + yOffset;
    this.whaleGroup.position.z = 2.5 * Math.cos(t);
    this.whaleGroup.rotation.y = Math.atan2(Math.cos(t), -Math.sin(t));
    this.whaleGroup.rotation.x = yOffset < 0 ? yOffset * 0.10 : 0;

  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.mixer?.stopAllAction();
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
  }
}
