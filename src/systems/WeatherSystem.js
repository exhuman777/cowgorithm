import { gameState } from '../core/GameState.js';
import { WEATHER_EVENTS, TECH_DEFS, getSeason, DECISION_EVENTS } from '../core/Constants.js';
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
      case 'Equipment Failure':
        gameState.activeEffects.push({ name: 'buildingDisable', daysLeft: 2 });
        break;
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
