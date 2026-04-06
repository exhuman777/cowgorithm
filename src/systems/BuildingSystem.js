// src/systems/BuildingSystem.js
import * as THREE from 'three';
import { GRID, BUILDING_DEFS, ANIMAL_DEFS, TECH_DEFS } from '../core/Constants.js';
import { gameState } from '../core/GameState.js';
import { eventBus, Events } from '../core/EventBus.js';
import { createBuilding, createRangeRing } from '../entities/BuildingFactory.js';

export class BuildingSystem {
  constructor(scene, farmGrid) {
    this.scene = scene;
    this.farmGrid = farmGrid;
    this.meshes = new Map(); // "col,row" -> THREE.Group

    eventBus.on(Events.BUILDING_PLACED, ({ col, row, type }) => this.placeBuilding(col, row, type));
    eventBus.on(Events.BUILDING_DEMOLISHED, ({ col, row }) => this.demolishBuilding(col, row));
    eventBus.on(Events.PASTURE_PLACED, ({ col, row }) => this.placePasture(col, row));
    eventBus.on(Events.LAND_EXPANDED, ({ col, row }) => this.expandLand(col, row));
  }

  init() {
    for (let row = 0; row < GRID.ROWS; row++) {
      for (let col = 0; col < GRID.COLS; col++) {
        const tile = gameState.map[row][col];
        if (tile.building) {
          this._createMesh(col, row, tile.building.type);
        }
      }
    }
  }

  _createMesh(col, row, type) {
    const group = createBuilding(type);
    const pos = this.farmGrid.tileToWorld(col, row);
    group.position.set(pos.x, pos.y, pos.z);

    // Add range ring for buildings that have range
    const def = BUILDING_DEFS[type];
    if (def && def.range) {
      const ring = createRangeRing(def.range * GRID.TILE_SIZE, 0x06b6d4);
      ring.position.y = 0.05;
      group.add(ring);
    }

    this.scene.add(group);
    const key = `${col},${row}`;
    this.meshes.set(key, group);
    return group;
  }

  _removeMesh(col, row) {
    const key = `${col},${row}`;
    const group = this.meshes.get(key);
    if (!group) return;

    this.scene.remove(group);
    group.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    this.meshes.delete(key);
  }

  placeBuilding(col, row, type) {
    const tile = this.farmGrid.getTileAt(col, row);
    if (!tile) return;
    if (!tile.owned) {
      eventBus.emit(Events.NOTIFICATION, { text: 'You don\'t own this tile!', type: 'error' });
      return;
    }
    if (tile.type === 'water') {
      eventBus.emit(Events.NOTIFICATION, { text: 'Cannot build on water!', type: 'error' });
      return;
    }
    if (tile.building) {
      eventBus.emit(Events.NOTIFICATION, { text: 'Tile already has a building!', type: 'error' });
      return;
    }

    const def = BUILDING_DEFS[type];
    if (!def) return;

    // AI Center: only one allowed
    if (type === 'ai_center' && this.countBuildings('ai_center') >= 1) {
      eventBus.emit(Events.NOTIFICATION, { text: 'Only one AI Command Center allowed!', type: 'error' });
      return;
    }

    // Calculate cost (free drone if applicable)
    let cost = def.cost;
    if (type === 'drone' && gameState.freeDrone) {
      cost = 0;
    }

    if (gameState.money < cost) {
      eventBus.emit(Events.NOTIFICATION, { text: `Not enough money! Need $${cost.toLocaleString()}`, type: 'error' });
      return;
    }

    // Deduct money
    gameState.money -= cost;
    gameState.totalSpent += cost;

    // Mark free drone as used
    if (type === 'drone' && gameState.freeDrone) {
      gameState.freeDrone = false;
    }

    // Set building on tile
    gameState.map[row][col].building = { type, level: 1 };

    // Create 3D mesh
    this._createMesh(col, row, type);

    // Emit events
    eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    eventBus.emit(Events.NOTIFICATION, { text: `${def.name} built!`, type: 'success' });
    eventBus.emit(Events.SFX_PLAY, { sound: 'build' });

    const worldPos = this.farmGrid.tileToWorld(col, row);
    eventBus.emit(Events.FLOAT_TEXT, {
      text: cost > 0 ? `-$${cost.toLocaleString()}` : 'FREE',
      x: worldPos.x,
      y: 2,
      z: worldPos.z,
      color: cost > 0 ? '#ef4444' : '#10b981',
    });
  }

