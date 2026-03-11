import * as THREE from 'three';
import { DepthOfFieldEffect, EffectComposer, EffectPass, RenderPass, SelectiveBloomEffect } from 'postprocessing';
import { GodraysPass } from 'three-good-godrays';

export class WhalePostProcessing {
  private composer: EffectComposer;
  readonly bloomEffect: SelectiveBloomEffect;
  readonly godraysPass: GodraysPass;
  readonly dofEffect: DepthOfFieldEffect;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    godrayLight: THREE.DirectionalLight,
  ) {
    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
    });
    this.composer.addPass(new RenderPass(scene, camera));

    // Selective bloom — uses depth-based masking, no scene traversal needed
    this.bloomEffect = new SelectiveBloomEffect(scene, camera, {
      intensity: 1.0,
      mipmapBlur: true,
      luminanceThreshold: 0,
      luminanceSmoothing: 0.025,
      radius: 0.85,
    });
    this.composer.addPass(new EffectPass(camera, this.bloomEffect));

    // Depth of field — cinematic bokeh, focus on mid-range whale
    this.dofEffect = new DepthOfFieldEffect(camera, {
      focusDistance: 8.0,
      focusRange: 10.0,
      bokehScale: 2.0,
    });
    this.composer.addPass(new EffectPass(camera, this.dofEffect));

    // God rays — shadow-map raymarched volumetric light
    this.godraysPass = new GodraysPass(godrayLight, camera, {
      density: 0.0247,
      maxDensity: 0.5,
      distanceAttenuation: 2,
      color: new THREE.Color(0x20415a),
      raymarchSteps: 60,
      blur: true,
      gammaCorrection: true,
    });
    this.composer.addPass(this.godraysPass);
  }

  /** Register an emissive mesh for selective bloom */
  addBloomMesh(mesh: THREE.Mesh): void {
    this.bloomEffect.selection.add(mesh);
  }

  setSize(w: number, h: number): void {
    this.composer.setSize(w, h);
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
  }
}
