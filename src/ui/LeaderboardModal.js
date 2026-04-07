// src/ui/LeaderboardModal.js -- Leaderboard display with Speedrun/Mogul tabs

import { fetchLeaderboard } from '../systems/ScoreSystem.js';

export class LeaderboardModal {
  constructor() {
    this.overlay = document.getElementById('leaderboard-overlay');
    this.activeTab = 'speedrun';
    this.cache = { speedrun: null, mogul: null };

    // Tab buttons
    const tabBtns = this.overlay?.querySelectorAll('.lb-tab');
    tabBtns?.forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.mode;
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadData();
      });
    });

    // Close button
    const closeBtn = this.overlay?.querySelector('.lb-close');
    closeBtn?.addEventListener('click', () => this.close());
  }

  open() {
    if (!this.overlay) return;
    this.overlay.style.display = 'flex';
    this.cache = { speedrun: null, mogul: null };
    this.loadData();
  }

  close() {
    if (this.overlay) this.overlay.style.display = 'none';
  }

  async loadData() {
    const body = this.overlay.querySelector('.lb-body');
    if (!body) return;

    body.innerHTML = '<div style="text-align:center;padding:40px;color:rgba(192,208,224,0.5);font-family:var(--mono);font-size:.8rem">Loading...</div>';

    if (this.cache[this.activeTab]) {
      this.render(this.cache[this.activeTab]);
      return;
    }

    const entries = await fetchLeaderboard(this.activeTab);
    this.cache[this.activeTab] = entries;
    this.render(entries);
  }

  render(entries) {
    const body = this.overlay.querySelector('.lb-body');
    if (!body) return;

    if (!entries || entries.length === 0) {
      body.innerHTML = '<div style="text-align:center;padding:40px;color:rgba(192,208,224,0.5);font-family:var(--mono);font-size:.8rem">No runs yet. Be the first!</div>';
      return;
    }

    const isSpeedrun = this.activeTab === 'speedrun';
    const header = `<div class="lb-row lb-header">
      <span class="lb-rank">#</span>
      <span class="lb-name">FARMER</span>
      <span class="lb-score">${isSpeedrun ? 'DAYS' : 'SCORE'}</span>
      <span class="lb-date">DATE</span>
    </div>`;

    const rows = entries.map((e, i) => {
      const rank = i + 1;
      const val = isSpeedrun ? e.completionDay : (e.mogulScore || 0).toLocaleString();
      const date = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const rankClass = rank <= 3 ? ` lb-top${rank}` : '';
      return `<div class="lb-row${rankClass}">
        <span class="lb-rank">${rank}</span>
        <span class="lb-name">${this.escapeHtml(e.playerName || 'Anonymous')}</span>
        <span class="lb-score">${val}</span>
        <span class="lb-date">${date}</span>
      </div>`;
    }).join('');

    body.innerHTML = header + rows;
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