  demolishBuilding(col, row) {
    const tile = this.farmGrid.getTileAt(col, row);
    if (!tile || !tile.building) return;

    if (tile.building.type === 'farmhouse') {
      eventBus.emit(Events.NOTIFICATION, { text: 'Cannot demolish the farmhouse!', type: 'error' });
      return;
    }

    const type = tile.building.type;
    const def = BUILDING_DEFS[type];

    // Block demolishing housing if animals would be homeless
    if (type === 'barn' || type === 'coop') {
      const capacityAfter = (this.countBuildings(type) - 1) * (def.capacity || 0);
      const currentAnimals = this.getHousingCount(type);
      if (currentAnimals > capacityAfter) {
        const name = type === 'barn' ? 'Barn' : 'Chicken Coop';
        eventBus.emit(Events.NOTIFICATION, {
          text: `Cannot demolish! ${currentAnimals} animals need ${name} housing (${capacityAfter} capacity left). Sell animals first.`,
          type: 'error',
        });
        return;
      }
    }

    // Block AI Center demolition if Tier 3+ techs depend on it
    if (type === 'ai_center') {
      const hasAdvancedTech = gameState.techs.some(techId => {
        const tech = TECH_DEFS.find(t => t.id === techId);
        return tech && tech.needsAI;
      });
      if (hasAdvancedTech) {
        eventBus.emit(Events.NOTIFICATION, {
          text: 'Cannot demolish! Advanced techs depend on AI Center.',
          type: 'error',
        });
        return;
      }
    }
    const refund = Math.floor((def ? def.cost : 0) * 0.4);

    // Add refund
    gameState.money += refund;
    gameState.totalEarnings += refund;

    // Clear tile
    gameState.map[row][col].building = null;

    // Remove 3D mesh
    const key = `${col},${row}`;
    this._removeMesh(col, row);
    if (this.buildingAnimator) this.buildingAnimator.removeDrone(key);

    // Emit events
    eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    eventBus.emit(Events.NOTIFICATION, { text: `${def ? def.name : 'Building'} demolished! +$${refund.toLocaleString()} refund`, type: 'info' });
    eventBus.emit(Events.SFX_PLAY, { sound: 'build' });

    const worldPos = this.farmGrid.tileToWorld(col, row);
    eventBus.emit(Events.FLOAT_TEXT, {
      text: `+$${refund.toLocaleString()}`,
      x: worldPos.x,
      y: 2,
      z: worldPos.z,
      color: '#10b981',
    });
  }

  placePasture(col, row) {
    const tile = this.farmGrid.getTileAt(col, row);
    if (!tile) return;
    if (!tile.owned) {
      eventBus.emit(Events.NOTIFICATION, { text: 'You don\'t own this tile!', type: 'error' });
      return;
    }
    if (tile.type !== 'grass') {
      eventBus.emit(Events.NOTIFICATION, { text: 'Pasture can only be placed on grass!', type: 'error' });
      return;
    }
    if (tile.isPasture) {
      eventBus.emit(Events.NOTIFICATION, { text: 'Already a pasture!', type: 'error' });
      return;
    }
    if (tile.building) {
      eventBus.emit(Events.NOTIFICATION, { text: 'Cannot place pasture on a building!', type: 'error' });
      return;
    }

    const cost = BUILDING_DEFS.pasture.cost; // 200
    if (gameState.money < cost) {
      eventBus.emit(Events.NOTIFICATION, { text: `Not enough money! Need $${cost}`, type: 'error' });
      return;
    }

    gameState.money -= cost;
    gameState.totalSpent += cost;
    gameState.map[row][col].isPasture = true;

    // Update terrain colors
    this.farmGrid.updateTerrainColors();

    // Emit events
    eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    eventBus.emit(Events.NOTIFICATION, { text: 'Pasture placed!', type: 'success' });
    eventBus.emit(Events.SFX_PLAY, { sound: 'build' });

    const worldPos = this.farmGrid.tileToWorld(col, row);
    eventBus.emit(Events.FLOAT_TEXT, {
      text: `-$${cost}`,
      x: worldPos.x,
      y: 2,
      z: worldPos.z,
      color: '#ef4444',
    });
  }

