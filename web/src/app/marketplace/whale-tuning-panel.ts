import * as THREE from 'three';
import GUI from 'lil-gui';
import type { WhalePostProcessing } from './whale-postprocessing';
import type { WhaleSwimming } from './whale-swimming';
import type { WhaleParticles } from './whale-particles';

/** URL param to show tuning panel: ?tune_3d=true */
export const TUNE_3D =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('tune_3d') === 'true';

/** Objects needed from the scene for whale tuning */
export interface WhaleTuningDeps {
  pp: WhalePostProcessing;
  renderer: THREE.WebGLRenderer;
  keyLight: THREE.DirectionalLight;
  modelGroup: THREE.Group;
  swimming: WhaleSwimming;
  particles: WhaleParticles;
  whaleMaterial: THREE.MeshStandardMaterial;
}

/** Live tuning panel for post-processing + whale 3D properties. */
export class WhaleTuningPanel {
  paused = false;
  private gui: GUI;

  // Proxy objects for lil-gui (it needs plain objects with get/set)
  private bloomParams = {
    intensity: 1.0,
    luminanceThreshold: 0,
    luminanceSmoothing: 0.025,
    radius: 0.85,
  };

  private godraysParams = {
    density: 0.0247,
    maxDensity: 0.5,
    distanceAttenuation: 2,
    colorHex: '#20415a',
    raymarchSteps: 60,
    blur: true,
    gammaCorrection: true,
  };

  private rendererParams = {
    toneMappingExposure: 3.0,
    toneMapping: THREE.ACESFilmicToneMapping as number,
  };

  private lightParams = {
    intensity: 1.5,
    posX: 2,
    posY: 4,
    posZ: 3,
    shadowMapSize: 1024,
    shadowCameraNear: 0.1,
    shadowCameraFar: 20,
    shadowCameraExtent: 8,
  };

  private whaleModelParams = {
    scale: 20,
    emissiveIntensity: 20,
    emissiveColorHex: '#ffffff',
    roughness: 1.0,
    metalness: 0,
    envMapIntensity: 1.0,
  };

  private swimmingParams = {
    swimSpeed: 0.002,
    turnLerp: 0.01,
    velocityLerp: 0.06,
    freeSwimInterval: 8000,
  };

  private oceanFloorParams = {
    sandColorHex: '#0e1a1f',
    causticColorHex: '#44bbcc',
    causticStrength: 0.25,
  };

  constructor(private deps: WhaleTuningDeps) {
    this.syncFromLive();

    this.gui = new GUI({ title: 'Scene Tuning', width: 340 });
    this.gui.domElement.style.zIndex = '10000';

    this.buildWhaleModelFolder();
    this.buildSwimmingFolder();
    this.buildOceanFloorFolder();
    this.buildBloomFolder();
    this.buildGodraysFolder();
    this.buildRendererFolder();
    this.buildLightFolder();
    this.buildActionsFolder();
  }

  private syncFromLive(): void {
    const { pp, renderer, keyLight, modelGroup, swimming, whaleMaterial } = this.deps;
    const bloom = pp.bloomEffect;
    this.bloomParams.intensity = bloom.intensity;
    this.bloomParams.luminanceThreshold = bloom.luminanceMaterial.threshold;
    this.bloomParams.luminanceSmoothing = bloom.luminanceMaterial.smoothing;

    this.rendererParams.toneMappingExposure = renderer.toneMappingExposure;
    this.rendererParams.toneMapping = renderer.toneMapping;

    const kl = keyLight;
    this.lightParams.intensity = kl.intensity;
    this.lightParams.posX = kl.position.x;
    this.lightParams.posY = kl.position.y;
    this.lightParams.posZ = kl.position.z;

    this.whaleModelParams.scale = modelGroup.scale.x;
    this.whaleModelParams.emissiveIntensity = whaleMaterial.emissiveIntensity;
    this.whaleModelParams.roughness = whaleMaterial.roughness;
    this.whaleModelParams.metalness = whaleMaterial.metalness;
    this.whaleModelParams.envMapIntensity = whaleMaterial.envMapIntensity ?? 1.0;
    this.whaleModelParams.emissiveColorHex = '#' + whaleMaterial.emissive.getHexString();

    this.swimmingParams.swimSpeed = swimming.swimSpeed;
    this.swimmingParams.turnLerp = swimming.TURN_LERP;
    this.swimmingParams.velocityLerp = swimming.VELOCITY_LERP;
    this.swimmingParams.freeSwimInterval = swimming.freeSwimInterval;
  }

