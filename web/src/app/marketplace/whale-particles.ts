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

  private floorGroup: THREE.Group | null = null;
  private floorMesh: THREE.Mesh | null = null;
  floorMaterial: THREE.MeshStandardMaterial | null = null;
  floorCausticUniforms: { uTime: { value: number }; uCausticColor: { value: THREE.Color }; uCausticStrength: { value: number }; uEdgeFadeStart: { value: number } } | null = null;
  private mountainGroups: THREE.Group[] = [];
  private propsGroup: THREE.Group | null = null;


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

  initOceanFloor(gltfLoader: import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader): void {
    // Caustic uniforms for animated Voronoi light refraction
    this.floorCausticUniforms = {
      uTime: { value: 0 },
      uCausticColor: { value: new THREE.Color(0x44bbcc) },
      uCausticStrength: { value: 0.7 },
      uEdgeFadeStart: { value: 0.55 },
    };
    const causticUniforms = this.floorCausticUniforms;

    const causticGlsl = /* glsl */ `
uniform float uTime;
uniform vec3 uCausticColor;
uniform float uCausticStrength;
uniform float uEdgeFadeStart;

vec2 _caustHash(vec2 p) {
  return fract(sin(vec2(
    dot(p, vec2(127.1, 311.7)),
    dot(p, vec2(269.5, 183.3))
  )) * 43758.5453);
}

float _voronoi(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float md = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = _caustHash(n + g);
      o = 0.5 + 0.5 * sin(uTime * 0.6 + 6.2831 * o);
      vec2 r = g + o - f;
      float d = dot(r, r);
      md = min(md, d);
    }
  }
  return md;
}

float _caustics(vec2 uv) {
  float c1 = _voronoi(uv * 6.0 + vec2(uTime * 0.15, uTime * 0.08));
  float c2 = _voronoi(uv * 12.0 - vec2(uTime * 0.1, uTime * 0.12));
  return pow(1.0 - c1, 3.0) * 0.6 + pow(1.0 - c2, 3.0) * 0.4;
}
`;

    gltfLoader.load('assets/models/sand_dunes.glb', (gltf) => {
      const floorGroup = gltf.scene;
      this.floorGroup = floorGroup;

      // Scale floor to cover the full swim volume (deep Z corridor)
      const bbox = new THREE.Box3().setFromObject(floorGroup);
      const modelWidth = bbox.max.x - bbox.min.x;
      const modelDepth = bbox.max.z - bbox.min.z;
      const sx = (this.swimRangeX * 8.0) / modelWidth;
      const sz = (this.swimRangeZ * 8.0) / modelDepth;
      const sy = sx * 0.3; // flatten dunes for gentle seabed look
      floorGroup.scale.set(sx, sy, sz);
      floorGroup.position.y = -this.swimRangeY * 1.5;

      // Inject caustics onto every mesh material
      floorGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.receiveShadow = true;
          this.floorMesh = mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          this.floorMaterial = mat;

          // Darken for underwater look
          mat.color.multiplyScalar(0.3);
          mat.transparent = true;

          mat.customProgramCacheKey = () => 'ocean-floor-caustics';
          mat.onBeforeCompile = (shader) => {
            shader.uniforms['uTime'] = causticUniforms.uTime;
            shader.uniforms['uCausticColor'] = causticUniforms.uCausticColor;
            shader.uniforms['uCausticStrength'] = causticUniforms.uCausticStrength;
            shader.uniforms['uEdgeFadeStart'] = causticUniforms.uEdgeFadeStart;
            (shader.defines ??= {})['USE_UV'] = '';

            shader.fragmentShader = causticGlsl + shader.fragmentShader;

            // Caustics on emissive
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              /* glsl */ `#include <emissivemap_fragment>
              float caustVal = _caustics(vUv);
              totalEmissiveRadiance += uCausticColor * caustVal * uCausticStrength;
              `,
            );

            // Edge alpha fadeout — floor dissolves into fog at edges
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <dithering_fragment>',
              /* glsl */ `#include <dithering_fragment>
              vec2 edgeDist = abs(vUv - 0.5) * 2.0; // 0 at center, 1 at edge
              float edgeMax = max(edgeDist.x, edgeDist.y);
              float edgeFade = 1.0 - smoothstep(uEdgeFadeStart, 1.0, edgeMax);
              gl_FragColor.a *= edgeFade;
              `,
            );
          };
        }
      });

      this.scene.add(floorGroup);
    });
  }

  initMountainRange(gltfLoader: import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader): void {
    // 3 peaks: left (tall), center (tallest), right (medium) — like a mountain ridge silhouette
    const peaks: { model: string; x: number; y: number; z: number; scale: number; rotY: number; brightness: number }[] = [
      { model: 'snowy_mountain.glb',   x: -this.swimRangeX * 2.5, y: -this.swimRangeY * 2.0, z: -this.swimRangeZ * 3.0, scale: 16, rotY: 0.3,  brightness: 0.10 },
      { model: 'mountain_distant.glb', x:  0,                     y: -this.swimRangeY * 1.8, z: -this.swimRangeZ * 3.5, scale: 20, rotY: 0,     brightness: 0.08 },
      { model: 'snowy_mountain.glb',   x:  this.swimRangeX * 2.8, y: -this.swimRangeY * 2.2, z: -this.swimRangeZ * 2.8, scale: 12, rotY: -0.4, brightness: 0.12 },
    ];

    for (const peak of peaks) {
      gltfLoader.load(`assets/models/${peak.model}`, (gltf) => {
        const group = gltf.scene;
        this.mountainGroups.push(group);

        const bbox = new THREE.Box3().setFromObject(group);
        const modelWidth = bbox.max.x - bbox.min.x;
        const s = (this.swimRangeX * peak.scale) / modelWidth;
        group.scale.set(s, s, s);
        group.position.set(peak.x, peak.y, peak.z);
        group.rotation.y = peak.rotY;

        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.receiveShadow = true;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat.color) mat.color.multiplyScalar(peak.brightness);
            mat.roughness = 1.0;
            mat.metalness = 0.0;
          }
        });

        this.scene.add(group);
      });
    }
  }

  initFloorProps(gltfLoader: import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader): void {
    gltfLoader.load('assets/models/minas_tirith.glb', (gltf) => {
      const group = gltf.scene;
      this.propsGroup = group;

      // Scale as a sunken city ruin on the ocean floor
      const bbox = new THREE.Box3().setFromObject(group);
      const modelHeight = bbox.max.y - bbox.min.y;
      const targetHeight = this.swimRangeY * 2.5;
      const s = targetHeight / modelHeight;
      group.scale.set(s, s, s);

      // Sit on the sand floor, offset right
      const scaledMinY = bbox.min.y * s;
      group.position.set(
        this.swimRangeX * 0.7,
        -this.swimRangeY * 1.5 - scaledMinY,
        -this.swimRangeZ * 0.3,
      );

      // Keep original photogrammetry textures — fog handles the underwater look
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      this.scene.add(group);
    });
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

    if (this.floorCausticUniforms) this.floorCausticUniforms.uTime.value = elapsed;
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
    if (this.floorGroup) {
      this.floorGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      this.floorGroup.removeFromParent();
    }
    if (this.propsGroup) {
      this.propsGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      this.propsGroup.removeFromParent();
    }
    for (const mg of this.mountainGroups) {
      mg.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      mg.removeFromParent();
    }
  }
}
