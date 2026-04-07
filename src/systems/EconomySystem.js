import { gameState } from '../core/GameState.js';
import { GRID, BUILDING_DEFS, TECH_DEFS, getSeason, SEASON_EFFECTS, SOLAR_SEASON_MOD } from '../core/Constants.js';
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
    for (const product of ['milk', 'wool', 'eggs', 'fish']) {
      const base = { milk: 15, wool: 7, eggs: 2, fish: 10 }[product];
      const factor = 0.92 + Math.random() * 0.16; // 0.92 to 1.08
      gameState.marketPrices[product] = Math.max(
        base * 0.5,
        Math.min(base * 2.5, gameState.marketPrices[product] * factor)
      );
      // Round to 2 decimal places
      gameState.marketPrices[product] = Math.round(gameState.marketPrices[product] * 100) / 100;

      // Track price history (last 7 entries)
      if (!gameState.priceHistory[product]) gameState.priceHistory[product] = [];
      gameState.priceHistory[product].push(gameState.marketPrices[product]);
      if (gameState.priceHistory[product].length > 7) gameState.priceHistory[product].shift();
    }

    // 3. Feed costs: handled per-animal in AnimalSystem._deductFeedCost()
    //    (includes silo proximity bonus + tech savings, so no duplicate here)

    // 4. Energy: solar + farmhouse generation vs building + animal drain
    const solarCount = this.buildingSystem.countBuildings('solar');
    const solarBase = solarCount * BUILDING_DEFS.solar.energyGen;
    const solarOutput = solarBase * (SOLAR_SEASON_MOD[season] || 1.0);

    // Farmhouse baseline energy generation
    const farmhouseCount = this.buildingSystem.countBuildings('farmhouse');
    const farmhouseGen = farmhouseCount * (BUILDING_DEFS.farmhouse.energyGen || 0);

    // Building energy drain (skip disabled building)
    const smartGridSave = this.getTechEffect('buildingEnergySave');
    let buildingDrain = 0;
    const disabled = gameState.disabledBuilding;
    for (let row = 0; row < GRID.ROWS; row++) {
      for (let col = 0; col < GRID.COLS; col++) {
        const tile = gameState.map[row]?.[col];
        if (tile && tile.building) {
          // Skip disabled building entirely (no energy gen or bonuses either)
          if (disabled && disabled.col === col && disabled.row === row) continue;
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
    let totalDrain = buildingDrain + animalDrain * (1 - energySave);
    // Blizzard: 2x energy drain
    if (gameState.activeEffects.some(e => e.name === 'blizzard')) totalDrain *= 2;
    const netEnergy = solarOutput + farmhouseGen + gameState.energyBonus - totalDrain;

    gameState.energy += netEnergy;
    gameState.energy = Math.max(-20, gameState.energy); // Hard floor at -20

    // Energy deficit state
    const wasDeficit = gameState.energyDeficit;
    gameState.energyDeficit = gameState.energy <= 0;

    // Warnings
    const maxEnergy = 100 + solarCount * 12; // rough capacity estimate
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

    // 6b. Koi pond fish production
    const seasonFishMod = { spring: 1.5, summer: 1.0, fall: 1.0, winter: 0.5 }[season] || 1.0;
    const heatWaveBonus = gameState.activeEffects.some(e => e.name === 'heatWave') ? 1.5 : 1.0;
    const harvestMoonBonus = gameState.activeEffects.some(e => e.name === 'harvestMoon') ? 1.3 : 1.0;
    let fishProduced = 0;
    for (let row = 0; row < GRID.ROWS; row++) {
      for (let col = 0; col < GRID.COLS; col++) {
        const tile = gameState.map[row]?.[col];
        if (tile && tile.building && tile.building.type === 'koi_pond') {
          // Skip disabled building
          if (disabled && disabled.col === col && disabled.row === row) continue;
          const amount = 2 * seasonFishMod * heatWaveBonus * harvestMoonBonus;
          gameState.fish += amount;
          fishProduced += amount;
          const worldX = col * GRID.TILE_SIZE + GRID.TILE_SIZE / 2;
          const worldZ = row * GRID.TILE_SIZE + GRID.TILE_SIZE / 2;
          eventBus.emit(Events.FLOAT_TEXT, {
            text: `+${amount} fish`,
            x: worldX, y: 1.5, z: worldZ,
            color: '#ff8844',
          });
        }
      }
    }
    if (fishProduced > 0) {
      gameState.dailyIncome += fishProduced * gameState.marketPrices.fish;
    }

    // 7. Auto-sell if enabled
    if (gameState.autoSell) {
      this.sellProducts();
    }

    // 7b. Loan interest accrual (10% per year = 120 game-days)
    if (gameState.loan > 0) {
      const dailyRate = 0.10 / 120; // 10% annual / 120 days per year
      const interest = (gameState.loan + gameState.loanInterest) * dailyRate;
      gameState.loanInterest += interest;
      gameState.dailyCosts += interest;
    }

    // 8. Tick milk contract countdown
    if (gameState.milkContractDays > 0) {
      gameState.milkContractDays--;
      if (gameState.milkContractDays === 0) {
        eventBus.emit(Events.NOTIFICATION, { text: 'Milk contract expired. Back to market prices.', type: 'info' });
      }
    }

    // 8b. Tick decision effect countdowns
    if (gameState.apprenticeDays > 0) {
      gameState.apprenticeDays--;
      // Auto-heal sick animals during apprentice
      for (const animal of gameState.animals) {
        if (animal.sick) {
          animal.sick = false;
          animal.health = 100;
        }
      }
      if (gameState.apprenticeDays === 0) {
        eventBus.emit(Events.NOTIFICATION, { text: 'Apprentice contract ended.', type: 'info' });
      }
    }
    if (gameState.cropRotationDays > 0) {
      gameState.cropRotationDays--;
      if (gameState.cropRotationDays === 0) {
        eventBus.emit(Events.NOTIFICATION, { text: 'Crop rotation bonus ended.', type: 'info' });
      }
    }
    if (gameState.sellPriceModDays > 0) {
      gameState.sellPriceModDays--;
      if (gameState.sellPriceModDays === 0) {
        gameState.sellPriceMod = 0;
        eventBus.emit(Events.NOTIFICATION, { text: 'Sell price modifier expired.', type: 'info' });
      }
    }
    if (gameState.prodModDays > 0) {
      gameState.prodModDays--;
      if (gameState.prodModDays === 0) {
        gameState.prodMod = 0;
        eventBus.emit(Events.NOTIFICATION, { text: 'Production modifier expired.', type: 'info' });
      }
    }

    // 9. Starter subsidy expiry toast
    if (gameState.day === 16) {
      eventBus.emit(Events.TOAST, { text: 'Starter subsidy ended. Your farm is on its own now.', color: '#f0c060', duration: 5000 });
    }

    // 10. Reset weather bonuses (they last only 1 day)
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

    for (const product of ['milk', 'wool', 'eggs', 'fish']) {
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

        // Reputation modifier from decisions
        if (gameState.reputationMod !== 0) {
          price *= (1 + gameState.reputationMod);
        }

        // Sell price modifier from rival_farm compete etc.
        if (gameState.sellPriceMod > 0 && gameState.sellPriceModDays > 0) {
          price *= (1 + gameState.sellPriceMod);
        }

        // Bulk sell bonus: +10% for 50+ units of one product
        if (amount >= 50) {
          price *= 1.1;
        }
      }

      // Track fish sold
      if (product === 'fish') {
        gameState.fishSold = true;
        gameState.totalFishSold += amount;
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

  takeLoan() {
    const amount = 10000;
    if (gameState.loan > 0) {
      eventBus.emit(Events.NOTIFICATION, { text: 'You already have an outstanding loan!', type: 'error' });
      return;
    }
    gameState.loan = amount;
    gameState.loanInterest = 0;
    gameState.money += amount;
    eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    eventBus.emit(Events.NOTIFICATION, { text: `Loan taken: $${amount.toLocaleString()} at 10% annual interest`, type: 'success' });
    eventBus.emit(Events.SFX_PLAY, { sound: 'sell' });
  }

  repayLoan() {
    if (gameState.loan <= 0) {
      eventBus.emit(Events.NOTIFICATION, { text: 'No outstanding loan!', type: 'error' });
      return;
    }
    const total = Math.ceil(gameState.loan + gameState.loanInterest);
    if (gameState.money < total) {
      eventBus.emit(Events.NOTIFICATION, { text: `Not enough cash! Need $${total.toLocaleString()} to repay.`, type: 'error' });
      return;
    }
    gameState.money -= total;
    gameState.totalSpent += total;
    const interestPaid = Math.ceil(gameState.loanInterest);
    gameState.loan = 0;
    gameState.loanInterest = 0;
    gameState.loanRepaid = true;
    eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    eventBus.emit(Events.NOTIFICATION, { text: `Loan repaid! $${total.toLocaleString()} ($${interestPaid.toLocaleString()} interest)`, type: 'success' });
    eventBus.emit(Events.SFX_PLAY, { sound: 'sell' });
  }

  formatMoney(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toFixed(0);
  }
}
