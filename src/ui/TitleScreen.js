// src/ui/TitleScreen.js

export class TitleScreen {
  constructor() {
    this.el = document.getElementById('title-screen');
    this.showPB();
  }

  show() {
    if (this.el) {
      this.el.style.display = 'flex';
      this.el.classList.remove('hidden');
    }
    this.showPB();
  }

  hide() {
    if (this.el) {
      this.el.classList.add('hidden');
      setTimeout(() => { this.el.style.display = 'none'; }, 600);
    }
  }

  showContinueButton() {
    const btn = document.getElementById('continue-btn');
    if (btn) btn.style.display = 'inline-block';
  }

  showPB() {
    const pbEl = document.getElementById('title-pb');
    if (!pbEl) return;
    try {
      const raw = localStorage.getItem('cowgorithm_pb');
      if (raw) {
        const pb = JSON.parse(raw);
        pbEl.textContent = `Personal Best: ${pb.completionDay} days`;
        pbEl.style.display = 'block';
      }
    } catch (e) {}
  }
}
