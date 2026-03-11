import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BLOOM_LAYER } from './whale-scene.constants';

/** Selective bloom pipeline — isolates emissive meshes via layer mask, renders bloom, composites */
export class WhaleBloom {
  private bloomComposer: EffectComposer;
  private finalComposer: EffectComposer;
  private bloomLayer = new THREE.Layers();
  private darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  private storedMaterials: Record<string, THREE.Material | THREE.Material[]> = {};

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, w: number, h: number) {
    this.bloomLayer.set(BLOOM_LAYER);

    this.bloomComposer = new EffectComposer(renderer);
    this.bloomComposer.renderToScreen = false;
    this.bloomComposer.addPass(new RenderPass(scene, camera));
    this.bloomComposer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0, 1.0, 0.0));

    const hBlurShader = {
      uniforms: { tDiffuse: { value: null }, h: { value: 2.0 / w } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float h; varying vec2 vUv;
        void main() {
          vec4 s = vec4(0.0);
          s += texture2D(tDiffuse, vec2(vUv.x - 4.0*h, vUv.y)) * 0.051;
          s += texture2D(tDiffuse, vec2(vUv.x - 3.0*h, vUv.y)) * 0.0918;
          s += texture2D(tDiffuse, vec2(vUv.x - 2.0*h, vUv.y)) * 0.12245;
          s += texture2D(tDiffuse, vec2(vUv.x - 1.0*h, vUv.y)) * 0.1531;
          s += texture2D(tDiffuse, vec2(vUv.x,          vUv.y)) * 0.1633;
          s += texture2D(tDiffuse, vec2(vUv.x + 1.0*h, vUv.y)) * 0.1531;
          s += texture2D(tDiffuse, vec2(vUv.x + 2.0*h, vUv.y)) * 0.12245;
          s += texture2D(tDiffuse, vec2(vUv.x + 3.0*h, vUv.y)) * 0.0918;
          s += texture2D(tDiffuse, vec2(vUv.x + 4.0*h, vUv.y)) * 0.051;
          gl_FragColor = s;
        }`,
    };
    const vBlurShader = {
      uniforms: { tDiffuse: { value: null }, v: { value: 2.0 / h } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float v; varying vec2 vUv;
        void main() {
          vec4 s = vec4(0.0);
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 4.0*v)) * 0.051;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 3.0*v)) * 0.0918;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 2.0*v)) * 0.12245;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 1.0*v)) * 0.1531;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y         )) * 0.1633;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 1.0*v)) * 0.1531;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 2.0*v)) * 0.12245;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 3.0*v)) * 0.0918;
          s += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 4.0*v)) * 0.051;
          gl_FragColor = s;
        }`,
    };
    for (let i = 0; i < 2; i++) {
      this.bloomComposer.addPass(new ShaderPass(hBlurShader));
      this.bloomComposer.addPass(new ShaderPass(vBlurShader));
    }

    const additiveBlendShader = {
      uniforms: { baseTexture: { value: null }, bloomTexture: { value: null } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv;
        void main() { gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv); }`,
    };
    this.finalComposer = new EffectComposer(renderer);
    this.finalComposer.addPass(new RenderPass(scene, camera));
    const blendPass = new ShaderPass(additiveBlendShader, 'baseTexture');
    blendPass.needsSwap = true;
    blendPass.uniforms['bloomTexture'].value = this.bloomComposer.renderTarget2.texture;
    this.finalComposer.addPass(blendPass);
    this.finalComposer.addPass(new OutputPass());
  }

  setSize(w: number, h: number): void {
    this.bloomComposer.setSize(w, h);
    this.finalComposer.setSize(w, h);
  }

  render(scene: THREE.Scene): void {
    scene.traverse(this.darkenNonBloomed);
    this.bloomComposer.render();
    scene.traverse(this.restoreMaterial);
    this.finalComposer.render();
  }

  private darkenNonBloomed = (obj: THREE.Object3D): void => {
    if ((obj as THREE.Mesh).isMesh && !this.bloomLayer.test(obj.layers)) {
      const mesh = obj as THREE.Mesh;
      this.storedMaterials[mesh.uuid] = mesh.material;
      mesh.material = this.darkMaterial;
    }
  };

  private restoreMaterial = (obj: THREE.Object3D): void => {
    if (this.storedMaterials[obj.uuid]) {
      (obj as THREE.Mesh).material = this.storedMaterials[obj.uuid];
      delete this.storedMaterials[obj.uuid];
    }
  };
}
