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
  const foliageMat = applyTreeSway(new THREE.MeshLambertMaterial({ color: 0x2d6a1e }));
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

// Season color maps
const TREE_SEASON_COLORS = {
  spring: 0x2d6a1e,
  summer: 0x3a7a28,
  fall:   0xc47a1a,
  winter: 0x6a6a60,
};

const SAKURA_SEASON_COLORS = {
  spring: 0xf0b0c0,
  summer: 0x2d6a1e,
  fall:   0xe0a080,
  winter: 0xc0c0c0,
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