  private buildWhaleModelFolder(): void {
    const { modelGroup, whaleMaterial } = this.deps;
    const f = this.gui.addFolder('Whale Model');

    f.add(this.whaleModelParams, 'scale', 0.5, 20, 0.1).onChange((v: number) => {
      modelGroup.scale.set(v, v, v);
    });
    f.add(this.whaleModelParams, 'emissiveIntensity', 0, 20, 0.1).onChange((v: number) => {
      whaleMaterial.emissiveIntensity = v;
    });
    f.addColor(this.whaleModelParams, 'emissiveColorHex').name('emissive color').onChange((v: string) => {
      whaleMaterial.emissive.set(v);
    });
    f.add(this.whaleModelParams, 'roughness', 0, 1, 0.01).onChange((v: number) => {
      whaleMaterial.roughness = v;
    });
    f.add(this.whaleModelParams, 'metalness', 0, 1, 0.01).onChange((v: number) => {
      whaleMaterial.metalness = v;
    });
    f.add(this.whaleModelParams, 'envMapIntensity', 0, 5, 0.1).onChange((v: number) => {
      whaleMaterial.envMapIntensity = v;
    });
  }

  private buildSwimmingFolder(): void {
    const { swimming } = this.deps;
    const f = this.gui.addFolder('Swimming');

    f.add(this.swimmingParams, 'swimSpeed', 0, 0.02, 0.0001).onChange((v: number) => {
      swimming.swimSpeed = v;
    });
    f.add(this.swimmingParams, 'turnLerp', 0, 0.1, 0.001).name('turn lerp').onChange((v: number) => {
      swimming.TURN_LERP = v;
    });
    f.add(this.swimmingParams, 'velocityLerp', 0, 0.3, 0.005).name('velocity lerp').onChange((v: number) => {
      swimming.VELOCITY_LERP = v;
    });
    f.add(this.swimmingParams, 'freeSwimInterval', 1000, 30000, 500).name('waypoint interval (ms)').onChange((v: number) => {
      swimming.freeSwimInterval = v;
    });
  }

  private buildOceanFloorFolder(): void {
    const { particles } = this.deps;
    const f = this.gui.addFolder('Ocean Floor');
    const floorMat = particles.floorMaterial;
    if (!floorMat) return;

    f.addColor(this.oceanFloorParams, 'sandColorHex').name('sand color').onChange((v: string) => {
      (floorMat.uniforms['sandColor'].value as THREE.Color).set(v);
    });
    f.addColor(this.oceanFloorParams, 'causticColorHex').name('caustic color').onChange((v: string) => {
      (floorMat.uniforms['causticColor'].value as THREE.Color).set(v);
    });
    f.add(this.oceanFloorParams, 'causticStrength', 0, 2, 0.01).onChange((v: number) => {
      floorMat.uniforms['causticStrength'].value = v;
    });
  }

  private buildBloomFolder(): void {
    const bloom = this.deps.pp.bloomEffect;
    const f = this.gui.addFolder('Bloom');

    f.add(this.bloomParams, 'intensity', 0, 5, 0.01).onChange((v: number) => {
      bloom.intensity = v;
    });
    f.add(this.bloomParams, 'luminanceThreshold', 0, 1, 0.001).onChange((v: number) => {
      bloom.luminanceMaterial.threshold = v;
    });
    f.add(this.bloomParams, 'luminanceSmoothing', 0, 1, 0.001).onChange((v: number) => {
      bloom.luminanceMaterial.smoothing = v;
    });
    f.add(this.bloomParams, 'radius', 0, 1, 0.01).name('radius (mipmap)').onChange((v: number) => {
      (bloom.mipmapBlurPass as unknown as { radius: number }).radius = v;
    });
  }

