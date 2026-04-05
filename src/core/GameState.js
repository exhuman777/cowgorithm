// src/core/GameState.js
import { GRID } from './Constants.js';

class GameState {
  constructor() { this.reset(); }

  reset() {
    this.map = this.createMap();
    this.money = 15000;
    this.milk = 0;
    this.wool = 0;
    this.eggs = 0;
    this.meat = 0;
    this.energy = 100;
    this.data = 0;
    this.animals = [];
    this.techs = [];
    this.day = 1;
    this.dayProgress = 0;
    this.totalEarnings = 0;
    this.totalSpent = 0;
    this.totalSellIncome = 0;
    this.completedMilestones = [];
    this.completedQuests = [];
    this.weatherBonus = 1;
    this.weatherProdPenalty = 0;
    this.marketBonus = 0;
    this.energyBonus = 0;
    this.freeDrone = false;
    this.techDiscount = 0;
    this.breedTimer = 0;
    this.eventCooldown = 0;
    this.tutorialDone = false;
    this.gameSpeed = 1;
    this.autoSell = false;
    this.soundEnabled = true;
    this.selectedBuild = null;
    this.selectedAnimal = null;
    this.selectedBuilding = null;
    this.programmingAnimal = null;
    this.programmingAction = null;
    this.marketPrices = { milk: 15, wool: 5, eggs: 2 };
    this.prevMarketPrices = { milk: 15, wool: 5, eggs: 2 };
    this.dailyIncome = 0;
    this.dailyCosts = 0;
    this.lastDayIncome = 0;
    this.lastDayCosts = 0;
    this.activeEffects = []; // { name, daysLeft, data }
    this.decisionCooldown = 0;
    this.merchantDiscount = false;
    this.milkContractDays = 0;
    this.stormProtected = false;
    this.disabledBuilding = null;
    this.visualDayProgress = 0;
  }

  createMap() {
    const map = [];
    for (let y = 0; y < GRID.ROWS; y++) {
      map[y] = [];
      for (let x = 0; x < GRID.COLS; x++) {
        let type = 'grass';
        // Water pond/stream (avoid starting buildings at 14,9 and 16,9)
        if ((x >= 18 && x <= 19 && y >= 7 && y <= 10) ||
            (x === 20 && y >= 8 && y <= 9) ||
            (x === 17 && y === 7) || (x === 17 && y === 8)) type = 'water';
        // Forest at edges
        const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const edgeY = y <= 1 || y >= GRID.ROWS - 2;
        const edgeX = x <= 1 || x >= GRID.COLS - 2;
        if (edgeY && ((seed % 1 + 1) % 1) < 0.4) type = 'forest';
        if (edgeX && ((seed % 1 + 1) % 1) < 0.3) type = 'forest';

        const owned = x >= 10 && x <= 21 && y >= 5 && y <= 14;
        map[y][x] = {
          type,
          grassLevel: type === 'grass' ? 70 + ((seed % 1 + 1) % 1) * 30 : 0,
          building: null,
          owned,
          isPasture: false,
        };
      }
    }
    // Starting buildings
    map[9][14].building = { type: 'farmhouse', level: 1 };
    map[9][16].building = { type: 'barn', level: 1 };
    return map;
  }

  toJSON() {
    return {
      map: this.map, money: this.money, milk: this.milk, wool: this.wool,
      eggs: this.eggs, meat: this.meat, energy: this.energy, data: this.data,
      animals: this.animals, techs: this.techs, day: this.day,
      totalEarnings: this.totalEarnings, totalSpent: this.totalSpent,
      totalSellIncome: this.totalSellIncome,
      completedMilestones: this.completedMilestones,
      completedQuests: this.completedQuests,
      energyBonus: this.energyBonus, freeDrone: this.freeDrone,
      breedTimer: this.breedTimer, tutorialDone: this.tutorialDone,
      autoSell: this.autoSell, soundEnabled: this.soundEnabled,
      marketPrices: this.marketPrices,
      activeEffects: this.activeEffects,
      decisionCooldown: this.decisionCooldown,
      milkContractDays: this.milkContractDays,
    };
  }

  loadFromJSON(data) {
    Object.keys(data).forEach(k => { if (k in this) this[k] = data[k]; });
    this.activeEffects = data.activeEffects || [];
    this.decisionCooldown = data.decisionCooldown || 0;
    this.milkContractDays = data.milkContractDays || 0;
  }

  save() {
    try { localStorage.setItem('cowgorithm_save', JSON.stringify(this.toJSON())); } catch (e) {}
  }

  load() {
    try {
      const raw = localStorage.getItem('cowgorithm_save');
      if (raw) { this.loadFromJSON(JSON.parse(raw)); return true; }
    } catch (e) {}
    return false;
  }

  hasSave() {
    return !!localStorage.getItem('cowgorithm_save');
  }
}

export const gameState = new GameState();
