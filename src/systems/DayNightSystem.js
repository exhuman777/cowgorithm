import * as THREE from 'three';
import { COLORS } from '../core/Constants.js';

export class DayNightSystem {
  constructor(scene, dirLight, ambientLight) {
    this.scene = scene;
    this.dirLight = dirLight;
    this.ambientLight = ambientLight;
    this.skyColor = new THREE.Color();
    this.dayColor = new THREE.Color(COLORS.SKY);
    this.nightColor = new THREE.Color(COLORS.SKY_NIGHT);
    this.sunsetColor = new THREE.Color(COLORS.SKY_SUNSET);

    // Sun - small yellow sphere, emissive so it glows without needing light
    const sunGeo = new THREE.SphereGeometry(1.8, 8, 8);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sun);

    // Moon - smaller pale sphere
    const moonGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xccd8ee });
    this.moon = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moon);

    // Stars - small Points cloud on a large sphere
    this.stars = this._createStars();
    this.scene.add(this.stars);
  }

  _createStars() {
    const count = 120;
    const positions = new Float32Array(count * 3);
    const radius = 180;
    for (let i = 0; i < count; i++) {
      // Distribute on upper hemisphere only
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45; // upper portion
      const r = radius + (Math.random() - 0.5) * 20;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) + 32;
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) + 20;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true });
    const points = new THREE.Points(geo, mat);
    points.visible = false;
    return points;
  }

  update(dayProgress) {
    // dayProgress 0-1: 0=dawn, 0.25=noon, 0.5=sunset, 0.75=midnight
    let t;
    if (dayProgress < 0.25) {
      t = dayProgress / 0.25;
      this.skyColor.lerpColors(this.sunsetColor, this.dayColor, t);
      this.ambientLight.intensity = 0.3 + 0.4 * t;
      this.dirLight.intensity = 0.4 + 0.6 * t;
    } else if (dayProgress < 0.5) {
      t = (dayProgress - 0.25) / 0.25;
      this.skyColor.lerpColors(this.dayColor, this.sunsetColor, t);
      this.ambientLight.intensity = 0.7 - 0.2 * t;
      this.dirLight.intensity = 1.0 - 0.4 * t;
    } else if (dayProgress < 0.75) {
      t = (dayProgress - 0.5) / 0.25;
      this.skyColor.lerpColors(this.sunsetColor, this.nightColor, t);
      this.ambientLight.intensity = 0.5 - 0.3 * t;
      this.dirLight.intensity = 0.6 - 0.4 * t;
    } else {
      t = (dayProgress - 0.75) / 0.25;
      this.skyColor.lerpColors(this.nightColor, this.sunsetColor, t);
      this.ambientLight.intensity = 0.2 + 0.1 * t;
      this.dirLight.intensity = 0.2 + 0.2 * t;
    }

    this.scene.background = this.skyColor;

    // Sun/moon orbit - shared arc parameters
    const angle = dayProgress * Math.PI * 2;
    const orbitRadius = 60;
    const cx = 32, cz = 20;

    // Sun position: visible during day half (progress 0-0.5)
    this.sun.position.set(
      Math.cos(angle) * orbitRadius * 0.5 + cx,
      Math.sin(angle) * orbitRadius,
      cz
    );
    this.sun.visible = dayProgress < 0.55;

    // Moon position: opposite side of orbit
    const moonAngle = angle + Math.PI;
    this.moon.position.set(
      Math.cos(moonAngle) * orbitRadius * 0.4 + cx,
      Math.sin(moonAngle) * orbitRadius,
      cz
    );
    this.moon.visible = dayProgress > 0.45;

    // Directional light follows sun
    this.dirLight.position.set(
      Math.cos(angle) * 40 + cx,
      Math.sin(angle) * 30 + 10,
      cz
    );

    // Stars: fade in at dusk, out at dawn
    const isNight = dayProgress > 0.45 && dayProgress < 0.95;
    this.stars.visible = isNight;
    if (isNight) {
      let starAlpha;
      if (dayProgress < 0.55) starAlpha = (dayProgress - 0.45) / 0.1;
      else if (dayProgress > 0.85) starAlpha = (0.95 - dayProgress) / 0.1;
      else starAlpha = 1;
      this.stars.material.opacity = Math.min(starAlpha, 1);
      this.stars.material.transparent = true;
    }
  }
}