  private buildGodraysFolder(): void {
    const f = this.gui.addFolder('God Rays');
    const apply = () => {
      this.deps.pp.godraysPass.setParams({
        density: this.godraysParams.density,
        maxDensity: this.godraysParams.maxDensity,
        distanceAttenuation: this.godraysParams.distanceAttenuation,
        color: new THREE.Color(this.godraysParams.colorHex),
        raymarchSteps: this.godraysParams.raymarchSteps,
        blur: this.godraysParams.blur,
        gammaCorrection: this.godraysParams.gammaCorrection,
      });
    };

    f.add(this.godraysParams, 'density', 0, 0.05, 0.0001).onChange(apply);
    f.add(this.godraysParams, 'maxDensity', 0, 2, 0.01).onChange(apply);
    f.add(this.godraysParams, 'distanceAttenuation', 0, 10, 0.1).onChange(apply);
    f.addColor(this.godraysParams, 'colorHex').name('color').onChange(apply);
    f.add(this.godraysParams, 'raymarchSteps', 10, 200, 1).onChange(apply);
    f.add(this.godraysParams, 'blur').onChange(apply);
    f.add(this.godraysParams, 'gammaCorrection').onChange(apply);
  }

  private buildRendererFolder(): void {
    const f = this.gui.addFolder('Renderer');
    const toneMappingOptions: Record<string, number> = {
      None: THREE.NoToneMapping,
      Linear: THREE.LinearToneMapping,
      Reinhard: THREE.ReinhardToneMapping,
      Cineon: THREE.CineonToneMapping,
      ACESFilmic: THREE.ACESFilmicToneMapping,
      AgX: THREE.AgXToneMapping,
      Neutral: THREE.NeutralToneMapping,
    };

    f.add(this.rendererParams, 'toneMappingExposure', 0, 10, 0.05).onChange((v: number) => {
      this.deps.renderer.toneMappingExposure = v;
    });
    f.add(this.rendererParams, 'toneMapping', toneMappingOptions).name('toneMapping').onChange((v: number) => {
      this.deps.renderer.toneMapping = v as THREE.ToneMapping;
    });
  }

  private buildLightFolder(): void {
    const f = this.gui.addFolder('Key Light');
    const kl = this.deps.keyLight;

    f.add(this.lightParams, 'intensity', 0, 10, 0.1).onChange((v: number) => {
      kl.intensity = v;
    });
    f.add(this.lightParams, 'posX', -20, 20, 0.1).name('pos X').onChange((v: number) => {
      kl.position.x = v;
    });
    f.add(this.lightParams, 'posY', -20, 20, 0.1).name('pos Y').onChange((v: number) => {
      kl.position.y = v;
    });
    f.add(this.lightParams, 'posZ', -20, 20, 0.1).name('pos Z').onChange((v: number) => {
      kl.position.z = v;
    });
    f.add(this.lightParams, 'shadowMapSize', [256, 512, 1024, 2048, 4096]).onChange((v: number) => {
      kl.shadow.mapSize.set(v, v);
      kl.shadow.map?.dispose();
      (kl.shadow as unknown as { map: null }).map = null; // force re-create
    });
    f.add(this.lightParams, 'shadowCameraNear', 0.01, 5, 0.01).name('shadow near').onChange((v: number) => {
      (kl.shadow.camera as THREE.OrthographicCamera).near = v;
      kl.shadow.camera.updateProjectionMatrix();
    });
    f.add(this.lightParams, 'shadowCameraFar', 5, 100, 0.5).name('shadow far').onChange((v: number) => {
      (kl.shadow.camera as THREE.OrthographicCamera).far = v;
      kl.shadow.camera.updateProjectionMatrix();
    });
    f.add(this.lightParams, 'shadowCameraExtent', 1, 30, 0.5).name('shadow extent').onChange((v: number) => {
      const cam = kl.shadow.camera as THREE.OrthographicCamera;
      cam.left = -v;
      cam.right = v;
      cam.top = v;
      cam.bottom = -v;
      cam.updateProjectionMatrix();
    });
  }

