import * as THREE from 'three';
import { PARTICLE_COUNT, PARTICLE_DRIFT_Y, PARTICLE_SWAY_FREQ, PARTICLE_SWAY_AMP } from './whale-scene.constants';

/** Manages floating particles (plankton, dust, micro-bubbles) and the ocean floor */
export class WhaleParticles {
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private points: THREE.Points | null = null;
  private positions: THREE.BufferAttribute | null = null;
  private speeds: Float32Array | null = null;
  private phases: Float32Array | null = null;

  private floorMesh: THREE.Mesh | null = null;
  floorMaterial: THREE.ShaderMaterial | null = null;

  constructor(
    private scene: THREE.Scene,
    private swimRangeX: number,
    private swimRangeY: number,
    private swimRangeZ: number,
  ) {}

  initParticles(): void {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    this.speeds = new Float32Array(PARTICLE_COUNT);
    this.phases = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * this.swimRangeX * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * this.swimRangeY * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.swimRangeZ * 2;
      this.speeds[i] = 0.5 + Math.random();
      this.phases[i] = Math.random() * Math.PI * 2;
    }

    this.geometry = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    this.geometry.setAttribute('position', posAttr);
    this.positions = posAttr;

    // Soft circular sprite (generated procedurally)
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    const particleTexture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 0.04,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: particleTexture,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  initOceanFloor(): void {
    const planeW = this.swimRangeX * 4.0;
    const planeD = this.swimRangeZ * 4.0;
    const geo = new THREE.PlaneGeometry(planeW, planeD);

    this.floorMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        sandColor: { value: new THREE.Color(0x0e1a1f) },
        causticColor: { value: new THREE.Color(0x44bbcc) },
        causticStrength: { value: 0.25 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 sandColor;
        uniform vec3 causticColor;
        uniform float causticStrength;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float valueNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        float sandNoise(vec2 p) {
          float v = 0.0;
          v += valueNoise(p * 1.0) * 0.5;
          v += valueNoise(p * 2.0) * 0.25;
          v += valueNoise(p * 4.0) * 0.125;
          v += valueNoise(p * 8.0) * 0.0625;
          return v;
        }

        void main() {
          vec2 centered = vUv * 2.0 - 1.0;
          float radial = length(centered * vec2(1.0, 0.7));
          float edgeDist = 1.0 - smoothstep(0.3, 0.9, radial);

          float grain = (sandNoise(vUv * 400.0) - 0.5) * 0.06;

          vec2 p = vUv * 8.0;
          float c = 0.0;
          c += pow(0.5 + 0.5 * sin(p.x * 3.0 + p.y * 1.5 + time * 0.8), 8.0);
          c += pow(0.5 + 0.5 * sin(p.x * 1.7 - p.y * 2.3 + time * 0.6), 8.0);
          c += pow(0.5 + 0.5 * sin(p.x * 2.1 + p.y * 3.1 - time * 0.7), 8.0);
          c /= 3.0;

          vec3 base = sandColor + grain;
          vec3 lit = base + causticColor * c * causticStrength;
          gl_FragColor = vec4(lit, edgeDist);
        }
      `,
      transparent: true,
      depthWrite: true,
      side: THREE.FrontSide,
    });

    this.floorMesh = new THREE.Mesh(geo, this.floorMaterial);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = -this.swimRangeY;
    this.scene.add(this.floorMesh);
  }

  update(delta: number, elapsed: number): void {
    if (!this.positions || !this.speeds || !this.phases) return;
    const positions = this.positions.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const speed = this.speeds[i];
      const phase = this.phases[i];

      positions[i3 + 1] += PARTICLE_DRIFT_Y * speed * delta;
      positions[i3]     += Math.sin(phase + elapsed * PARTICLE_SWAY_FREQ) * PARTICLE_SWAY_AMP * delta;
      positions[i3 + 2] += Math.cos(phase * 0.7 + elapsed * PARTICLE_SWAY_FREQ * 0.6) * PARTICLE_SWAY_AMP * 0.3 * delta;

      if (positions[i3 + 1] > this.swimRangeY) positions[i3 + 1] = -this.swimRangeY;
      if (positions[i3] > this.swimRangeX) positions[i3] = -this.swimRangeX;
      else if (positions[i3] < -this.swimRangeX) positions[i3] = this.swimRangeX;
      if (positions[i3 + 2] > this.swimRangeZ) positions[i3 + 2] = -this.swimRangeZ;
      else if (positions[i3 + 2] < -this.swimRangeZ) positions[i3 + 2] = this.swimRangeZ;
    }

    this.positions.needsUpdate = true;

    if (this.floorMaterial) this.floorMaterial.uniforms['time'].value = elapsed;
  }

  dispose(): void {
    this.geometry?.dispose();
    this.material?.map?.dispose();
    this.material?.dispose();
    if (this.points) this.points.removeFromParent();
    this.floorMaterial?.dispose();
    if (this.floorMesh) {
      this.floorMesh.geometry.dispose();
      this.floorMesh.removeFromParent();
    }
  }
}
