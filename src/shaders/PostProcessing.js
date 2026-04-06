import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uDayProgress: { value: 0 },
    uSeasonTint: { value: new THREE.Vector3(1, 1, 1) },
    uVignette: { value: 0.15 },
    uHeatWave: { value: 0.0 },
    uTime: { value: 0.0 },
    uDrought: { value: 0.0 },
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
    uniform float uHeatWave;
    uniform float uTime;
    uniform float uDrought;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;

      // Heat wave shimmer distortion
      if (uHeatWave > 0.0) {
        float distort = sin(uv.y * 30.0 + uTime * 3.0) * 0.003 * uHeatWave;
        distort += sin(uv.y * 50.0 + uTime * 5.0) * 0.001 * uHeatWave;
        uv.x += distort;
      }

      vec4 color = texture2D(tDiffuse, uv);

      // Season tint (subtle overlay)
      color.rgb = mix(color.rgb, color.rgb * uSeasonTint, 0.15);

      // Heat wave warm tint
      if (uHeatWave > 0.0) {
        color.rgb = mix(color.rgb, color.rgb * vec3(1.08, 1.02, 0.92), uHeatWave * 0.4);
      }

      // Drought desaturation + warm push
      if (uDrought > 0.0) {
        float grey = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        color.rgb = mix(color.rgb, vec3(grey) * vec3(1.1, 1.0, 0.85), uDrought * 0.3);
      }

      // Day warmth curve: subtle hue shift only, no brightness reduction
      float dayAngle = uDayProgress * 6.28318;
      float warmth = sin(dayAngle) * 0.5 + 0.5;
      vec3 warmTint = mix(vec3(0.92, 0.94, 1.0), vec3(1.0, 0.98, 0.96), warmth);
      color.rgb *= warmTint;

      // Very slight contrast boost
      color.rgb = (color.rgb - 0.5) * 1.03 + 0.5;

      // Vignette
      vec2 vigUv = vUv * 2.0 - 1.0;
      float vig = 1.0 - dot(vigUv, vigUv) * uVignette;
      color.rgb *= clamp(vig, 0.0, 1.0);

      gl_FragColor = color;
    }
  `,
};

const SEASON_TINTS = {
  spring: new THREE.Vector3(0.98, 1.02, 0.98),
  summer: new THREE.Vector3(1.02, 1.01, 0.97),
  fall:   new THREE.Vector3(1.03, 0.98, 0.95),
  winter: new THREE.Vector3(0.96, 0.98, 1.03),
};

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    const size = renderer.getSize(new THREE.Vector2());
    this.bloomPass = new UnrealBloomPass(size, 0.15, 0.3, 0.9);
    this.composer.addPass(this.bloomPass);

    this.colorPass = new ShaderPass(ColorGradeShader);
    this.composer.addPass(this.colorPass);

    // OutputPass handles tone mapping + sRGB gamma correction
    this.composer.addPass(new OutputPass());
  }

  setSeason(season) {
    const tint = SEASON_TINTS[season] || SEASON_TINTS.spring;
    this.colorPass.uniforms.uSeasonTint.value.copy(tint);
  }

  setHeatWave(intensity) {
    this.colorPass.uniforms.uHeatWave.value = intensity;
  }

  setDrought(intensity) {
    this.colorPass.uniforms.uDrought.value = intensity;
  }

  update(dayProgress, elapsedTime) {
    this.colorPass.uniforms.uDayProgress.value = dayProgress;
    if (elapsedTime !== undefined) this.colorPass.uniforms.uTime.value = elapsedTime;
  }

  render() {
    this.composer.render();
  }

  resize(w, h) {
    this.composer.setSize(w, h);
  }
}
