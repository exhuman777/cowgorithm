import * as THREE from 'three';

export function createTree() {
  const group = new THREE.Group();

  // Trunk
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 7), trunkMat);
  trunk.position.y = 0.3;
  trunk.castShadow = true;
  group.add(trunk);

  // Foliage cone
  const foliageMat = new THREE.MeshLambertMaterial({ color: 0x2d6a1e });
  const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.5, 6), foliageMat);
  foliage.position.y = 1.35;
  foliage.castShadow = true;
  group.add(foliage);

  // Random variation
  const scale = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  group.scale.setScalar(scale);
  group.rotation.y = Math.random() * Math.PI * 2;

  return group;
}
