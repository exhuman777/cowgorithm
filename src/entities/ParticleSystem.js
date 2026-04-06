import * as THREE from 'three';

export const PARTICLE_COLORS = {
  milk:  0xffffff,
  wool:  0xcccccc,
  eggs:  0xffd700,
  coins: 0xffd700,
  dust:  0xd2b48c,
  tech:  0x06b6d4,
};

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = []; // { mesh, velocity, lifetime, age }
    this.snowing = false;
    this.snowParticles = [];
    this.petals = [];
    this.petalActive = false;
    this.sakuraPositions = [];
    this.fireflies = [];
    this.firefliesActive = false;

    // Weather effect particles
    this.raining = false;
    this.rainParticles = [];
    this.blizzardMode = false;
    this.locustsActive = false;
    this.locustParticles = [];
    this.meteorsActive = false;
    this.meteorParticles = [];
    this.goldenActive = false;
    this.goldenParticles = [];
    this.miasmaActive = false;
    this.miasmaParticles = [];
    this.rainbowMesh = null;
    this.dustStormActive = false;
    this.dustStormParticles = [];
  }

  spawn(worldX, worldY, worldZ, color, count = 3) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.06, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        worldX + (Math.random() - 0.5) * 0.5,
        worldY + Math.random() * 0.3,
        worldZ + (Math.random() - 0.5) * 0.5
      );
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: 0.5 + Math.random() * 0.5,
        lifetime: 1 + Math.random() * 0.5,
        age: 0,
      });
    }
  }

  update(delta, elapsedTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += delta;
      p.mesh.position.y += p.velocity * delta;
      p.mesh.material.opacity = 1 - (p.age / p.lifetime);
      if (p.age >= p.lifetime) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
    this.updateSnow(delta);
    this.updatePetals(delta);
    this.updateFireflies(delta, elapsedTime);
    this.updateRain(delta);
    this.updateLocusts(delta, elapsedTime);
    this.updateMeteors(delta);
    this.updateGoldenSparkles(delta);
    this.updateMiasma(delta, elapsedTime);
    this.updateDustStorm(delta);
  }

  startSnow() {
    if (this.snowing) return;
    this.snowing = true;
    this.snowParticles = [];
  }

  stopSnow() {
    this.snowing = false;
    for (const sp of this.snowParticles || []) {
      this.scene.remove(sp.mesh);
      sp.mesh.geometry.dispose();
      sp.mesh.material.dispose();
    }
    this.snowParticles = [];
  }

  setBlizzardMode(on) { this.blizzardMode = on; }

  updateSnow(delta) {
    if (!this.snowing) return;
    const spawnRate = this.blizzardMode ? 0.85 : 0.45;
    const cap = this.blizzardMode ? 250 : 120;
    const windDrift = this.blizzardMode ? 3.0 : 0;

    // Spawn new snowflakes
    if (Math.random() < spawnRate) {
      const size = this.blizzardMode ? 0.06 + Math.random() * 0.03 : 0.05;
      const geo = new THREE.SphereGeometry(size, 3, 3);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: this.blizzardMode ? 0.85 : 0.7 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        Math.random() * 64,
        25 + Math.random() * 5,
        Math.random() * 40
      );
      this.scene.add(mesh);
      const speed = this.blizzardMode ? 3.0 + Math.random() * 2.0 : 1.5 + Math.random() * 1.5;
      const drift = (Math.random() - 0.5) * 0.5 + windDrift;
      this.snowParticles.push({ mesh, speed, drift });
    }
    // Update positions
    for (let i = this.snowParticles.length - 1; i >= 0; i--) {
      const sp = this.snowParticles[i];
      sp.mesh.position.y -= sp.speed * delta;
      sp.mesh.position.x += sp.drift * delta;
      if (sp.mesh.position.y < 0 || sp.mesh.position.x > 70) {
        this.scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        sp.mesh.material.dispose();
        this.snowParticles.splice(i, 1);
      }
    }
    while (this.snowParticles.length > cap) {
      const sp = this.snowParticles.shift();
      this.scene.remove(sp.mesh);
      sp.mesh.geometry.dispose();
      sp.mesh.material.dispose();
    }
  }

  setSakuraPositions(positions) {
    this.sakuraPositions = positions;
  }

  startPetals() { this.petalActive = true; }
  stopPetals() {
    this.petalActive = false;
    for (const p of this.petals) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this.petals = [];
  }

  updatePetals(delta) {
    if (!this.petalActive || this.sakuraPositions.length === 0) return;

    // Spawn
    if (this.petals.length < 80 && Math.random() < 0.2) {
      const src = this.sakuraPositions[Math.floor(Math.random() * this.sakuraPositions.length)];
      const geo = new THREE.PlaneGeometry(0.08, 0.08);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf0b0c0, transparent: true, opacity: 0.7,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        src.x + (Math.random() - 0.5) * 2,
        2 + Math.random() * 3,
        src.z + (Math.random() - 0.5) * 2
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(mesh);
      this.petals.push({
        mesh, age: 0, lifetime: 4 + Math.random() * 3,
        driftX: (Math.random() - 0.5) * 0.8,
        driftZ: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Update
    for (let i = this.petals.length - 1; i >= 0; i--) {
      const p = this.petals[i];
      p.age += delta;
      p.mesh.position.y -= 0.3 * delta;
      p.mesh.position.x += (p.driftX + Math.sin(p.age * 2 + p.phase) * 0.3) * delta;
      p.mesh.position.z += p.driftZ * delta;
      p.mesh.rotation.x += delta * 0.5;
      p.mesh.rotation.z += delta * 0.3;

      // Fade near ground
      if (p.mesh.position.y < 1) {
        p.mesh.material.opacity = Math.max(0, p.mesh.position.y * 0.7);
      }

      if (p.age >= p.lifetime || p.mesh.position.y < 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.petals.splice(i, 1);
      }
    }
  }

  startFireflies() { this.firefliesActive = true; }
  stopFireflies() {
    this.firefliesActive = false;
    for (const f of this.fireflies) {
      this.scene.remove(f.mesh);
      f.mesh.geometry.dispose();
      f.mesh.material.dispose();
    }
    this.fireflies = [];
  }

  updateFireflies(delta, elapsedTime) {
    if (!this.firefliesActive) return;

    // Spawn
    if (this.fireflies.length < 20 && Math.random() < 0.05) {
      const geo = new THREE.SphereGeometry(0.06, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0xc0e080, transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        8 + Math.random() * 48,
        1 + Math.random() * 2,
        4 + Math.random() * 32
      );
      this.scene.add(mesh);
      this.fireflies.push({
        mesh, age: 0, lifetime: 5 + Math.random() * 5,
        baseY: mesh.position.y,
        driftX: (Math.random() - 0.5) * 0.4,
        driftZ: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Update
    for (let i = this.fireflies.length - 1; i >= 0; i--) {
      const f = this.fireflies[i];
      f.age += delta;
      f.mesh.position.x += f.driftX * delta;
      f.mesh.position.z += f.driftZ * delta;
      f.mesh.position.y = f.baseY + Math.sin(f.age * 1.5 + f.phase) * 0.3;
      f.mesh.material.opacity = 0.4 + Math.sin(f.age * 3 + f.phase) * 0.4;

      if (f.age >= f.lifetime) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        f.mesh.material.dispose();
        this.fireflies.splice(i, 1);
      }
    }
  }

  spawnDust(worldX, worldZ) {
    for (let i = 0; i < 2; i++) {
      const geo = new THREE.SphereGeometry(0.03, 3, 3);
      const mat = new THREE.MeshBasicMaterial({ color: 0xd2b48c, transparent: true, opacity: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        worldX + (Math.random() - 0.5) * 0.3,
        0.1 + Math.random() * 0.1,
        worldZ + (Math.random() - 0.5) * 0.3
      );
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: 0.2 + Math.random() * 0.2,
        lifetime: 0.4,
        age: 0,
      });
    }
  }

  // --- Rain ---

  startRain() {
    if (this.raining) return;
    this.raining = true;
    this.rainParticles = [];
  }

  stopRain() {
    this.raining = false;
    for (const r of this.rainParticles) {
      this.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.mesh.material.dispose();
    }
    this.rainParticles = [];
  }

  updateRain(delta) {
    if (!this.raining) return;

    // Spawn rain drops
    for (let s = 0; s < 3; s++) {
      if (this.rainParticles.length >= 200) break;
      const geo = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 3);
      const mat = new THREE.MeshBasicMaterial({ color: 0x6699cc, transparent: true, opacity: 0.5 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(Math.random() * 64, 20 + Math.random() * 8, Math.random() * 40);
      mesh.rotation.z = 0.15; // slight angle
      this.scene.add(mesh);
      this.rainParticles.push({ mesh, speed: 12 + Math.random() * 6 });
    }

    for (let i = this.rainParticles.length - 1; i >= 0; i--) {
      const r = this.rainParticles[i];
      r.mesh.position.y -= r.speed * delta;
      r.mesh.position.x += 0.5 * delta; // wind drift
      if (r.mesh.position.y < 0) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        this.rainParticles.splice(i, 1);
      }
    }
  }

  // --- Locusts ---

  startLocusts() {
    if (this.locustsActive) return;
    this.locustsActive = true;
    this.locustParticles = [];
  }

  stopLocusts() {
    this.locustsActive = false;
    for (const l of this.locustParticles) {
      this.scene.remove(l.mesh);
      l.mesh.geometry.dispose();
      l.mesh.material.dispose();
    }
    this.locustParticles = [];
  }

  updateLocusts(delta, elapsedTime) {
    if (!this.locustsActive) return;

    // Spawn swarm particles
    if (this.locustParticles.length < 80 && Math.random() < 0.3) {
      const geo = new THREE.PlaneGeometry(0.06, 0.03);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x2a2a1a, transparent: true, opacity: 0.8,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      // Swarm center drifts across the farm
      const cx = 20 + Math.sin(elapsedTime * 0.3) * 15;
      const cz = 15 + Math.cos(elapsedTime * 0.2) * 10;
      mesh.position.set(
        cx + (Math.random() - 0.5) * 12,
        2 + Math.random() * 4,
        cz + (Math.random() - 0.5) * 8
      );
      this.scene.add(mesh);
      this.locustParticles.push({
        mesh, age: 0, lifetime: 3 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2,
        buzzX: (Math.random() - 0.5) * 3,
        buzzZ: (Math.random() - 0.5) * 2,
      });
    }

    for (let i = this.locustParticles.length - 1; i >= 0; i--) {
      const l = this.locustParticles[i];
      l.age += delta;
      l.mesh.position.x += (l.buzzX + Math.sin(l.age * 8 + l.phase) * 2) * delta;
      l.mesh.position.z += (l.buzzZ + Math.cos(l.age * 6 + l.phase) * 1.5) * delta;
      l.mesh.position.y += Math.sin(l.age * 10 + l.phase) * 0.5 * delta;
      l.mesh.rotation.z = Math.sin(l.age * 12 + l.phase) * 0.5; // wing buzz

      if (l.age >= l.lifetime) {
        this.scene.remove(l.mesh);
        l.mesh.geometry.dispose();
        l.mesh.material.dispose();
        this.locustParticles.splice(i, 1);
      }
    }
  }

  // --- Meteor Shower ---

  startMeteors() {
    if (this.meteorsActive) return;
    this.meteorsActive = true;
    this.meteorParticles = [];
  }

  stopMeteors() {
    this.meteorsActive = false;
    for (const m of this.meteorParticles) {
      this.scene.remove(m.mesh);
      if (m.trail) this.scene.remove(m.trail);
      m.mesh.geometry.dispose();
      m.mesh.material.dispose();
      if (m.trail) { m.trail.geometry.dispose(); m.trail.material.dispose(); }
    }
    this.meteorParticles = [];
  }

  updateMeteors(delta) {
    if (!this.meteorsActive) return;

    // Spawn meteors
    if (this.meteorParticles.length < 6 && Math.random() < 0.08) {
      const geo = new THREE.SphereGeometry(0.12, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      const startX = Math.random() * 64;
      const startZ = Math.random() * 40;
      mesh.position.set(startX, 22 + Math.random() * 5, startZ);
      this.scene.add(mesh);

      // Trail line
      const trailGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(6);
      trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const trailMat = new THREE.LineBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.6 });
      const trail = new THREE.Line(trailGeo, trailMat);
      this.scene.add(trail);

      this.meteorParticles.push({
        mesh, trail, age: 0, lifetime: 1.2 + Math.random() * 0.8,
        speedX: 5 + Math.random() * 3,
        speedY: -(8 + Math.random() * 4),
        speedZ: (Math.random() - 0.5) * 2,
        startX: mesh.position.x,
        startY: mesh.position.y,
        startZ: mesh.position.z,
      });
    }

    for (let i = this.meteorParticles.length - 1; i >= 0; i--) {
      const m = this.meteorParticles[i];
      m.age += delta;
      m.mesh.position.x += m.speedX * delta;
      m.mesh.position.y += m.speedY * delta;
      m.mesh.position.z += m.speedZ * delta;
      m.mesh.material.opacity = Math.max(0, 0.9 - m.age / m.lifetime);

      // Update trail
      if (m.trail) {
        const pos = m.trail.geometry.attributes.position.array;
        pos[0] = m.startX; pos[1] = m.startY; pos[2] = m.startZ;
        pos[3] = m.mesh.position.x; pos[4] = m.mesh.position.y; pos[5] = m.mesh.position.z;
        m.trail.geometry.attributes.position.needsUpdate = true;
        m.trail.material.opacity = Math.max(0, 0.6 - m.age / m.lifetime);
      }

      if (m.age >= m.lifetime || m.mesh.position.y < 0) {
        this.scene.remove(m.mesh);
        m.mesh.geometry.dispose();
        m.mesh.material.dispose();
        if (m.trail) {
          this.scene.remove(m.trail);
          m.trail.geometry.dispose();
          m.trail.material.dispose();
        }
        this.meteorParticles.splice(i, 1);
      }
    }
  }

  // --- Golden Sparkles (Golden Calf, Harvest Moon, Perfect Weather) ---

  startGoldenSparkles() {
    if (this.goldenActive) return;
    this.goldenActive = true;
    this.goldenParticles = [];
  }

  stopGoldenSparkles() {
    this.goldenActive = false;
    for (const g of this.goldenParticles) {
      this.scene.remove(g.mesh);
      g.mesh.geometry.dispose();
      g.mesh.material.dispose();
    }
    this.goldenParticles = [];
  }

  updateGoldenSparkles(delta) {
    if (!this.goldenActive) return;

    if (this.goldenParticles.length < 40 && Math.random() < 0.2) {
      const geo = new THREE.SphereGeometry(0.04, 4, 4);
      const color = Math.random() > 0.5 ? 0xffd700 : 0xffaa00;
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        8 + Math.random() * 48,
        0.5 + Math.random() * 0.5,
        4 + Math.random() * 32
      );
      this.scene.add(mesh);
      this.goldenParticles.push({
        mesh, age: 0, lifetime: 2 + Math.random() * 2,
        speed: 0.8 + Math.random() * 0.5,
        driftX: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }

    for (let i = this.goldenParticles.length - 1; i >= 0; i--) {
      const g = this.goldenParticles[i];
      g.age += delta;
      g.mesh.position.y += g.speed * delta;
      g.mesh.position.x += g.driftX * delta;
      g.mesh.material.opacity = 0.8 * (1 - g.age / g.lifetime);
      const pulse = 0.8 + Math.sin(g.age * 6 + g.phase) * 0.3;
      g.mesh.scale.setScalar(pulse);

      if (g.age >= g.lifetime) {
        this.scene.remove(g.mesh);
        g.mesh.geometry.dispose();
        g.mesh.material.dispose();
        this.goldenParticles.splice(i, 1);
      }
    }
  }

  // --- Disease Miasma ---

  startMiasma() {
    if (this.miasmaActive) return;
    this.miasmaActive = true;
    this.miasmaParticles = [];
  }

  stopMiasma() {
    this.miasmaActive = false;
    for (const m of this.miasmaParticles) {
      this.scene.remove(m.mesh);
      m.mesh.geometry.dispose();
      m.mesh.material.dispose();
    }
    this.miasmaParticles = [];
  }

  updateMiasma(delta, elapsedTime) {
    if (!this.miasmaActive) return;

    if (this.miasmaParticles.length < 30 && Math.random() < 0.15) {
      const geo = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 5, 5);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x44aa44, transparent: true, opacity: 0.2, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        8 + Math.random() * 48,
        0.3 + Math.random() * 1.5,
        4 + Math.random() * 32
      );
      this.scene.add(mesh);
      this.miasmaParticles.push({
        mesh, age: 0, lifetime: 4 + Math.random() * 3,
        driftX: (Math.random() - 0.5) * 0.4,
        driftZ: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }

    for (let i = this.miasmaParticles.length - 1; i >= 0; i--) {
      const m = this.miasmaParticles[i];
      m.age += delta;
      m.mesh.position.x += m.driftX * delta;
      m.mesh.position.z += m.driftZ * delta;
      m.mesh.position.y += Math.sin(m.age * 0.8 + m.phase) * 0.1 * delta;
      const scale = 1 + m.age * 0.3;
      m.mesh.scale.setScalar(scale);
      m.mesh.material.opacity = 0.2 * (1 - m.age / m.lifetime);

      if (m.age >= m.lifetime) {
        this.scene.remove(m.mesh);
        m.mesh.geometry.dispose();
        m.mesh.material.dispose();
        this.miasmaParticles.splice(i, 1);
      }
    }
  }

  // --- Dust Storm (Drought) ---

  startDustStorm() {
    if (this.dustStormActive) return;
    this.dustStormActive = true;
    this.dustStormParticles = [];
  }

  stopDustStorm() {
    this.dustStormActive = false;
    for (const d of this.dustStormParticles) {
      this.scene.remove(d.mesh);
      d.mesh.geometry.dispose();
      d.mesh.material.dispose();
    }
    this.dustStormParticles = [];
  }

  updateDustStorm(delta) {
    if (!this.dustStormActive) return;

    if (this.dustStormParticles.length < 60 && Math.random() < 0.25) {
      const geo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 3, 3);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xc4a060, transparent: true, opacity: 0.4, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        -5 + Math.random() * 10,
        0.5 + Math.random() * 3,
        Math.random() * 40
      );
      this.scene.add(mesh);
      this.dustStormParticles.push({
        mesh, age: 0, lifetime: 3 + Math.random() * 2,
        speedX: 4 + Math.random() * 2,
        driftY: (Math.random() - 0.5) * 0.5,
      });
    }

    for (let i = this.dustStormParticles.length - 1; i >= 0; i--) {
      const d = this.dustStormParticles[i];
      d.age += delta;
      d.mesh.position.x += d.speedX * delta;
      d.mesh.position.y += d.driftY * delta;
      d.mesh.material.opacity = 0.4 * (1 - d.age / d.lifetime);

      if (d.age >= d.lifetime || d.mesh.position.x > 70) {
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        d.mesh.material.dispose();
        this.dustStormParticles.splice(i, 1);
      }
    }
  }

  // --- Rainbow ---

  showRainbow() {
    if (this.rainbowMesh) return;
    const group = new THREE.Group();
    const colors = [0xff0000, 0xff7700, 0xffff00, 0x00cc00, 0x0066ff, 0x4400cc, 0x8800aa];
    for (let c = 0; c < colors.length; c++) {
      const radius = 18 + c * 0.6;
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI, false, 0);
      const points = curve.getPoints(40);
      const positions = [];
      for (const p of points) positions.push(p.x, p.y, 0);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: colors[c], transparent: true, opacity: 0.35 });
      const line = new THREE.Line(geo, mat);
      group.add(line);
    }
    group.position.set(32, 0, -10);
    group.rotation.x = -0.3;
    this.scene.add(group);
    this.rainbowMesh = group;
  }

  hideRainbow() {
    if (!this.rainbowMesh) return;
    this.rainbowMesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    this.scene.remove(this.rainbowMesh);
    this.rainbowMesh = null;
  }
}
