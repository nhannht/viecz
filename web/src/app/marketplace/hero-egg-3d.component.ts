import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
} from '@angular/core';
import { extend, NgtArgs, injectBeforeRender, injectStore } from 'angular-three';
import { NgtCanvas, NgtCanvasContent } from 'angular-three/dom';
import { injectGLTF } from 'angular-three-soba/loaders';
import * as THREE from 'three';

extend(THREE);

@Component({
  selector: 'app-hero-egg-3d-scene',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgtArgs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (gltf(); as gltf) {
      <ngt-primitive *args="[gltf.scene]" />
    }
  `,
})
class HeroEgg3dSceneComponent {
  protected gltf = injectGLTF(() => 'assets/models/a_windy_day.glb');

  private store = injectStore();
  private mixer: THREE.AnimationMixer | null = null;
  private initialized = false;

  constructor() {
    injectBeforeRender(({ delta }) => {
      this.mixer?.update(delta);
      if (!this.initialized) this.setupModel();
    });
  }

  private setupModel(): void {
    const data = this.gltf();
    if (!data) return;
    this.initialized = true;

    const gltfData = data as { scene: THREE.Group; animations: THREE.AnimationClip[] };

    // Center the model
    const box = new THREE.Box3().setFromObject(gltfData.scene);
    const center = box.getCenter(new THREE.Vector3());
    gltfData.scene.position.sub(center);

    // Fit camera to model
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const camera = this.store.snapshot.camera as THREE.PerspectiveCamera;
    camera.position.set(0, 0, maxDim * 1.8);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // Increase point size for visibility
    gltfData.scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Points).isPoints) {
        const points = child as THREE.Points;
        const mat = points.material as THREE.PointsMaterial;
        if (mat.isPointsMaterial) {
          mat.size = 0.03;
          mat.sizeAttenuation = true;
        }
      }
    });

    // Play animations
    if (gltfData.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(gltfData.scene);
      for (const clip of gltfData.animations) {
        this.mixer.clipAction(clip).play();
      }
    }
  }
}

@Component({
  selector: 'app-hero-egg-3d',
  standalone: true,
  imports: [NgtCanvas, NgtCanvasContent, HeroEgg3dSceneComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ngt-canvas
      [camera]="{ position: [0, 0, 20], fov: 45, near: 0.1, far: 500 }"
      [gl]="{ antialias: true, powerPreference: 'high-performance' }"
      [scene]="sceneOptions"
      [dpr]="[1, 2]"
    >
      <app-hero-egg-3d-scene *canvasContent />
    </ngt-canvas>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    ngt-canvas {
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: auto;
      touch-action: none;
    }
  `,
})
export class HeroEgg3dComponent {
  sceneOptions = { background: new THREE.Color('#0a0a12') };
}
