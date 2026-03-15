import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  viewChild,
  ElementRef,
  inject,
  PLATFORM_ID,
  afterNextRender,
  NgZone,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-whale-scroll',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas></canvas>`,
  styles: `
    :host {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      opacity: 0;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `,
})
export class WhaleScrollComponent implements OnDestroy {
  private canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private hostRef = inject(ElementRef);

  private renderer: any = null;
  private scene: any = null;
  private camera: any = null;
  private composer: any = null;
  private whaleGroup: any = null;
  private resizeObserver: ResizeObserver | null = null;
  private animationId = 0;
  private _progress = 0;
  private _active = false;
  private initialized = false;
  private mixer: any = null;
  private clock: any = null;
  private surfaceAction: any = null;
  private swimAction: any = null;
  private diveAction: any = null;

  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId) && !this.initialized) {
        Promise.resolve().then(() => this.init());
      }
    });
  }

  /** External scroll progress control (0→1) */
  setProgress(p: number): void {
    this._progress = p;
  }

  /** Show/hide the whale background and start/stop rendering */
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

    // Scene — transparent canvas, env map for PBR reflections only
    const scene = new THREE.Scene();
    this.scene = scene;

    // Bright equirectangular env map — high contrast for visible reflections
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = 2;
    gradCanvas.height = 256;
    const gCtx = gradCanvas.getContext('2d')!;
    const grad = gCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#b8e0f0');   // top — bright sky highlight (specular source)
    grad.addColorStop(0.15, '#4a8ea8'); // upper — bright teal
    grad.addColorStop(0.4, '#1a5570'); // mid — ocean blue
    grad.addColorStop(0.7, '#0c3350'); // lower — deep blue
    grad.addColorStop(1, '#061a28');   // bottom — dark abyss
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 2, 256);
    const gradTex = new THREE.CanvasTexture(gradCanvas);
    gradTex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = gradTex; // env only, no scene.background → transparent

    // Lights — brighter for visible reflections on wet surface
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

    // Camera — frustum-based approach (same as hero)
    const DESIRED_HALF_HEIGHT = 3.0;
    const FOV = 45;
    const camZ = DESIRED_HALF_HEIGHT / Math.tan((FOV * Math.PI / 180) / 2);

    const camera = new THREE.PerspectiveCamera(FOV, w / h, 0.1, 500);
    camera.position.set(0, 0, camZ);
    camera.lookAt(0, 0, 0);
    this.camera = camera;

    // Renderer — alpha: true for transparent canvas
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

    // Post-processing: selective bloom for emissive glow spots
    const { EffectComposer, EffectPass, RenderPass, SelectiveBloomEffect } = await import('postprocessing');
    const composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
    });
    composer.addPass(new RenderPass(scene, camera));

    const bloomEffect = new SelectiveBloomEffect(scene, camera, {
      intensity: 1.5,
      mipmapBlur: true,
      luminanceThreshold: 0,
      luminanceSmoothing: 0.025,
      radius: 0.85,
    });
    composer.addPass(new EffectPass(camera, bloomEffect));
    this.composer = composer;

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => {
      const rw = host.clientWidth || window.innerWidth;
      const rh = host.clientHeight || window.innerHeight;
      if (rw === 0 || rh === 0) return;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
      composer.setSize(rw, rh);
    });
    this.resizeObserver.observe(host);

    // Load whale
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('assets/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      'assets/models/glow_whale_final.glb',
      (gltf) => {
        const group = new THREE.Group();
        group.add(gltf.scene);

        // Center on origin
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        group.position.sub(center);

        // Scale whale to fill ~60% of visible height
        // Visible height at camZ = 2 * DESIRED_HALF_HEIGHT = 6.0 units
        const targetHeight = DESIRED_HALF_HEIGHT * 2 * 0.3; // 1.8 units (half of original 60%)
        const whaleScale = targetHeight / size.y;
        group.scale.setScalar(whaleScale);

        // Re-center after scaling
        const box2 = new THREE.Box3().setFromObject(group);
        const center2 = box2.getCenter(new THREE.Vector3());
        group.position.sub(center2);

        // Wet whale: clearcoat for glossy water film + low roughness + strong reflections
        group.traverse((child: any) => {
          if (child.isMesh && child.material) {
            const mat = child.material as any;

            // Upgrade to MeshPhysicalMaterial for clearcoat support
            if (mat.isMeshStandardMaterial && !mat.isMeshPhysicalMaterial) {
              const phys = new THREE.MeshPhysicalMaterial();
              // Copy base properties
              phys.color.copy(mat.color);
              phys.map = mat.map;
              phys.normalMap = mat.normalMap;
              phys.normalScale.copy(mat.normalScale);
              phys.emissive.copy(mat.emissive);
              phys.emissiveMap = mat.emissiveMap;
              phys.emissiveIntensity = 12;
              phys.metalness = mat.metalness;
              phys.metalnessMap = mat.metalnessMap;
              phys.roughness = 0.15; // smooth wet surface
              phys.roughnessMap = mat.roughnessMap;
              phys.aoMap = mat.aoMap;
              phys.side = mat.side;
              phys.transparent = mat.transparent;
              phys.opacity = mat.opacity;

              // Wet surface — clearcoat is the thin glossy water film
              phys.clearcoat = 1.0;
              phys.clearcoatRoughness = 0.05;
              phys.envMapIntensity = 2.5;

              child.material = phys;
              mat.dispose();
            } else {
              // Already physical or basic — just tweak
              if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 12;
              if (mat.roughness !== undefined) mat.roughness = 0.15;
              if (mat.clearcoat !== undefined) mat.clearcoat = 1.0;
              if (mat.clearcoatRoughness !== undefined) mat.clearcoatRoughness = 0.05;
              if (mat.envMapIntensity !== undefined) mat.envMapIntensity = 2.5;
            }

            // Register emissive meshes for selective bloom
            bloomEffect.selection.add(child);
          }
        });

        // Play built-in animations: surface (enter), swim (cruise), dive (exit)
        if (gltf.animations.length) {
          const mixer = new THREE.AnimationMixer(gltf.scene);
          const findClip = (name: string) => gltf.animations.find((c: any) => c.name === name);

          const surfaceClip = findClip('surface');
          const swimClip = findClip('move f');
          const diveClip = findClip('move d');

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

          // Surface starts active (whale enters), others start at weight 0
          this.surfaceAction = setupAction(surfaceClip, 1);
          this.swimAction = setupAction(swimClip, 0);
          this.diveAction = setupAction(diveClip, 0);
          this.mixer = mixer;
        }

        scene.add(group);
        this.whaleGroup = group;

        // Render one initial frame if already active (ScrollTrigger may have fired before load)
        if (this._active) {
          composer.render();
        }
      },
      undefined,
      (err) => console.error('[whale-scroll] failed to load whale GLB:', err),
    );

    // Render loop — only render when active
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (!this._active) return;

      if (this.mixer) {
        this.mixer.update(this.clock.getDelta());

        // Blend animation weights based on scroll phase
        const p = this._progress;
        let surfaceW = 0, swimW = 0, diveW = 0;
        if (p < 0.08) {
          // Enter: surface only
          surfaceW = 1; swimW = 0; diveW = 0;
        } else if (p < 0.15) {
          // Crossfade surface → swim
          const blend = (p - 0.08) / 0.07;
          surfaceW = 1 - blend; swimW = blend; diveW = 0;
        } else if (p < 0.85) {
          // Cruise: swim only
          surfaceW = 0; swimW = 1; diveW = 0;
        } else if (p < 0.92) {
          // Crossfade swim → dive
          const blend = (p - 0.85) / 0.07;
          surfaceW = 0; swimW = 1 - blend; diveW = blend;
        } else {
          // Exit: dive only
          surfaceW = 0; swimW = 0; diveW = 1;
        }
        this.surfaceAction?.setEffectiveWeight(surfaceW);
        this.swimAction?.setEffectiveWeight(swimW);
        this.diveAction?.setEffectiveWeight(diveW);
      }
      if (this.whaleGroup) {
        const p = this._progress;
        const t = p * Math.PI * 2;

        // Enter/exit offset: whale enters from below, exits diving down
        // smoothstep for smooth acceleration/deceleration
        let yOffset = 0;
        if (p < 0.10) {
          const e = p / 0.10; // 0→1
          const smooth = e * e * (3 - 2 * e); // smoothstep
          yOffset = -4 * (1 - smooth);
        } else if (p > 0.90) {
          const e = (p - 0.90) / 0.10; // 0→1
          const smooth = e * e * (3 - 2 * e);
          yOffset = -4 * smooth;
        }

        this.whaleGroup.position.x = 1.5 * Math.sin(t);
        this.whaleGroup.position.y = 0.4 * Math.sin(2 * t) + yOffset;
        this.whaleGroup.position.z = 2.5 * Math.cos(t);
        this.whaleGroup.rotation.y = Math.atan2(Math.cos(t), -Math.sin(t));

        // Tilt nose down during enter/exit
        this.whaleGroup.rotation.x = yOffset < 0 ? yOffset * 0.12 : 0;
      }
      composer.render();
    };
    this.ngZone.runOutsideAngular(() => animate());
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.mixer?.stopAllAction();
    this.resizeObserver?.disconnect();
    this.composer?.dispose();
    this.renderer?.dispose();
  }
}
