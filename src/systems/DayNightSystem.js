import * as THREE from 'three';

export class DayNightSystem {
  constructor(scene, dirLight, ambientLight) {
    this.scene = scene;
    this.dirLight = dirLight;
    this.ambientLight = ambientLight;
    this.skyColor = new THREE.Color();

    // Season-specific palettes (day, night, sunset)
    this.palettes = {
      spring: { day: new THREE.Color(0x8ecae6), night: new THREE.Color(0x0a1628), sunset: new THREE.Color(0xff9eb5) },
      summer: { day: new THREE.Color(0x87ceeb), night: new THREE.Color(0x0a1628), sunset: new THREE.Color(0xff7b54) },
      fall:   { day: new THREE.Color(0x7ba7bc), night: new THREE.Color(0x0d1a2a), sunset: new THREE.Color(0xc44536) },
      winter: { day: new THREE.Color(0xb0c4d8), night: new THREE.Color(0x101828), sunset: new THREE.Color(0x8a7fa0) },
    };
    this.currentPalette = this.palettes.spring;

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

  setSeason(seasonKey) {
    this.currentPalette = this.palettes[seasonKey] || this.palettes.spring;
  }

  update(visualProgress) {
    const p = this.currentPalette;
    let t;
    if (visualProgress < 0.25) {
      t = visualProgress / 0.25;
      this.skyColor.lerpColors(p.sunset, p.day, t);
      this.ambientLight.intensity = 0.3 + 0.4 * t;
      this.dirLight.intensity = 0.4 + 0.6 * t;
    } else if (visualProgress < 0.5) {
      t = (visualProgress - 0.25) / 0.25;
      this.skyColor.lerpColors(p.day, p.sunset, t);
      this.ambientLight.intensity = 0.7 - 0.2 * t;
      this.dirLight.intensity = 1.0 - 0.4 * t;
    } else if (visualProgress < 0.75) {
      t = (visualProgress - 0.5) / 0.25;
      this.skyColor.lerpColors(p.sunset, p.night, t);
      this.ambientLight.intensity = 0.5 - 0.3 * t;
      this.dirLight.intensity = 0.6 - 0.4 * t;
    } else {
      t = (visualProgress - 0.75) / 0.25;
      this.skyColor.lerpColors(p.night, p.sunset, t);
      this.ambientLight.intensity = 0.2 + 0.1 * t;
      this.dirLight.intensity = 0.2 + 0.2 * t;
    }

    this.scene.background = this.skyColor;

    const angle = visualProgress * Math.PI * 2;
    const orbitRadius = 60;
    const cx = 32, cz = 20;

    this.sun.position.set(
      Math.cos(angle) * orbitRadius * 0.5 + cx,
      Math.sin(angle) * orbitRadius,
      cz
    );
    this.sun.visible = visualProgress < 0.55;

    const moonAngle = angle + Math.PI;
    this.moon.position.set(
      Math.cos(moonAngle) * orbitRadius * 0.4 + cx,
      Math.sin(moonAngle) * orbitRadius,
      cz
    );
    this.moon.visible = visualProgress > 0.45;

    this.dirLight.position.set(
      Math.cos(angle) * 40 + cx,
      Math.sin(angle) * 30 + 10,
      cz
    );

    const isNight = visualProgress > 0.45 && visualProgress < 0.95;
    this.stars.visible = isNight;
    if (isNight) {
      let starAlpha;
      if (visualProgress < 0.55) starAlpha = (visualProgress - 0.45) / 0.1;
      else if (visualProgress > 0.85) starAlpha = (0.95 - visualProgress) / 0.1;
      else starAlpha = 1;
      this.stars.material.opacity = Math.min(starAlpha, 1);
      this.stars.material.transparent = true;
    }
  }
}
