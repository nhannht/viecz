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
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import {
  BLOOM_LAYER, DESIRED_HALF_HEIGHT, CAMERA_FOV, DEBUG_3D,
  TRAIL_MAX_POINTS, DIR_ANIMS, GULP_ANIM, SURFACE_ANIM, BLEND_SPEED,
  Direction, WhaleSceneContext,
} from './whale-scene.constants';
import { WhaleSwimming } from './whale-swimming';
import { WhaleParticles } from './whale-particles';
import { WhalePostProcessing } from './whale-postprocessing';
import { WhaleDebugGui } from './whale-debug-gui';
import { WhaleDebugTrail } from './whale-debug-trail';
import { WhaleDebugMinimap } from './whale-debug-minimap';
import { WhaleDebugPlot } from './whale-debug-plot';
import { WhaleDebugLog } from './whale-debug-log';
import { WhaleTuningPanel, TUNE_3D } from './whale-tuning-panel';

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
  private _visible = true;
  private _intersectionObserver: IntersectionObserver | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private _whaleScene: THREE.Group | null = null; // the gltf.scene inside modelGroup
  private clock = new THREE.Clock();

  // Animation actions
  private dirActions: Record<Direction, THREE.AnimationAction | null> = {
    forward: null, left: null, right: null, up: null, down: null,
  };
  private gulpAction: THREE.AnimationAction | null = null;
  private surfaceAction: THREE.AnimationAction | null = null;

  // Helpers
  private swimming = new WhaleSwimming(1, 1, 0.5);
  private particles: WhaleParticles | null = null;
  private postProcessing: WhalePostProcessing | null = null;

  private tuningPanel: WhaleTuningPanel | null = null;
  // Debug helpers (only initialized when DEBUG_3D)
  private debugGui: WhaleDebugGui | null = null;
  private debugTrail: WhaleDebugTrail | null = null;
  private debugMinimap: WhaleDebugMinimap | null = null;
  private debugPlot: WhaleDebugPlot | null = null;
  private debugLog: WhaleDebugLog | null = null;
  private debugPopupWindow: Window | null = null;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.initThree();
    });
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
    this._intersectionObserver?.disconnect();
    this.mixer?.removeEventListener('finished', this.onGulpFinished);
    this.renderer?.dispose();
    this.tuningPanel?.destroy();
    this.postProcessing?.dispose();
    this.particles?.dispose();
    this.destroyDebug();
  }

  onCanvasClick(event: MouseEvent): void {
    if (!this.camera || !this.swimming) return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this._modelGroup) {
      this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
      const hits = this.raycaster.intersectObject(this._modelGroup, true);

      if (hits.length > 0) {
        this.whaleClicked.emit();
        if (this.swimming.isReacting || !this.gulpAction) return;
        this.swimming.isReacting = true;
        this.gulpAction.reset();
        this.gulpAction.setEffectiveWeight(0);
        console.log(`[whale:click] gulp triggered, active=${this.swimming.activeDir}`);
      } else {
        // Click background — swim toward that point
        const clickWorld = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(this.camera);
        const camPos = this.camera.position.clone();
        const dir = clickWorld.sub(camPos).normalize();
        const t = -camPos.z / dir.z;
        const targetX = camPos.x + dir.x * t;
        const targetY = camPos.y + dir.y * t;
        this.swimming.setUserTarget(targetX, targetY);
      }
    }
  }

  private _scrollProgress = 0;
  private _baseCamZ = 0;

  private _modelGroup: THREE.Group | null = null;

  /** Called by landing page GSAP ScrollTrigger to animate whale exit.
   *  p < 0.3: normal view
   *  p 0.3→1.0: camera zooms out, model fades */
  setScrollProgress(p: number): void {
    this._scrollProgress = p;
    if (!this.camera || !this._baseCamZ) return;

    if (p < 0.3) {
      this.camera.position.z = this._baseCamZ;
    } else {
      const t = (p - 0.3) / 0.7;
      this.camera.position.z = this._baseCamZ * (1 + t * 2.5);
    }

    // Fade model materials
    if (this._modelGroup && p > 0.6) {
      const fadeT = (p - 0.6) / 0.4;
      this._modelGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat) {
            mat.transparent = true;
            mat.opacity = 1 - fadeT;
          }
        }
      });
    } else if (this._modelGroup && p <= 0.6) {
      this._modelGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat && mat.opacity < 1) {
            mat.opacity = 1;
          }
        }
      });
    }
  }

  private onGulpFinished = (): void => {
    if (!this.swimming.isReacting) return;
    this.swimming.isReacting = false;
    if (this.gulpAction) {
      this.gulpAction.reset();
      this.gulpAction.setEffectiveWeight(0);
    }
    console.log(`[whale:gulp-done] returning to ${this.swimming.activeDir}`);
  };

  private getSceneContext(): WhaleSceneContext {
    return {
      scene: null!,  // Not needed for GUI updates
      camera: this.camera!,
      renderer: this.renderer!,
      modelGroup: this._modelGroup,
      whalePos: this.swimming.whalePos,
      whaleVelocity: this.swimming.whaleVelocity,
      whaleTarget: this.swimming.whaleTarget,
      swimRangeX: this.swimming.swimRangeX,
      swimRangeY: this.swimming.swimRangeY,
      swimRangeZ: this.swimming.swimRangeZ,
      activeDir: this.swimming.activeDir,
      enteringScene: this.swimming.enteringScene,
      isReacting: this.swimming.isReacting,
      dirActions: this.dirActions,
      surfaceAction: this.surfaceAction,
      gulpAction: this.gulpAction,
    };
  }

  private initDebugPopup(): void {
    if (this.debugPopupWindow && !this.debugPopupWindow.closed) {
      this.debugPopupWindow.focus();
      return;
    }

    this.debugPlot?.destroy();
    this.debugLog?.destroy();

    const popup = window.open('', 'whale-debug', 'width=1000,height=700,resizable=yes,scrollbars=yes');
    if (!popup) {
      console.warn('[whale:debug] Popup blocked — allow popups for localhost');
      return;
    }

    const doc = popup.document;
    doc.open();
    doc.close();

    this.debugPopupWindow = popup;
    doc.title = 'Whale 3D Debug';
    doc.body.style.cssText =
      'margin:0;padding:0;background:#0d0d1a;color:#aabbdd;' +
      'font-family:monospace;font-size:11px;display:flex;flex-direction:column;height:100vh;overflow:hidden;';

    const topBar = doc.createElement('div');
    topBar.style.cssText =
      'padding:8px 12px;background:#161630;border-bottom:1px solid #444488;' +
      'font-size:13px;font-weight:bold;color:#8888cc;flex-shrink:0;';
    topBar.textContent = 'Whale 3D Debug — Interactive Plot + Structured Log';
    doc.body.appendChild(topBar);

    const main = doc.createElement('div');
    main.style.cssText = 'display:flex;flex:1;min-height:0;overflow:hidden;';

    const leftCol = doc.createElement('div');
    leftCol.style.cssText = 'width:50%;flex-shrink:0;border-right:1px solid #444488;position:relative;';
    this.debugPlot = new WhaleDebugPlot();
    this.debugPlot.init(doc, leftCol, this.swimming.swimRangeX, this.swimming.swimRangeY, this.swimming.swimRangeZ);
    main.appendChild(leftCol);

    const rightCol = doc.createElement('div');
    rightCol.style.cssText = 'flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;';
    this.debugLog = new WhaleDebugLog();
    this.debugLog.init(doc);
    if (this.debugLog.panel) rightCol.appendChild(this.debugLog.panel);
    main.appendChild(rightCol);

    doc.body.appendChild(main);
  }

  private destroyDebug(): void {
    this.debugGui?.destroy();
    this.debugGui = null;
    this.debugMinimap?.destroy();
    this.debugMinimap = null;
    this.debugPlot?.destroy();
    this.debugPlot = null;
    this.debugLog?.destroy();
    this.debugLog = null;
    if (this.debugPopupWindow && !this.debugPopupWindow.closed) {
      this.debugPopupWindow.close();
    }
    this.debugPopupWindow = null;
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement!;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();

    // Deep ocean gradient background (dark abyss → lighter blue-green)
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = 2;
    gradCanvas.height = 256;
    const gCtx = gradCanvas.getContext('2d')!;
    const grad = gCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#0a2a3a');   // top — lighter deep teal
    grad.addColorStop(0.4, '#061a28'); // mid — dark ocean
    grad.addColorStop(1, '#020c14');   // bottom — near-black abyss
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 2, 256);
    const gradTex = new THREE.CanvasTexture(gradCanvas);
    gradTex.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = gradTex;

    // Exponential fog — objects fade into deep ocean at distance
    const fogColor = new THREE.Color(0x061a28);
    scene.fog = new THREE.FogExp2(fogColor, 0.025);

    scene.add(new THREE.AmbientLight(0x303050, 0.6));
    const keyLight = new THREE.DirectionalLight(0xddeeff, 2.0);
    keyLight.position.set(-3, 8, 2); // high & left — diagonal shafts
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 12;
    keyLight.shadow.camera.bottom = -12;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    fillLight.position.set(-2, -1, -2);
    scene.add(fillLight);

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, w / h, 0.1, 500);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 3.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;

    // Post-processing pipeline (selective bloom + god rays)
    this.postProcessing = new WhalePostProcessing(renderer, scene, camera, keyLight);

    const onResize = () => {
      const rw = container.clientWidth;
      const rh = container.clientHeight;
      if (rw === 0 || rh === 0) return;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
      this.postProcessing?.setSize(rw, rh);
    };
    this.resizeObserver = new ResizeObserver(onResize);
    this.resizeObserver.observe(container);

    this._intersectionObserver = new IntersectionObserver(
      ([entry]) => { this._visible = entry.isIntersecting; },
      { threshold: 0 },
    );
    this._intersectionObserver.observe(container);

    // Load whale — check cache for high-end model first
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('assets/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    const HIGH_END_MODEL = 'assets/models/glow_whale_mr_draco.glb';
    const LIGHTWEIGHT_MODEL = 'assets/models/glow_whale_final.glb';

    const onWhaleLoaded = (gltf: import('three/examples/jsm/loaders/GLTFLoader.js').GLTF, isHighEnd: boolean) => {
      if (this._modelGroup) return; // already loaded (race condition guard)
      const modelGroup = new THREE.Group();
      this._modelGroup = modelGroup;

      const whaleMaterial = this.setupWhaleFromGltf(gltf, camera);

      modelGroup.add(gltf.scene);
      modelGroup.scale.set(20, 20, 20);
      scene.add(modelGroup);

      this.swimming.pickFreeSwimWaypoint();

      // Phase 1: immediate — pure geometry, no GLB loads
      this.particles = new WhaleParticles(scene, this.swimming.swimRangeX, this.swimming.swimRangeY, this.swimming.swimRangeZ);
      this.particles.initParticles();
      this.particles.initSeaFlora();
      this.particles.initRocks();
      this.particles.initBubbles();

      // Phase 2: deferred — GLB models, staggered via requestIdleCallback
      // Priority order: ocean floor → buddha/props → mountains → fish → koi
      const deferredInits = [
        () => this.particles?.initOceanFloor(loader),
        () => this.particles?.initFloorProps(loader, (mesh) => this.postProcessing?.addBloomMesh(mesh)),
        () => this.particles?.initMountainRange(loader),
        () => this.particles?.initFishFlocks(loader),
        () => this.particles?.initKoiFish(loader),
      ];
      const scheduleNext = (i: number) => {
        if (i >= deferredInits.length) return;
        (window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 80)))(
          () => { deferredInits[i](); scheduleNext(i + 1); },
        );
      };
      scheduleNext(0);

      // Tuning panel (activate via ?tune_3d=true)
      if (TUNE_3D && this.postProcessing && whaleMaterial) {
        this.tuningPanel = new WhaleTuningPanel({
          pp: this.postProcessing,
          renderer,
          scene,
          camera,
          keyLight,
          modelGroup,
          swimming: this.swimming,
          particles: this.particles,
          whaleMaterial,
        });
      }

      // Debug
      if (DEBUG_3D) {
        this.debugTrail = new WhaleDebugTrail();
        this.debugTrail.init(scene);

        this.debugMinimap = new WhaleDebugMinimap();
        this.debugMinimap.init(this.swimming.swimRangeX, this.swimming.swimRangeY, this.swimming.swimRangeZ);

        this.debugGui = new WhaleDebugGui({
          onOpenDebugWindow: () => this.initDebugPopup(),
          onClearTrail: () => this.debugTrail?.clear(),
          onClearLog: () => this.debugLog?.clear(),
          onReplayEntrance: () => {
            this.swimming.replayEntrance();
            this.debugTrail?.clear();
          },
          getTrailLine: () => this.debugTrail?.trailLine ?? null,
          getVelocityArrow: () => this.debugTrail?.velocityArrow ?? null,
          getLogPanel: () => this.debugLog?.panel ?? null,
        });
        this.debugGui.init(scene, gltf.scene);
      }

      // If loaded the lightweight model, schedule background upgrade if network is fast
      if (!isHighEnd) {
        this.maybeUpgradeWhaleModel(loader, camera);
      } else {
        console.log('[whale:adaptive] High-end model loaded from cache — no upgrade needed');
      }
    };

    // Try cache-first: if the high-end model is already cached, use it directly
    fetch(HIGH_END_MODEL, { method: 'HEAD', cache: 'only-if-cached', mode: 'same-origin' })
      .then((res) => {
        if (res.ok) {
          console.log('[whale:adaptive] High-end model found in cache — loading directly');
          loader.load(HIGH_END_MODEL, (gltf) => onWhaleLoaded(gltf, true));
        } else {
          throw new Error('not cached');
        }
      })
      .catch(() => {
        // Not cached — load lightweight model first
        loader.load(LIGHTWEIGHT_MODEL, (gltf) => onWhaleLoaded(gltf, false));
      });

    // Animation loop
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (!this._visible) return; // skip all work when offscreen
      const delta = this.clock.getDelta();
      const elapsed = this.clock.elapsedTime;

      // Pause: skip simulation but still render
      if (this.debugGui?.params.paused || this.tuningPanel?.paused) {
        this.postProcessing?.render();
        if (DEBUG_3D) {
          this.debugMinimap?.render(renderer, container.clientWidth, container.clientHeight, this.debugGui?.params.showMinimap ?? true);
        }
        return;
      }

      // Weight blending
      const blendStep = BLEND_SPEED * delta;
      const lerpFactor = Math.min(blendStep * 4, 1);

      for (const [dir, action] of Object.entries(this.dirActions)) {
        if (!action) continue;
        const targetWeight = (dir === this.swimming.activeDir && !this.swimming.isReacting) ? 1 : 0;
        const currentWeight = action.getEffectiveWeight();
        const newWeight = currentWeight + (targetWeight - currentWeight) * lerpFactor;
        action.enabled = true;
        action.setEffectiveTimeScale(action.timeScale);
        action.setEffectiveWeight(newWeight);
      }

      if (this.surfaceAction) {
        const surfaceTarget = this.swimming.enteringScene ? 1 : 0;
        const surfaceCurrent = this.surfaceAction.getEffectiveWeight();
        const surfaceNew = surfaceCurrent + (surfaceTarget - surfaceCurrent) * lerpFactor;
        this.surfaceAction.enabled = true;
        this.surfaceAction.setEffectiveTimeScale(this.surfaceAction.timeScale);
        this.surfaceAction.setEffectiveWeight(surfaceNew);
      }

      if (this.gulpAction) {
        const gulpTarget = this.swimming.isReacting ? 1 : 0;
        const gulpCurrent = this.gulpAction.getEffectiveWeight();
        const gulpNew = gulpCurrent + (gulpTarget - gulpCurrent) * lerpFactor;
        this.gulpAction.enabled = true;
        this.gulpAction.setEffectiveTimeScale(1);
        this.gulpAction.setEffectiveWeight(gulpNew);
        if (this.swimming.isReacting && this.gulpAction.time >= this.gulpAction.getClip().duration * 0.95) {
          this.onGulpFinished();
        }
      }

      if (this.mixer) this.mixer.update(delta);

      if (this._modelGroup) {
        this.swimming.update(this._modelGroup, performance.now());
      }

      // Particles + caustics
      this.particles?.update(delta, elapsed);
      this.tuningPanel?.syncCurrentDisplay();

      // Debug updates
      if (DEBUG_3D && this.debugTrail) {
        const pos = this.swimming.whalePos;
        const vel = this.swimming.whaleVelocity;
        const debugVx = this.swimming.enteringScene
          ? (pos.x - (this.debugTrail.count > 0 && this.debugTrail.positions
            ? this.debugTrail.positions[((this.debugTrail.index - 1 + TRAIL_MAX_POINTS) % TRAIL_MAX_POINTS) * 3] : pos.x))
          : vel.x;
        const debugVy = this.swimming.enteringScene
          ? (pos.y - (this.debugTrail.count > 0 && this.debugTrail.positions
            ? this.debugTrail.positions[((this.debugTrail.index - 1 + TRAIL_MAX_POINTS) % TRAIL_MAX_POINTS) * 3 + 1] : pos.y))
          : vel.y;
        const debugVz = this.swimming.enteringScene
          ? (pos.z - (this.debugTrail.count > 0 && this.debugTrail.positions
            ? this.debugTrail.positions[((this.debugTrail.index - 1 + TRAIL_MAX_POINTS) % TRAIL_MAX_POINTS) * 3 + 2] : pos.z))
          : vel.z;

        this.debugTrail.updateTrail(pos);
        this.debugTrail.updateVelocityArrow(pos, debugVx, debugVy, debugVz);

        const ctx = this.getSceneContext();
        this.debugGui?.update(ctx, debugVx, debugVy, debugVz);

        this.debugMinimap?.update(pos, this.debugTrail.positions, this.debugTrail.count);
        this.debugPlot?.update(pos, this.debugTrail.positions, this.debugTrail.count, this.debugPopupWindow?.closed ?? true);
        this.debugLog?.update(ctx, debugVx, debugVy, debugVz, this.debugGui?.params.showLogPanel ?? true, this.debugPopupWindow?.document ?? null);
      }

      // Render
      this.postProcessing?.render();

      // Debug minimap inset
      if (DEBUG_3D) {
        this.debugMinimap?.render(renderer, container.clientWidth, container.clientHeight, this.debugGui?.params.showMinimap ?? true);
      }
    };
    animate();
  }

  /** Set up whale model: center, materials, bloom, animations. Returns first material for tuning panel. */
  private setupWhaleFromGltf(
    gltf: import('three/examples/jsm/loaders/GLTFLoader.js').GLTF,
    camera: THREE.PerspectiveCamera,
  ): THREE.MeshStandardMaterial | null {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    gltf.scene.position.sub(center);

    // Position camera so visible area at z=0 = ±DESIRED_HALF_HEIGHT vertically
    const vFov = (CAMERA_FOV * Math.PI) / 180;
    const camZ = DESIRED_HALF_HEIGHT / Math.tan(vFov / 2);
    camera.position.set(0, 0, camZ);
    camera.lookAt(0, 0, 0);
    this._baseCamZ = camZ;

    // Compute swim ranges from actual frustum
    const swimRangeY = DESIRED_HALF_HEIGHT;
    const swimRangeX = DESIRED_HALF_HEIGHT * camera.aspect;
    const swimRangeZ = camZ * 2.5;
    this.swimming.setSwimRange(swimRangeX, swimRangeY, swimRangeZ);

    // Materials: shadows, emissive, bloom
    let firstMaterial: THREE.MeshStandardMaterial | null = null;
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (!firstMaterial) firstMaterial = mat;
        mat.emissiveIntensity = 20;
        child.layers.enable(BLOOM_LAYER);
        this.postProcessing?.addBloomMesh(mesh);
      }
    });

    // Animations
    if (this.mixer) {
      this.mixer.removeEventListener('finished', this.onGulpFinished);
      this.mixer.stopAllAction();
    }
    this.mixer = new THREE.AnimationMixer(gltf.scene);
    this.mixer.addEventListener('finished', this.onGulpFinished);

    for (const [dir, animName] of Object.entries(DIR_ANIMS)) {
      const clip = gltf.animations.find(c => c.name === animName);
      if (clip) {
        const action = this.mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.timeScale = 0.7;
        action.enabled = true;
        action.setEffectiveWeight(0);
        action.play();
        this.dirActions[dir as Direction] = action;
      }
    }

    const gulpClip = gltf.animations.find(c => c.name === GULP_ANIM);
    if (gulpClip) {
      this.gulpAction = this.mixer.clipAction(gulpClip);
      this.gulpAction.setLoop(THREE.LoopOnce, 1);
      this.gulpAction.clampWhenFinished = true;
      this.gulpAction.enabled = true;
      this.gulpAction.setEffectiveWeight(0);
      this.gulpAction.play();
    }

    const surfaceClip = gltf.animations.find(c => c.name === SURFACE_ANIM);
    if (surfaceClip) {
      this.surfaceAction = this.mixer.clipAction(surfaceClip);
      this.surfaceAction.setLoop(THREE.LoopRepeat, Infinity);
      this.surfaceAction.enabled = true;
      this.surfaceAction.setEffectiveWeight(1);
      this.surfaceAction.play();
    }

    this._whaleScene = gltf.scene;
    return firstMaterial;
  }

  /** Check network conditions and load high-end whale model if bandwidth allows */
  private maybeUpgradeWhaleModel(loader: GLTFLoader, camera: THREE.PerspectiveCamera): void {
    const conn = (navigator as any).connection;
    if (conn) {
      // Network Information API available (Chrome/Edge)
      const dominated = conn.effectiveType === '2g' || conn.effectiveType === '3g'
        || conn.effectiveType === 'slow-2g'
        || (conn.downlink != null && conn.downlink < 5);
      if (dominated) {
        console.log(`[whale:adaptive] Slow network (${conn.effectiveType}, ${conn.downlink} Mbps) — keeping lightweight model`);
        return;
      }
      console.log(`[whale:adaptive] Fast network (${conn.effectiveType}, ${conn.downlink} Mbps) — upgrading to high-end model`);
    } else {
      console.log('[whale:adaptive] Network Info API unavailable — attempting progressive upgrade');
    }

    // Defer upgrade to avoid competing with deferred scene loads
    setTimeout(() => {
      if (!this._modelGroup) return; // component destroyed
      loader.load('assets/models/glow_whale_mr_draco.glb', (gltf) => {
        try {
          if (!this._modelGroup) return; // destroyed during load
          console.log('[whale:adaptive] High-end model loaded, hot-swapping...');

          // Remove old whale scene from model group
          if (this._whaleScene) {
            this._modelGroup.remove(this._whaleScene);
            // Dispose old geometry/materials/textures
            this._whaleScene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.geometry.dispose();
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material as THREE.Material];
                for (const m of mats) {
                  // Dispose all texture maps on the material
                  for (const key of Object.keys(m)) {
                    const val = (m as any)[key];
                    if (val instanceof THREE.Texture) val.dispose();
                  }
                  m.dispose();
                }
              }
            });
          }

          // Set up new model with same centering, materials, bloom, animations
          this.setupWhaleFromGltf(gltf, camera);
          this._modelGroup.add(gltf.scene);

          console.log('[whale:adaptive] Hot-swap complete — now using high-end whale model');
        } catch (e) {
          console.warn('[whale:adaptive] Failed to upgrade whale model, keeping current:', e);
        }
      }, undefined, (err) => {
        console.warn('[whale:adaptive] Failed to load high-end whale model, scene unaffected:', err);
      });
    }, 3000); // Wait 3s for deferred scene loads to settle
  }

}
