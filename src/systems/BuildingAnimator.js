import * as THREE from 'three';
import { gameState } from '../core/GameState.js';
import { GRID } from '../core/Constants.js';

export class BuildingAnimator {
  constructor(buildingSystem) {
    this.buildingSystem = buildingSystem;
    this.hoverDrones = new Map(); // key -> { group, rotors, baseY, phase }
    this.frostApplied = false;
    this.frostData = new Map(); // key -> [{ child, originalColor }]
  }

  update(delta, elapsedTime, visualDayProgress) {
    for (const [key, group] of this.buildingSystem.meshes) {
      const type = group.userData.type;

      switch (type) {
        case 'drone':
          this._animateDrone(key, group, delta, elapsedTime);
          break;
        case 'solar':
          this._animateSolar(group, visualDayProgress);
          break;
        case 'vet':
          this._animateVet(group, elapsedTime);
          break;
        case 'ai_center':
          this._animateAI(group, elapsedTime);
          break;
        case 'milking':
          this._animateMilking(group, delta, elapsedTime);
          break;
      }
    }

    // Update hover drones
    for (const [key, drone] of this.hoverDrones) {
      if (!this.buildingSystem.meshes.has(key)) {
        this.removeDrone(key);
        continue;
      }
      drone.group.position.y = drone.baseY + Math.sin(elapsedTime * 1.5 + drone.phase) * 0.3;
      for (const rotor of drone.rotors) {
        rotor.rotation.y += 8 * delta;
      }
    }
  }

  // --- Drone Station ---

  _animateDrone(key, group, delta, elapsedTime) {
    // Spin rotor
    if (group.userData.rotor) {
      group.userData.rotor.rotation.y += 3 * delta;
    }

    // Create hover drone if missing
    if (!this.hoverDrones.has(key)) {
      const droneGroup = new THREE.Group();
      const bodyMat = new THREE.MeshLambertMaterial({ color: 0x444455 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), bodyMat);
      droneGroup.add(body);

      const rotorMat = new THREE.MeshBasicMaterial({ color: 0x888899 });
      const rotorGeo = new THREE.BoxGeometry(0.2, 0.02, 0.04);
      const rotors = [];
      const offsets = [[0.15, 0.06, 0.15], [-0.15, 0.06, 0.15], [0.15, 0.06, -0.15], [-0.15, 0.06, -0.15]];
      for (const [rx, ry, rz] of offsets) {
        const rotor = new THREE.Mesh(rotorGeo, rotorMat);
        rotor.position.set(rx, ry, rz);
        droneGroup.add(rotor);
        rotors.push(rotor);
      }

      const worldPos = group.position.clone();
      droneGroup.position.set(worldPos.x + 1.5, 3.5, worldPos.z);
      this.buildingSystem.scene.add(droneGroup);

      this.hoverDrones.set(key, {
        group: droneGroup,
        rotors,
        baseY: 3.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // --- Solar Array ---

  _animateSolar(group, visualDayProgress) {
    // Lazy init: find the panel
    if (!group.userData.panel) {
      for (const child of group.children) {
        if (child.isMesh && child.geometry) {
          const params = child.geometry.parameters;
          if (params && params.width >= 1.5 && params.height <= 0.05) {
            group.userData.panel = child;
            break;
          }
        }
      }
    }
    const panel = group.userData.panel;
    if (panel) {
      panel.rotation.x = -0.52 + Math.sin(visualDayProgress * Math.PI * 2) * 0.35;
    }
  }

  // --- Vet Lab ---

  _animateVet(group, elapsedTime) {
    // Lazy init: find cross bars by color
    if (!group.userData.crossBars) {
      group.userData.crossBars = [];
      group.traverse(child => {
        if (child.isMesh && child.material && child.material.color) {
          const c = child.material.color;
          // Check for green cross color 0x10b981 -> r~0.063, g~0.725, b~0.506
          if (Math.abs(c.r - 0.063) < 0.05 && c.g > 0.5 && c.b > 0.3) {
            child.material = child.material.clone();
            child.material.transparent = true;
            group.userData.crossBars.push(child);
          }
        }
      });
    }
    for (const bar of group.userData.crossBars) {
      bar.material.opacity = 0.6 + Math.sin(elapsedTime * 1.5) * 0.4;
    }
  }

  // --- AI Center ---

  _animateAI(group, elapsedTime) {
    if (group.userData.beacon && group.userData.beacon.material) {
      group.userData.beacon.material.emissiveIntensity = 0.55 + Math.sin(elapsedTime) * 0.25;
    }
  }

  // --- Milking Station ---

  _animateMilking(group, delta, elapsedTime) {
    // Lazy init: find tanks
    if (!group.userData.tanks) {
      group.userData.tanks = [];
      group.traverse(child => {
        if (child.isMesh && child.geometry && child.geometry.type === 'CylinderGeometry') {
          const params = child.geometry.parameters;
          if (params && params.radiusTop <= 0.2 && params.height <= 0.5) {
            group.userData.tanks.push(child);
          }
        }
      });
    }

    // Only rotate if an animal with milk task is nearby
    const gx = group.position.x;
    const gz = group.position.z;
    let milking = false;
    for (const animal of gameState.animals) {
      if (animal.task && animal.task.type === 'milk') {
        const ax = animal.x * GRID.TILE_SIZE;
        const az = animal.y * GRID.TILE_SIZE;
        const dist = Math.sqrt((ax - gx) ** 2 + (az - gz) ** 2);
        if (dist < 4 * GRID.TILE_SIZE) {
          milking = true;
          break;
        }
      }
    }

    if (milking) {
      for (const tank of group.userData.tanks) {
        tank.rotation.y += delta;
      }
    }
  }

  // --- Frost on Roofs ---

  setFrost(season) {
    if (season === 'winter' && !this.frostApplied) {
      this.frostApplied = true;
      for (const [key, group] of this.buildingSystem.meshes) {
        this._applyFrost(key, group);
      }
    } else if (season !== 'winter' && this.frostApplied) {
      this.frostApplied = false;
      this._removeFrost();
    }
  }

  _applyFrost(key, group) {
    const data = [];
    group.traverse(child => {
      if (!child.isMesh || !child.material) return;
      // Identify roof: high y position with ConeGeometry or thin BoxGeometry
      const pos = child.position;
      const geo = child.geometry;
      const isCone = geo && geo.type === 'ConeGeometry';
      const isThinBox = geo && geo.type === 'BoxGeometry' && geo.parameters &&
        geo.parameters.height <= 0.12 && pos.y > 0.9;
      if ((isCone && pos.y > 0.9) || isThinBox) {
        const original = child.material.color.getHex();
        child.material = child.material.clone();
        child.material.color.setHex(0xd8e8f0);
        data.push({ child, originalColor: original });
      }
    });
    if (data.length > 0) {
      this.frostData.set(key, data);
    }
  }

  _removeFrost() {
    for (const [key, data] of this.frostData) {
      for (const { child, originalColor } of data) {
        if (child.material) {
          child.material.color.setHex(originalColor);
        }
      }
    }
    this.frostData.clear();
  }

  // --- Cleanup ---

  removeDrone(key) {
    const drone = this.hoverDrones.get(key);
    if (!drone) return;
    this.buildingSystem.scene.remove(drone.group);
    drone.group.traverse(child => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
    });
    this.hoverDrones.delete(key);
  }
}
