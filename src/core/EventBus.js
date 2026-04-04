// src/core/EventBus.js
export const Events = {
  // Game lifecycle
  GAME_START: 'game:start',
  GAME_TICK: 'game:tick',
  DAY_NEW: 'day:new',

  // Animals
  ANIMAL_SPAWN: 'animal:spawn',
  ANIMAL_PRODUCE: 'animal:produce',
  ANIMAL_SICK: 'animal:sick',
  ANIMAL_HEALED: 'animal:healed',
  ANIMAL_SOLD: 'animal:sold',
  ANIMAL_DIED: 'animal:died',
  ANIMAL_TASK_ASSIGNED: 'animal:taskAssigned',
  ANIMAL_TASK_COMPLETE: 'animal:taskComplete',
  ANIMAL_BRED: 'animal:bred',

  // Buildings
  BUILDING_PLACED: 'building:placed',
  BUILDING_DEMOLISHED: 'building:demolished',
  PASTURE_PLACED: 'pasture:placed',
  LAND_EXPANDED: 'land:expanded',

  // Economy
  MONEY_CHANGED: 'money:changed',
  PRODUCTS_SOLD: 'products:sold',

  // Tech
  TECH_UNLOCKED: 'tech:unlocked',

  // Quests and Milestones
  QUEST_COMPLETE: 'quest:complete',
  MILESTONE_COMPLETE: 'milestone:complete',

  // Weather
  WEATHER_EVENT: 'weather:event',

  // UI
  SELECTION_CHANGED: 'selection:changed',
  BUILD_MODE_CHANGED: 'buildMode:changed',
  NOTIFICATION: 'notification',
  FLOAT_TEXT: 'floatText',
  TOAST: 'toast',

  // Audio
  AUDIO_INIT: 'audio:init',
  SFX_PLAY: 'sfx:play',
};

class EventBus {
  constructor() { this.listeners = {}; }
  on(event, cb) { (this.listeners[event] ||= []).push(cb); return this; }
  off(event, cb) { const l = this.listeners[event]; if (l) this.listeners[event] = l.filter(c => c !== cb); return this; }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) { console.error(`EventBus error [${event}]:`, e); } }); return this; }
  removeAll() { this.listeners = {}; return this; }
}

export const eventBus = new EventBus();
