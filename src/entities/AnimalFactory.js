import * as THREE from 'three';
import { GRID, ANIMAL_DEFS } from '../core/Constants.js';

// --- Shared material helper ---
function mat(color, emissive = 0x000000) {
  return new THREE.MeshLambertMaterial({ color, emissive });
}

// --- COW ---
function buildCow(color = 0xffffff, bodyW = 1.2, bodyH = 0.8, bodyD = 0.7) {
  const group = new THREE.Group();

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyD), mat(color));
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);
  group.userData.body = body;

  // Legs (4 corners)
  const legMat = mat(0x8b4513);
  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6);
  const legOffsets = [
    [ 0.4, 0.1,  0.25],
    [-0.4, 0.1,  0.25],
    [ 0.4, 0.1, -0.25],
    [-0.4, 0.1, -0.25],
  ];
  for (const [lx, ly, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    group.add(leg);
  }

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), mat(color));
  head.position.set(0.65, 0.75, 0);
  head.castShadow = true;
  group.add(head);
  group.userData.head = head;

  // Horns
  const hornMat = mat(0xd4a017);
  const hornGeo = new THREE.ConeGeometry(0.04, 0.15, 6);
  for (const sign of [-1, 1]) {
    const horn = new THREE.Mesh(hornGeo, hornMat);
    horn.position.set(0.65, 1.05, sign * 0.12);
    horn.rotation.z = sign * 0.3;
    group.add(horn);
  }

  // Black patches on body
  const patchMat = mat(0x111111);
  const patchPositions = [
    [0.1, 0.62, 0.36],
    [-0.2, 0.55, -0.36],
    [0.3, 0.7, 0.1],
  ];
  for (const [px, py, pz] of patchPositions) {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.02), patchMat);
    patch.position.set(px, py, pz);
    group.add(patch);
  }

  return group;
}

// --- SHEEP ---
function buildSheep() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10), mat(0xf5f5f5));
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);
  group.userData.body = body;

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), mat(0x333333));
  face.position.set(0.48, 0.6, 0);
  face.castShadow = true;
  group.add(face);
  group.userData.head = face;

  const legMat = mat(0x333333);
  const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6);
  const legOffsets = [
    [ 0.25, 0.15,  0.2],
    [-0.25, 0.15,  0.2],
    [ 0.25, 0.15, -0.2],
    [-0.25, 0.15, -0.2],
  ];
  for (const [lx, ly, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    group.add(leg);
  }

  return group;
}

// --- GOAT ---
function buildGoat() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.5), mat(0xd2b48c));
  body.position.y = 0.6;
  body.castShadow = true;
  group.add(body);
  group.userData.body = body;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.25), mat(0xd2b48c));
  head.position.set(0.55, 0.85, 0);
  group.add(head);
  group.userData.head = head;

  const legMat = mat(0xb8986a);
  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6);
  const legOffsets = [
    [ 0.28, 0.1,  0.18],
    [-0.28, 0.1,  0.18],
    [ 0.28, 0.1, -0.18],
    [-0.28, 0.1, -0.18],
  ];
  for (const [lx, ly, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    group.add(leg);
  }

  // Backward-pointing horns
  const hornMat = mat(0x888855);
  const hornGeo = new THREE.ConeGeometry(0.04, 0.2, 6);
  for (const sign of [-1, 1]) {
    const horn = new THREE.Mesh(hornGeo, hornMat);
    horn.position.set(0.42, 1.02, sign * 0.07);
    horn.rotation.x = -0.8;
    horn.rotation.z = sign * 0.2;
    group.add(horn);
  }

  return group;
}

// --- CHICKEN ---
function buildChicken() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), mat(0xffd700));
  body.position.y = 0.25;
  body.castShadow = true;
  group.add(body);
  group.userData.body = body;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), mat(0xffd700));
  head.position.set(0.22, 0.42, 0);
  group.add(head);
  group.userData.head = head;

  // Beak
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), mat(0xff8800));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.35, 0.42, 0);
  group.add(beak);

  // Comb
  const comb = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 5), mat(0xcc0000));
  comb.position.set(0.2, 0.56, 0);
  group.add(comb);

  // Legs
  const legMat = mat(0xff8800);
  const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.15, 5);
  for (const sign of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(0, 0.08, sign * 0.08);
    leg.castShadow = true;
    group.add(leg);
  }

  return group;
}

// --- Public API ---

export function createAnimal(type) {
  let group;
  switch (type) {
    case 'cow':
      group = buildCow(0xffffff, 1.2, 0.8, 0.7);
      break;
    case 'beef':
      group = buildCow(0x8b4513, 1.4, 0.9, 0.8);
      break;
    case 'sheep':
      group = buildSheep();
      break;
    case 'goat':
      group = buildGoat();
      break;
    case 'chicken':
      group = buildChicken();
      break;
    default:
      group = buildCow(0xffffff, 1.2, 0.8, 0.7);
  }

  group.userData.type = type;

  // Collar placeholder (hidden by default)
  const collarGeo = new THREE.SphereGeometry(0.1, 6, 6);
  const collarMat = new THREE.MeshLambertMaterial({ color: 0x06b6d4 });
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.visible = false;
  // Position above head if head exists, else above body
  const headRef = group.userData.head;
  if (headRef) {
    collar.position.copy(headRef.position);
    collar.position.y += 0.25;
  } else {
    collar.position.y = 1.2;
  }
  group.add(collar);
  group.userData.collar = collar;

  return group;
}

export function updateAnimalVisuals(group, animal, delta, elapsedTime) {
  if (!group || !animal) return;

  // World position
  const worldX = animal.x * GRID.TILE_SIZE;
  const worldZ = animal.y * GRID.TILE_SIZE;
  const bob = Math.sin(elapsedTime * 2 + animal.x) * 0.05;
  group.position.set(worldX, 0.5 + bob, worldZ);

  // Face movement direction
  if (animal.targetX !== undefined && animal.targetY !== undefined) {
    const dx = animal.targetX * GRID.TILE_SIZE - worldX;
    const dz = animal.targetY * GRID.TILE_SIZE - worldZ;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      group.rotation.y = Math.atan2(dx, dz);
    }
  }

  // Sick tint
  const body = group.userData.body;
  if (body && body.material) {
    body.material.emissive.setHex(animal.sick ? 0x330000 : 0x000000);
  }

  // Collar visibility
  const collar = group.userData.collar;
  if (collar) {
    collar.visible = !!animal.collarVisible;
  }
}
