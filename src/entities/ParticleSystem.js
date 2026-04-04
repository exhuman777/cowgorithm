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
  }
}
