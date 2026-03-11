import * as THREE from 'three';
import { TRAIL_MAX_POINTS, TRAIL_COLOR } from './whale-scene.constants';

/** Manages the debug trail line and velocity arrow */
export class WhaleDebugTrail {
  trailLine: THREE.Line | null = null;
  velocityArrow: THREE.ArrowHelper | null = null;

  positions: Float32Array | null = null;
  index = 0;
  count = 0;

  init(scene: THREE.Scene): void {
    // Trail line
    this.positions = new Float32Array(TRAIL_MAX_POINTS * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setDrawRange(0, 0);
    const material = new THREE.LineBasicMaterial({ color: TRAIL_COLOR, linewidth: 2 });
    this.trailLine = new THREE.Line(geometry, material);
    this.trailLine.frustumCulled = false;
    scene.add(this.trailLine);

    // Velocity arrow
    const dir = new THREE.Vector3(1, 0, 0);
    this.velocityArrow = new THREE.ArrowHelper(dir, new THREE.Vector3(), 0.5, 0x00ff00, 0.1, 0.05);
    scene.add(this.velocityArrow);
  }

  updateTrail(whalePos: THREE.Vector3): void {
    if (!this.positions || !this.trailLine) return;
    const i = this.index * 3;
    this.positions[i] = whalePos.x;
    this.positions[i + 1] = whalePos.y;
    this.positions[i + 2] = whalePos.z;
    this.index = (this.index + 1) % TRAIL_MAX_POINTS;
    this.count = Math.min(this.count + 1, TRAIL_MAX_POINTS);
    const attr = this.trailLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
    this.trailLine.geometry.setDrawRange(0, this.count);
  }

  updateVelocityArrow(whalePos: THREE.Vector3, vx: number, vy: number, vz: number): void {
    if (!this.velocityArrow) return;
    this.velocityArrow.position.copy(whalePos);
    const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (len > 0.0001) {
      const dir = new THREE.Vector3(vx, vy, vz).normalize();
      this.velocityArrow.setDirection(dir);
      this.velocityArrow.setLength(Math.min(len * 2000, 1.5), 0.15, 0.08);
    }
  }

  clear(): void {
    this.index = 0;
    this.count = 0;
    if (this.positions) this.positions.fill(0);
    if (this.trailLine) this.trailLine.geometry.setDrawRange(0, 0);
  }
}
