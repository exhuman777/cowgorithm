import * as THREE from 'three';
import { applyTreeSway } from '../shaders/TreeSway.js';

export function createTree() {
  const group = new THREE.Group();
  group.userData.isSakura = false;

  // Trunk
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 7), trunkMat);
  trunk.position.y = 0.3;
  trunk.castShadow = true;
  group.add(trunk);

  // Foliage cone
  const foliageMat = applyTreeSway(new THREE.MeshLambertMaterial({ color: 0x4a9e2e }));
  const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.5, 6), foliageMat);
  foliage.position.y = 1.35;
  foliage.castShadow = true;
  group.add(foliage);

  // Random variation
  const scale = 0.8 + Math.random() * 0.4;
  group.scale.setScalar(scale);
  group.rotation.y = Math.random() * Math.PI * 2;

  return group;
}

export function createSakuraTree() {
  const group = new THREE.Group();
  group.userData.isSakura = true;

  // Trunk (same as regular, slightly thinner)
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3520 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.7, 7), trunkMat);
  trunk.position.y = 0.35;
  trunk.castShadow = true;
  group.add(trunk);

  // Rounder foliage (sphere instead of cone)
  const pinkShade = 0xf0b0c0 + Math.floor(Math.random() * 0x080808);
  const foliageMat = applyTreeSway(new THREE.MeshLambertMaterial({ color: pinkShade }));
  const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), foliageMat);
  foliage.position.y = 1.2;
  foliage.castShadow = true;
  foliage.scale.set(1, 0.75, 1); // Slightly flattened
  group.add(foliage);

  // Random variation
  const scale = 0.8 + Math.random() * 0.4;
  group.scale.setScalar(scale);
  group.rotation.y = Math.random() * Math.PI * 2;

  return group;
}

// Season color maps -- bright and cheerful
const TREE_SEASON_COLORS = {
  spring: 0x4a9e2e,
  summer: 0x55a835,
  fall:   0xd4922a,
  winter: 0x8a8a7a,
};

const SAKURA_SEASON_COLORS = {
  spring: 0xf8c8d8,
  summer: 0x4a9e2e,
  fall:   0xf0b888,
  winter: 0xd0d0d0,
};

export function updateTreeSeason(tree, season) {
  const foliage = tree.children[1]; // children[0]=trunk, children[1]=foliage
  if (!foliage) return;

  if (tree.userData.isSakura) {
    foliage.material.color.setHex(SAKURA_SEASON_COLORS[season] || 0xf0b0c0);
    // Winter: shrink foliage to simulate bare branches
    if (season === 'winter') {
      foliage.scale.set(0.3, 0.3, 0.3);
    } else {
      foliage.scale.set(1, 0.75, 1);
    }
  } else {
    foliage.material.color.setHex(TREE_SEASON_COLORS[season] || 0x2d6a1e);
  }
}
