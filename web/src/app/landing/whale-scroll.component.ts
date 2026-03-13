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
  private whaleGroup: any = null;
  private resizeObserver: ResizeObserver | null = null;
  private animationId = 0;
  private _progress = 0;
  private _active = false;
  private initialized = false;

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

    const host = this.hostRef.nativeElement as HTMLElement;
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;

    // Scene — NO background, transparent canvas
    const scene = new THREE.Scene();
    this.scene = scene;

    // Lights: 1 ambient + 1 directional
    scene.add(new THREE.AmbientLight(0x404060, 1.5));
    const dir = new THREE.DirectionalLight(0xddeeff, 2.5);
    dir.position.set(-3, 5, 4);
    scene.add(dir);

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
    renderer.toneMappingExposure = 1.0;
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
        const targetHeight = DESIRED_HALF_HEIGHT * 2 * 0.6; // 3.6 units
        const whaleScale = targetHeight / size.y;
        group.scale.setScalar(whaleScale);

        // Re-center after scaling
        const box2 = new THREE.Box3().setFromObject(group);
        const center2 = box2.getCenter(new THREE.Vector3());
        group.position.sub(center2);

        // Replace PBR materials with MeshLambertMaterial (works without env map)
        group.traverse((child: any) => {
          if (child.isMesh && child.material) {
            const oldMat = child.material;
            let color = oldMat.color ? oldMat.color.clone() : new THREE.Color(0x3a7ca5);
            if (color.r < 0.05 && color.g < 0.05 && color.b < 0.05) {
              color = new THREE.Color(0x3a7ca5);
            }
            child.material = new THREE.MeshLambertMaterial({
              color,
              transparent: oldMat.transparent || false,
              opacity: oldMat.opacity ?? 1,
            });
          }
        });

        scene.add(group);
        this.whaleGroup = group;

        // Render one initial frame if already active (ScrollTrigger may have fired before load)
        if (this._active) {
          renderer.render(scene, camera);
        }
      },
      undefined,
      (err) => console.error('[whale-scroll] failed to load whale GLB:', err),
    );

    // Render loop — only render when active
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (!this._active) return;

      if (this.whaleGroup) {
        this.whaleGroup.rotation.y = this._progress * Math.PI * 2;
      }
      renderer.render(scene, camera);
    };
    this.ngZone.runOutsideAngular(() => animate());
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
  }
}
