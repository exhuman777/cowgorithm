import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GRID } from '../core/Constants.js';
import { gameState } from '../core/GameState.js';

const vertexShader = /* glsl */ `
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vec3 pos = position;
  pos.y += sin(pos.x * 2.5 + uTime * 1.5) * 0.08 + sin(pos.z * 3.0 + uTime * 2.0) * 0.05;

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

// Simplex-ish noise (hash-based)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec3 deepTeal = vec3(0.05, 0.35, 0.65);
  vec3 turquoise = vec3(0.12, 0.55, 0.85);

  // Noise caustics
  float n = snoise(vWorldPos.xz * 3.0 + uTime * 0.5);
  float caustic = smoothstep(0.3, 0.8, n) * 0.3;

  vec3 baseColor = mix(deepTeal, turquoise, 0.5 + n * 0.3);
  baseColor += caustic;

  // Fresnel reflection
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
  baseColor = mix(baseColor, uSkyColor, fresnel * 0.5);

  // Sun specular
  vec3 sunDir = normalize(uSunDir - vWorldPos);
  vec3 halfDir = normalize(viewDir + sunDir);
  float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0);
  baseColor += vec3(1.0, 0.95, 0.8) * spec * 0.6;

  // Day/night darkening (subtle -- scene lights already handle most of it)
  float dayAngle = uDayProgress * 6.28318;
  float daylight = sin(dayAngle) * 0.5 + 0.5;
  baseColor *= mix(0.6, 1.0, daylight);

  float alpha = mix(0.80, 0.95, fresnel);
  gl_FragColor = vec4(baseColor, alpha);
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
      side: THREE.DoubleSide,
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
          const geo = new THREE.PlaneGeometry(ts, ts, 2, 2);
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
