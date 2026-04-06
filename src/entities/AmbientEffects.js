import * as THREE from 'three';

export class AmbientEffects {
  constructor(scene) {
    this.scene = scene;
    this.season = 'spring';

    // Butterflies
    this.butterflies = [];
    this.butterflyColors = [0xf0c040, 0xe07020, 0xf5f5f0];

    // Dandelion seeds
    this.dandelions = [];

    // Falling leaves
    this.leaves = [];
    this.leafColors = [0xc47a1a, 0xb85c0a, 0x8b4513, 0xd4a017, 0xcc2222];
    this.treePositions = [];
    this.gustTimer = 0;
    this.gustDuration = 0;
    this.gustActive = false;
    this.gustDir = { x: 0, z: 0 };

    // Breath vapor
    this.breathPuffs = [];

    // Birds
    this.birds = [];

    // Wildflowers
    this.wildflowers = [];
  }

  setSeason(season) {
    this.season = season;
    this._updateBirds();
  }

  update(delta, elapsedTime, visualDayProgress) {
    this._updateButterflies(delta, elapsedTime, visualDayProgress);
    this._updateDandelions(delta);
    this._updateLeaves(delta, elapsedTime);
    this._updateBreath(delta);
    this._updateBirds_frame(delta, elapsedTime);
  }

  // --- Butterflies ---

  _updateButterflies(delta, elapsedTime, visualDayProgress) {
    const active = this.season === 'spring' || this.season === 'summer';
    const isDay = visualDayProgress < 0.5;
    if (!active || !isDay) {
      this._clearArray(this.butterflies);
      return;
    }

    const cap = this.season === 'summer' ? 20 : 15;

    // Spawn
    if (this.butterflies.length < cap && Math.random() < 0.08) {
      const color = this.butterflyColors[Math.floor(Math.random() * this.butterflyColors.length)];
      const geo = new THREE.PlaneGeometry(0.12, 0.08);
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.85,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        8 + Math.random() * 48,
        1 + Math.random() * 2,
        4 + Math.random() * 32
      );
      this.scene.add(mesh);
      this.butterflies.push({
        mesh, age: 0,
        lifetime: 8 + Math.random() * 7,
        phase: Math.random() * Math.PI * 2,
        baseX: mesh.position.x,
        baseZ: mesh.position.z,
        baseY: mesh.position.y,
      });
    }

