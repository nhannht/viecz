import * as THREE from 'three';
import { Direction, DIR_HOLD_TIME } from './whale-scene.constants';

/** Manages whale swimming: free-swim waypoints, entrance animation, user-directed movement, rotation */
export class WhaleSwimming {
  // 3D movement
  readonly whalePos = new THREE.Vector3(-2, 0, 0);
  readonly whaleTarget = new THREE.Vector3(0, 0, 0);
  readonly whaleVelocity = new THREE.Vector3(0, 0, 0);
  swimSpeed = 0.002;
  enteringScene = true;
  private entranceStartTime = 0;
  private readonly ENTRANCE_DURATION = 5000;

  // Rotation
  private targetRotationY = 0;
  private targetRotationX = 0;
  TURN_LERP = 0.01;

  // Free-swim
  private freeSwimTarget = new THREE.Vector3(0, 0, 0);
  private freeSwimTimer = 0;
  freeSwimInterval = 8000;
  VELOCITY_LERP = 0.06;
  private wobblePhase = Math.random() * Math.PI * 2;

  // User-directed swim
  private userDirected = false;
  private userDirectedTarget = new THREE.Vector3(0, 0, 0);

  // Direction hold
  activeDir: Direction = 'forward';
  isReacting = false;
  private pendingDir: Direction = 'forward';
  private pendingDirSince = 0;

  // Debug logging
  private lastDebugLog = 0;
  private readonly DEBUG_LOG_INTERVAL = 500;

  constructor(
    public swimRangeX: number,
    public swimRangeY: number,
    public swimRangeZ: number,
  ) {}

  setSwimRange(x: number, y: number, z: number): void {
    this.swimRangeX = x;
    this.swimRangeY = y;
    this.swimRangeZ = z;
    this.whalePos.set(-x * 1.3, 0, 0);
  }

  pickFreeSwimWaypoint(): void {
    const speed = this.whaleVelocity.length();
    const CONE_HALF_ANGLE = Math.PI / 3;

    if (speed > 0.00005) {
      const headingAngleXZ = Math.atan2(this.whaleVelocity.x, this.whaleVelocity.z);
      const headingAngleY = Math.atan2(this.whaleVelocity.y, Math.sqrt(
        this.whaleVelocity.x * this.whaleVelocity.x + this.whaleVelocity.z * this.whaleVelocity.z
      ));

      const deviationXZ = (Math.random() - 0.5) * 2 * CONE_HALF_ANGLE;
      const deviationY = (Math.random() - 0.5) * 2 * CONE_HALF_ANGLE * 0.5;

      const newAngleXZ = headingAngleXZ + deviationXZ;
      const newAngleY = headingAngleY + deviationY;

      const distFactor = 0.4 + Math.random() * 0.5;
      const dist = Math.max(this.swimRangeX, this.swimRangeZ) * distFactor;

      const candidateX = this.whalePos.x + Math.sin(newAngleXZ) * Math.cos(newAngleY) * dist;
      const candidateY = this.whalePos.y + Math.sin(newAngleY) * dist * 0.6;
      const candidateZ = this.whalePos.z + Math.cos(newAngleXZ) * Math.cos(newAngleY) * dist;

      this.freeSwimTarget.set(
        Math.max(-this.swimRangeX * 0.9, Math.min(this.swimRangeX * 0.9, candidateX)),
        Math.max(-this.swimRangeY * 0.9, Math.min(this.swimRangeY * 0.9, candidateY)),
        Math.max(-this.swimRangeZ * 0.9, Math.min(this.swimRangeZ * 0.9, candidateZ)),
      );
    } else {
      this.freeSwimTarget.set(
        (Math.random() - 0.5) * 2 * this.swimRangeX * 0.7,
        (Math.random() - 0.5) * 2 * this.swimRangeY * 0.5,
        (Math.random() - 0.5) * 2 * this.swimRangeZ * 0.7,
      );
    }

    this.freeSwimInterval = 6000 + Math.random() * 6000;
    this.swimSpeed = 0.001 + Math.random() * 0.003;
  }

  setUserTarget(x: number, y: number): void {
    this.userDirected = true;
    this.userDirectedTarget.set(
      Math.max(-this.swimRangeX * 0.9, Math.min(this.swimRangeX * 0.9, x)),
      Math.max(-this.swimRangeY * 0.9, Math.min(this.swimRangeY * 0.9, y)),
      this.whalePos.z,
    );
    console.log(`[whale:click] swim to (${this.userDirectedTarget.x.toFixed(2)}, ${this.userDirectedTarget.y.toFixed(2)})`);
  }

  replayEntrance(): void {
    this.enteringScene = true;
    this.entranceStartTime = 0;
    this.whalePos.set(-this.swimRangeX * 1.3, 0, 0);
    this.whaleVelocity.set(0, 0, 0);
    console.log('[whale] replaying entrance');
  }

  /** Returns desired direction from look vector */
  computeDesiredDirection(lookDx: number, lookDy: number, lookDz: number): Direction {
    const ax = Math.abs(lookDx);
    const ay = Math.abs(lookDy);
    const az = Math.abs(lookDz);

    if (ax < 0.1 && ay < 0.1 && az < 0.1) return this.activeDir;
    if (az > ax && az > ay) return 'forward';
    if (ax > ay) return lookDx > 0 ? 'right' : 'left';
    return lookDy > 0 ? 'up' : 'down';
  }

  switchDirection(newDir: Direction): void {
    if (newDir === this.activeDir || this.isReacting) return;
    console.log(`[whale:switch] ${this.activeDir} → ${newDir}`);
    this.activeDir = newDir;
  }

