import * as THREE from 'three';

function mat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

// --- FARMHOUSE ---
function buildFarmhouse() {
  const group = new THREE.Group();

  const walls = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 2), mat(0x8b4513));
  walls.position.y = 0.75;
  walls.castShadow = true;
  group.add(walls);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1, 4), mat(0xcc2222));
  roof.position.y = 2.0;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.05), mat(0x5c3310));
  door.position.set(0, 0.3, 1.03);
  group.add(door);

  return group;
}

// --- BARN ---
function buildBarn() {
  const group = new THREE.Group();

  const walls = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2, 2), mat(0x8b6914));
  walls.position.y = 1.0;
  walls.castShadow = true;
  group.add(walls);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.2, 4), mat(0x6b3a10));
  roof.position.y = 2.6;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Barn doors (two panels)
  const doorMat = mat(0x5c3310);
  const doorGeo = new THREE.BoxGeometry(0.55, 1.2, 0.06);
  for (const sign of [-1, 1]) {
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(sign * 0.3, 0.6, 1.04);
    group.add(door);
  }

  return group;
}

// --- MILKING STATION ---
function buildMilking() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 1.5), mat(0xe0e0e0));
  base.position.y = 0.5;
  base.castShadow = true;
  group.add(base);

  // Two tanks on top
  const tankMat = mat(0xb0b0b0);
  const tankGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 10);
  for (const sign of [-1, 1]) {
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(sign * 0.35, 1.2, 0);
    tank.castShadow = true;
    group.add(tank);
  }

  // Flat roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 1.6), mat(0xcccccc));
  roof.position.y = 1.035;
  group.add(roof);

  return group;
}

// --- SHEARING SHED ---
function buildShearing() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 1.5), mat(0xd4a574));
  base.position.y = 0.5;
  base.castShadow = true;
  group.add(base);

  // Sloped roof (thin box tilted)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 1.7), mat(0xb8865a));
  roof.position.y = 1.1;
  roof.rotation.x = 0.15;
  roof.castShadow = true;
  group.add(roof);

  return group;
}

// --- CHICKEN COOP ---
function buildCoop() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), mat(0xc4a35a));
  base.position.y = 0.4;
  base.castShadow = true;
  group.add(base);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.6, 4), mat(0x9a7040));
  roof.position.y = 1.1;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Small door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.05), mat(0x6b4010));
  door.position.set(0, 0.125, 0.53);
  group.add(door);

  return group;
}

// --- SILO ---
function buildSilo() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.5, 14), mat(0x708090));
  body.position.y = 1.25;
  body.castShadow = true;
  group.add(body);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.5, 14), mat(0x556070));
  cap.position.y = 2.75;
  cap.castShadow = true;
  group.add(cap);

  return group;
}

// --- SOLAR ARRAY ---
function buildSolar() {
  const group = new THREE.Group();

  // Frame base
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.5), mat(0x1e3a5f));
  frame.position.y = 0.15;
  frame.castShadow = true;
  group.add(frame);

  // Support posts
  const postMat = mat(0x3a4a5a);
  const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6);
  const postOffsets = [
    [ 0.55, 0.25,  0.55],
    [-0.55, 0.25,  0.55],
    [ 0.55, 0.25, -0.55],
    [-0.55, 0.25, -0.55],
  ];
  for (const [px, py, pz] of postOffsets) {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(px, py, pz);
    group.add(post);
  }

  // Solar panel (PlaneGeometry, tilted 30 degrees)
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.04, 1.2),
    mat(0x1565c0)
  );
  panel.position.set(0, 0.65, -0.1);
  panel.rotation.x = -0.52; // ~30 degrees
  panel.castShadow = true;
  group.add(panel);

  // Grid lines on panel for visual interest
  const lineMat = mat(0x0d47a1);
  for (let i = -2; i <= 2; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 1.22), lineMat);
    line.position.set(i * 0.35, 0.69, -0.1);
    line.rotation.x = -0.52;
    group.add(line);
  }

  return group;
}

// --- DRONE STATION ---
function buildDrone() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), mat(0x4a4a5a));
  base.position.y = 0.4;
  base.castShadow = true;
  group.add(base);

  // Rotor platform
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 10), mat(0x333344));
  platform.position.y = 0.83;
  group.add(platform);

  // Rotor (thin box that spins)
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.12), mat(0x888899));
  rotor.position.y = 0.9;
  group.add(rotor);
  group.userData.rotor = rotor;

  // Landing legs
  const legMat = mat(0x555566);
  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 5);
  const legOffsets = [
    [ 0.4, 0.12,  0.4],
    [-0.4, 0.12,  0.4],
    [ 0.4, 0.12, -0.4],
    [-0.4, 0.12, -0.4],
  ];
  for (const [lx, ly, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, ly, lz);
    group.add(leg);
  }

  return group;
}

// --- VET LAB ---
function buildVet() {
  const group = new THREE.Group();

  const walls = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.5), mat(0xf5f5f5));
  walls.position.y = 0.6;
  walls.castShadow = true;
  group.add(walls);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.6), mat(0xdddddd));
  roof.position.y = 1.24;
  group.add(roof);

  // Green cross on front face
  const crossMat = mat(0x10b981);
  const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.06), crossMat);
  hBar.position.set(0, 0.65, 0.78);
  group.add(hBar);

  const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.06), crossMat);
  vBar.position.set(0, 0.65, 0.78);
  group.add(vBar);

  return group;
}

// --- AI COMMAND CENTER ---
function buildAICenter() {
  const group = new THREE.Group();

  const walls = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 2), mat(0x6d28d9));
  walls.position.y = 0.75;
  walls.castShadow = true;
  group.add(walls);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 2.1), mat(0x5b21b6));
  roof.position.y = 1.55;
  group.add(roof);

  // Antenna
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), mat(0x888888));
  antenna.position.y = 1.85;
  group.add(antenna);

  // Cyan beacon sphere
  const beaconMat = new THREE.MeshLambertMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.6,
  });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), beaconMat);
  beacon.position.y = 2.15;
  group.add(beacon);
  group.userData.beacon = beacon;

  // Decorative panels on sides
  const panelMat = mat(0x7c3aed);
  for (const [px, pz, rotY] of [[0, 1.06, 0], [0, -1.06, Math.PI], [1.06, 0, Math.PI / 2], [-1.06, 0, -Math.PI / 2]]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.04), panelMat);
    panel.position.set(px, 0.9, pz);
    panel.rotation.y = rotY;
    group.add(panel);
  }

  return group;
}

// --- RANGE RING ---
export function createRangeRing(radius, color) {
  const geo = new THREE.RingGeometry(radius - 0.1, radius, 48);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

// --- Public API ---
export function createBuilding(type) {
  let group;
  switch (type) {
    case 'farmhouse': group = buildFarmhouse(); break;
    case 'barn':      group = buildBarn();      break;
    case 'milking':   group = buildMilking();   break;
    case 'shearing':  group = buildShearing();  break;
    case 'coop':      group = buildCoop();      break;
    case 'silo':      group = buildSilo();      break;
    case 'solar':     group = buildSolar();     break;
    case 'drone':     group = buildDrone();     break;
    case 'vet':       group = buildVet();       break;
    case 'ai_center': group = buildAICenter();  break;
    default:
      // Fallback: plain box
      group = new THREE.Group();
      const fallback = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), mat(0x888888));
      fallback.position.y = 0.75;
      fallback.castShadow = true;
      group.add(fallback);
  }
  group.userData.type = type;
  return group;
}
