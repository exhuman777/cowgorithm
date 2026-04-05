import { gameState } from '../core/GameState.js';
import { WEATHER_EVENTS, TECH_DEFS } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';

export class WeatherSystem {
  constructor(buildingSystem) {
    this.buildingSystem = buildingSystem;
  }

  checkWeatherEvent() {
    // Only trigger after day 3
    if (gameState.day <= 3) return;

    // Cooldown check
    if (gameState.eventCooldown > 0) {
      gameState.eventCooldown--;
      return;
    }

    // Roll each event's probability
    for (const event of WEATHER_EVENTS) {
      if (Math.random() < event.prob) {
        this.triggerEvent(event);
        gameState.eventCooldown = 3; // 3-day cooldown
        return; // Only one event per day
      }
    }
  }

  triggerEvent(event) {
    // Apply event effects
    switch (event.name) {
      case 'Sunny Day':
        gameState.weatherBonus = 2; // 2x grass growth
        break;
      case 'Rain Storm':
        gameState.weatherBonus = 3; // 3x grass growth
        gameState.weatherProdPenalty = 0.2; // -20% production
        break;
      case 'Market Boom':
        gameState.marketBonus = 0.3; // +30% sell prices
        break;
      case 'Disease': {
        // Apply disease reduction from tech
        let diseaseReduce = 0;
        for (const techId of gameState.techs) {
          const tech = TECH_DEFS.find(t => t.id === techId);
          if (tech && tech.effect && tech.effect.diseaseReduce) {
            diseaseReduce += tech.effect.diseaseReduce;
          }
        }
        diseaseReduce = Math.min(diseaseReduce, 0.95);

        // Infect animals, reduced by tech + vet proximity
        const shuffled = [...gameState.animals].sort(() => Math.random() - 0.5);
        let infected = 0;
        for (const animal of shuffled) {
          if (infected >= Math.max(1, Math.floor(gameState.animals.length * 0.3))) break;
          // Vet lab proximity reduces disease chance
          const animalCol = Math.floor(animal.x);
          const animalRow = Math.floor(animal.y);
          const nearVet = this.buildingSystem ? this.buildingSystem.isNearVet(animalCol, animalRow) : false;
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
        gameState.marketBonus = 0.5; // +50% sell prices
        break;
      case 'Drought':
        gameState.weatherBonus = 0.5; // Half grass regrowth
        break;
      case 'Gov Subsidy':
        gameState.money += 3000;
        gameState.totalEarnings += 3000;
        eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
        break;
      case 'Tech Grant':
        gameState.techDiscount = 0.5; // 50% off next tech
        break;
      case 'Festival':
        for (const animal of gameState.animals) {
          animal.happiness = Math.min(100, animal.happiness + 20);
        }
        break;
      case 'Predator Alert':
        for (const animal of gameState.animals) {
          if (animal.type === 'chicken') {
            animal.happiness = Math.max(0, animal.happiness - 30);
          }
        }
        break;
    }

    eventBus.emit(Events.WEATHER_EVENT, { event });
    eventBus.emit(Events.NOTIFICATION, { msg: `Event: ${event.msg}` });
    eventBus.emit(Events.TOAST, { text: event.msg, color: '#f59e0b' });
  }
}
