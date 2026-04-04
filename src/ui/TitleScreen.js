// src/ui/TitleScreen.js

export class TitleScreen {
  constructor() {
    this.el = document.getElementById('title-screen');
  }

  show() {
    if (this.el) {
      this.el.style.display = 'flex';
      this.el.classList.remove('hidden');
    }
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
}