  /** Main update — call each frame. Updates position, velocity, rotation, direction. */
  update(modelGroup: THREE.Group, now: number): void {
    // Phase management
    if (this.enteringScene) {
      if (this.entranceStartTime === 0) {
        this.entranceStartTime = now;
        this.targetRotationY = Math.PI / 2;
        modelGroup.rotation.y = Math.PI / 2;
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
      this.whaleTarget.copy(this.userDirectedTarget);
      const distToClick = this.whalePos.distanceTo(this.userDirectedTarget);
      if (distToClick < 0.15) {
        this.userDirected = false;
        this.freeSwimTimer = now;
        this.pickFreeSwimWaypoint();
        console.log(`[whale:click] arrived at click target, resuming free-swim`);
      }
    } else {
      if (now - this.freeSwimTimer > this.freeSwimInterval) {
        this.freeSwimTimer = now;
        this.pickFreeSwimWaypoint();
        console.log(`[whale:freeswim] new waypoint: (${this.freeSwimTarget.x.toFixed(2)},${this.freeSwimTarget.y.toFixed(2)},${this.freeSwimTarget.z.toFixed(2)})`);
      }
      this.whaleTarget.copy(this.freeSwimTarget);
    }

    // Throttled debug log
    if (!this.enteringScene && now - this.lastDebugLog > this.DEBUG_LOG_INTERVAL * 4) {
      this.lastDebugLog = now;
      console.log(
        `[whale:${this.userDirected ? 'user' : 'freeswim'}] pos=(${this.whalePos.x.toFixed(2)},${this.whalePos.y.toFixed(2)},${this.whalePos.z.toFixed(2)})` +
        ` vel=(${this.whaleVelocity.x.toFixed(4)},${this.whaleVelocity.y.toFixed(4)},${this.whaleVelocity.z.toFixed(4)})` +
        ` dir=${this.activeDir} reacting=${this.isReacting}`
      );
    }

    // Movement toward waypoint
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

    // Organic wobble
    this.wobblePhase += 0.015;
    const wobbleAmount = 0.00002;
    const headingAngle = Math.atan2(this.whaleVelocity.x, this.whaleVelocity.z || 0.001);
    this.whalePos.x += this.whaleVelocity.x + Math.cos(headingAngle) * Math.sin(this.wobblePhase) * wobbleAmount;
    this.whalePos.y += this.whaleVelocity.y + Math.sin(this.wobblePhase * 0.7) * wobbleAmount * 0.5;
    this.whalePos.z += this.whaleVelocity.z + Math.sin(headingAngle) * Math.sin(this.wobblePhase) * wobbleAmount;

    // Soft boundary steering
    const BOUNDARY_START = 0.8;
    const STEER_STRENGTH = 0.0008;
    const steerAxis = (pos: number, range: number) => {
      const ratio = pos / range;
      if (Math.abs(ratio) > BOUNDARY_START) {
        const overshoot = (Math.abs(ratio) - BOUNDARY_START) / (1 - BOUNDARY_START);
        return -Math.sign(ratio) * overshoot * overshoot * STEER_STRENGTH;
      }
      return 0;
    };
    this.whaleVelocity.x += steerAxis(this.whalePos.x, this.swimRangeX);
    this.whaleVelocity.y += steerAxis(this.whalePos.y, this.swimRangeY);
    this.whaleVelocity.z += steerAxis(this.whalePos.z, this.swimRangeZ);

    // Pick new inward waypoint if near edge
    const nearEdge = Math.abs(this.whalePos.x) > this.swimRangeX * 0.9
      || Math.abs(this.whalePos.y) > this.swimRangeY * 0.9
      || Math.abs(this.whalePos.z) > this.swimRangeZ * 0.9;
    if (nearEdge && !this.userDirected && (now - this.freeSwimTimer > 2000)) {
      this.freeSwimTarget.set(
        (Math.random() - 0.5) * this.swimRangeX * 0.5,
        (Math.random() - 0.5) * this.swimRangeY * 0.3,
        (Math.random() - 0.5) * this.swimRangeZ * 0.5,
      );
      this.freeSwimTimer = now;
    }

    // Hard clamp
    const TANK_PAD = 1.05;
    this.whalePos.x = Math.max(-this.swimRangeX * TANK_PAD, Math.min(this.swimRangeX * TANK_PAD, this.whalePos.x));
    this.whalePos.y = Math.max(-this.swimRangeY * TANK_PAD, Math.min(this.swimRangeY * TANK_PAD, this.whalePos.y));
    this.whalePos.z = Math.max(-this.swimRangeZ * TANK_PAD, Math.min(this.swimRangeZ * TANK_PAD, this.whalePos.z));

    modelGroup.position.copy(this.whalePos);

    // Rotation
    const lookDx = this.whaleTarget.x - this.whalePos.x;
    const lookDy = this.whaleTarget.y - this.whalePos.y;
    const lookDz = this.whaleTarget.z - this.whalePos.z;
    const lookDistXZ = Math.sqrt(lookDx * lookDx + lookDz * lookDz);
    const lookDist3D = Math.sqrt(lookDx * lookDx + lookDy * lookDy + lookDz * lookDz);

    if (lookDist3D > 0.05) {
      this.targetRotationY = Math.atan2(lookDx, lookDz + 0.001);
      this.targetRotationX = -Math.atan2(lookDy, lookDistXZ + 0.1) * 0.6;
    }

    modelGroup.rotation.y += (this.targetRotationY - modelGroup.rotation.y) * this.TURN_LERP;
    modelGroup.rotation.x += (this.targetRotationX - modelGroup.rotation.x) * this.TURN_LERP;

    // Direction animation
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
}
