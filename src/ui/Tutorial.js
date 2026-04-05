// src/ui/Tutorial.js
import { TUTORIAL_STEPS } from '../core/Constants.js';
import { gameState } from '../core/GameState.js';
import { eventBus, Events } from '../core/EventBus.js';

export class Tutorial {
  constructor() {
    this.overlay = document.getElementById('tutorial-overlay');
    this.card = document.getElementById('tut-card');
    this.step = 0;
    this.waiting = false;
    this._listeners = [];
  }

  start() {
    this.step = gameState.tutorialStep || 0;
    this.showStep();
    if (this.overlay) this.overlay.style.display = 'block';
  }

  showStep() {
    if (!this.card || this.step >= TUTORIAL_STEPS.length) { this.end(); return; }
    const s = TUTORIAL_STEPS[this.step];
    this._clearHighlights();
    this.waiting = false;

    // Progress dots
    let dots = '';
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      dots += `<span style="display:inline-block;width:6px;height:6px;border:1px solid var(--ink);${i === this.step ? 'background:var(--accent)' : ''};margin:0 2px"></span>`;
    }

    if (s.type === 'overlay') {
      this.card.innerHTML = `
        <div class="tut-step">Step ${this.step + 1} of ${TUTORIAL_STEPS.length}</div>
        <h3>${s.title}</h3>
        <p style="white-space:pre-line">${s.text}</p>
        <div style="margin:12px 0">${dots}</div>
        <div class="tut-btns">
          <button class="tut-btn skip" onclick="window.game?.tutorialEnd()">Skip</button>
          ${this.step < TUTORIAL_STEPS.length - 1
            ? '<button class="tut-btn next" onclick="window.game?.tutorialNext()">Next</button>'
            : '<button class="tut-btn next" onclick="window.game?.tutorialEnd()">Start Farming!</button>'}
        </div>`;
      if (s.highlight) this._highlightElement(s.highlight);
    } else if (s.type === 'action') {
      this.waiting = true;
      this.card.innerHTML = `
        <div class="tut-step">Step ${this.step + 1} of ${TUTORIAL_STEPS.length}</div>
        <h3>${s.title}</h3>
        <p style="white-space:pre-line">${s.text}</p>
        <div style="margin:12px 0">${dots}</div>
        <div class="tut-btns">
          <button class="tut-btn skip" onclick="window.game?.tutorialEnd()">Skip</button>
        </div>`;
      if (s.highlightBtn) this._highlightElement(s.highlightBtn);
      this._waitForAction(s.waitFor);
    }

    gameState.tutorialStep = this.step;
  }

  _waitForAction(action) {
    const handler = () => {
      if (!this.waiting) return;
      this.waiting = false;
      this._removeListener(action, handler);
      this.next();
    };
    switch (action) {
      case 'animalSelected':
        eventBus.on(Events.SELECTION_CHANGED, handler);
        this._listeners.push({ event: Events.SELECTION_CHANGED, fn: handler });
        break;
      case 'buildingPlaced':
        eventBus.on(Events.BUILDING_PLACED, handler);
        this._listeners.push({ event: Events.BUILDING_PLACED, fn: handler });
        break;
      case 'productsSold':
        eventBus.on(Events.PRODUCTS_SOLD, handler);
        this._listeners.push({ event: Events.PRODUCTS_SOLD, fn: handler });
        break;
      case 'techOpened':
        eventBus.on('ui:toggleTechTree', handler);
        this._listeners.push({ event: 'ui:toggleTechTree', fn: handler });
        break;
    }
  }

  _removeListener(action, fn) {
    for (let i = this._listeners.length - 1; i >= 0; i--) {
      if (this._listeners[i].fn === fn) {
        eventBus.off(this._listeners[i].event, fn);
        this._listeners.splice(i, 1);
      }
    }
  }

  _highlightElement(selector) {
    const el = document.querySelector(selector);
    if (el) {
      el.style.outline = '2px solid var(--accent)';
      el.style.outlineOffset = '2px';
      el.dataset.tutHighlight = 'true';
    }
  }

  _clearHighlights() {
    document.querySelectorAll('[data-tut-highlight]').forEach(el => {
      el.style.outline = '';
      el.style.outlineOffset = '';
      delete el.dataset.tutHighlight;
    });
  }

  next() {
    this.step++;
    if (this.step < TUTORIAL_STEPS.length) {
      this.showStep();
    } else {
      this.end();
    }
  }

  end() {
    this._clearHighlights();
    for (const l of this._listeners) eventBus.off(l.event, l.fn);
    this._listeners = [];
    if (this.overlay) this.overlay.style.display = 'none';
    gameState.tutorialDone = true;
  }
}
