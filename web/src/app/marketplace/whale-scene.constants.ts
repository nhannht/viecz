import * as THREE from 'three';

export const BLOOM_LAYER = 1;
export const DESIRED_HALF_HEIGHT = 3.0;
export const CAMERA_FOV = 45;

// Debug visualizations: enable via URL query param ?debug_3d=true
export const DEBUG_3D = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug_3d') === 'true';
export const TRAIL_MAX_POINTS = 600; // ~10s at 60fps
export const TRAIL_COLOR = 0xff4444;

// Direction animation names matching the GLB
export const DIR_ANIMS = {
  forward: 'move f',
  left: 'move l',
  right: 'move r',
  up: 'move u',
  down: 'move d',
} as const;
export type Direction = keyof typeof DIR_ANIMS;


export const GULP_ANIM = 'gulp';
export const SURFACE_ANIM = 'surface';
export const BLEND_SPEED = 0.6;
export const DIR_HOLD_TIME = 2000;

// Floating particles
export const PARTICLE_COUNT = 1500;
export const PARTICLE_DRIFT_Y = 0.15;
export const PARTICLE_SWAY_FREQ = 0.4;
export const PARTICLE_SWAY_AMP = 0.3;

// Underwater current — Abzu-style directional drift
export const CURRENT_ANGLE_DEG = 0;       // 0 = rightward (+X)
export const CURRENT_STRENGTH = 0.08;     // world units/sec — subtle drift

/** Shared context passed to all whale scene helpers */
export interface WhaleSceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  modelGroup: THREE.Group | null;
  whalePos: THREE.Vector3;
  whaleVelocity: THREE.Vector3;
  whaleTarget: THREE.Vector3;
  swimRangeX: number;
  swimRangeY: number;
  swimRangeZ: number;
  activeDir: Direction;
  enteringScene: boolean;
  isReacting: boolean;
  dirActions: Record<Direction, THREE.AnimationAction | null>;
  surfaceAction: THREE.AnimationAction | null;
  gulpAction: THREE.AnimationAction | null;
}
