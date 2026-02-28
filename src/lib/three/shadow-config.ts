import * as THREE from 'three';

// ─── Shadow Map Constants ────────────────────────────────────────────

export const SHADOW_MAP_SIZE_HIGH = 2048;
export const SHADOW_MAP_SIZE_LOW = 1024;

/**
 * Enable shadow maps on the WebGL renderer with PCF soft shadows.
 */
export function configureShadows(renderer: THREE.WebGLRenderer): void {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

/**
 * Check FPS and recommend shadow map downgrade if below threshold.
 * Returns the recommended shadow map size.
 */
export function checkFps(fps: number): {
  recommendedSize: number;
  shouldDowngrade: boolean;
} {
  if (fps < 30) {
    return { recommendedSize: SHADOW_MAP_SIZE_LOW, shouldDowngrade: true };
  }
  return { recommendedSize: SHADOW_MAP_SIZE_HIGH, shouldDowngrade: false };
}

/**
 * Configure a directional light for shadow casting.
 */
export function configureSunShadow(
  light: THREE.DirectionalLight,
  mapSize: number = SHADOW_MAP_SIZE_HIGH,
): void {
  light.castShadow = true;
  light.shadow.mapSize.width = mapSize;
  light.shadow.mapSize.height = mapSize;
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 100;
  light.shadow.camera.left = -15;
  light.shadow.camera.right = 15;
  light.shadow.camera.top = 15;
  light.shadow.camera.bottom = -15;
  light.shadow.bias = -0.0005;
}
