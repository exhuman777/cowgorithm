import { gameState } from '../core/GameState.js';
import { ANIMAL_DEFS, BUILDING_DEFS, TECH_DEFS } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';

export class EconomySystem {
  constructor(buildingSystem) {
    this.buildingSystem = buildingSystem;

    // Listen for sell command from InputSystem keyboard shortcut or UI button
    eventBus.on(Events.PRODUCTS_SOLD, () => this.sellProducts());
  }

  newDay() {
    // Called each new day by main.js orchestrator

    // 1. Save previous day's income/costs
    gameState.lastDayIncome = gameState.dailyIncome;
    gameState.lastDayCosts = gameState.dailyCosts;
    gameState.dailyIncome = 0;
    gameState.dailyCosts = 0;

    // 2. Market price fluctuation (random walk)
    gameState.prevMarketPrices = { ...gameState.marketPrices };
    for (const product of ['milk', 'wool', 'eggs']) {
      const base = product === 'milk' ? 15 : product === 'wool' ? 5 : 2;
      const factor = 0.92 + Math.random() * 0.16; // 0.92 to 1.08
      gameState.marketPrices[product] = Math.max(
        base * 0.5,
        Math.min(base * 2, gameState.marketPrices[product] * factor)
      );
      // Round to 2 decimal places
      gameState.marketPrices[product] = Math.round(gameState.marketPrices[product] * 100) / 100;
    }

    // 3. Feed costs per animal
    let totalFeed = 0;
    const feedSave = this.getTechEffect('feedSave');
    for (const animal of gameState.animals) {
      const def = ANIMAL_DEFS[animal.type];
      if (def) {
        totalFeed += def.feedCost * (1 - feedSave);
      }
    }
    totalFeed = Math.round(totalFeed * 100) / 100;
    gameState.money -= totalFeed;
    gameState.dailyCosts += totalFeed;

    // 4. Energy: solar arrays generate energy
    const solarCount = this.buildingSystem.countBuildings('solar');
    const solarEnergy = solarCount * BUILDING_DEFS.solar.energyGen;
    const energySave = this.getTechEffect('energySave');
    const energyCost = Math.max(0, gameState.animals.length * 0.5 * (1 - energySave));
    gameState.energy += solarEnergy + gameState.energyBonus - energyCost;
    gameState.energy = Math.max(0, gameState.energy);

    // 5. Carbon credits daily bonus
    const carbonBonus = this.getTechEffect('dailyBonus');
    if (carbonBonus > 0) {
      gameState.money += carbonBonus;
      gameState.dailyIncome += carbonBonus;
      gameState.totalEarnings += carbonBonus;
    }

    // 6. Data points from AI center
    if (this.buildingSystem.hasAICenter()) {
      gameState.data += 5;
    }

    // 7. Auto-sell if enabled
    if (gameState.autoSell) {
      this.sellProducts();
    }

    // 8. Reset weather bonuses (they last only 1 day)
    gameState.weatherBonus = 1;
    gameState.weatherProdPenalty = 0;
    gameState.marketBonus = 0;

    eventBus.emit(Events.DAY_NEW, { day: gameState.day });
  }

  sellProducts() {
    let total = 0;
    const bonus = 1 + gameState.marketBonus;

    // Sell milk
    if (gameState.milk > 0) {
      const income = gameState.milk * gameState.marketPrices.milk * bonus;
      total += income;
      gameState.milk = 0;
    }

    // Sell wool
    if (gameState.wool > 0) {
      const income = gameState.wool * gameState.marketPrices.wool * bonus;
      total += income;
      gameState.wool = 0;
    }

    // Sell eggs
    if (gameState.eggs > 0) {
      const income = gameState.eggs * gameState.marketPrices.eggs * bonus;
      total += income;
      gameState.eggs = 0;
    }

    if (total > 0) {
      total = Math.round(total * 100) / 100;
      gameState.money += total;
      gameState.dailyIncome += total;
      gameState.totalEarnings += total;
      gameState.totalSellIncome += total;
      eventBus.emit(Events.NOTIFICATION, { msg: `Sold products for $${this.formatMoney(total)}` });
      eventBus.emit(Events.SFX_PLAY, { sound: 'sell' });
      eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    }
  }

  getTechEffect(effectName) {
    let total = 0;
    for (const techId of gameState.techs) {
      const tech = TECH_DEFS.find(t => t.id === techId);
      if (tech && tech.effect && tech.effect[effectName] !== undefined) {
        total += tech.effect[effectName];
      }
    }
    return Math.min(total, 1); // Clamp to max 1 (100%)
  }

  formatMoney(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toFixed(0);
  }
}
