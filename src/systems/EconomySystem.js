import { gameState } from '../core/GameState.js';
import { BUILDING_DEFS, TECH_DEFS, getSeason, SEASON_EFFECTS, SOLAR_SEASON_MOD } from '../core/Constants.js';
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

    // 2. Season detection
    const season = getSeason(gameState.day);
    const seasonFx = SEASON_EFFECTS[season];

    // 3. Market price fluctuation (random walk)
    gameState.prevMarketPrices = { ...gameState.marketPrices };
    for (const product of ['milk', 'wool', 'eggs']) {
      const base = product === 'milk' ? 15 : product === 'wool' ? 7 : 2;
      const factor = 0.92 + Math.random() * 0.16; // 0.92 to 1.08
      gameState.marketPrices[product] = Math.max(
        base * 0.5,
        Math.min(base * 2.5, gameState.marketPrices[product] * factor)
      );
      // Round to 2 decimal places
      gameState.marketPrices[product] = Math.round(gameState.marketPrices[product] * 100) / 100;
    }

    // 3. Feed costs: handled per-animal in AnimalSystem._deductFeedCost()
    //    (includes silo proximity bonus + tech savings, so no duplicate here)

    // 4. Energy: solar generation vs building + animal drain
    const solarCount = this.buildingSystem.countBuildings('solar');
    const solarBase = solarCount * BUILDING_DEFS.solar.energyGen;
    const solarOutput = solarBase * (SOLAR_SEASON_MOD[season] || 1.0);

    // Building energy drain
    const smartGridSave = this.getTechEffect('buildingEnergySave');
    let buildingDrain = 0;
    for (let row = 0; row < 20; row++) {
      for (let col = 0; col < 32; col++) {
        const tile = gameState.map[row]?.[col];
        if (tile && tile.building) {
          const def = BUILDING_DEFS[tile.building.type];
          if (def && def.energyCost) {
            buildingDrain += def.energyCost;
          }
        }
      }
    }
    buildingDrain *= (1 - smartGridSave);

    // Animal drain
    const animalDrain = gameState.animals.length * 0.5;
    const energySave = this.getTechEffect('energySave');
    const totalDrain = buildingDrain + animalDrain * (1 - energySave);
    const netEnergy = solarOutput + gameState.energyBonus - totalDrain;

    gameState.energy += netEnergy;
    gameState.energy = Math.max(-20, gameState.energy); // Hard floor at -20

    // Energy deficit state
    const wasDeficit = gameState.energyDeficit;
    gameState.energyDeficit = gameState.energy <= 0;

    // Warnings
    const maxEnergy = 50 + solarCount * 15; // rough capacity estimate
    const energyPct = gameState.energy / maxEnergy;
    if (energyPct <= 0 && !wasDeficit) {
      eventBus.emit(Events.TOAST, { text: 'POWER FAILURE. Buildings offline.', color: '#e06060', duration: 4000 });
    } else if (energyPct <= 0.2 && energyPct > 0) {
      eventBus.emit(Events.TOAST, { text: 'Energy reserves low. Build more Solar Arrays.', color: '#f0c060', duration: 3000 });
    }

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

    // 8. Tick milk contract countdown
    if (gameState.milkContractDays > 0) {
      gameState.milkContractDays--;
      if (gameState.milkContractDays === 0) {
        eventBus.emit(Events.NOTIFICATION, { text: 'Milk contract expired. Back to market prices.', type: 'info' });
      }
    }

    // 9. Reset weather bonuses (they last only 1 day)
    gameState.weatherBonus = 1;
    gameState.weatherProdPenalty = 0;
    gameState.marketBonus = 0;

    eventBus.emit(Events.DAY_NEW, { day: gameState.day });
  }

  sellProducts() {
    let total = 0;
    const bonus = 1 + gameState.marketBonus;
    const season = getSeason(gameState.day);
    const seasonPriceMod = SEASON_EFFECTS[season].priceMod;

    // Check active effects
    const marketCrash = gameState.activeEffects.find(e => e.name === 'marketCrash');
    const celebrityBoost = gameState.activeEffects.find(e => e.name === 'celebrityBoost');

    for (const product of ['milk', 'wool', 'eggs']) {
      const amount = gameState[product];
      if (amount <= 0) continue;

      let price;

      // Milk contract: fixed $12/unit overrides market price
      if (product === 'milk' && gameState.milkContractDays > 0) {
        price = 12;
      } else {
        price = gameState.marketPrices[product] * bonus * seasonPriceMod;

        // Market crash: -50% for targeted product
        if (marketCrash && marketCrash.data === product) {
          price *= 0.5;
        }

        // Celebrity endorsement: 3x for targeted product
        if (celebrityBoost && celebrityBoost.data === product) {
          price *= 3;
        }
      }

      total += amount * price;
      gameState[product] = 0;
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

  getSeasonProdMod() {
    const season = getSeason(gameState.day);
    return SEASON_EFFECTS[season].prodMod;
  }

  getSeasonFeedMod() {
    const season = getSeason(gameState.day);
    return SEASON_EFFECTS[season].feedMod;
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
