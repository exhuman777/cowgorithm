// src/systems/AnimalSystem.js
import * as THREE from 'three';
import { GRID, GAME, ANIMAL_DEFS, ANIMAL_NAMES, TECH_DEFS } from '../core/Constants.js';
import { gameState } from '../core/GameState.js';
import { eventBus, Events } from '../core/EventBus.js';
import { createAnimal, updateAnimalVisuals } from '../entities/AnimalFactory.js';

const MOVE_SPEED = 0.02;
const WANDER_CHANCE = 0.02;
const WANDER_RANGE = 3;
const STATION_WORK_TICKS = 120;

export class AnimalSystem {
  constructor(scene, buildingSystem) {
    this.scene = scene;
    this.buildingSystem = buildingSystem;
    this.meshes = new Map(); // animal object -> THREE.Group
    this.routeLines = new Map(); // animal object -> THREE.Line
    this.elapsedTime = 0;
    this.usedNames = new Map(); // type -> Set of used names

    // Listen for task assignment from InputSystem
    eventBus.on(Events.ANIMAL_TASK_ASSIGNED, ({ animal, action, col, row }) => {
      this.sendAnimalTo(animal, action, col, row);
    });
  }

  // --- Initialization ---

  init() {
    // New game: create 3 starting dairy cows near the barn (col 16, row 9)
    this.usedNames.clear();
    for (let i = 0; i < 3; i++) {
      const x = 15 + Math.random() * 3; // cols 15-18
      const y = 8 + Math.random() * 3;  // rows 8-11
      this._spawnAnimalAt('cow', x, y);
    }
  }

  initFromState() {
    // Load game: create meshes for existing animals
    this.usedNames.clear();
    for (const animal of gameState.animals) {
      // Track used names
      if (!this.usedNames.has(animal.type)) {
        this.usedNames.set(animal.type, new Set());
      }
      this.usedNames.get(animal.type).add(animal.name);

      const group = createAnimal(animal.type);
      group.position.set(
        animal.x * GRID.TILE_SIZE,
        0.5,
        animal.y * GRID.TILE_SIZE
      );
      this.scene.add(group);
      this.meshes.set(animal, group);
    }
  }

  // --- Spawning ---

  _spawnAnimalAt(type, x, y) {
    const animal = {
      type,
      x,
      y,
      targetX: null,
      targetY: null,
      health: 100,
      happiness: 80,
      sick: false,
      age: 0,
      lifetimeEarnings: 0,
      prodTimer: 0,
      name: this._randomName(type),
      task: null,
      autoManage: false,
      collarVisible: gameState.techs.includes('gps'),
      beefDayCounter: type === 'beef' ? 0 : undefined,
    };

    const group = createAnimal(type);
    group.position.set(x * GRID.TILE_SIZE, 0.5, y * GRID.TILE_SIZE);
    this.scene.add(group);
    this.meshes.set(animal, group);
    gameState.animals.push(animal);

    eventBus.emit(Events.ANIMAL_SPAWN, { animal });
    eventBus.emit(Events.NOTIFICATION, { text: `${animal.name} the ${ANIMAL_DEFS[type].name} joined the farm!`, type: 'success' });

    return animal;
  }

  spawnAnimal(type) {
    // Find a random owned tile near a barn/coop
    const housing = ANIMAL_DEFS[type].housing;
    const spawnPos = this._findSpawnPosition(housing);
    return this._spawnAnimalAt(type, spawnPos.x, spawnPos.y);
  }

