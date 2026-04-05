// src/ui/DecisionModal.js
import { gameState } from '../core/GameState.js';
import { eventBus, Events } from '../core/EventBus.js';

export class DecisionModal {
  constructor() {
    this.overlay = document.getElementById('decision-overlay');
    this.titleEl = document.getElementById('decision-title');
    this.descEl = document.getElementById('decision-desc');
    this.optionsEl = document.getElementById('decision-options');
    this.currentEvent = null;
    this.onChoose = null;
  }

  show(event, onChoose) {
    this.currentEvent = event;
    this.onChoose = onChoose;
    if (this.titleEl) this.titleEl.textContent = event.title;
    if (this.descEl) this.descEl.textContent = event.desc;
    if (this.optionsEl) {
      this.optionsEl.innerHTML = '';
      event.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'sel-btn' + (idx === 0 ? ' heal' : '');
        btn.style.cssText = 'padding:8px 20px;font-size:.75rem';
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
          this.close();
          if (this.onChoose) this.onChoose(opt, idx);
        });
        this.optionsEl.appendChild(btn);
      });
    }
    if (this.overlay) this.overlay.classList.add('active');
  }

  close() {
    if (this.overlay) this.overlay.classList.remove('active');
    this.currentEvent = null;
  }
}
