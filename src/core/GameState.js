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
    this.fish = 0;
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
    this.marketPrices = { milk: 15, wool: 5, eggs: 2, fish: 10 };
    this.prevMarketPrices = { milk: 15, wool: 5, eggs: 2, fish: 10 };
    this.dailyIncome = 0;
    this.dailyCosts = 0;
    this.lastDayIncome = 0;
    this.lastDayCosts = 0;
    this.activeEffects = []; // { name, daysLeft, data }
    this.decisionCooldown = 0;
    this.merchantDiscount = false;
    this.milkContractDays = 0;
    this.stormProtected = false;
    this.loan = 0;          // outstanding loan principal
    this.loanInterest = 0;  // accrued interest
    this.disabledBuilding = null;
    this.visualDayProgress = 0;
    this.energyDeficit = false; // true when energy <= 0
    this.completionDay = 0;     // day when all techs unlocked (0 = not yet)
    // New tracking fields
    this.loanRepaid = false;
    this.animalsBred = 0;
    this.fishSold = false;
    this.totalFishSold = 0;
    this.completedDecisions = [];
    this.insuranceActive = false;
    this.apprenticeDays = 0;
    this.reputationMod = 0;
    this.geneticBonus = 0;
    this.cropRotationDays = 0;
    this.sellPriceMod = 0;       // temporary sell price modifier from decisions
    this.sellPriceModDays = 0;
    this.prodMod = 0;            // temporary production modifier from decisions
    this.prodModDays = 0;
    this.priceHistory = { milk: [], wool: [], eggs: [], fish: [] };
    // Leaderboard
    this.mogulScore = 0;         // computed at day 120
    this.mogulSubmitted = false;  // prevent double submission
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
      eggs: this.eggs, fish: this.fish, meat: this.meat, energy: this.energy, data: this.data,
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
      energyDeficit: this.energyDeficit,
      completionDay: this.completionDay,
      loan: this.loan,
      loanInterest: this.loanInterest,
      loanRepaid: this.loanRepaid,
      animalsBred: this.animalsBred,
      fishSold: this.fishSold,
      totalFishSold: this.totalFishSold,
      completedDecisions: this.completedDecisions,
      insuranceActive: this.insuranceActive,
      apprenticeDays: this.apprenticeDays,
      reputationMod: this.reputationMod,
      geneticBonus: this.geneticBonus,
      cropRotationDays: this.cropRotationDays,
      sellPriceMod: this.sellPriceMod,
      sellPriceModDays: this.sellPriceModDays,
      prodMod: this.prodMod,
      prodModDays: this.prodModDays,
      priceHistory: this.priceHistory,
      mogulScore: this.mogulScore,
      mogulSubmitted: this.mogulSubmitted,
    };
  }

  loadFromJSON(data) {
    Object.keys(data).forEach(k => { if (k in this) this[k] = data[k]; });
    this.activeEffects = data.activeEffects || [];
    this.decisionCooldown = data.decisionCooldown || 0;
    this.milkContractDays = data.milkContractDays || 0;
    this.completedDecisions = data.completedDecisions || [];
    this.priceHistory = data.priceHistory || { milk: [], wool: [], eggs: [], fish: [] };
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
