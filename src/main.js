import { eventBus, Events } from './core/EventBus.js';
import { gameState } from './core/GameState.js';
import { GRID, BUILDING_DEFS, ANIMAL_DEFS, TECH_DEFS } from './core/Constants.js';

console.log('COWGORITHM core loaded');
console.log('Grid:', GRID.COLS, 'x', GRID.ROWS);
console.log('Buildings:', Object.keys(BUILDING_DEFS).length);
console.log('Animals:', Object.keys(ANIMAL_DEFS).length);
console.log('Techs:', TECH_DEFS.length);
console.log('Map tiles:', gameState.map.length, 'x', gameState.map[0].length);
console.log('Starting money:', gameState.money);
