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

type Phase = 'hero' | 'scroll';

/**
 * Unified whale background — single WebGL context for the entire landing page.
 * Hero phase: whale centered, plays surface animation, fades on scroll.
 * Scroll phase: whale follows figure-8 path driven by scroll progress.
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

  private _phase: Phase = 'hero';
  private _heroProgress = 0;
  private _scrollProgress = 0;
  private _active = true;
  private _baseCamZ = 0;
  private _whaleMeshes: any[] = [];
  private _bgTexture: any = null;

  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId) && !this.initialized) {
        // Skip WebGL on slow connections or reduced motion
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

  /** Switch between hero (centered whale) and scroll (path-driven) phase */
  setPhase(phase: Phase): void {
    this._phase = phase;
    if (this.scene) {
      if (phase === 'scroll') {
        // Scroll phase: transparent canvas, whale floats over page content
        this.scene.background = null;
        this.scene.fog = null;
        if (this.renderer) {
          this.renderer.setClearColor(0x000000, 0);
        }
        // Reset whale opacity
        for (const mesh of this._whaleMeshes) {
          const mat = mesh.material;
          if (mat) {
            mat.transparent = true;
            mat.opacity = 1;
          }
        }
      } else {
        // Hero phase: dark ocean background
        this.scene.background = this._bgTexture;
        if (this.scene.fog === null) {
          // Re-import THREE to create fog — but we can't easily here.
          // Skip fog re-creation, the background gradient is enough.
        }
      }
    }
  }

  /** Hero scroll progress: 0 = full view, 1 = fully faded/zoomed out */
  setHeroProgress(p: number): void {
    this._heroProgress = p;
  }

  /** Scroll phase progress: 0 = enter from below, 1 = exit diving down */
  setScrollProgress(p: number): void {
    this._scrollProgress = p;
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

    // Scene — transparent canvas, env map for PBR reflections
    const scene = new THREE.Scene();
    this.scene = scene;

    // Gradient env map for specular reflections on wet whale
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
    scene.environment = gradTex;
    scene.background = gradTex; // Dark ocean background — visible in hero phase
    this._bgTexture = gradTex;

    // Exponential fog for depth
    scene.fog = new THREE.FogExp2(0x061a28, 0.03);

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

    // Renderer — alpha enabled so scroll phase can be transparent
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

    // Resize observer
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

        // Wet whale material: clearcoat + high emissive for CSS-driven glow
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

        // Show the canvas
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

      if (this._phase === 'hero') {
        this.updateHeroPhase();
      } else {
        this.updateScrollPhase();
      }

      renderer.render(scene, camera);
    };
    this.ngZone.runOutsideAngular(() => animate());
  }

  /** Hero phase: whale centered, surface animation, camera zoom + fade on scroll */
  private updateHeroPhase(): void {
    const p = this._heroProgress;

    // Surface animation stays dominant in hero phase
    this.surfaceAction?.setEffectiveWeight(1);
    this.swimAction?.setEffectiveWeight(0);
    this.diveAction?.setEffectiveWeight(0);

    // Camera zoom out as hero scrolls
    if (this.camera && this._baseCamZ) {
      if (p < 0.3) {
        this.camera.position.z = this._baseCamZ;
      } else {
        const t = (p - 0.3) / 0.7;
        this.camera.position.z = this._baseCamZ * (1 + t * 2.5);
      }
    }

    // Fade whale meshes
    if (p > 0.6) {
      const fadeT = (p - 0.6) / 0.4;
      for (const mesh of this._whaleMeshes) {
        const mat = mesh.material;
        if (mat) {
          mat.transparent = true;
          mat.opacity = 1 - fadeT;
        }
      }
    } else {
      for (const mesh of this._whaleMeshes) {
        const mat = mesh.material;
        if (mat && mat.opacity < 1) {
          mat.opacity = 1;
        }
      }
    }
  }

  /** Scroll phase: figure-8 path, animation blending by progress */
  private updateScrollPhase(): void {
    if (!this.whaleGroup) return;
    const p = this._scrollProgress;

    // Blend animation weights by scroll position
    let surfaceW = 0, swimW = 0, diveW = 0;
    if (p < 0.08) {
      surfaceW = 1;
    } else if (p < 0.15) {
      const blend = (p - 0.08) / 0.07;
      surfaceW = 1 - blend; swimW = blend;
    } else if (p < 0.85) {
      swimW = 1;
    } else if (p < 0.92) {
      const blend = (p - 0.85) / 0.07;
      swimW = 1 - blend; diveW = blend;
    } else {
      diveW = 1;
    }
    this.surfaceAction?.setEffectiveWeight(surfaceW);
    this.swimAction?.setEffectiveWeight(swimW);
    this.diveAction?.setEffectiveWeight(diveW);

    // Figure-8 path
    const t = p * Math.PI * 2;

    // Enter/exit Y offset with smoothstep
    let yOffset = 0;
    if (p < 0.10) {
      const e = p / 0.10;
      const smooth = e * e * (3 - 2 * e);
      yOffset = -4 * (1 - smooth);
    } else if (p > 0.90) {
      const e = (p - 0.90) / 0.10;
      const smooth = e * e * (3 - 2 * e);
      yOffset = -4 * smooth;
    }

    this.whaleGroup.position.x = 1.5 * Math.sin(t);
    this.whaleGroup.position.y = 0.4 * Math.sin(2 * t) + yOffset;
    this.whaleGroup.position.z = 2.5 * Math.cos(t);
    this.whaleGroup.rotation.y = Math.atan2(Math.cos(t), -Math.sin(t));
    this.whaleGroup.rotation.x = yOffset < 0 ? yOffset * 0.12 : 0;

    // Reset camera to base position for scroll phase
    if (this.camera && this._baseCamZ) {
      this.camera.position.z = this._baseCamZ;
    }
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.mixer?.stopAllAction();
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
  }
}
