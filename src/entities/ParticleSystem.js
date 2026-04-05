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

  updateSnow(delta) {
    if (!this.snowing) return;
    // Spawn new snowflakes
    if (Math.random() < 0.3) {
      const geo = new THREE.SphereGeometry(0.05, 3, 3);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        Math.random() * 64,
        25 + Math.random() * 5,
        Math.random() * 40
      );
      this.scene.add(mesh);
      this.snowParticles.push({ mesh, speed: 1.5 + Math.random() * 1.5, drift: (Math.random() - 0.5) * 0.5 });
    }
    // Update positions
    for (let i = this.snowParticles.length - 1; i >= 0; i--) {
      const sp = this.snowParticles[i];
      sp.mesh.position.y -= sp.speed * delta;
      sp.mesh.position.x += sp.drift * delta;
      if (sp.mesh.position.y < 0) {
        this.scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        sp.mesh.material.dispose();
        this.snowParticles.splice(i, 1);
      }
    }
    // Cap at 80 snowflakes
    while (this.snowParticles.length > 80) {
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
    if (this.petals.length < 40 && Math.random() < 0.15) {
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
}
