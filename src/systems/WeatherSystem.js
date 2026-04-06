import { gameState } from '../core/GameState.js';
import { GRID, WEATHER_EVENTS, TECH_DEFS, getSeason, DECISION_EVENTS } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';

export class WeatherSystem {
  constructor(buildingSystem, animalSystem) {
    this.buildingSystem = buildingSystem;
    this.animalSystem = animalSystem;
  }

  checkWeatherEvent() {
    if (gameState.day <= 3) return;

    // Tick down active effects
    this._tickActiveEffects();

    // Cooldown check for regular weather events
    if (gameState.eventCooldown > 0) {
      gameState.eventCooldown--;
    } else {
      const season = getSeason(gameState.day);

      for (const event of WEATHER_EVENTS) {
        // Skip season-only events outside their season
        if (event.seasonOnly && event.seasonOnly !== season) continue;

        let prob = event.prob;
        // Apply season boost
        if (event.seasonBoost && event.seasonBoost[season]) {
          prob *= event.seasonBoost[season];
        }

        if (Math.random() < prob) {
          // Insurance: nullify next disaster
          const isDamage = ['Disease', 'Drought', 'Predator Alert', 'Pest Infestation',
            'Equipment Failure', 'Market Crash', 'Frost', 'Stampede', 'Locusts',
            'Heat Wave', 'Blizzard', 'Animal Escape', 'Tax Audit'].includes(event.name);
          if (isDamage && gameState.insuranceActive) {
            gameState.insuranceActive = false;
            eventBus.emit(Events.TOAST, { text: 'Insurance activated! Disaster nullified.', color: '#10b981' });
            eventBus.emit(Events.NOTIFICATION, { text: 'Your farm insurance covered the disaster!', type: 'success' });
            gameState.eventCooldown = 3;
            break;
          }
          // Storm protection from decision event
          const isStorm = ['Rain Storm', 'Frost', 'Blizzard'].includes(event.name);
          if (isStorm && gameState.stormProtected) {
            gameState.stormProtected = false;
            eventBus.emit(Events.TOAST, { text: 'Storm reinforcements held! No damage.', color: '#10b981' });
            eventBus.emit(Events.NOTIFICATION, { text: 'Your barn reinforcements protected the farm!', type: 'success' });
            gameState.eventCooldown = 3;
            break;
          }
          this.triggerEvent(event, season);
          gameState.eventCooldown = 3;
          break;
        }
      }
    }

    // Decision events (after day 10, separate cooldown)
    if (gameState.day > 10 && gameState.decisionCooldown <= 0 && Math.random() < 0.03) {
      const event = DECISION_EVENTS[Math.floor(Math.random() * DECISION_EVENTS.length)];
      gameState.decisionCooldown = 10;
      eventBus.emit('decision:offer', { event });
    }
    if (gameState.decisionCooldown > 0) gameState.decisionCooldown--;
  }

