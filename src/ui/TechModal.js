// src/ui/TechModal.js
import { TECH_DEFS } from '../core/Constants.js';
import { gameState } from '../core/GameState.js';

export class TechModal {
  constructor(techSystem) {
    this.techSystem = techSystem;
    this.overlay = document.getElementById('tech-overlay');
    this.grid = document.getElementById('tech-grid');
  }

  open() {
    this.render();
    if (this.overlay) this.overlay.classList.add('active');
  }

  close() {
    if (this.overlay) this.overlay.classList.remove('active');
  }

  render() {
    if (!this.grid) return;
    this.grid.innerHTML = '';

    for (let tier = 1; tier <= 4; tier++) {
      const tierTechs = TECH_DEFS.filter(t => t.tier === tier);

      const tierHeader = document.createElement('div');
      tierHeader.style.cssText = 'grid-column:1/-1;color:var(--text2);font-size:12px;margin-top:8px;padding:4px 0;border-bottom:1px solid var(--border)';
      tierHeader.textContent = `TIER ${tier}`;
      this.grid.appendChild(tierHeader);

      for (const tech of tierTechs) {
        const status = this.techSystem.getStatus(tech.id);
        const cost = this.techSystem.getTechCost(tech);
        const card = document.createElement('div');
        card.className = 'tech-card';

        let borderColor = 'var(--border)';
        let opacity = '0.5';
        let cursor = 'default';
        if (status === 'unlocked') { borderColor = 'var(--emerald)'; opacity = '1'; }
        else if (status === 'available') { borderColor = 'var(--cyan)'; opacity = '1'; cursor = 'pointer'; }

        card.style.cssText = `
          background:var(--panel2);border:1px solid ${borderColor};border-radius:6px;
          padding:10px;opacity:${opacity};cursor:${cursor};transition:all 0.2s;
        `;

        let prereqText = '';
        if (tech.requires && tech.requires.length > 0) {
          const names = tech.requires.map(r => {
            const t = TECH_DEFS.find(td => td.id === r);
            return t ? t.name : r;
          });
          prereqText = `<div style="font-size:10px;color:var(--text3);margin-top:4px">Requires: ${names.join(', ')}</div>`;
        }
        if (tech.needsAI) {
          prereqText += `<div style="font-size:10px;color:var(--purple);margin-top:2px">Needs AI Center</div>`;
        }

        card.innerHTML = `
          <div style="font-size:13px;font-weight:700;color:${status === 'unlocked' ? 'var(--emerald)' : 'var(--text)'};margin-bottom:4px">${tech.name}</div>
          <div style="font-size:11px;color:var(--text2);margin-bottom:6px">${tech.desc}</div>
          ${prereqText}
          <div style="font-size:12px;font-weight:700;margin-top:6px;color:${status === 'unlocked' ? 'var(--emerald)' : status === 'available' ? 'var(--amber)' : 'var(--text3)'}">
            ${status === 'unlocked' ? 'UNLOCKED' : `$${cost.toLocaleString()}`}
          </div>
        `;

        if (status === 'available') {
          card.addEventListener('click', () => {
            this.techSystem.unlock(tech.id);
            this.render();
          });
          card.addEventListener('mouseenter', () => { card.style.borderColor = 'var(--cyan-light)'; });
          card.addEventListener('mouseleave', () => { card.style.borderColor = 'var(--cyan)'; });
        }

        this.grid.appendChild(card);
      }
    }
  }
}
