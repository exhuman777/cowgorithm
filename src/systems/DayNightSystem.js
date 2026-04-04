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
  }

  update(dayProgress) {
    // dayProgress 0-1: 0=dawn, 0.25=noon, 0.5=sunset, 0.75=midnight
    let t;
    if (dayProgress < 0.25) {
      // Dawn to noon
      t = dayProgress / 0.25;
      this.skyColor.lerpColors(this.sunsetColor, this.dayColor, t);
      this.ambientLight.intensity = 0.3 + 0.4 * t;
      this.dirLight.intensity = 0.4 + 0.6 * t;
    } else if (dayProgress < 0.5) {
      // Noon to sunset
      t = (dayProgress - 0.25) / 0.25;
      this.skyColor.lerpColors(this.dayColor, this.sunsetColor, t);
      this.ambientLight.intensity = 0.7 - 0.2 * t;
      this.dirLight.intensity = 1.0 - 0.4 * t;
    } else if (dayProgress < 0.75) {
      // Sunset to midnight
      t = (dayProgress - 0.5) / 0.25;
      this.skyColor.lerpColors(this.sunsetColor, this.nightColor, t);
      this.ambientLight.intensity = 0.5 - 0.3 * t;
      this.dirLight.intensity = 0.6 - 0.4 * t;
    } else {
      // Midnight to dawn
      t = (dayProgress - 0.75) / 0.25;
      this.skyColor.lerpColors(this.nightColor, this.sunsetColor, t);
      this.ambientLight.intensity = 0.2 + 0.1 * t;
      this.dirLight.intensity = 0.2 + 0.2 * t;
    }

    this.scene.background = this.skyColor;

    // Rotate directional light in a circle to simulate sun arc
    const angle = dayProgress * Math.PI * 2;
    const radius = 40;
    this.dirLight.position.set(
      Math.cos(angle) * radius + 32, // offset to center of grid
      Math.sin(angle) * 30 + 10,     // height varies
      20                               // centered on grid Z
    );
  }
}
