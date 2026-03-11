import * as THREE from 'three';
import GUI from 'lil-gui';
import type { Direction, WhaleSceneContext } from './whale-scene.constants';

export interface DebugGuiParams {
  posX: number; posY: number; posZ: number;
  velX: number; velY: number; velZ: number;
  rotY: number; rotX: number;
  activeDir: string;
  enteringScene: boolean;
  isReacting: boolean;
  timeScale: number;
  wForward: number; wLeft: number; wRight: number; wUp: number; wDown: number;
  wSurface: number; wGulp: number;
  showTrail: boolean;
  showVelocity: boolean;
  showSkeleton: boolean;
  showAxes: boolean;
  showMinimap: boolean;
  showLogPanel: boolean;
  paused: boolean;
  openDebugWindow: () => void;
  clearTrail: () => void;
  clearLog: () => void;
  replayEntrance: () => void;
}

export class WhaleDebugGui {
  gui: GUI | null = null;
  skeletonHelper: THREE.SkeletonHelper | null = null;
  axes: THREE.AxesHelper | null = null;
  params: DebugGuiParams;

  constructor(
    private callbacks: {
      onOpenDebugWindow: () => void;
      onClearTrail: () => void;
      onClearLog: () => void;
      onReplayEntrance: () => void;
      getTrailLine: () => THREE.Line | null;
      getVelocityArrow: () => THREE.ArrowHelper | null;
      getLogPanel: () => HTMLDivElement | null;
    },
  ) {
    this.params = {
      posX: 0, posY: 0, posZ: 0,
      velX: 0, velY: 0, velZ: 0,
      rotY: 0, rotX: 0,
      activeDir: 'forward',
      enteringScene: true,
      isReacting: false,
      timeScale: 0.7,
      wForward: 0, wLeft: 0, wRight: 0, wUp: 0, wDown: 0,
      wSurface: 0, wGulp: 0,
      showTrail: true,
      showVelocity: true,
      showSkeleton: false,
      showAxes: true,
      showMinimap: true,
      showLogPanel: true,
      paused: false,
      openDebugWindow: () => callbacks.onOpenDebugWindow(),
      clearTrail: () => callbacks.onClearTrail(),
      clearLog: () => callbacks.onClearLog(),
      replayEntrance: () => callbacks.onReplayEntrance(),
    };
  }