  triggerEvent(event, season) {
    switch (event.name) {
      case 'Sunny Day':
        gameState.weatherBonus = 2;
        break;
      case 'Rain Storm':
        gameState.weatherBonus = 3;
        gameState.weatherProdPenalty = 0.2;
        break;
      case 'Market Boom':
        gameState.marketBonus = 0.3;
        break;
      case 'Disease': {
        let diseaseReduce = 0;
        for (const techId of gameState.techs) {
          const tech = TECH_DEFS.find(t => t.id === techId);
          if (tech?.effect?.diseaseReduce) diseaseReduce += tech.effect.diseaseReduce;
        }
        diseaseReduce = Math.min(diseaseReduce, 0.95);
        const shuffled = [...gameState.animals].sort(() => Math.random() - 0.5);
        let infected = 0;
        for (const animal of shuffled) {
          if (infected >= Math.max(1, Math.floor(gameState.animals.length * 0.3))) break;
          const animalCol = Math.floor(animal.x);
          const animalRow = Math.floor(animal.y);
          const nearVet = this.buildingSystem?.isNearVet(animalCol, animalRow) || false;
          const totalReduce = diseaseReduce + (nearVet ? 0.3 : 0);
          if (Math.random() < (1 - totalReduce)) {
            animal.sick = true;
            animal.health = 50;
            infected++;
          }
        }
        break;
      }
      case 'Premium Buyer':
        gameState.marketBonus = 0.5;
        break;
      case 'Drought':
        gameState.weatherBonus = 0.5;
        break;
      case 'Gov Subsidy':
        gameState.money += 3000;
        gameState.totalEarnings += 3000;
        eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
        break;
      case 'Tech Grant':
        gameState.techDiscount = 0.5;
        break;
      case 'Festival':
        for (const animal of gameState.animals) {
          animal.happiness = Math.min(100, animal.happiness + 20);
        }
        break;
      case 'Predator Alert':
        for (const animal of gameState.animals) {
          if (animal.type === 'chicken') animal.happiness = Math.max(0, animal.happiness - 30);
        }
        break;
      case 'Pest Infestation':
        gameState.activeEffects.push({ name: 'pestBlock', daysLeft: 3 });
        break;
      case 'Equipment Failure': {
        // Pick a random building to disable
        const buildings = [];
        for (let r = 0; r < GRID.ROWS; r++) {
          for (let c = 0; c < GRID.COLS; c++) {
            const tile = gameState.map[r]?.[c];
            if (tile && tile.building && tile.building.type !== 'farmhouse') {
              buildings.push({ col: c, row: r, type: tile.building.type });
            }
          }
        }
        if (buildings.length > 0) {
          const target = buildings[Math.floor(Math.random() * buildings.length)];
          gameState.disabledBuilding = { col: target.col, row: target.row };
          gameState.activeEffects.push({ name: 'buildingDisable', daysLeft: 2, data: target });
        }
        break;
      }
      case 'Market Crash': {
        const products = ['milk', 'wool', 'eggs'];
        const target = products[Math.floor(Math.random() * products.length)];
        gameState.activeEffects.push({ name: 'marketCrash', daysLeft: 5, data: target });
        break;
      }
      case 'Frost':
        gameState.activeEffects.push({ name: 'frostBlock', daysLeft: 3 });
        break;
      case 'Stampede': {
        const chickens = gameState.animals.filter(a => a.type === 'chicken');
        const lost = Math.min(chickens.length, 1 + Math.floor(Math.random() * 2));
        for (let i = 0; i < lost; i++) {
          if (this.animalSystem) {
            this.animalSystem.removeAnimal(chickens[i]);
          }
        }
        break;
      }
      case 'Traveling Merchant':
        gameState.merchantDiscount = true;
        gameState.activeEffects.push({ name: 'merchantDiscount', daysLeft: 1 });
        break;
      case 'Celebrity Endorsement': {
        const products = ['milk', 'wool', 'eggs'];
        const target = products[Math.floor(Math.random() * products.length)];
        gameState.activeEffects.push({ name: 'celebrityBoost', daysLeft: 2, data: target });
        break;
      }
      case 'Perfect Weather':
        gameState.activeEffects.push({ name: 'perfectWeather', daysLeft: 3 });
        break;
      case 'Golden Calf': {
        if (!this.animalSystem) break;
        const capacity = this.buildingSystem.getCapacity('barn');
        const current = this.buildingSystem.getHousingCount('barn');
        if (current >= capacity) {
          eventBus.emit(Events.NOTIFICATION, { text: 'Golden Calf appeared but no barn space!', type: 'error' });
        } else {
          const animal = this.animalSystem.spawnAnimal('cow');
          animal.name = 'Golden ' + ['Belle', 'Star', 'Luna', 'Gem'][Math.floor(Math.random() * 4)];
          animal.golden = true;
          animal.happiness = 100;
        }
        break;
      }
      case 'Meteor Shower':
        gameState.money += 5000;
        gameState.totalEarnings += 5000;
        eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
        break;
      case 'Locusts':
        gameState.activeEffects.push({ name: 'locusts', daysLeft: 3 });
        break;
      case 'Rainbow':
        for (const animal of gameState.animals) {
          animal.happiness = Math.min(100, animal.happiness + 15);
        }
        break;
      case 'Heat Wave':
        gameState.activeEffects.push({ name: 'heatWave', daysLeft: 2 });
        for (const animal of gameState.animals) {
          animal.happiness = Math.max(0, animal.happiness - 10);
        }
        break;
      case 'Blizzard':
        gameState.activeEffects.push({ name: 'blizzard', daysLeft: 3 });
        for (const animal of gameState.animals) {
          animal.happiness = Math.max(0, animal.happiness - 15);
        }
        break;
      case 'Harvest Moon':
        gameState.activeEffects.push({ name: 'harvestMoon', daysLeft: 2 });
        break;
      case 'Animal Escape': {
        if (!this.animalSystem || gameState.animals.length === 0) break;
        const escapee = gameState.animals[Math.floor(Math.random() * gameState.animals.length)];
        eventBus.emit(Events.NOTIFICATION, { text: `${escapee.name} escaped the farm!`, type: 'error' });
        this.animalSystem.removeAnimal(escapee);
        break;
      }
      case 'Tax Audit': {
        const tax = Math.floor(gameState.money * 0.05);
        gameState.money -= tax;
        gameState.totalSpent += tax;
        eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
        eventBus.emit(Events.NOTIFICATION, { text: `Tax audit: -$${tax.toLocaleString()}`, type: 'error' });
        break;
      }
    }

    eventBus.emit(Events.WEATHER_EVENT, { event });
    eventBus.emit(Events.NOTIFICATION, { msg: `Event: ${event.msg}` });
    eventBus.emit(Events.TOAST, { text: event.msg, color: '#ea4e24' });
  }

  _tickActiveEffects() {
    for (let i = gameState.activeEffects.length - 1; i >= 0; i--) {
      gameState.activeEffects[i].daysLeft--;
      if (gameState.activeEffects[i].daysLeft <= 0) {
        const ended = gameState.activeEffects[i];
        if (ended.name === 'merchantDiscount') gameState.merchantDiscount = false;
        if (ended.name === 'buildingDisable') gameState.disabledBuilding = null;
        gameState.activeEffects.splice(i, 1);
      }
    }
  }

  hasActiveEffect(name) {
    return gameState.activeEffects.some(e => e.name === name);
  }

  getActiveEffect(name) {
    return gameState.activeEffects.find(e => e.name === name);
  }
}