  _findSpawnPosition(housingType) {
    // Try to find a position near a barn or coop
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        const tile = gameState.map[r][c];
        if (tile.building && tile.building.type === housingType) {
          // Found a housing building; pick a random nearby owned grass tile
          for (let attempt = 0; attempt < 20; attempt++) {
            const ox = c + Math.floor(Math.random() * 5) - 2;
            const oy = r + Math.floor(Math.random() * 5) - 2;
            const neighbor = this.buildingSystem.farmGrid.getTileAt(ox, oy);
            if (neighbor && neighbor.owned && neighbor.type === 'grass' && !neighbor.building) {
              return { x: ox + Math.random() * 0.8 + 0.1, y: oy + Math.random() * 0.8 + 0.1 };
            }
          }
          // Fallback: right next to the building
          return { x: c + Math.random(), y: r + Math.random() };
        }
      }
    }
    // No housing found, spawn near center of owned land
    return { x: 15 + Math.random() * 3, y: 8 + Math.random() * 3 };
  }

  buyAnimal(type) {
    const def = ANIMAL_DEFS[type];
    if (!def) return false;

    if (gameState.money < def.cost) {
      eventBus.emit(Events.NOTIFICATION, { text: `Not enough money! Need $${def.cost.toLocaleString()}`, type: 'error' });
      return false;
    }

    const housing = def.housing;
    const capacity = this.buildingSystem.getCapacity(housing);
    const current = this.buildingSystem.getHousingCount(housing);
    if (current >= capacity) {
      const buildingName = housing === 'barn' ? 'Barn' : 'Chicken Coop';
      eventBus.emit(Events.NOTIFICATION, { text: `No room! Build more ${buildingName}s (${current}/${capacity})`, type: 'error' });
      return false;
    }

    gameState.money -= def.cost;
    gameState.totalSpent += def.cost;

    this.spawnAnimal(type);

    eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    eventBus.emit(Events.SFX_PLAY, { sound: 'coin' });
    return true;
  }

  // --- Game Tick ---

  tick() {
    const animals = gameState.animals;
    // Iterate in reverse so we can safely remove animals mid-loop (beef maturity)
    for (let i = animals.length - 1; i >= 0; i--) {
      const animal = animals[i];

      // 1. Auto-manage (GPS = manual routing, CowGorithm v1 = auto routing)
      if (animal.autoManage && !animal.task && gameState.techs.includes('gps')) {
        this._autoAssignTask(animal);
      }

      // 2. Task movement or random wander
      if (animal.task) {
        this._moveTowardTarget(animal);
      } else {
        this._randomWander(animal);
      }

      // 3. Production timer
      animal.prodTimer++;
      if (animal.prodTimer >= GAME.DAY_TICKS) {
        animal.prodTimer = 0;
        animal.age++;

        // Beef cattle maturity check
        if (animal.type === 'beef') {
          if (animal.beefDayCounter === undefined) animal.beefDayCounter = 0;
          animal.beefDayCounter++;
          if (animal.beefDayCounter >= ANIMAL_DEFS.beef.maturityDays) {
            this._matureBeef(animal);
            continue; // Animal removed, skip rest
          }
        } else {
          this._produceFromAnimal(animal);
        }

        // Feed cost deduction
        this._deductFeedCost(animal);

        // Happiness decay (slight)
        if (animal.happiness > 50) {
          animal.happiness -= 1;
        }
      }

      // 4. Grazing: reduce grass at current tile slightly
      this._graze(animal);
    }
  }

  updateVisuals(delta) {
    this.elapsedTime += delta;
    for (const [animal, group] of this.meshes) {
      updateAnimalVisuals(group, animal, delta, this.elapsedTime);

      // Update route line if animal has task
      if (animal.task && this.routeLines.has(animal)) {
        const line = this.routeLines.get(animal);
        const positions = line.geometry.attributes.position.array;
        positions[0] = animal.x * GRID.TILE_SIZE;
        positions[1] = 0.5;
        positions[2] = animal.y * GRID.TILE_SIZE;
        // Target stays the same (positions[3..5] set on creation)
        line.geometry.attributes.position.needsUpdate = true;
      }
    }
  }

  // --- Movement ---

  _moveTowardTarget(animal) {
    if (animal.targetX === null || animal.targetY === null) return;

    const dx = animal.targetX - animal.x;
    const dy = animal.targetY - animal.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.3) {
      // Arrived at target
      animal.x = animal.targetX;
      animal.y = animal.targetY;

      if (animal.task && animal.task.workTimer === undefined) {
        // Start station work
        animal.task.workTimer = STATION_WORK_TICKS;
      }

      if (animal.task && animal.task.workTimer !== undefined) {
        animal.task.workTimer--;
        if (animal.task.workTimer <= 0) {
          this._executeStationWork(animal);
        }
      }
      return;
    }

    // Move toward target
    const nx = dx / dist;
    const ny = dy / dist;
    animal.x += nx * MOVE_SPEED;
    animal.y += ny * MOVE_SPEED;
  }

  _randomWander(animal) {
    // If currently moving toward a wander target, continue
    if (animal.targetX !== null && animal.targetY !== null) {
      const dx = animal.targetX - animal.x;
      const dy = animal.targetY - animal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.3) {
        // Arrived at wander target
        animal.targetX = null;
        animal.targetY = null;
        return;
      }

      const nx = dx / dist;
      const ny = dy / dist;
      animal.x += nx * MOVE_SPEED * 0.5; // Wander slower
      animal.y += ny * MOVE_SPEED * 0.5;
      return;
    }

    // Chance to pick a new wander target
    if (Math.random() < WANDER_CHANCE) {
      const targetCol = Math.floor(animal.x) + Math.floor(Math.random() * (WANDER_RANGE * 2 + 1)) - WANDER_RANGE;
      const targetRow = Math.floor(animal.y) + Math.floor(Math.random() * (WANDER_RANGE * 2 + 1)) - WANDER_RANGE;

      // Clamp to grid
      const col = Math.max(0, Math.min(GRID.COLS - 1, targetCol));
      const row = Math.max(0, Math.min(GRID.ROWS - 1, targetRow));

      const tile = this.buildingSystem.farmGrid.getTileAt(col, row);
      if (tile && tile.owned && tile.type === 'grass' && !tile.building) {
        animal.targetX = col + Math.random() * 0.8 + 0.1;
        animal.targetY = row + Math.random() * 0.8 + 0.1;
      }
    }
  }

  // --- Production ---

  _produceFromAnimal(animal) {
    if (animal.sick) return;

    const def = ANIMAL_DEFS[animal.type];
    if (!def || def.prodAmt <= 0) return;

    let amount = def.prodAmt;

    // Tech bonus
    const techBonus = this.getTechProdBonus();
    amount *= (1 + techBonus);

    // Weather penalty
    amount *= (1 - gameState.weatherProdPenalty);

    // Building proximity bonus
    const animalCol = Math.floor(animal.x);
    const animalRow = Math.floor(animal.y);

    if (def.product === 'milk') {
      const dairyBonus = this.buildingSystem.getBuildingBonusAt('dairy', animalCol, animalRow);
      amount *= (1 + (gameState.energyDeficit ? 0 : dairyBonus));
    } else if (def.product === 'wool') {
      const woolBonus = this.buildingSystem.getBuildingBonusAt('wool', animalCol, animalRow);
      amount *= (1 + (gameState.energyDeficit ? 0 : woolBonus));
    }

    // Grass level scaling
    const tile = this.buildingSystem.farmGrid.getTileAt(animalCol, animalRow);
    if (tile && tile.type === 'grass') {
      const grassFactor = Math.max(0.3, (tile.grassLevel || 50) / 100);
      amount *= grassFactor;
    }

    // Happiness scaling
    amount *= Math.max(0.3, animal.happiness / 100);

    // Energy deficit penalty: power failure halves all production
    if (gameState.energyDeficit) amount *= 0.5;

    // Round to 1 decimal
    amount = Math.round(amount * 10) / 10;
    if (amount <= 0) return;

    // Add to game state
    const product = def.product;
    const valueProduced = amount * def.prodValue;
    if (product === 'milk') gameState.milk += amount;
    else if (product === 'wool') gameState.wool += amount;
    else if (product === 'eggs') gameState.eggs += amount;

    // Track per-animal lifetime earnings
    animal.lifetimeEarnings = (animal.lifetimeEarnings || 0) + valueProduced;

    // Emit events
    eventBus.emit(Events.ANIMAL_PRODUCE, { animal, product, amount });

    // Show float text for ~30% of production events to reduce clutter
    if (Math.random() < 0.3) {
      const worldX = animal.x * GRID.TILE_SIZE;
      const worldZ = animal.y * GRID.TILE_SIZE;
      eventBus.emit(Events.FLOAT_TEXT, {
        text: `+${amount} ${product}`,
        x: worldX,
        y: 2,
        z: worldZ,
        color: '#06b6d4',
      });
    }
  }

  _matureBeef(animal) {
    // Beef cattle reached maturity, auto-sell
    let value = ANIMAL_DEFS.beef.matureValue;

    // Apply tech bonus to mature value
    const techBonus = this.getTechProdBonus();
    value = Math.floor(value * (1 + techBonus));

    // Apply market bonus
    value = Math.floor(value * (1 + gameState.marketBonus));

    gameState.money += value;
    gameState.totalEarnings += value;
    animal.lifetimeEarnings = (animal.lifetimeEarnings || 0) + value;

    const worldX = animal.x * GRID.TILE_SIZE;
    const worldZ = animal.y * GRID.TILE_SIZE;

    eventBus.emit(Events.FLOAT_TEXT, {
      text: `+$${value.toLocaleString()} (mature)`,
      x: worldX,
      y: 2,
      z: worldZ,
      color: '#10b981',
    });
    eventBus.emit(Events.NOTIFICATION, { text: `${animal.name} matured! Sold for $${value.toLocaleString()}`, type: 'success' });
    eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    eventBus.emit(Events.SFX_PLAY, { sound: 'coin' });

    this._removeAnimal(animal);
  }

  _deductFeedCost(animal) {
    const def = ANIMAL_DEFS[animal.type];
    if (!def) return;

    let feedCost = def.feedCost;

    // Silo bonus (reduces feed cost)
    const animalCol = Math.floor(animal.x);
    const animalRow = Math.floor(animal.y);
    const feedBonus = this.buildingSystem.getBuildingBonusAt('feed', animalCol, animalRow);
    feedCost *= (1 - feedBonus);

    // Tech feed savings
    let feedSave = 0;
    for (const techId of gameState.techs) {
      const tech = TECH_DEFS.find(t => t.id === techId);
      if (tech && tech.effect && tech.effect.feedSave) {
        feedSave += tech.effect.feedSave;
      }
    }
    feedSave = Math.min(feedSave, 1); // Cap at 100% savings
    feedCost *= (1 - feedSave);

    feedCost = Math.round(feedCost * 100) / 100;
    if (feedCost > 0) {
      gameState.money -= feedCost;
      gameState.dailyCosts += feedCost;
    }
  }

  _graze(animal) {
    const col = Math.floor(animal.x);
    const row = Math.floor(animal.y);
    const tile = this.buildingSystem.farmGrid.getTileAt(col, row);
    if (tile && tile.type === 'grass' && tile.grassLevel > 0) {
      tile.grassLevel = Math.max(0, tile.grassLevel - 0.05);
    }
  }

  // --- AI / Task System ---

  _autoAssignTask(animal) {
    const animalCol = Math.floor(animal.x);
    const animalRow = Math.floor(animal.y);

    // Priority 1: sick -> find vet or barn
    if (animal.sick) {
      const vet = this.findNearestBuilding('vet', animalCol, animalRow);
      if (vet) {
        this.sendAnimalTo(animal, 'heal', vet.col, vet.row);
        return;
      }
      const barn = this.findNearestBuilding('barn', animalCol, animalRow);
      if (barn) {
        this.sendAnimalTo(animal, 'rest', barn.col, barn.row);
        return;
      }
    }

    // Priority 2: low happiness -> barn for rest
    if (animal.happiness < 40) {
      const barn = this.findNearestBuilding('barn', animalCol, animalRow);
      if (barn) {
        this.sendAnimalTo(animal, 'rest', barn.col, barn.row);
        return;
      }
    }

    // Priority 3: route to production station
    const def = ANIMAL_DEFS[animal.type];
    if (def && def.product === 'milk') {
      const station = this.findNearestBuilding('milking', animalCol, animalRow);
      if (station) {
        this.sendAnimalTo(animal, 'milk', station.col, station.row);
        return;
      }
    } else if (def && def.product === 'wool') {
      const station = this.findNearestBuilding('shearing', animalCol, animalRow);
      if (station) {
        this.sendAnimalTo(animal, 'shear', station.col, station.row);
        return;
      }
    }
  }

  sendAnimalTo(animal, taskType, col, row) {
    animal.task = { type: taskType, col, row, workTimer: undefined };
    animal.targetX = col + 0.5;
    animal.targetY = row + 0.5;

    // Create route line visualization
    this._removeRouteLine(animal);

    const positions = new Float32Array(6);
    positions[0] = animal.x * GRID.TILE_SIZE;
    positions[1] = 0.5;
    positions[2] = animal.y * GRID.TILE_SIZE;
    positions[3] = animal.targetX * GRID.TILE_SIZE;
    positions[4] = 0.5;
    positions[5] = animal.targetY * GRID.TILE_SIZE;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: 0x06b6d4 });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.routeLines.set(animal, line);

    eventBus.emit(Events.NOTIFICATION, { text: `${animal.name} heading to ${taskType}`, type: 'info' });
  }

  _executeStationWork(animal) {
    if (!animal.task) return;

    const taskType = animal.task.type;
    const def = ANIMAL_DEFS[animal.type];

    switch (taskType) {
      case 'milk': {
        // Bonus milk production from station visit
        if (def && def.product === 'milk') {
          const bonus = Math.max(1, def.prodAmt * 0.5);
          gameState.milk += bonus;
          animal.lifetimeEarnings = (animal.lifetimeEarnings || 0) + bonus * def.prodValue;
          eventBus.emit(Events.FLOAT_TEXT, {
            text: `+${bonus} milk (station)`,
            x: animal.x * GRID.TILE_SIZE,
            y: 2,
            z: animal.y * GRID.TILE_SIZE,
            color: '#06b6d4',
          });
        }
        break;
      }
      case 'shear': {
        // Bonus wool production
        if (def && def.product === 'wool') {
          const bonus = Math.max(1, def.prodAmt * 0.5);
          gameState.wool += bonus;
          animal.lifetimeEarnings = (animal.lifetimeEarnings || 0) + bonus * def.prodValue;
          eventBus.emit(Events.FLOAT_TEXT, {
            text: `+${bonus} wool (station)`,
            x: animal.x * GRID.TILE_SIZE,
            y: 2,
            z: animal.y * GRID.TILE_SIZE,
            color: '#06b6d4',
          });
        }
        break;
      }
      case 'heal': {
        // Heal at vet
        if (animal.sick) {
          animal.sick = false;
          animal.health = 100;
          eventBus.emit(Events.ANIMAL_HEALED, { animal });
          eventBus.emit(Events.FLOAT_TEXT, {
            text: 'Healed!',
            x: animal.x * GRID.TILE_SIZE,
            y: 2,
            z: animal.y * GRID.TILE_SIZE,
            color: '#10b981',
          });
        }
        break;
      }
      case 'rest': {
        // Rest at barn, increase happiness
        animal.happiness = Math.min(100, animal.happiness + 20);
        eventBus.emit(Events.FLOAT_TEXT, {
          text: '+20 happiness',
          x: animal.x * GRID.TILE_SIZE,
          y: 2,
          z: animal.y * GRID.TILE_SIZE,
          color: '#fbbf24',
        });
        break;
      }
    }

    // Clear task and route line
    animal.task = null;
    animal.targetX = null;
    animal.targetY = null;
    this._removeRouteLine(animal);
    eventBus.emit(Events.ANIMAL_TASK_COMPLETE, { animal });
  }

  // --- Selling ---

  sellAnimal(animal) {
    const def = ANIMAL_DEFS[animal.type];
    if (!def) return;

    const value = def.sellValue;
    gameState.money += value;
    gameState.totalEarnings += value;

    eventBus.emit(Events.ANIMAL_SOLD, { animal, value });
    eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    eventBus.emit(Events.NOTIFICATION, { text: `Sold ${animal.name} for $${value}`, type: 'info' });
    eventBus.emit(Events.SFX_PLAY, { sound: 'coin' });

    const worldX = animal.x * GRID.TILE_SIZE;
    const worldZ = animal.y * GRID.TILE_SIZE;
    eventBus.emit(Events.FLOAT_TEXT, {
      text: `+$${value}`,
      x: worldX,
      y: 2,
      z: worldZ,
      color: '#10b981',
    });

    this._removeAnimal(animal);
  }

  sellSelectedAnimal() {
    if (!gameState.selectedAnimal) return;
    const animal = gameState.selectedAnimal;
    gameState.selectedAnimal = null;
    eventBus.emit(Events.SELECTION_CHANGED, { type: null, entity: null });
    this.sellAnimal(animal);
  }

  // --- Healing ---

  healAnimal(animal) {
    if (!animal.sick) return;

    const cost = 200;
    if (gameState.money < cost) {
      eventBus.emit(Events.NOTIFICATION, { text: `Not enough money! Need $${cost}`, type: 'error' });
      return;
    }

    gameState.money -= cost;
    gameState.totalSpent += cost;
    animal.sick = false;
    animal.health = 100;

    eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    eventBus.emit(Events.ANIMAL_HEALED, { animal });
    eventBus.emit(Events.NOTIFICATION, { text: `${animal.name} healed!`, type: 'success' });
    eventBus.emit(Events.SFX_PLAY, { sound: 'coin' });

    const worldX = animal.x * GRID.TILE_SIZE;
    const worldZ = animal.y * GRID.TILE_SIZE;
    eventBus.emit(Events.FLOAT_TEXT, {
      text: '-$200 (healed)',
      x: worldX,
      y: 2,
      z: worldZ,
      color: '#ef4444',
    });
  }

  healSelectedAnimal() {
    if (!gameState.selectedAnimal || !gameState.selectedAnimal.sick) return;
    this.healAnimal(gameState.selectedAnimal);
  }

  // --- Breeding ---

  tryBreeding() {
    if (!gameState.techs.includes('fertility_ai')) return;
    gameState.breedTimer++;
    if (gameState.breedTimer < 30) return; // Every 30 days
    gameState.breedTimer = 0;

    if (gameState.animals.length === 0) return;

    // Pick a random animal type that has housing capacity
    const types = [...new Set(gameState.animals.map(a => a.type))];
    const shuffled = types.sort(() => Math.random() - 0.5);

    for (const type of shuffled) {
      const def = ANIMAL_DEFS[type];
      if (!def) continue;
      const housing = def.housing;
      const capacity = this.buildingSystem.getCapacity(housing);
      const current = this.buildingSystem.getHousingCount(housing);
      if (current < capacity) {
        const baby = this.spawnAnimal(type);
        eventBus.emit(Events.NOTIFICATION, { text: `Fertility AI: ${baby.name} was born!`, type: 'success' });
        eventBus.emit(Events.TOAST, { text: `New ${def.name} born!`, color: '#10b981' });
        return;
      }
    }
  }

  // --- Auto-manage ---

  autoManageAll() {
    const hasGPS = gameState.techs.includes('gps');
    if (!hasGPS) {
      eventBus.emit(Events.NOTIFICATION, { text: 'Unlock GPS Tracking first!', type: 'error' });
      return;
    }

    // GPS unlocked = all animals get collars
    const toggling = gameState.animals.length > 0;
    const newState = !gameState.animals[0]?.autoManage;
    for (const animal of gameState.animals) {
      animal.autoManage = newState;
    }

    if (toggling) {
      eventBus.emit(Events.NOTIFICATION, { text: `Auto-manage ${newState ? 'ON' : 'OFF'} for all animals`, type: 'info' });
    }
  }

  // --- Tech helpers ---

  getTechProdBonus() {
    let total = 0;
    for (const techId of gameState.techs) {
      const tech = TECH_DEFS.find(t => t.id === techId);
      if (tech && tech.effect && tech.effect.prodBonus) {
        total += tech.effect.prodBonus;
      }
    }
    return total;
  }

  // --- Building search ---

  findNearestBuilding(type, fromCol, fromRow) {
    let nearest = null;
    let nearestDist = Infinity;

    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        const tile = gameState.map[r][c];
        if (tile.building && tile.building.type === type) {
          const dist = Math.sqrt((c - fromCol) ** 2 + (r - fromRow) ** 2);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = { col: c, row: r };
          }
        }
      }
    }
    return nearest;
  }

  // --- Internal helpers ---

  _removeAnimal(animal) {
    // Remove from gameState.animals
    const idx = gameState.animals.indexOf(animal);
    if (idx !== -1) gameState.animals.splice(idx, 1);

    // Remove 3D mesh
    const group = this.meshes.get(animal);
    if (group) {
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
      this.meshes.delete(animal);
    }

    // Remove route line
    this._removeRouteLine(animal);

    // Free name
    if (this.usedNames.has(animal.type)) {
      this.usedNames.get(animal.type).delete(animal.name);
    }
  }

  _removeRouteLine(animal) {
    const line = this.routeLines.get(animal);
    if (line) {
      this.scene.remove(line);
      line.geometry.dispose();
      line.material.dispose();
      this.routeLines.delete(animal);
    }
  }

  _randomName(type) {
    if (!this.usedNames.has(type)) {
      this.usedNames.set(type, new Set());
    }
    const used = this.usedNames.get(type);
    const names = ANIMAL_NAMES[type] || [];

    // Find an unused name
    for (const name of names) {
      if (!used.has(name)) {
        used.add(name);
        return name;
      }
    }

    // All names used, append a number
    let counter = 1;
    while (true) {
      const base = names.length > 0 ? names[counter % names.length] : type;
      const name = `${base} ${Math.floor(counter / names.length) + 2}`;
      if (!used.has(name)) {
        used.add(name);
        return name;
      }
      counter++;
    }
  }
}