    // Update
    for (let i = this.butterflies.length - 1; i >= 0; i--) {
      const b = this.butterflies[i];
      b.age += delta;
      b.mesh.position.x = b.baseX + Math.sin(b.age * 0.8 + b.phase) * 2;
      b.mesh.position.z = b.baseZ + Math.cos(b.age * 0.6 + b.phase) * 1.5;
      b.mesh.position.y = b.baseY + Math.sin(b.age * 1.2) * 0.3;
      // Wing flap
      b.mesh.rotation.x = Math.sin(elapsedTime * 6 + b.phase) * 0.6;

      if (b.age >= b.lifetime) {
        this._dispose(b.mesh);
        this.butterflies.splice(i, 1);
      }
    }
  }

  // --- Dandelion Seeds ---

  _updateDandelions(delta) {
    if (this.season !== 'summer') {
      this._clearArray(this.dandelions);
      return;
    }

    // Spawn
    if (this.dandelions.length < 10 && Math.random() < 0.03) {
      const geo = new THREE.SphereGeometry(0.04, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        8 + Math.random() * 48,
        4 + Math.random() * 4,
        4 + Math.random() * 32
      );
      this.scene.add(mesh);
      this.dandelions.push({
        mesh, age: 0,
        lifetime: 10 + Math.random() * 10,
        driftX: 0.5 + Math.random(),
        wobblePhase: Math.random() * Math.PI * 2,
      });
    }

    // Update
    for (let i = this.dandelions.length - 1; i >= 0; i--) {
      const d = this.dandelions[i];
      d.age += delta;
      d.mesh.position.y -= 0.1 * delta;
      d.mesh.position.x += d.driftX * delta;
      d.mesh.position.z += Math.sin(d.age * 0.5 + d.wobblePhase) * 0.2 * delta;

      if (d.age >= d.lifetime || d.mesh.position.y < 0) {
        this._dispose(d.mesh);
        this.dandelions.splice(i, 1);
      }
    }
  }

  // --- Falling Leaves ---

  _updateLeaves(delta, elapsedTime) {
    if (this.season !== 'fall') {
      this._clearArray(this.leaves);
      return;
    }

    // Wind gusts
    if (!this.gustActive) {
      this.gustTimer -= delta;
      if (this.gustTimer <= 0) {
        this.gustActive = true;
        this.gustDuration = 2 + Math.random();
        this.gustDir = {
          x: (Math.random() - 0.5) * 4,
          z: (Math.random() - 0.5) * 2,
        };
      }
    } else {
      this.gustDuration -= delta;
      if (this.gustDuration <= 0) {
        this.gustActive = false;
        this.gustTimer = 8 + Math.random() * 7;
      }
    }

    // Spawn from tree positions
    if (this.leaves.length < 60 && this.treePositions.length > 0 && Math.random() < 0.15) {
      const src = this.treePositions[Math.floor(Math.random() * this.treePositions.length)];
      const color = this.leafColors[Math.floor(Math.random() * this.leafColors.length)];
      const geo = new THREE.PlaneGeometry(0.1, 0.08);
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.85,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        src.x + (Math.random() - 0.5) * 2,
        2.5 + Math.random() * 2,
        src.z + (Math.random() - 0.5) * 2
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(mesh);
      this.leaves.push({
        mesh, age: 0,
        lifetime: 5 + Math.random() * 5,
        fallSpeed: 0.5 + Math.random() * 0.5,
        driftX: (Math.random() - 0.5) * 0.5,
        driftZ: (Math.random() - 0.5) * 0.3,
      });
    }

    // Update
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const l = this.leaves[i];
      l.age += delta;
      l.mesh.position.y -= l.fallSpeed * delta;
      l.mesh.position.x += l.driftX * delta;
      l.mesh.position.z += l.driftZ * delta;

      // Tumble
      l.mesh.rotation.x += 2 * delta;
      l.mesh.rotation.z += 1.5 * delta;

      // Wind gust
      if (this.gustActive) {
        l.mesh.position.x += this.gustDir.x * delta;
        l.mesh.position.z += this.gustDir.z * delta;
      }

      if (l.age >= l.lifetime || l.mesh.position.y < 0) {
        this._dispose(l.mesh);
        this.leaves.splice(i, 1);
      }
    }
  }

  // --- Breath Vapor ---

  spawnBreath(x, y, z) {
    if (this.breathPuffs.length >= 30) return;
    const geo = new THREE.SphereGeometry(0.03, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.breathPuffs.push({ mesh, age: 0, lifetime: 1.5 });
  }

  _updateBreath(delta) {
    for (let i = this.breathPuffs.length - 1; i >= 0; i--) {
      const p = this.breathPuffs[i];
      p.age += delta;
      p.mesh.position.y += 0.15 * delta;
      const t = p.age / p.lifetime;
      const scale = 1 + t * 0.5;
      p.mesh.scale.set(scale, scale, scale);
      p.mesh.material.opacity = 0.5 * (1 - t);

      if (p.age >= p.lifetime) {
        this._dispose(p.mesh);
        this.breathPuffs.splice(i, 1);
      }
    }
  }

  // --- Birds ---

  _updateBirds() {
    // Set target count based on season
    const counts = { spring: 5, summer: 5, fall: 4, winter: 3 };
    const target = counts[this.season] || 4;

    // Remove excess
    while (this.birds.length > target) {
      const b = this.birds.pop();
      this.scene.remove(b.group);
      b.group.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
    }

    // Add missing
    while (this.birds.length < target) {
      const group = new THREE.Group();

      // V-shape: two small triangle wings
      const wingGeo = new THREE.BufferGeometry();
      const verts = new Float32Array([0, 0, 0, 0.15, 0.04, -0.05, 0.15, -0.04, -0.05]);
      wingGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      wingGeo.computeVertexNormals();
      const wingMat = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      const rightWing = new THREE.Mesh(wingGeo.clone(), wingMat);
      rightWing.scale.x = -1;
      group.add(leftWing);
      group.add(rightWing);

      this.scene.add(group);
      this.birds.push({
        group,
        leftWing,
        rightWing,
        radius: 25 + Math.random() * 10,
        altitude: 15 + Math.random() * 5,
        speed: 0.15 + Math.random() * 0.15,
        angle: Math.random() * Math.PI * 2,
        centerX: 32,
        centerZ: 20,
        flapPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  _updateBirds_frame(delta, elapsedTime) {
    for (const b of this.birds) {
      b.angle += b.speed * delta;
      b.group.position.x = b.centerX + Math.cos(b.angle) * b.radius;
      b.group.position.z = b.centerZ + Math.sin(b.angle) * b.radius;
      b.group.position.y = b.altitude;
      // Face direction of travel
      b.group.rotation.y = -b.angle + Math.PI / 2;
      // Wing flap
      const flap = Math.sin(elapsedTime * 4 + b.flapPhase) * 0.4;
      b.leftWing.rotation.z = flap;
      b.rightWing.rotation.z = -flap;
    }
  }

  // --- Wildflowers ---

  placeWildflowers(positions) {
    this.clearWildflowers();
    if (!positions || positions.length === 0) return;

    const colors = this.season === 'spring'
      ? [0xf0c040, 0xffd700, 0xffffff, 0x9966cc]
      : [0xff6347, 0xffa500, 0xffff00];

    // Place on ~15% of positions
    for (const pos of positions) {
      if (Math.random() > 0.15) continue;
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const geo = new THREE.SphereGeometry(0.04, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          pos.x + (Math.random() - 0.5) * 1.6,
          0.05,
          pos.z + (Math.random() - 0.5) * 1.6
        );
        this.scene.add(mesh);
        this.wildflowers.push(mesh);
      }
    }
  }

  clearWildflowers() {
    for (const mesh of this.wildflowers) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.wildflowers = [];
  }

  // --- Helpers ---

  _dispose(mesh) {
    this.scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
  }

  _clearArray(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const item = arr[i];
      const mesh = item.mesh || item.group;
      if (mesh) {
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
        // For groups (birds)
        if (mesh.traverse) {
          mesh.traverse(child => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) child.material.dispose();
            }
          });
        }
      }
    }
    arr.length = 0;
  }
}
