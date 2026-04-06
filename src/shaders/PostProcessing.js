import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uDayProgress: { value: 0 },
    uSeasonTint: { value: new THREE.Vector3(1, 1, 1) },
    uVignette: { value: 0.35 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uDayProgress;
    uniform vec3 uSeasonTint;
    uniform float uVignette;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Season tint (subtle overlay)
      color.rgb = mix(color.rgb, color.rgb * uSeasonTint, 0.15);

      // Day warmth curve: warm at dawn/dusk, neutral midday, cool at night
      float dayAngle = uDayProgress * 6.28318;
      float warmth = sin(dayAngle) * 0.5 + 0.5;
      vec3 warmTint = mix(vec3(0.7, 0.75, 1.0), vec3(1.0, 0.95, 0.9), warmth);
      color.rgb *= warmTint;

      // Slight contrast boost
      color.rgb = (color.rgb - 0.5) * 1.08 + 0.5;

      // Vignette
      vec2 uv = vUv * 2.0 - 1.0;
      float vig = 1.0 - dot(uv, uv) * uVignette;
      color.rgb *= clamp(vig, 0.0, 1.0);

      gl_FragColor = color;
    }
  `,
};

const SEASON_TINTS = {
  spring: new THREE.Vector3(0.95, 1.05, 0.95),
  summer: new THREE.Vector3(1.05, 1.02, 0.92),
  fall:   new THREE.Vector3(1.08, 0.95, 0.85),
  winter: new THREE.Vector3(0.90, 0.95, 1.08),
};

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    const size = renderer.getSize(new THREE.Vector2());
    this.bloomPass = new UnrealBloomPass(size, 0.25, 0.4, 0.85);
    this.composer.addPass(this.bloomPass);

    this.colorPass = new ShaderPass(ColorGradeShader);
    this.composer.addPass(this.colorPass);
  }

  setSeason(season) {
    const tint = SEASON_TINTS[season] || SEASON_TINTS.spring;
    this.colorPass.uniforms.uSeasonTint.value.copy(tint);
  }

  update(dayProgress) {
    this.colorPass.uniforms.uDayProgress.value = dayProgress;
  }

  render() {
    this.composer.render();
  }

  resize(w, h) {
    this.composer.setSize(w, h);
  }
}
