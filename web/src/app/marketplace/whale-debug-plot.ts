import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TRAIL_MAX_POINTS } from './whale-scene.constants';

/** Interactive 3D debug plot rendered in a popup window */
export class WhaleDebugPlot {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private whaleDot: THREE.Mesh | null = null;
  private trailLine: THREE.Line | null = null;
  private animId = 0;

  init(doc: Document, container: HTMLElement, swimRangeX: number, swimRangeY: number, swimRangeZ: number): void {
    const canvas = doc.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d1a);
    this.scene = scene;

    const range = Math.max(swimRangeX, swimRangeY, swimRangeZ) * 1.3;
    const grid = new THREE.GridHelper(range * 2, 20, 0x333366, 0x222244);
    scene.add(grid);
    const axes = new THREE.AxesHelper(range * 0.6);
    scene.add(axes);

    // Axis labels
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

    // Swim bounds wireframe
    const PAD = 1.15;
    const boxGeo = new THREE.BoxGeometry(
      swimRangeX * 2 * PAD,
      swimRangeY * 2 * PAD,
      swimRangeZ * 2 * PAD,
    );
    const edges = new THREE.EdgesGeometry(boxGeo);
    scene.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x555588, transparent: true, opacity: 0.5 })));

    // Whale dot
    const dotGeo = new THREE.SphereGeometry(range * 0.03, 12, 12);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.whaleDot = new THREE.Mesh(dotGeo, dotMat);
    scene.add(this.whaleDot);

    // Trail line with vertex colors
    const trailPositions = new Float32Array(TRAIL_MAX_POINTS * 3);
    const trailColors = new Float32Array(TRAIL_MAX_POINTS * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    trailGeo.setDrawRange(0, 0);
    this.trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true }));
    this.trailLine.frustumCulled = false;
    scene.add(this.trailLine);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
    camera.position.set(range * 1.2, range * 0.8, range * 1.2);
    camera.lookAt(0, 0, 0);
    this.camera = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(0, 0, 0);
    this.controls = controls;

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
    setTimeout(onResize, 50);

    // Own render loop
    const animatePlot = () => {
      this.animId = requestAnimationFrame(animatePlot);
      controls.update();
      renderer.render(scene, camera);
    };
    animatePlot();
  }

  update(whalePos: THREE.Vector3, trailPositions: Float32Array | null, trailCount: number, popupClosed: boolean): void {
    if (!this.scene || !this.whaleDot || !this.trailLine || popupClosed) return;

    this.whaleDot.position.set(whalePos.x, whalePos.y, whalePos.z);

    if (trailPositions && this.trailLine.geometry) {
      const posAttr = this.trailLine.geometry.getAttribute('position') as THREE.BufferAttribute;
      posAttr.array.set(trailPositions);
      posAttr.needsUpdate = true;

      const colorAttr = this.trailLine.geometry.getAttribute('color') as THREE.BufferAttribute;
      const count = Math.min(trailCount, TRAIL_MAX_POINTS);
      for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 1;
        colorAttr.setXYZ(i, 0.4 + t * 0.6, 0.1 + t * 0.5, 0.1 * (1 - t));
      }
      colorAttr.needsUpdate = true;
      this.trailLine.geometry.setDrawRange(0, count);
    }
  }

  destroy(): void {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.whaleDot = null;
    this.trailLine = null;
  }
}
