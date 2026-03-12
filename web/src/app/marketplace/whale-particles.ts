import * as THREE from 'three';
import { PARTICLE_COUNT, PARTICLE_DRIFT_Y, PARTICLE_SWAY_FREQ, PARTICLE_SWAY_AMP, CURRENT_ANGLE_DEG, CURRENT_STRENGTH } from './whale-scene.constants';

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
  private castleMeshes: THREE.Mesh[] = [];
  private haloSprite: THREE.Mesh | null = null;
  private haloOpacity = { value: 0.8 };
  private castleSpotLight: THREE.SpotLight | null = null;
  private castleCenter = new THREE.Vector3();
  private orbGroup: THREE.Group | null = null;
  private orbData: { mesh: THREE.Mesh; radius: number; speed: number; yOffset: number; phase: number }[] = [];
  currentAngle = CURRENT_ANGLE_DEG;      // degrees — live animated value
  currentStrength = CURRENT_STRENGTH;    // world units/sec — live animated value
  currentAutoAnimate = true;             // set false for manual tuning override

  // Dynamic current state machine
  private currentTargetAngle = CURRENT_ANGLE_DEG;
  private currentTargetStrength = CURRENT_STRENGTH;
  private currentLerpSpeed = 0.3;        // how fast we lerp toward target (per sec)
  private surgeTimer = 0;                // countdown to next surge
  private surgeRemaining = 0;            // seconds left in active surge
  private nextSurgeIn = 60 + Math.random() * 120; // first surge in 60–180s

  private floraUniforms: { uTime: { value: number }; uCurrentDirX: { value: number }; uCurrentDirZ: { value: number }; uCurrentStrength: { value: number } } | null = null;
  private floraMeshes: THREE.InstancedMesh[] = [];
  private rockMeshes: THREE.InstancedMesh[] = [];
  private bubbleMesh: THREE.InstancedMesh | null = null;
  private bubbleUniforms: { uTime: { value: number } } | null = null;
  private fishGroup: THREE.Group | null = null;
  private fishMixer: THREE.AnimationMixer | null = null;
  private fishBasePos = new THREE.Vector3();
  private koiGroup: THREE.Group | null = null;
  private koiMixer: THREE.AnimationMixer | null = null;
  private koiPrevPos = new THREE.Vector3();

  // Light pillar effect
  private pillarMesh: THREE.Mesh | null = null;
  private pillarUniforms: { uTime: { value: number } } | null = null;

  // Spiritual motes (fully GPU-driven)
  private motesPoints: THREE.Points | null = null;
  private motesUniforms: { uTime: { value: number } } | null = null;

  // Marine snow (GPU-driven falling particles)
  private marineSnowPoints: THREE.Points | null = null;
  private marineSnowUniforms: { uTime: { value: number } } | null = null;

  private disabledSystems = new Set<string>();

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
      { model: 'snowy_mountain.glb',   x: -this.swimRangeX * 2.5, y: -this.swimRangeY * 2.0, z: -this.swimRangeZ * 2.4, scale: 16, rotY: 0.3,  brightness: 0.28 },
      { model: 'mountain_distant.glb', x:  0,                     y: -this.swimRangeY * 1.8, z: -this.swimRangeZ * 2.8, scale: 20, rotY: 0,     brightness: 0.22 },
      { model: 'snowy_mountain.glb',   x:  this.swimRangeX * 2.8, y: -this.swimRangeY * 2.2, z: -this.swimRangeZ * 2.2, scale: 12, rotY: -0.4, brightness: 0.32 },
    ];

    const applyPeak = (group: THREE.Group, peak: typeof peaks[0]) => {
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
          // Clone material so brightness tint doesn't bleed between instances
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mesh.material = mat;
          if (mat.color) mat.color.multiplyScalar(peak.brightness);
          mat.roughness = 1.0;
          mat.metalness = 0.0;
        }
      });

      this.scene.add(group);
    };

    // Load snowy_mountain.glb once, clone for second instance
    // Clone BEFORE applyPeak — clone shares original materials; applyPeak
    // replaces them with cloned instances, so brightness tints stay independent.
    gltfLoader.load('assets/models/snowy_mountain.glb', (gltf) => {
      const secondPeak = gltf.scene.clone();
      applyPeak(gltf.scene, peaks[0]);
      applyPeak(secondPeak, peaks[2]);
    });

    // mountain_distant.glb is unique — load normally
    gltfLoader.load('assets/models/mountain_distant.glb', (gltf) => {
      applyPeak(gltf.scene, peaks[1]);
    });
  }

  initFloorProps(
    gltfLoader: import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader,
    addBloomMesh?: (mesh: THREE.Mesh) => void,
  ): void {
    gltfLoader.load('assets/models/buddha_statue.glb', (gltf) => {
      if (this.disabledSystems.has('props')) return;
      const group = gltf.scene;
      this.propsGroup = group;

      // Scale as a sunken statue on the ocean floor
      const bbox = new THREE.Box3().setFromObject(group);
      const modelHeight = bbox.max.y - bbox.min.y;
      const targetHeight = this.swimRangeY * 2.0;
      const s = targetHeight / modelHeight;
      group.scale.set(s, s, s);

      // Sit on the sand floor, offset right
      const scaledMinY = bbox.min.y * s;
      const px = this.swimRangeX * 0.7;
      const py = -this.swimRangeY * 1.8 - scaledMinY;
      const pz = -this.swimRangeZ * 0.3;
      group.position.set(px, py, pz);
      group.rotation.y = -Math.PI / 4; // 45° clockwise

      this.castleCenter.set(px, py + targetHeight * 0.5, pz);

      // Keep original unlit material untouched — just register for bloom and shadows
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.castleMeshes.push(mesh);
          if (addBloomMesh) addBloomMesh(mesh);
        }
      });

      // Billboard sprite halo — large radial gradient behind the statue
      const haloSize = targetHeight * 2.5;
      const haloCanvas = document.createElement('canvas');
      haloCanvas.width = 256;
      haloCanvas.height = 256;
      const hCtx = haloCanvas.getContext('2d')!;
      const grad = hCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, 'rgba(100,180,255,1.0)');
      grad.addColorStop(0.25, 'rgba(68,136,255,0.8)');
      grad.addColorStop(0.5, 'rgba(40,100,220,0.4)');
      grad.addColorStop(0.8, 'rgba(20,60,160,0.1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      hCtx.fillStyle = grad;
      hCtx.fillRect(0, 0, 256, 256);
      const haloTexture = new THREE.CanvasTexture(haloCanvas);

      const haloGeo = new THREE.PlaneGeometry(haloSize, haloSize);
      const haloMat = new THREE.ShaderMaterial({
        uniforms: {
          uTex: { value: haloTexture },
          uOpacity: this.haloOpacity,
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            // Billboard: always face camera
            vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
            vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
            vec3 center = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
            vec3 worldPos = center + camRight * position.x + camUp * position.y;
            gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uTex;
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            vec4 texColor = texture2D(uTex, vUv);
            gl_FragColor = vec4(texColor.rgb * 2.0, texColor.a * uOpacity);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.set(px, py + targetHeight * 0.5, pz);
      this.scene.add(haloMesh);
      this.haloSprite = haloMesh;

      // Mystical cyan-blue point light to illuminate the surroundings
      const light = new THREE.PointLight(0x4488ff, 100, targetHeight * 4, 1.0);
      light.position.set(px, py + targetHeight * 0.7, pz + targetHeight * 0.3);
      this.scene.add(light);

      // Divine spotlight beam from above
      const spotTarget = new THREE.Object3D();
      spotTarget.position.set(px, py + targetHeight * 0.3, pz);
      this.scene.add(spotTarget);

      const spotLight = new THREE.SpotLight(0x00ddff, 140);
      spotLight.position.set(px, py + targetHeight * 2, pz);
      spotLight.target = spotTarget;
      spotLight.angle = 0.4;
      spotLight.penumbra = 0.9;
      spotLight.distance = targetHeight * 5;
      spotLight.decay = 1.5;
      this.scene.add(spotLight);
      this.castleSpotLight = spotLight;

      // Floating light orbs
      const orbGroup = new THREE.Group();
      const orbCount = 8;
      for (let i = 0; i < orbCount; i++) {
        const geo = new THREE.SphereGeometry(0.1, 8, 8);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x000000,
          emissive: new THREE.Color(0x00ffaa),
          emissiveIntensity: 2.5,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
        });
        const orb = new THREE.Mesh(geo, mat);
        orbGroup.add(orb);
        if (addBloomMesh) addBloomMesh(orb);

        this.orbData.push({
          mesh: orb,
          radius: (0.15 + Math.random() * 0.25) * targetHeight,
          speed: 0.2 + Math.random() * 0.4,
          yOffset: (-0.15 + Math.random() * 0.5) * targetHeight,
          phase: Math.random() * Math.PI * 2,
        });
      }
      this.scene.add(orbGroup);
      this.orbGroup = orbGroup;

      // ── Light Pillar: dust-in-sunbeam particles in a cone above statue ─
      {
        const moteCount = 80;
        const coneHeight = targetHeight * 3.5;
        const coneTopR = targetHeight * 0.7;
        const coneBotR = targetHeight * 0.1;
        this.pillarUniforms = { uTime: { value: 0 } };

        const positions = new Float32Array(moteCount * 3);
        const speeds = new Float32Array(moteCount);
        const phases = new Float32Array(moteCount);

        for (let i = 0; i < moteCount; i++) {
          // Random height along cone, biased toward top
          const t = Math.random(); // 0 = bottom (statue head), 1 = top
          const r = coneBotR + (coneTopR - coneBotR) * t;
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.sqrt(Math.random()) * r;
          positions[i * 3]     = px + Math.cos(angle) * dist;
          positions[i * 3 + 1] = py + targetHeight + t * coneHeight;
          positions[i * 3 + 2] = pz + Math.sin(angle) * dist;
          speeds[i] = 0.05 + Math.random() * 0.1; // slow downward drift
          phases[i] = Math.random() * Math.PI * 2;
        }

        const geo = new THREE.BufferGeometry();
        const posAttr = new THREE.BufferAttribute(positions, 3);
        geo.setAttribute('position', posAttr);
        geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

        const mat = new THREE.ShaderMaterial({
          uniforms: this.pillarUniforms,
          vertexShader: /* glsl */ `
            uniform float uTime;
            attribute float aPhase;
            varying float vAlpha;
            void main() {
              // Pulsing brightness per particle
              vAlpha = 0.4 + 0.6 * sin(uTime * 1.5 + aPhase);
              vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = (3.0 + 2.0 * sin(uTime * 1.2 + aPhase)) * (250.0 / -mvPos.z);
              gl_Position = projectionMatrix * mvPos;
            }
          `,
          fragmentShader: /* glsl */ `
            varying float vAlpha;
            void main() {
              float d = length(gl_PointCoord - vec2(0.5));
              if (d > 0.5) discard;
              float soft = 1.0 - smoothstep(0.1, 0.5, d);
              gl_FragColor = vec4(0.6, 0.9, 1.0, soft * vAlpha * 0.5);
            }
          `,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        });

        const points = new THREE.Points(geo, mat);
        points.frustumCulled = false;
        this.pillarMesh = points as unknown as THREE.Mesh;
        // Store refs for CPU animation
        (this as any)._pillarPositions = posAttr;
        (this as any)._pillarSpeeds = speeds;
        (this as any)._pillarPhases = phases;
        (this as any)._pillarConeH = coneHeight;
        (this as any)._pillarConeTopR = coneTopR;
        (this as any)._pillarConeBotR = coneBotR;
        (this as any)._pillarBaseY = py + targetHeight;
        (this as any)._pillarPx = px;
        (this as any)._pillarPz = pz;
        this.scene.add(points);
      }

      // ── Spiritual Motes: GPU-driven particles in cylinder around statue ─
      {
        const moteCount = 150;
        const cylR = targetHeight * 1.5;
        const cylH = targetHeight * 0.4;
        const floorY = -this.swimRangeY * 1.5;
        const cx = px;
        const cy = floorY + cylH * 0.5;
        const cz = pz;
        this.motesUniforms = { uTime: { value: 0 } };

        // Per-particle attributes: base position, speed, phase, radius offset
        const aBasePos = new Float32Array(moteCount * 3);
        const aSpeed = new Float32Array(moteCount);
        const aPhase = new Float32Array(moteCount);

        for (let i = 0; i < moteCount; i++) {
          // Uniform disk distribution
          const r = Math.sqrt(Math.random()) * cylR;
          const theta = Math.random() * Math.PI * 2;
          aBasePos[i * 3]     = cx + Math.cos(theta) * r;
          aBasePos[i * 3 + 1] = Math.random() * cylH; // 0..cylH, will be wrapped via mod()
          aBasePos[i * 3 + 2] = cz + Math.sin(theta) * r;
          aSpeed[i] = 0.08 + Math.random() * 0.15;
          aPhase[i] = Math.random() * Math.PI * 2;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(aBasePos, 3));
        geo.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
        geo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));

        const mat = new THREE.ShaderMaterial({
          uniforms: {
            uTime: this.motesUniforms.uTime,
            uCylH: { value: cylH },
            uCenterY: { value: cy - cylH * 0.5 },
          },
          vertexShader: /* glsl */ `
            uniform float uTime;
            uniform float uCylH;
            uniform float uCenterY;
            attribute float aSpeed;
            attribute float aPhase;
            varying float vAlpha;
            void main() {
              // Wrap Y upward via mod — seamless recycling
              float y = mod(position.y + uTime * aSpeed, uCylH) + uCenterY;
              // Gentle XZ sway
              float swayX = sin(uTime * 0.4 + aPhase) * 0.08;
              float swayZ = cos(uTime * 0.35 + aPhase) * 0.08;
              vec3 pos = vec3(position.x + swayX, y, position.z + swayZ);

              vAlpha = 0.4 + 0.6 * sin(uTime * 1.8 + aPhase);
              vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = (3.0 + 2.0 * sin(uTime * 1.5 + aPhase)) * (200.0 / -mvPos.z);
              gl_Position = projectionMatrix * mvPos;
            }
          `,
          fragmentShader: /* glsl */ `
            varying float vAlpha;
            void main() {
              float d = length(gl_PointCoord - vec2(0.5));
              if (d > 0.5) discard;
              float soft = 1.0 - smoothstep(0.15, 0.5, d);
              gl_FragColor = vec4(0.3, 0.9, 0.7, soft * vAlpha * 0.5);
            }
          `,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        });

        const motes = new THREE.Points(geo, mat);
        motes.frustumCulled = false;
        this.motesPoints = motes;
        this.scene.add(motes);
      }

      // ── Marine Snow: GPU-driven falling particles across full scene ──
      {
        const snowCount = 250;
        const spreadX = this.swimRangeX * 2;
        const spreadZ = this.swimRangeZ * 2;
        const topY = this.swimRangeY * 1.2;
        const floorY = -this.swimRangeY * 1.5;
        const fallH = topY - floorY;

        this.marineSnowUniforms = { uTime: { value: 0 } };

        const aBasePos = new Float32Array(snowCount * 3);
        const aSpeed = new Float32Array(snowCount);
        const aPhase = new Float32Array(snowCount);

        for (let i = 0; i < snowCount; i++) {
          aBasePos[i * 3]     = (Math.random() - 0.5) * spreadX;
          aBasePos[i * 3 + 1] = Math.random() * fallH; // 0..fallH, wrapped via mod()
          aBasePos[i * 3 + 2] = (Math.random() - 0.5) * spreadZ;
          aSpeed[i] = 0.02 + Math.random() * 0.04;
          aPhase[i] = Math.random() * Math.PI * 2;
        }

        const snowGeo = new THREE.BufferGeometry();
        snowGeo.setAttribute('position', new THREE.BufferAttribute(aBasePos, 3));
        snowGeo.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
        snowGeo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));

        const snowMat = new THREE.ShaderMaterial({
          uniforms: {
            uTime: this.marineSnowUniforms.uTime,
            uFallH: { value: fallH },
            uTopY: { value: topY },
          },
          vertexShader: /* glsl */ `
            uniform float uTime;
            uniform float uFallH;
            uniform float uTopY;
            attribute float aSpeed;
            attribute float aPhase;
            varying float vAlpha;
            void main() {
              // Wrap Y downward via mod — seamless recycling from top
              float y = uTopY - mod(position.y + uTime * aSpeed, uFallH);
              // Gentle lateral drift
              float driftX = sin(uTime * 0.3 + aPhase) * 0.15;
              float driftZ = cos(uTime * 0.25 + aPhase * 1.3) * 0.12;
              vec3 pos = vec3(position.x + driftX, y, position.z + driftZ);

              // Fade near top and bottom edges
              float normY = (y - (uTopY - uFallH)) / uFallH;
              vAlpha = smoothstep(0.0, 0.08, normY) * smoothstep(1.0, 0.92, normY);
              // Subtle twinkle
              vAlpha *= 0.5 + 0.5 * sin(uTime * 2.5 + aPhase);

              vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = (2.0 + 1.5 * sin(uTime * 1.2 + aPhase)) * (200.0 / -mvPos.z);
              gl_Position = projectionMatrix * mvPos;
            }
          `,
          fragmentShader: /* glsl */ `
            varying float vAlpha;
            void main() {
              float d = length(gl_PointCoord - vec2(0.5));
              if (d > 0.5) discard;
              float soft = 1.0 - smoothstep(0.2, 0.5, d);
              // White-ish with slight blue tint for underwater feel
              gl_FragColor = vec4(0.75, 0.85, 0.95, soft * vAlpha * 0.25);
            }
          `,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        });

        const snow = new THREE.Points(snowGeo, snowMat);
        snow.frustumCulled = false;
        this.marineSnowPoints = snow;
        this.scene.add(snow);
      }

      this.scene.add(group);
    });
  }

  // ── Sea Flora (instanced billboard quads) ─────────────────────────
  initSeaFlora(): void {
    const floorY = -this.swimRangeY * 1.5;

    // Shared uniforms
    this.floraUniforms = {
      uTime: { value: 0 },
      uCurrentDirX: { value: Math.cos(this.currentAngle * Math.PI / 180) },
      uCurrentDirZ: { value: Math.sin(this.currentAngle * Math.PI / 180) },
      uCurrentStrength: { value: this.currentStrength * 1.25 },
    };

    const vertexShader = /* glsl */ `
      uniform float uTime;
      uniform float uCurrentDirX;
      uniform float uCurrentDirZ;
      uniform float uCurrentStrength;
      attribute float aPhase;
      varying vec2 vUv;
      varying float vFogDepth;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        float swayFactor = pow(uv.y, 1.5);

        // Constant lean in current direction (tips lean most, roots fixed)
        float currentLean = uCurrentDirX * uCurrentStrength * swayFactor;

        // Asymmetric oscillation — downstream swing larger than upstream
        float rawSin = sin(uTime * 1.2 + aPhase);
        float asymmetry = 0.4 * uCurrentStrength;
        float sway = rawSin * 0.08 * (1.0 + asymmetry * sign(rawSin)) * swayFactor;

        mvPos.x += currentLean + sway;
        vFogDepth = -mvPos.z;
        gl_Position = projectionMatrix * mvPos;
      }
    `;

    const fragmentShader = /* glsl */ `
      uniform sampler2D uTex;
      varying vec2 vUv;
      varying float vFogDepth;
      void main() {
        vec4 texColor = texture2D(uTex, vUv);
        if (texColor.a < 0.1) discard;
        // Manual FogExp2 matching scene fog (color: 0x061a28, density: 0.025)
        float fogDensity = 0.025;
        float fogFactor = exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
        fogFactor = clamp(fogFactor, 0.0, 1.0);
        vec3 fogColor = vec3(0.024, 0.102, 0.157);
        vec3 finalColor = mix(fogColor, texColor.rgb, fogFactor);
        gl_FragColor = vec4(finalColor, texColor.a);
      }
    `;

    // Plant type definitions
    const plantTypes: {
      name: string;
      w: number; h: number;
      instances: number;
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
    }[] = [
      {
        name: 'seaweed', w: 128, h: 256, instances: 12,
        draw: (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          for (let b = 0; b < 3; b++) {
            ctx.beginPath();
            const bx = w * 0.2 + b * w * 0.25;
            ctx.moveTo(bx, h);
            const cp1x = bx + (Math.random() - 0.5) * w * 0.6;
            const cp1y = h * 0.65;
            const cp2x = bx + (Math.random() - 0.5) * w * 0.5;
            const cp2y = h * 0.3;
            const topX = bx + (Math.random() - 0.5) * w * 0.3;
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, topX, h * 0.05);
            ctx.lineWidth = 6 + Math.random() * 4;
            const grad = ctx.createLinearGradient(0, h, 0, 0);
            grad.addColorStop(0, '#1a5a30');
            grad.addColorStop(1, '#3aaa60');
            ctx.strokeStyle = grad;
            ctx.stroke();
          }
        },
      },
      {
        name: 'coralFan', w: 256, h: 256, instances: 10,
        draw: (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          const drawBranch = (x: number, y: number, angle: number, len: number, depth: number) => {
            if (depth <= 0 || len < 4) return;
            const ex = x + Math.cos(angle) * len;
            const ey = y - Math.sin(angle) * len;
            const t = 1 - depth / 5;
            const grad = ctx.createLinearGradient(x, y, ex, ey);
            grad.addColorStop(0, '#8b2500');
            grad.addColorStop(1, '#ff6040');
            ctx.strokeStyle = grad;
            ctx.lineWidth = depth * 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            drawBranch(ex, ey, angle + 0.4 + Math.random() * 0.3, len * 0.68, depth - 1);
            drawBranch(ex, ey, angle - 0.4 - Math.random() * 0.3, len * 0.68, depth - 1);
          };
          drawBranch(w * 0.5, h * 0.95, Math.PI / 2, h * 0.25, 5);
        },
      },
      {
        name: 'kelpBlade', w: 128, h: 256, instances: 12,
        draw: (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          // Wide ribbon
          const grad = ctx.createLinearGradient(0, h, 0, 0);
          grad.addColorStop(0, '#3a5a10');
          grad.addColorStop(1, '#6a9a20');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(w * 0.25, h);
          ctx.quadraticCurveTo(w * 0.1, h * 0.5, w * 0.35, h * 0.05);
          ctx.lineTo(w * 0.65, h * 0.05);
          ctx.quadraticCurveTo(w * 0.9, h * 0.5, w * 0.75, h);
          ctx.closePath();
          ctx.fill();
          // Central vein
          ctx.strokeStyle = '#2a4a08';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(w * 0.5, h * 0.95);
          ctx.quadraticCurveTo(w * 0.48, h * 0.5, w * 0.5, h * 0.08);
          ctx.stroke();
        },
      },
      {
        name: 'seaGrass', w: 256, h: 192, instances: 15,
        draw: (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          const bladeCount = 5 + Math.floor(Math.random() * 3);
          for (let i = 0; i < bladeCount; i++) {
            const bx = w * 0.15 + (i / (bladeCount - 1)) * w * 0.7;
            const tipX = bx + (Math.random() - 0.5) * w * 0.2;
            const tipY = h * 0.05 + Math.random() * h * 0.15;
            const grad = ctx.createLinearGradient(0, h, 0, 0);
            grad.addColorStop(0, '#4a7a10');
            grad.addColorStop(1, '#9abb30');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2 + Math.random() * 2;
            ctx.beginPath();
            ctx.moveTo(bx, h);
            ctx.quadraticCurveTo(bx + (Math.random() - 0.5) * 20, h * 0.5, tipX, tipY);
            ctx.stroke();
          }
        },
      },
    ];

    // Castle exclusion zone
    const castleX = this.swimRangeX * 0.7;
    const castleZ = -this.swimRangeZ * 0.3;
    const exclusionR = this.swimRangeX * 0.5;

    for (const plant of plantTypes) {
      // Create canvas texture
      const canvas = document.createElement('canvas');
      canvas.width = plant.w;
      canvas.height = plant.h;
      const ctx = canvas.getContext('2d')!;
      plant.draw(ctx, plant.w, plant.h);
      const texture = new THREE.CanvasTexture(canvas);
      texture.premultiplyAlpha = false;

      // ShaderMaterial
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: this.floraUniforms.uTime,
          uCurrentDirX: this.floraUniforms.uCurrentDirX,
          uCurrentDirZ: this.floraUniforms.uCurrentDirZ,
          uCurrentStrength: this.floraUniforms.uCurrentStrength,
          uTex: { value: texture },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      // PlaneGeometry — scale to scene size and shift origin to bottom edge
      const aspect = plant.w / plant.h;
      const planeH = this.swimRangeY * 0.8; // ~2.4 units tall at full scale
      const planeW = planeH * aspect;
      const geo = new THREE.PlaneGeometry(planeW, planeH);
      // Shift geometry up so bottom edge is at y=0 (sits on floor)
      geo.translate(0, planeH / 2, 0);

      const mesh = new THREE.InstancedMesh(geo, mat, plant.instances);
      mesh.renderOrder = 1;

      // Per-instance phase attribute
      const phases = new Float32Array(plant.instances);
      const dummy = new THREE.Object3D();

      for (let i = 0; i < plant.instances; i++) {
        // Rejection sampling to avoid castle
        let px: number, pz: number;
        let attempts = 0;
        do {
          px = (Math.random() * 2 - 1) * this.swimRangeX * 2.0;
          pz = -this.swimRangeZ * 1.5 + Math.random() * this.swimRangeZ * 2.0;
          attempts++;
        } while (
          attempts < 50 &&
          Math.sqrt((px - castleX) ** 2 + (pz - castleZ) ** 2) < exclusionR
        );

        const scale = 0.5 + Math.random() * 0.5;
        dummy.position.set(px, floorY, pz);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        phases[i] = Math.random() * Math.PI * 2;
      }

      geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
      mesh.instanceMatrix.needsUpdate = true;

      this.scene.add(mesh);
      this.floraMeshes.push(mesh);
    }
  }

  initRocks(): void {
    const floorY = -this.swimRangeY * 1.5;
    const castleX = this.swimRangeX * 0.7;
    const castleZ = -this.swimRangeZ * 0.3;
    const exclusionR = this.swimRangeX * 0.5;

    const variants: { geoFn: () => THREE.BufferGeometry; instances: number; color: number }[] = [
      { geoFn: () => new THREE.IcosahedronGeometry(1, 1), instances: 10, color: 0x3a3a3a },
      { geoFn: () => new THREE.DodecahedronGeometry(1, 1), instances: 8, color: 0x4a3a2a },
      { geoFn: () => new THREE.IcosahedronGeometry(1, 0), instances: 7, color: 0x2a2a2a },
    ];

    const dummy = new THREE.Object3D();

    for (const variant of variants) {
      const geo = variant.geoFn();
      // Displace vertices for organic shapes
      const posAttr = geo.attributes['position'];
      for (let i = 0; i < posAttr.count; i++) {
        posAttr.setXYZ(
          i,
          posAttr.getX(i) + (Math.random() - 0.5) * 0.6,
          posAttr.getY(i) + (Math.random() - 0.5) * 0.6,
          posAttr.getZ(i) + (Math.random() - 0.5) * 0.6,
        );
      }
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        color: variant.color,
        roughness: 0.95,
        metalness: 0.05,
        flatShading: true,
      });

      const mesh = new THREE.InstancedMesh(geo, mat, variant.instances);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      for (let i = 0; i < variant.instances; i++) {
        let px: number, pz: number;
        let attempts = 0;
        do {
          px = (Math.random() * 2 - 1) * this.swimRangeX * 2.0;
          pz = -this.swimRangeZ * 1.5 + Math.random() * this.swimRangeZ * 2.0;
          attempts++;
        } while (
          attempts < 50 &&
          Math.sqrt((px - castleX) ** 2 + (pz - castleZ) ** 2) < exclusionR
        );

        const scale = (0.3 + Math.random() * 1.2) * this.swimRangeY * 0.15;
        dummy.position.set(px, floorY, pz);
        dummy.rotation.set(
          (Math.random() - 0.5) * 0.6,
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * 0.6,
        );
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      this.scene.add(mesh);
      this.rockMeshes.push(mesh);
    }
  }

  initBubbles(): void {
    const floorY = -this.swimRangeY * 1.5;
    const cycleHeight = this.swimRangeY * 2.5;
    const castleX = this.swimRangeX * 0.7;
    const castleZ = -this.swimRangeZ * 0.3;
    const exclusionR = this.swimRangeX * 0.5;

    this.bubbleUniforms = { uTime: { value: 0 } };

    // Canvas texture — radial gradient bubble
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.6)');
    grad.addColorStop(0.5, 'rgba(180,220,255,0.3)');
    grad.addColorStop(1, 'rgba(100,180,255,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    const s = this.swimRangeY * 0.06;
    const geo = new THREE.PlaneGeometry(s, s);

    // Emitter groups: 10 groups of 5 bubbles
    const groupCount = 10;
    const perGroup = 5;
    const instanceCount = groupCount * perGroup;

    const aPhase = new Float32Array(instanceCount);
    const aSpeed = new Float32Array(instanceCount);
    const aOffsetX = new Float32Array(instanceCount);
    const aOffsetZ = new Float32Array(instanceCount);
    const aScale = new Float32Array(instanceCount);

    let idx = 0;
    for (let g = 0; g < groupCount; g++) {
      // Pick emitter position with castle exclusion
      let gx: number, gz: number;
      let attempts = 0;
      do {
        gx = (Math.random() * 2 - 1) * this.swimRangeX * 1.5;
        gz = -this.swimRangeZ * 1.0 + Math.random() * this.swimRangeZ * 1.5;
        attempts++;
      } while (
        attempts < 50 &&
        Math.sqrt((gx - castleX) ** 2 + (gz - castleZ) ** 2) < exclusionR
      );

      for (let b = 0; b < perGroup; b++) {
        aPhase[idx] = Math.random() * Math.PI * 2;
        aSpeed[idx] = 0.3 + Math.random() * 0.5;
        aOffsetX[idx] = gx + (Math.random() - 0.5) * 0.5;
        aOffsetZ[idx] = gz + (Math.random() - 0.5) * 0.5;
        aScale[idx] = 0.5 + Math.random() * 1.0;
        idx++;
      }
    }

    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(aPhase, 1));
    geo.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(aSpeed, 1));
    geo.setAttribute('aOffsetX', new THREE.InstancedBufferAttribute(aOffsetX, 1));
    geo.setAttribute('aOffsetZ', new THREE.InstancedBufferAttribute(aOffsetZ, 1));
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(aScale, 1));

    const vertexShader = /* glsl */ `
      uniform float uTime;
      attribute float aPhase;
      attribute float aSpeed;
      attribute float aOffsetX;
      attribute float aOffsetZ;
      attribute float aScale;
      varying vec2 vUv;
      varying float vAlpha;
      varying float vFogDepth;

      void main() {
        vUv = uv;

        // Cyclic rise
        float cycleHeight = ${cycleHeight.toFixed(2)};
        float floorY = ${floorY.toFixed(2)};
        float t = mod(uTime * aSpeed + aPhase, 6.2832) / 6.2832;
        float worldY = floorY + t * cycleHeight;

        // Horizontal wobble
        float wobbleX = sin(uTime * 1.5 + aPhase) * 0.15;
        float wobbleZ = cos(uTime * 1.1 + aPhase * 0.7) * 0.1;

        // Fade in/out
        float fadeIn = smoothstep(0.0, 0.1, t);
        float fadeOut = smoothstep(1.0, 0.85, t);
        vAlpha = fadeIn * fadeOut;

        // Billboard: extract camera right and up from viewMatrix
        vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

        float s = aScale;
        vec3 worldPos = vec3(aOffsetX + wobbleX, worldY, aOffsetZ + wobbleZ);
        vec3 vertexPos = worldPos + camRight * position.x * s + camUp * position.y * s;

        vec4 mvPos = viewMatrix * vec4(vertexPos, 1.0);
        vFogDepth = -mvPos.z;
        gl_Position = projectionMatrix * mvPos;
      }
    `;

    const fragmentShader = /* glsl */ `
      uniform sampler2D uTex;
      varying vec2 vUv;
      varying float vAlpha;
      varying float vFogDepth;

      void main() {
        vec4 texColor = texture2D(uTex, vUv);
        if (texColor.a < 0.05) discard;

        float fogDensity = 0.025;
        float fogFactor = exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
        fogFactor = clamp(fogFactor, 0.0, 1.0);
        vec3 fogColor = vec3(0.024, 0.102, 0.157);
        vec3 finalColor = mix(fogColor, texColor.rgb, fogFactor);

        gl_FragColor = vec4(finalColor, texColor.a * vAlpha);
      }
    `;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: this.bubbleUniforms.uTime,
        uTex: { value: texture },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.InstancedMesh(geo, mat, instanceCount);
    mesh.renderOrder = 2;

    // Set all instance matrices to identity
    const identity = new THREE.Matrix4();
    for (let i = 0; i < instanceCount; i++) {
      mesh.setMatrixAt(i, identity);
    }
    mesh.instanceMatrix.needsUpdate = true;

    this.scene.add(mesh);
    this.bubbleMesh = mesh;
  }


  initFishFlocks(gltfLoader: import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader): void {
    gltfLoader.load('assets/models/fish_particle.glb', (gltf) => {
      if (this.disabledSystems.has('fish')) return;
      const group = gltf.scene;
      this.fishGroup = group;

      // The model spans roughly ±1.7 units — scale to fill the swim area
      const bbox = new THREE.Box3().setFromObject(group);
      const modelSize = new THREE.Vector3();
      bbox.getSize(modelSize);
      const targetSize = this.swimRangeX * 3.0;
      const s = targetSize / modelSize.x;
      group.scale.set(s, s, s);

      // Position deep in the scene — fog blurs the low-poly geometry
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      center.multiplyScalar(s);
      group.position.set(-center.x, -center.y, -center.z - this.swimRangeZ * 1.5);
      this.fishBasePos.copy(group.position);

      // Cast shadows onto ocean floor
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).castShadow = true;
      });

      this.scene.add(group);

      // Play baked animation — make it loop seamlessly
      if (gltf.animations.length > 0) {
        const clip = gltf.animations[0];

        // Blend last 2s of keyframes back toward the first keyframe
        // so end pose matches start pose — seamless LoopRepeat
        const blendDuration = 2.0;
        const duration = clip.duration;
        for (const track of clip.tracks) {
          const times = track.times;
          const values = track.values;
          const stride = track.getValueSize();
          const startVals = values.slice(0, stride);
          const isQuat = track.name.endsWith('.quaternion');

          for (let i = 0; i < times.length; i++) {
            if (times[i] >= duration - blendDuration) {
              const alpha = (times[i] - (duration - blendDuration)) / blendDuration;
              const off = i * stride;
              for (let j = 0; j < stride; j++) {
                values[off + j] = values[off + j] * (1 - alpha) + startVals[j] * alpha;
              }
              if (isQuat) {
                let len = 0;
                for (let j = 0; j < 4; j++) len += values[off + j] ** 2;
                len = Math.sqrt(len);
                for (let j = 0; j < 4; j++) values[off + j] /= len;
              }
            }
          }
        }

        this.fishMixer = new THREE.AnimationMixer(group);
        const action = this.fishMixer.clipAction(clip);
        action.play();
      }
    });
  }

  initKoiFish(gltfLoader: import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader): void {
    gltfLoader.load('assets/models/koi_fish.glb', (gltf) => {
      if (this.disabledSystems.has('koi')) return;
      // Use a wrapper pivot for movement/rotation — keep model internals untouched
      const pivot = new THREE.Group();
      pivot.add(gltf.scene);
      this.koiGroup = pivot;

      // Model is ~6.4 units on X — scale to ~1/3 of swimRangeX
      const bbox = new THREE.Box3().setFromObject(gltf.scene);
      const modelLen = bbox.max.x - bbox.min.x;
      const targetLen = this.swimRangeX * 0.7; // 2x bigger
      const s = targetLen / modelLen;
      gltf.scene.scale.set(s, s, s);

      // Rotate model so its X-axis forward aligns with -Z (Three.js forward)
      // Model faces +X, so rotate -90° around Y to face -Z
      gltf.scene.rotation.y = -Math.PI / 2;

      // Cast shadows onto ocean floor
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).castShadow = true;
      });

      pivot.position.set(0, 0, 0);
      this.koiPrevPos.set(0, 0, 0);

      this.scene.add(pivot);

      // Play morph target swim animation as-is (150 sequential morph targets)
      if (gltf.animations.length > 0) {
        this.koiMixer = new THREE.AnimationMixer(gltf.scene);
        const action = this.koiMixer.clipAction(gltf.animations[0]);
        action.play();
      }
    });
  }

  update(delta: number, elapsed: number): void {
    if (!this.positions || !this.speeds || !this.phases) return;
    const positions = this.positions.array as Float32Array;

    // ── Dynamic current animation ──────────────────────────────────
    if (this.currentAutoAnimate) {
      this.surgeTimer += delta;

      if (this.surgeRemaining > 0) {
        // Active surge — count down
        this.surgeRemaining -= delta;
        if (this.surgeRemaining <= 0) {
          // Surge ended — set new calm target, slow lerp back
          this.currentTargetAngle = CURRENT_ANGLE_DEG + (Math.random() - 0.5) * 60;
          this.currentTargetStrength = CURRENT_STRENGTH * (0.6 + Math.random() * 0.8);
          this.currentLerpSpeed = 0.15; // slow recovery
          this.nextSurgeIn = 60 + Math.random() * 120;
          this.surgeTimer = 0;
        }
      } else {
        // Calm phase — gentle wandering target
        // Slowly shift base target using layered sine waves
        this.currentTargetAngle = CURRENT_ANGLE_DEG
          + Math.sin(elapsed * 0.02) * 25
          + Math.sin(elapsed * 0.007 + 1.3) * 15;
        this.currentTargetStrength = CURRENT_STRENGTH
          * (0.7 + 0.3 * Math.sin(elapsed * 0.015)
             + 0.2 * Math.sin(elapsed * 0.04 + 2.1));
        this.currentLerpSpeed = 0.3;

        // Check for surge trigger
        if (this.surgeTimer >= this.nextSurgeIn) {
          // SURGE — dramatic spike
          this.currentTargetAngle = Math.random() * 360;
          this.currentTargetStrength = 0.35 + Math.random() * 0.15; // 0.35–0.5
          this.currentLerpSpeed = 0.8; // fast ramp-up
          this.surgeRemaining = 30;
          this.surgeTimer = 0;
        }
      }

      // Lerp current values toward targets
      const lerpFactor = 1 - Math.exp(-this.currentLerpSpeed * delta);
      // Angle lerp — handle wrapping (shortest path)
      let angleDiff = this.currentTargetAngle - this.currentAngle;
      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff < -180) angleDiff += 360;
      this.currentAngle += angleDiff * lerpFactor;
      // Normalize to 0–360
      this.currentAngle = ((this.currentAngle % 360) + 360) % 360;

      this.currentStrength += (this.currentTargetStrength - this.currentStrength) * lerpFactor;
    }

    // Current drift vector (computed once per frame)
    const currentRad = this.currentAngle * Math.PI / 180;
    const cdx = Math.cos(currentRad) * this.currentStrength;
    const cdz = Math.sin(currentRad) * this.currentStrength;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const speed = this.speeds[i];
      const phase = this.phases[i];

      positions[i3 + 1] += PARTICLE_DRIFT_Y * speed * delta;
      positions[i3]     += Math.sin(phase + elapsed * PARTICLE_SWAY_FREQ) * PARTICLE_SWAY_AMP * delta + cdx * delta;
      positions[i3 + 2] += Math.cos(phase * 0.7 + elapsed * PARTICLE_SWAY_FREQ * 0.6) * PARTICLE_SWAY_AMP * 0.3 * delta + cdz * delta;

      if (positions[i3 + 1] > this.swimRangeY) positions[i3 + 1] = -this.swimRangeY;
      if (positions[i3] > this.swimRangeX) positions[i3] = -this.swimRangeX;
      else if (positions[i3] < -this.swimRangeX) positions[i3] = this.swimRangeX;
      if (positions[i3 + 2] > this.swimRangeZ) positions[i3 + 2] = -this.swimRangeZ;
      else if (positions[i3 + 2] < -this.swimRangeZ) positions[i3 + 2] = this.swimRangeZ;
    }

    this.positions.needsUpdate = true;

    if (this.floorCausticUniforms) this.floorCausticUniforms.uTime.value = elapsed;
    if (this.floraUniforms) {
      this.floraUniforms.uTime.value = elapsed;
      this.floraUniforms.uCurrentDirX.value = Math.cos(currentRad);
      this.floraUniforms.uCurrentDirZ.value = Math.sin(currentRad);
      this.floraUniforms.uCurrentStrength.value = this.currentStrength * 1.25;
    }
    if (this.bubbleUniforms) this.bubbleUniforms.uTime.value = elapsed;
    if (this.fishMixer) this.fishMixer.update(delta);

    // Fish flock group — slow rotation, drift, and bob
    if (this.fishGroup) {
      // Slow Y rotation — school circling through the deep
      this.fishGroup.rotation.y = elapsed * 0.03;

      // Gentle horizontal drift — school migrating across background
      this.fishGroup.position.x = this.fishBasePos.x + Math.sin(elapsed * 0.04) * this.swimRangeX * 0.8;
      this.fishGroup.position.z = this.fishBasePos.z + Math.cos(elapsed * 0.03) * this.swimRangeZ * 0.3;

      // Subtle vertical bob — riding a current
      this.fishGroup.position.y = this.fishBasePos.y + Math.sin(elapsed * 0.15) * this.swimRangeY * 0.15;
    }

    // Koi fish — Lissajous path with body-facing rotation
    if (this.koiMixer) this.koiMixer.update(delta);
    if (this.koiGroup) {
      const t = elapsed * 0.04; // slow cruise (3x slower)
      const x = Math.sin(t) * this.swimRangeX * 1.2;
      const z = Math.cos(t * 1.7) * this.swimRangeZ * 0.6;
      const y = Math.sin(t * 0.8) * this.swimRangeY * 0.3;

      // Compute velocity for facing direction
      const dx = x - this.koiPrevPos.x;
      const dy = y - this.koiPrevPos.y;
      const dz = z - this.koiPrevPos.z;
      const hSpeed = Math.sqrt(dx * dx + dz * dz);

      if (hSpeed > 0.0001) {
        // Yaw — face movement direction on XZ plane
        this.koiGroup.rotation.y = Math.atan2(dx, dz);

        // Pitch — tilt nose up/down with vertical movement
        this.koiGroup.rotation.x = Math.atan2(-dy, hSpeed) * 0.5;

        // Bank — lean into turns
        this.koiGroup.rotation.z = Math.sin(t * 1.7) * 0.15;
      }

      this.koiGroup.position.set(x, y, z);
      this.koiPrevPos.set(x, y, z);
    }

    // Pulsing billboard halo behind Buddha statue
    this.haloOpacity.value = 0.8 + 0.2 * Math.sin(elapsed * 0.35 + 0.5);

    // Floating orb circular orbits with vertical bob
    for (const orb of this.orbData) {
      const angle = elapsed * orb.speed + orb.phase;
      orb.mesh.position.set(
        this.castleCenter.x + Math.cos(angle) * orb.radius,
        this.castleCenter.y + orb.yOffset + Math.sin(elapsed * 0.8 + orb.phase) * 0.15,
        this.castleCenter.z + Math.sin(angle) * orb.radius,
      );
    }

    // Light pillar: drift particles downward in cone
    if (this.pillarUniforms) {
      this.pillarUniforms.uTime.value = elapsed;
      const posAttr = (this as any)._pillarPositions as THREE.BufferAttribute | undefined;
      const speeds = (this as any)._pillarSpeeds as Float32Array | undefined;
      const phases = (this as any)._pillarPhases as Float32Array | undefined;
      if (posAttr && speeds && phases) {
        const pos = posAttr.array as Float32Array;
        const count = pos.length / 3;
        const baseY = (this as any)._pillarBaseY as number;
        const coneH = (this as any)._pillarConeH as number;
        const topR = (this as any)._pillarConeTopR as number;
        const botR = (this as any)._pillarConeBotR as number;
        const cx = (this as any)._pillarPx as number;
        const cz = (this as any)._pillarPz as number;
        for (let i = 0; i < count; i++) {
          // Drift down
          pos[i * 3 + 1] -= speeds[i] * delta;
          // Gentle XZ sway
          pos[i * 3]     += Math.sin(elapsed * 0.3 + phases[i]) * 0.001;
          pos[i * 3 + 2] += Math.cos(elapsed * 0.25 + phases[i]) * 0.001;
          // Recycle below cone bottom → respawn at top
          if (pos[i * 3 + 1] < baseY) {
            const t = 0.8 + Math.random() * 0.2;
            const r = botR + (topR - botR) * t;
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.sqrt(Math.random()) * r;
            pos[i * 3]     = cx + Math.cos(angle) * dist;
            pos[i * 3 + 1] = baseY + t * coneH;
            pos[i * 3 + 2] = cz + Math.sin(angle) * dist;
          }
        }
        posAttr.needsUpdate = true;
      }
    }

    // Spiritual motes: GPU-only, just update time
    if (this.motesUniforms) {
      this.motesUniforms.uTime.value = elapsed;
    }

    // Marine snow: GPU-only, just update time
    if (this.marineSnowUniforms) {
      this.marineSnowUniforms.uTime.value = elapsed;
    }

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

    // Dispose castle spotlight + target
    if (this.castleSpotLight) {
      this.castleSpotLight.target.removeFromParent();
      this.castleSpotLight.removeFromParent();
      this.castleSpotLight = null;
    }

    // Dispose floating orbs
    if (this.orbGroup) {
      this.orbGroup.traverse((child) => {
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
      this.orbGroup.removeFromParent();
      this.orbGroup = null;
    }

    // Dispose sea flora instanced meshes
    for (const fm of this.floraMeshes) {
      fm.geometry.dispose();
      const mat = fm.material as THREE.ShaderMaterial;
      if (mat.uniforms['uTex']?.value) mat.uniforms['uTex'].value.dispose();
      mat.dispose();
      fm.removeFromParent();
    }
    this.floraMeshes = [];
    this.floraUniforms = null;

    // Dispose rocks
    for (const rm of this.rockMeshes) {
      rm.geometry.dispose();
      (rm.material as THREE.Material).dispose();
      rm.removeFromParent();
    }
    this.rockMeshes = [];

    // Dispose bubbles
    if (this.bubbleMesh) {
      this.bubbleMesh.geometry.dispose();
      const bMat = this.bubbleMesh.material as THREE.ShaderMaterial;
      if (bMat.uniforms['uTex']?.value) bMat.uniforms['uTex'].value.dispose();
      bMat.dispose();
      this.bubbleMesh.removeFromParent();
      this.bubbleMesh = null;
    }
    this.bubbleUniforms = null;

    // Dispose fish flock
    if (this.fishGroup) {
      this.fishGroup.traverse((child) => {
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
      this.fishGroup.removeFromParent();
      this.fishGroup = null;
    }
    if (this.fishMixer) {
      this.fishMixer.stopAllAction();
      this.fishMixer = null;
    }

    // Dispose koi fish
    if (this.koiGroup) {
      this.koiGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            (mesh.material as THREE.Material).dispose();
          }
        }
      });
      this.koiGroup.removeFromParent();
      this.koiGroup = null;
    }
    if (this.koiMixer) {
      this.koiMixer.stopAllAction();
      this.koiMixer = null;
    }

    // Dispose billboard halo
    if (this.haloSprite) {
      const mat = this.haloSprite.material as THREE.ShaderMaterial;
      if (mat.uniforms['uTex']?.value) mat.uniforms['uTex'].value.dispose();
      mat.dispose();
      this.haloSprite.geometry.dispose();
      this.haloSprite.removeFromParent();
      this.haloSprite = null;
    }

    // Dispose light pillar
    if (this.pillarMesh) {
      this.pillarMesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
      });
      this.pillarMesh.removeFromParent();
      this.pillarMesh = null;
      this.pillarUniforms = null;
    }

    // Dispose spiritual motes
    if (this.motesPoints) {
      (this.motesPoints.material as THREE.ShaderMaterial).dispose();
      this.motesPoints.geometry.dispose();
      this.motesPoints.removeFromParent();
      this.motesPoints = null;
      this.motesUniforms = null;
    }

    // Dispose marine snow
    if (this.marineSnowPoints) {
      (this.marineSnowPoints.material as THREE.ShaderMaterial).dispose();
      this.marineSnowPoints.geometry.dispose();
      this.marineSnowPoints.removeFromParent();
      this.marineSnowPoints = null;
      this.marineSnowUniforms = null;
    }

    this.castleMeshes = [];
    this.orbData = [];
  }

  // ── Adaptive FPS degradation: disable individual subsystems ──────

  disableMarineSnow(): void {
    this.disabledSystems.add('marineSnow');
    if (this.marineSnowPoints) {
      (this.marineSnowPoints.material as THREE.ShaderMaterial).dispose();
      this.marineSnowPoints.geometry.dispose();
      this.marineSnowPoints.removeFromParent();
      this.marineSnowPoints = null;
      this.marineSnowUniforms = null;
    }
  }

  disableSpiritualMotes(): void {
    this.disabledSystems.add('motes');
    if (this.motesPoints) {
      (this.motesPoints.material as THREE.ShaderMaterial).dispose();
      this.motesPoints.geometry.dispose();
      this.motesPoints.removeFromParent();
      this.motesPoints = null;
      this.motesUniforms = null;
    }
  }

  disableLightPillar(): void {
    this.disabledSystems.add('pillar');
    if (this.pillarMesh) {
      (this.pillarMesh.material as THREE.Material).dispose();
      (this.pillarMesh as unknown as THREE.Points).geometry.dispose();
      this.pillarMesh.removeFromParent();
      this.pillarMesh = null;
      this.pillarUniforms = null;
      (this as any)._pillarPositions = null;
      (this as any)._pillarSpeeds = null;
      (this as any)._pillarPhases = null;
    }
  }

  disableOrbs(): void {
    this.disabledSystems.add('orbs');
    if (this.orbGroup) {
      this.orbGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        }
      });
      this.orbGroup.removeFromParent();
      this.orbGroup = null;
      this.orbData = [];
    }
  }

  disableFish(): void {
    this.disabledSystems.add('fish');
    if (this.fishMixer) {
      this.fishMixer.stopAllAction();
      this.fishMixer = null;
    }
    if (this.fishGroup) {
      this.fishGroup.traverse((child) => {
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
      this.fishGroup.removeFromParent();
      this.fishGroup = null;
    }
  }

  disableKoi(): void {
    this.disabledSystems.add('koi');
    if (this.koiMixer) {
      this.koiMixer.stopAllAction();
      this.koiMixer = null;
    }
    if (this.koiGroup) {
      this.koiGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            (mesh.material as THREE.Material).dispose();
          }
        }
      });
      this.koiGroup.removeFromParent();
      this.koiGroup = null;
    }
  }

  disableBubbles(): void {
    this.disabledSystems.add('bubbles');
    if (this.bubbleMesh) {
      this.bubbleMesh.geometry.dispose();
      const bMat = this.bubbleMesh.material as THREE.ShaderMaterial;
      if (bMat.uniforms['uTex']?.value) bMat.uniforms['uTex'].value.dispose();
      bMat.dispose();
      this.bubbleMesh.removeFromParent();
      this.bubbleMesh = null;
      this.bubbleUniforms = null;
    }
  }

  disableFlora(): void {
    this.disabledSystems.add('flora');
    for (const fm of this.floraMeshes) {
      fm.geometry.dispose();
      const mat = fm.material as THREE.ShaderMaterial;
      if (mat.uniforms['uTex']?.value) mat.uniforms['uTex'].value.dispose();
      mat.dispose();
      fm.removeFromParent();
    }
    this.floraMeshes = [];
    this.floraUniforms = null;
  }

  disableCaustics(): void {
    this.disabledSystems.add('caustics');
    if (this.floorCausticUniforms) {
      this.floorCausticUniforms.uCausticStrength.value = 0;
    }
  }
}
