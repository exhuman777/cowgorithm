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

  update(delta) {
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
}
