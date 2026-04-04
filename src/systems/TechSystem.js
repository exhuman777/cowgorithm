import { gameState } from '../core/GameState.js';
import { TECH_DEFS } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';

export class TechSystem {
  constructor(buildingSystem) {
    this.buildingSystem = buildingSystem;
  }

  canUnlock(techId) {
    const tech = TECH_DEFS.find(t => t.id === techId);
    if (!tech) return false;

    // Already unlocked?
    if (gameState.techs.includes(techId)) return false;

    // Prerequisites met?
    if (tech.requires) {
      for (const req of tech.requires) {
        if (!gameState.techs.includes(req)) return false;
      }
    }

    // Needs AI Center?
    if (tech.needsAI && !this.buildingSystem.hasAICenter()) return false;

    // Can afford? (with discount)
    const cost = this.getTechCost(tech);
    if (gameState.money < cost) return false;

    return true;
  }

  getTechCost(tech) {
    const discount = gameState.techDiscount || 0;
    return Math.floor(tech.cost * (1 - discount));
  }

  unlock(techId) {
    if (!this.canUnlock(techId)) return false;

    const tech = TECH_DEFS.find(t => t.id === techId);
    const cost = this.getTechCost(tech);

    gameState.money -= cost;
    gameState.totalSpent += cost;
    gameState.techs.push(techId);

    // Clear tech discount after use
    if (gameState.techDiscount > 0) {
      gameState.techDiscount = 0;
    }

    // If GPS unlocked, show collars on all animals
    if (techId === 'gps') {
      for (const animal of gameState.animals) {
        animal.collarVisible = true;
      }
    }

    // If CowGorithm v1 unlocked, enable auto-manage on all animals
    if (techId === 'cowgorithm_v1') {
      for (const animal of gameState.animals) {
        animal.autoManage = true;
      }
    }

    eventBus.emit(Events.TECH_UNLOCKED, { techId, tech });
    eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    eventBus.emit(Events.NOTIFICATION, { msg: `Unlocked: ${tech.name}!` });
    eventBus.emit(Events.SFX_PLAY, { sound: 'milestone' });
    eventBus.emit(Events.TOAST, { text: `Tech Unlocked: ${tech.name}`, color: '#06b6d4' });

    return true;
  }

  hasTech(id) {
    return gameState.techs.includes(id);
  }

  getTechEffect(effectName) {
    let total = 0;
    for (const techId of gameState.techs) {
      const tech = TECH_DEFS.find(t => t.id === techId);
      if (tech && tech.effect && tech.effect[effectName] !== undefined) {
        total += tech.effect[effectName];
      }
    }
    return Math.min(total, 1);
  }

  getStatus(techId) {
    if (gameState.techs.includes(techId)) return 'unlocked';
    const tech = TECH_DEFS.find(t => t.id === techId);
    if (!tech) return 'locked';

    // Check prereqs
    if (tech.requires) {
      for (const req of tech.requires) {
        if (!gameState.techs.includes(req)) return 'locked';
      }
    }
    // Check AI center requirement
    if (tech.needsAI && !this.buildingSystem.hasAICenter()) return 'locked';

    return 'available';
  }
}
