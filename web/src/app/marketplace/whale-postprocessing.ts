import * as THREE from 'three';
import { BlendFunction, DepthOfFieldEffect, Effect, EffectComposer, EffectPass, RenderPass, SelectiveBloomEffect } from 'postprocessing';
import { GodraysPass } from 'three-good-godrays';

/** Subtle underwater refraction wobble — screen-space UV distortion */
class UnderwaterDistortionEffect extends Effect {
  constructor() {
    super('UnderwaterDistortion', /* glsl */ `
      uniform float time;

      void mainUv(inout vec2 uv) {
        uv += sin(uv.y * 10.0 + time) * 0.003;
        uv += cos(uv.x * 8.0 + time * 0.7) * 0.002;
      }
    `, {
      uniforms: new Map([['time', new THREE.Uniform(0)]]),
    });
  }

  override update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime: number): void {
    const u = this.uniforms.get('time')!;
    u.value += deltaTime;
  }
}

export class WhalePostProcessing {
  private composer: EffectComposer;
  readonly bloomEffect: SelectiveBloomEffect;
  readonly godraysPass: GodraysPass;
  readonly dofEffect: DepthOfFieldEffect;
  private bloomPass: EffectPass;
  private effectsPass: EffectPass;

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
    this.bloomPass = new EffectPass(camera, this.bloomEffect);
    this.composer.addPass(this.bloomPass);

    // Merged effects pass — distortion + DOF in a single full-screen quad
    // DOF has EffectAttribute.DEPTH (not CONVOLUTION), so it's safe to merge
    // with the UV-transforming distortion effect
    const distortion = new UnderwaterDistortionEffect();
    this.dofEffect = new DepthOfFieldEffect(camera, {
      focusDistance: 8.0,
      focusRange: 10.0,
      bokehScale: 2.0,
    });
    this.effectsPass = new EffectPass(camera, distortion, this.dofEffect);
    this.composer.addPass(this.effectsPass);

    // God rays — shadow-map raymarched volumetric light
    // gammaCorrection: false — EffectPass already handles sRGB encoding;
    // double-encoding causes overbright/washed-out look on first load
    this.godraysPass = new GodraysPass(godrayLight, camera, {
      density: 0.08,
      maxDensity: 0.6,
      distanceAttenuation: 2,
      color: new THREE.Color(0x88ccff),
      raymarchSteps: 30,
      blur: true,
      gammaCorrection: false,
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

  disableGodrays(): void {
    this.godraysPass.enabled = false;
  }

  disableBloom(): void {
    this.bloomPass.enabled = false;
  }

  disableDof(): void {
    this.dofEffect.blendMode.blendFunction = BlendFunction.DST;
  }

  dispose(): void {
    this.composer.dispose();
  }
}
