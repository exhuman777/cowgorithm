import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GRID } from '../core/Constants.js';
import { gameState } from '../core/GameState.js';

const vertexShader = /* glsl */ `
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vWave;

void main() {
  vec3 pos = position;

  // Gentle layered sine waves
  float wave1 = sin(pos.x * 1.8 + uTime * 1.2) * 0.06;
  float wave2 = sin(pos.z * 2.2 + uTime * 0.9) * 0.04;
  float wave3 = sin((pos.x + pos.z) * 1.0 + uTime * 1.6) * 0.03;
  pos.y += wave1 + wave2 + wave3;
  vWave = wave1 + wave2;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uDayProgress;
uniform vec3 uSkyColor;
uniform vec3 uSunDir;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vWave;

void main() {
  // Bright cheerful base colors
  vec3 shallowBlue = vec3(0.30, 0.70, 0.92);
  vec3 deepBlue = vec3(0.15, 0.50, 0.82);

  // Smooth ripple pattern using sine waves (no noise = no ugly voids)
  float ripple1 = sin(vWorldPos.x * 2.0 + vWorldPos.z * 1.5 + uTime * 1.3) * 0.5 + 0.5;
  float ripple2 = sin(vWorldPos.x * 1.2 - vWorldPos.z * 2.5 + uTime * 0.8) * 0.5 + 0.5;
  float ripple = ripple1 * 0.6 + ripple2 * 0.4;

  vec3 baseColor = mix(deepBlue, shallowBlue, ripple * 0.5 + 0.25);

  // Bright shimmer highlights on wave peaks
  float shimmer = smoothstep(0.03, 0.08, vWave);
  baseColor += vec3(0.15, 0.18, 0.20) * shimmer;

  // Gentle fresnel -- sky reflection at glancing angles
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.5);
  baseColor = mix(baseColor, uSkyColor * 0.9 + 0.1, fresnel * 0.35);

  // Soft sun specular
  vec3 sunDir = normalize(uSunDir - vWorldPos);
  vec3 halfDir = normalize(viewDir + sunDir);
  float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0);
  baseColor += vec3(1.0, 0.97, 0.90) * spec * 0.35;

  // Day/night: subtle only, scene lights handle the rest
  float dayAngle = uDayProgress * 6.28318;
  float daylight = sin(dayAngle) * 0.5 + 0.5;
  baseColor *= mix(0.7, 1.0, daylight);

  gl_FragColor = vec4(baseColor, 0.75);
}
`;

export class WaterPlane {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uDayProgress: { value: 0 },
        uSkyColor: { value: new THREE.Vector3(0.53, 0.81, 0.92) },
        uSunDir: { value: new THREE.Vector3(30, 40, 20) },
      },
      transparent: true,
      depthWrite: false,
    });
  }

  rebuild() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }

    const quads = [];
    const ts = GRID.TILE_SIZE;
    for (let row = 0; row < GRID.ROWS; row++) {
      for (let col = 0; col < GRID.COLS; col++) {
        const tile = gameState.map[row]?.[col];
        if (tile && tile.type === 'water') {
          const geo = new THREE.PlaneGeometry(ts, ts, 4, 4);
          geo.rotateX(-Math.PI / 2);
          geo.translate(col * ts + ts / 2, 0, row * ts + ts / 2);
          quads.push(geo);
        }
      }
    }

    if (quads.length === 0) return;

    const merged = mergeGeometries(quads, false);
    quads.forEach(g => g.dispose());

    this.mesh = new THREE.Mesh(merged, this.material);
    this.mesh.position.y = 0.02;
    this.mesh.renderOrder = 1;
    this.scene.add(this.mesh);
  }

  update(elapsedTime, dayProgress, skyColor, sunPosition) {
    const u = this.material.uniforms;
    u.uTime.value = elapsedTime;
    u.uDayProgress.value = dayProgress;
    if (skyColor) u.uSkyColor.value.set(skyColor.r, skyColor.g, skyColor.b);
    if (sunPosition) u.uSunDir.value.set(sunPosition.x, sunPosition.y, sunPosition.z);
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material.dispose();
      this.mesh = null;
    }
  }
}
