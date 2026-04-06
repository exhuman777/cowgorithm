import * as THREE from 'three';

export function applyTreeSway(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uWindStrength = { value: 0.5 };

    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      `uniform float uTime;
       uniform float uWindStrength;
       void main() {`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vec4 worldPos = modelMatrix * vec4(position, 1.0);
       float heightFactor = clamp(position.y / 1.5, 0.0, 1.0);
       float sway = sin(uTime * 1.5 + worldPos.x * 0.5 + worldPos.z * 0.3) * 0.15;
       sway += sin(uTime * 2.3 + worldPos.x * 0.8) * 0.05;
       transformed.x += sway * heightFactor * uWindStrength;
       transformed.z += sway * heightFactor * uWindStrength * 0.5;`
    );

    material.userData.shader = shader;
  };

  return material;
}

export function updateTreeSwayUniforms(trees, elapsedTime, windStrength) {
  for (const tree of trees) {
    const foliage = tree.children[1];
    if (!foliage || !foliage.material || !foliage.material.userData.shader) continue;
    const shader = foliage.material.userData.shader;
    shader.uniforms.uTime.value = elapsedTime;
    shader.uniforms.uWindStrength.value = windStrength;
  }
}
