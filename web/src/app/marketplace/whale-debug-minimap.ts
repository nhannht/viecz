import * as THREE from 'three';
import { TRAIL_MAX_POINTS, TRAIL_COLOR } from './whale-scene.constants';

/** Debug minimap — top-down orthographic inset viewport */
export class WhaleDebugMinimap {
  private scene: THREE.Scene | null = null;
  private cam: THREE.OrthographicCamera | null = null;
  private whaleDot: THREE.Mesh | null = null;
  private trailLine: THREE.Line | null = null;
  private boundsBox: THREE.LineSegments | null = null;

  init(swimRangeX: number, swimRangeY: number, swimRangeZ: number): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111122);

    const range = Math.max(swimRangeX, swimRangeZ) * 1.3;
    this.cam = new THREE.OrthographicCamera(-range, range, range, -range, 0.1, 100);
    this.cam.position.set(0, 20, 0);
    this.cam.lookAt(0, 0, 0);

    // Swim bounds box
    const PAD = 1.15;
    const boxGeo = new THREE.BoxGeometry(
      swimRangeX * 2 * PAD,
      swimRangeY * 2 * PAD,
      swimRangeZ * 2 * PAD,
    );
    const edges = new THREE.EdgesGeometry(boxGeo);
    this.boundsBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x444488 }));
    this.scene.add(this.boundsBox);

    this.scene.add(new THREE.AxesHelper(range * 0.3));

    // Whale dot
    const dotGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.whaleDot = new THREE.Mesh(dotGeo, dotMat);
    this.scene.add(this.whaleDot);

    // Trail line
    const trailPositions = new Float32Array(TRAIL_MAX_POINTS * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setDrawRange(0, 0);
    this.trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: TRAIL_COLOR }));
    this.trailLine.frustumCulled = false;
    this.scene.add(this.trailLine);
  }

  update(whalePos: THREE.Vector3, trailPositions: Float32Array | null, trailCount: number): void {
    if (!this.scene || !this.whaleDot || !this.trailLine) return;

    this.whaleDot.position.set(whalePos.x, whalePos.y, whalePos.z);

    if (trailPositions && this.trailLine.geometry) {
      const miniAttr = this.trailLine.geometry.getAttribute('position') as THREE.BufferAttribute;
      miniAttr.array.set(trailPositions);
      miniAttr.needsUpdate = true;
      this.trailLine.geometry.setDrawRange(0, Math.min(trailCount, TRAIL_MAX_POINTS));
    }
  }

  render(renderer: THREE.WebGLRenderer, containerW: number, containerH: number, show: boolean): void {
    if (!this.scene || !this.cam || !show) return;

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
    renderer.render(this.scene, this.cam);

    // Restore
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, containerW * pr, containerH * pr);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
  }

  destroy(): void {
    this.scene = null;
    this.cam = null;
    this.whaleDot = null;
    this.trailLine = null;
    this.boundsBox = null;
  }
}
