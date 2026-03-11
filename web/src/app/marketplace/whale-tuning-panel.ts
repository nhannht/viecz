import * as THREE from 'three';
import GUI from 'lil-gui';
import type { WhalePostProcessing } from './whale-postprocessing';

/** URL param to show tuning panel: ?tune_3d=true */
export const TUNE_3D =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('tune_3d') === 'true';

/** Live tuning panel for post-processing (bloom + god rays + renderer). */
export class WhaleTuningPanel {
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
    colorHex: '#88ccff',
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

  constructor(
    private pp: WhalePostProcessing,
    private renderer: THREE.WebGLRenderer,
    private keyLight: THREE.DirectionalLight,
  ) {
    // Sync initial values from live objects
    this.syncFromLive();

    this.gui = new GUI({ title: 'Post-Processing Tuning', width: 340 });
    this.gui.domElement.style.zIndex = '10000';

    this.buildBloomFolder();
    this.buildGodraysFolder();
    this.buildRendererFolder();
    this.buildLightFolder();
    this.buildActionsFolder();
  }

  private syncFromLive(): void {
    const bloom = this.pp.bloomEffect;
    this.bloomParams.intensity = bloom.intensity;
    this.bloomParams.luminanceThreshold = bloom.luminanceMaterial.threshold;
    this.bloomParams.luminanceSmoothing = bloom.luminanceMaterial.smoothing;

    this.rendererParams.toneMappingExposure = this.renderer.toneMappingExposure;
    this.rendererParams.toneMapping = this.renderer.toneMapping;

    const kl = this.keyLight;
    this.lightParams.intensity = kl.intensity;
    this.lightParams.posX = kl.position.x;
    this.lightParams.posY = kl.position.y;
    this.lightParams.posZ = kl.position.z;
  }

  private buildBloomFolder(): void {
    const bloom = this.pp.bloomEffect;
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
      this.pp.godraysPass.setParams({
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
      this.renderer.toneMappingExposure = v;
    });
    f.add(this.rendererParams, 'toneMapping', toneMappingOptions).name('toneMapping').onChange((v: number) => {
      this.renderer.toneMapping = v as THREE.ToneMapping;
    });
  }

  private buildLightFolder(): void {
    const f = this.gui.addFolder('Key Light');
    const kl = this.keyLight;

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
    f.add({ copy: () => this.copySettings() }, 'copy').name('Copy Settings to Clipboard');
  }

  /** Serialize all current settings as text and copy to clipboard. */
  private copySettings(): void {
    const lines = [
      '=== Post-Processing Settings ===',
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