  init(scene: THREE.Scene, model: THREE.Object3D): void {
    this.gui = new GUI({ title: '🐋 Whale Debug', width: 320 });

    const posFolder = this.gui.addFolder('Position');
    posFolder.add(this.params, 'posX').listen().disable();
    posFolder.add(this.params, 'posY').listen().disable();
    posFolder.add(this.params, 'posZ').listen().disable();

    const velFolder = this.gui.addFolder('Velocity');
    velFolder.add(this.params, 'velX').listen().disable();
    velFolder.add(this.params, 'velY').listen().disable();
    velFolder.add(this.params, 'velZ').listen().disable();

    const rotFolder = this.gui.addFolder('Rotation');
    rotFolder.add(this.params, 'rotY').listen().disable();
    rotFolder.add(this.params, 'rotX').listen().disable();

    const animFolder = this.gui.addFolder('Animation');
    animFolder.add(this.params, 'activeDir').listen().disable();
    animFolder.add(this.params, 'enteringScene').listen().disable();
    animFolder.add(this.params, 'isReacting').listen().disable();
    animFolder.add(this.params, 'timeScale').listen().disable();

    const weightsFolder = this.gui.addFolder('Weights');
    weightsFolder.add(this.params, 'wForward', 0, 1).listen().disable();
    weightsFolder.add(this.params, 'wLeft', 0, 1).listen().disable();
    weightsFolder.add(this.params, 'wRight', 0, 1).listen().disable();
    weightsFolder.add(this.params, 'wUp', 0, 1).listen().disable();
    weightsFolder.add(this.params, 'wDown', 0, 1).listen().disable();
    weightsFolder.add(this.params, 'wSurface', 0, 1).listen().disable();
    weightsFolder.add(this.params, 'wGulp', 0, 1).listen().disable();

    const toggleFolder = this.gui.addFolder('Toggles');
    toggleFolder.add(this.params, 'paused').name('Pause Scene');
    toggleFolder.add(this.params, 'showTrail').onChange((v: boolean) => {
      const line = this.callbacks.getTrailLine();
      if (line) line.visible = v;
    });
    toggleFolder.add(this.params, 'showVelocity').onChange((v: boolean) => {
      const arrow = this.callbacks.getVelocityArrow();
      if (arrow) arrow.visible = v;
    });
    toggleFolder.add(this.params, 'showSkeleton').onChange((v: boolean) => {
      if (this.skeletonHelper) this.skeletonHelper.visible = v;
    });
    toggleFolder.add(this.params, 'showAxes').onChange((v: boolean) => {
      if (this.axes) this.axes.visible = v;
    });
    toggleFolder.add(this.params, 'showMinimap').name('3D Minimap');
    toggleFolder.add(this.params, 'showLogPanel').name('Log Panel').onChange((v: boolean) => {
      const panel = this.callbacks.getLogPanel();
      if (panel) panel.style.display = v ? 'flex' : 'none';
    });
    toggleFolder.add(this.params, 'openDebugWindow').name('Open Debug Window');
    toggleFolder.add(this.params, 'clearTrail');
    toggleFolder.add(this.params, 'clearLog').name('Clear Log');
    toggleFolder.add(this.params, 'replayEntrance').name('Replay Entrance');

    // Axes helper at whale position
    this.axes = new THREE.AxesHelper(0.5);
    scene.add(this.axes);

    // Skeleton helper
    this.skeletonHelper = new THREE.SkeletonHelper(model);
    this.skeletonHelper.visible = false;
    scene.add(this.skeletonHelper);
  }

  update(ctx: WhaleSceneContext, vx: number, vy: number, vz: number): void {
    const p = this.params;
    p.posX = +ctx.whalePos.x.toFixed(3);
    p.posY = +ctx.whalePos.y.toFixed(3);
    p.posZ = +ctx.whalePos.z.toFixed(3);
    p.velX = +vx.toFixed(5);
    p.velY = +vy.toFixed(5);
    p.velZ = +vz.toFixed(5);
    if (ctx.modelGroup) {
      p.rotY = +(ctx.modelGroup.rotation.y * 180 / Math.PI).toFixed(1);
      p.rotX = +(ctx.modelGroup.rotation.x * 180 / Math.PI).toFixed(1);
    }
    p.activeDir = ctx.activeDir;
    p.enteringScene = ctx.enteringScene;
    p.isReacting = ctx.isReacting;
    p.timeScale = +(ctx.dirActions[ctx.activeDir]?.timeScale ?? 0).toFixed(2);
    p.wForward = +(ctx.dirActions.forward?.getEffectiveWeight() ?? 0).toFixed(3);
    p.wLeft = +(ctx.dirActions.left?.getEffectiveWeight() ?? 0).toFixed(3);
    p.wRight = +(ctx.dirActions.right?.getEffectiveWeight() ?? 0).toFixed(3);
    p.wUp = +(ctx.dirActions.up?.getEffectiveWeight() ?? 0).toFixed(3);
    p.wDown = +(ctx.dirActions.down?.getEffectiveWeight() ?? 0).toFixed(3);
    p.wSurface = +(ctx.surfaceAction?.getEffectiveWeight() ?? 0).toFixed(3);
    p.wGulp = +(ctx.gulpAction?.getEffectiveWeight() ?? 0).toFixed(3);

    if (this.axes) this.axes.position.copy(ctx.whalePos);
  }

  destroy(): void {
    this.gui?.destroy();
    this.gui = null;
  }
}