  expandLand(col, row) {
    const tile = this.farmGrid.getTileAt(col, row);
    if (!tile) return;
    if (tile.owned) {
      eventBus.emit(Events.NOTIFICATION, { text: 'You already own this tile!', type: 'error' });
      return;
    }
    if (tile.type === 'water') {
      eventBus.emit(Events.NOTIFICATION, { text: 'Cannot buy water tiles!', type: 'error' });
      return;
    }

    // Must be adjacent to at least one owned tile (4 cardinal neighbors)
    const neighbors = [
      { c: col - 1, r: row },
      { c: col + 1, r: row },
      { c: col, r: row - 1 },
      { c: col, r: row + 1 },
    ];
    const hasAdjacentOwned = neighbors.some(({ c, r }) => {
      const t = this.farmGrid.getTileAt(c, r);
      return t && t.owned;
    });

    if (!hasAdjacentOwned) {
      eventBus.emit(Events.NOTIFICATION, { text: 'Must be adjacent to owned land!', type: 'error' });
      return;
    }

    const cost = 2000;
    if (gameState.money < cost) {
      eventBus.emit(Events.NOTIFICATION, { text: `Not enough money! Need $${cost.toLocaleString()}`, type: 'error' });
      return;
    }

    gameState.money -= cost;
    gameState.totalSpent += cost;
    gameState.map[row][col].owned = true;

    // Convert forest to grass
    if (tile.type === 'forest') {
      gameState.map[row][col].type = 'grass';
      gameState.map[row][col].grassLevel = 50;
    }

    // Update terrain colors
    this.farmGrid.updateTerrainColors();

    // Emit events
    eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    eventBus.emit(Events.NOTIFICATION, { text: 'Land acquired!', type: 'success' });
    eventBus.emit(Events.SFX_PLAY, { sound: 'build' });

    const worldPos = this.farmGrid.tileToWorld(col, row);
    eventBus.emit(Events.FLOAT_TEXT, {
      text: `-$${cost.toLocaleString()}`,
      x: worldPos.x,
      y: 2,
      z: worldPos.z,
      color: '#ef4444',
    });
  }

  getBuildingBonusAt(bonusType, col, row) {
    let totalBonus = 0;
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        const tile = gameState.map[r][c];
        if (!tile.building) continue;
        const def = BUILDING_DEFS[tile.building.type];
        if (!def || def.bonus !== bonusType) continue;
        const dist = Math.sqrt((c - col) ** 2 + (r - row) ** 2);
        if (dist <= def.range) {
          totalBonus += def.bonusAmt;
        }
      }
    }
    return totalBonus;
  }

  isNearVet(col, row) {
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        const tile = gameState.map[r][c];
        if (!tile.building || tile.building.type !== 'vet') continue;
        const dist = Math.sqrt((c - col) ** 2 + (r - row) ** 2);
        if (dist <= 6) return true;
      }
    }
    return false;
  }

  hasAICenter() {
    return this.countBuildings('ai_center') > 0;
  }

  getCapacity(housingType) {
    // housingType is 'barn' or 'coop'
    const count = this.countBuildings(housingType);
    const def = BUILDING_DEFS[housingType];
    if (!def || !def.capacity) return 0;
    return count * def.capacity;
  }

  getHousingCount(housingType) {
    // Count animals currently needing this housing type
    let count = 0;
    for (const animal of gameState.animals) {
      const def = ANIMAL_DEFS[animal.type];
      if (def && def.housing === housingType) {
        count++;
      }
    }
    return count;
  }

  countBuildings(type) {
    let count = 0;
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        const tile = gameState.map[r][c];
        if (tile.building && tile.building.type === type) {
          count++;
        }
      }
    }
    return count;
  }

  countOwned() {
    let count = 0;
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        if (gameState.map[r][c].owned) count++;
      }
    }
    return count;
  }
}
