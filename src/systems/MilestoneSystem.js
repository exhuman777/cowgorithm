import { gameState } from '../core/GameState.js';
import { MILESTONES } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';

export class MilestoneSystem {
  constructor(buildingSystem) {
    this.buildingSystem = buildingSystem;
  }

  checkMilestones() {
    for (const ms of MILESTONES) {
      if (gameState.completedMilestones.includes(ms.id)) continue;

      let achieved = false;

      switch (ms.id) {
        case 'm1': achieved = gameState.animals.length >= 10; break;
        case 'm2': achieved = gameState.techs.length >= 3; break;
        case 'm3': achieved = this.buildingSystem.countOwned() >= 150; break;
        case 'm4': achieved = gameState.techs.includes('cowgorithm_v1'); break;
        case 'm5': achieved = gameState.totalEarnings >= 50000; break;
        case 'm6': achieved = new Set(gameState.animals.map(a => a.type)).size >= 5; break;
        case 'm7': achieved = this.buildingSystem.countBuildings('solar') >= 3; break;
        case 'm8': achieved = gameState.techs.length >= 13; break;
        case 'm9': achieved = gameState.totalFishSold >= 50; break;
        case 'm10': achieved = gameState.loanRepaid; break;
        case 'm11': achieved = gameState.animals.length >= 25; break;
        case 'm12': achieved = gameState.totalSellIncome >= 100000; break;
        case 'm13': achieved = gameState.day >= 121; break;
      }

      if (achieved) {
        this.completeMilestone(ms);
      }
    }
  }

  completeMilestone(ms) {
    gameState.completedMilestones.push(ms.id);

    // Apply rewards
    if (ms.rewardMoney) {
      gameState.money += ms.rewardMoney;
      gameState.totalEarnings += ms.rewardMoney;
    }
    if (ms.rewardEnergy) {
      gameState.energyBonus += ms.rewardEnergy;
    }
    if (ms.rewardFreeDrone) {
      gameState.freeDrone = true;
    }
    if (ms.rewardWin) {
      eventBus.emit(Events.TOAST, { text: 'YOU WIN! Full farm automation achieved!', color: '#f59e0b', duration: 10000 });
    }

    eventBus.emit(Events.MILESTONE_COMPLETE, { milestone: ms });
    eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    eventBus.emit(Events.NOTIFICATION, { msg: `Milestone: ${ms.name} - ${ms.reward}` });
    eventBus.emit(Events.SFX_PLAY, { sound: 'milestone' });
    eventBus.emit(Events.TOAST, { text: `Milestone: ${ms.name}!`, color: '#f59e0b' });
  }

  getMilestoneProgress(ms) {
    // Return current value / target for progress bars
    switch (ms.id) {
      case 'm1': return gameState.animals.length;
      case 'm2': return gameState.techs.length;
      case 'm3': return this.buildingSystem.countOwned();
      case 'm4': return gameState.techs.includes('cowgorithm_v1') ? 1 : 0;
      case 'm5': return gameState.totalEarnings;
      case 'm6': return new Set(gameState.animals.map(a => a.type)).size;
      case 'm7': return this.buildingSystem.countBuildings('solar');
      case 'm8': return gameState.techs.length;
      case 'm9': return gameState.totalFishSold;
      case 'm10': return gameState.loanRepaid ? 1 : 0;
      case 'm11': return gameState.animals.length;
      case 'm12': return gameState.totalSellIncome;
      case 'm13': return gameState.day;
      default: return 0;
    }
  }
}