  private buildActionsFolder(): void {
    const f = this.gui.addFolder('Actions');
    f.add(this, 'paused').name('Pause Scene');
    f.add({ copy: () => this.copySettings() }, 'copy').name('Copy Settings to Clipboard');
  }

  /** Serialize all current settings as text and copy to clipboard. */
  private copySettings(): void {
    const lines = [
      '=== Scene Settings ===',
      '',
      '--- Whale Model ---',
      `scale: ${this.whaleModelParams.scale}`,
      `emissiveIntensity: ${this.whaleModelParams.emissiveIntensity}`,
      `emissiveColor: ${this.whaleModelParams.emissiveColorHex}`,
      `roughness: ${this.whaleModelParams.roughness}`,
      `metalness: ${this.whaleModelParams.metalness}`,
      `envMapIntensity: ${this.whaleModelParams.envMapIntensity}`,
      '',
      '--- Swimming ---',
      `swimSpeed: ${this.swimmingParams.swimSpeed}`,
      `turnLerp: ${this.swimmingParams.turnLerp}`,
      `velocityLerp: ${this.swimmingParams.velocityLerp}`,
      `freeSwimInterval: ${this.swimmingParams.freeSwimInterval}`,
      '',
      '--- Ocean Floor ---',
      `sandColor: ${this.oceanFloorParams.sandColorHex}`,
      `causticColor: ${this.oceanFloorParams.causticColorHex}`,
      `causticStrength: ${this.oceanFloorParams.causticStrength}`,
      '',
      '--- Bloom ---',
      `intensity: ${this.bloomParams.intensity}`,
      `luminanceThreshold: ${this.bloomParams.luminanceThreshold}`,
      `luminanceSmoothing: ${this.bloomParams.luminanceSmoothing}`,
      `radius: ${this.bloomParams.radius}`,
      '',
      '--- God Rays ---',
      `density: ${this.godraysParams.density}`,
      `maxDensity: ${this.godraysParams.maxDensity}`,
      `distanceAttenuation: ${this.godraysParams.distanceAttenuation}`,
      `color: ${this.godraysParams.colorHex}`,
      `raymarchSteps: ${this.godraysParams.raymarchSteps}`,
      `blur: ${this.godraysParams.blur}`,
      `gammaCorrection: ${this.godraysParams.gammaCorrection}`,
      '',
      '--- Renderer ---',
      `toneMappingExposure: ${this.rendererParams.toneMappingExposure}`,
      `toneMapping: ${this.rendererParams.toneMapping} (${this.getToneMappingName()})`,
      '',
      '--- Key Light ---',
      `intensity: ${this.lightParams.intensity}`,
      `position: (${this.lightParams.posX}, ${this.lightParams.posY}, ${this.lightParams.posZ})`,
      `shadowMapSize: ${this.lightParams.shadowMapSize}`,
      `shadowCameraNear: ${this.lightParams.shadowCameraNear}`,
      `shadowCameraFar: ${this.lightParams.shadowCameraFar}`,
      `shadowCameraExtent: ${this.lightParams.shadowCameraExtent}`,
    ];
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(
      () => console.log('[tune] Settings copied to clipboard'),
      (err) => console.error('[tune] Failed to copy:', err),
    );
  }

  private getToneMappingName(): string {
    const map: Record<number, string> = {
      [THREE.NoToneMapping]: 'None',
      [THREE.LinearToneMapping]: 'Linear',
      [THREE.ReinhardToneMapping]: 'Reinhard',
      [THREE.CineonToneMapping]: 'Cineon',
      [THREE.ACESFilmicToneMapping]: 'ACESFilmic',
      [THREE.AgXToneMapping]: 'AgX',
      [THREE.NeutralToneMapping]: 'Neutral',
    };
    return map[this.rendererParams.toneMapping] ?? 'Unknown';
  }

  destroy(): void {
    this.gui.destroy();
  }
}
