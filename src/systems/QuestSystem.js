import { gameState } from '../core/GameState.js';
import { QUESTS } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';

export class QuestSystem {
  constructor(buildingSystem) {
    this.buildingSystem = buildingSystem;
  }

  getCurrentQuest() {
    for (const quest of QUESTS) {
      if (!gameState.completedQuests.includes(quest.id)) return quest;
    }
    return null; // All quests complete
  }

  getCurrentQuestIndex() {
    const quest = this.getCurrentQuest();
    if (!quest) return QUESTS.length;
    return QUESTS.findIndex(q => q.id === quest.id);
  }

  getPhase() {
    const idx = this.getCurrentQuestIndex();
    if (idx < 3) return 1;
    if (idx < 6) return 2;
    if (idx < 9) return 3;
    if (idx < 14) return 4;
    return 5;
  }

  checkQuests() {
    const quest = this.getCurrentQuest();
    if (!quest) return;

    let completed = false;

    switch (quest.id) {
      case 'q1': completed = gameState.totalSellIncome >= 10; break;
      case 'q2': completed = this.buildingSystem.countBuildings('solar') >= 1; break;
      case 'q3': completed = this.buildingSystem.countBuildings('milking') >= 1; break;
      case 'q4': completed = gameState.animals.filter(a => a.type === 'cow').length >= 5; break;
      case 'q5': completed = gameState.techs.includes('gps'); break;
      case 'q6': completed = gameState.animals.some(a => a.task && (a.task.type === 'milk' || a.task.type === 'milking')); break;
      case 'q7': completed = gameState.techs.includes('health_mon'); break;
      case 'q8': completed = gameState.techs.includes('solar_collar'); break;
      case 'q9': completed = gameState.animals.some(a => ['sheep', 'chicken', 'goat'].includes(a.type)); break;
      case 'q10': completed = this.buildingSystem.countBuildings('koi_pond') >= 1; break;
      case 'q11': completed = gameState.fishSold; break;
      case 'q12': completed = gameState.day >= 31; break;
      case 'q13': completed = gameState.loanRepaid; break;
      case 'q14': completed = gameState.animalsBred >= 1; break;
      case 'q15': completed = gameState.animals.some(a => a.type === 'beef' && (a.beefDayCounter || 0) >= 60); break;
      case 'q16': {
        const types = new Set();
        for (let r = 0; r < 20; r++) for (let c = 0; c < 32; c++) {
          const tile = gameState.map[r]?.[c];
          if (tile && tile.building && tile.building.type !== 'farmhouse') types.add(tile.building.type);
        }
        completed = types.size >= 3;
        break;
      }
      case 'q17': completed = gameState.totalEarnings >= 25000; break;
      case 'q18': completed = this.buildingSystem.countBuildings('ai_center') >= 1; break;
      case 'q19': completed = gameState.techs.includes('cowgorithm_v1'); break;
      case 'q20': completed = gameState.techs.length >= 13 && gameState.animals.length >= 20; break;
    }

    if (completed) {
      this.completeQuest(quest);
    }
  }

  completeQuest(quest) {
    gameState.completedQuests.push(quest.id);
    gameState.money += quest.reward;
    gameState.totalEarnings += quest.reward;

    eventBus.emit(Events.QUEST_COMPLETE, { quest });
    eventBus.emit(Events.MONEY_CHANGED, { money: gameState.money });
    eventBus.emit(Events.NOTIFICATION, { msg: `Quest Complete: ${quest.text} (+$${quest.reward})` });
    eventBus.emit(Events.SFX_PLAY, { sound: 'milestone' });
    eventBus.emit(Events.TOAST, { text: `Quest Complete! +$${quest.reward}`, color: '#10b981' });
  }
}
