// src/ui/Tutorial.js
import { TUTORIAL_STEPS } from '../core/Constants.js';
import { gameState } from '../core/GameState.js';

export class Tutorial {
  constructor() {
    this.overlay = document.getElementById('tutorial-overlay');
    this.card = document.getElementById('tut-card');
    this.step = 0;
  }

  start() {
    this.step = 0;
    this.showStep();
    if (this.overlay) this.overlay.classList.add('active');
  }

  showStep() {
    if (!this.card) return;
    const s = TUTORIAL_STEPS[this.step];
    this.card.innerHTML = `
      <div class="tut-step">Step ${this.step + 1} of ${TUTORIAL_STEPS.length}</div>
      <h3>${s.title}</h3>
      <p style="white-space:pre-line">${s.text}</p>
      <div class="tut-btns">
        <button class="tut-btn skip" onclick="window.game?.tutorialEnd()">Skip</button>
        ${this.step < TUTORIAL_STEPS.length - 1
          ? '<button class="tut-btn next" onclick="window.game?.tutorialNext()">Next</button>'
          : '<button class="tut-btn next" onclick="window.game?.tutorialEnd()">Start Farming!</button>'}
      </div>`;
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
    if (this.overlay) this.overlay.classList.remove('active');
    gameState.tutorialDone = true;
  }
}
