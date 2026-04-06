// src/ui/GuidedTour.js — YESNO-style guided product tour

const TOUR_STEPS = [
  {
    title: 'Welcome to CowGorithm',
    desc: 'The Bloomberg terminal for farming. Build an AI-powered agricultural empire from 3 cows and $15,000. This tour walks you through every panel and system.',
    selector: null,
    position: 'center',
  },
  {
    title: 'Build Panel',
    desc: 'Your construction hub. Top section has infrastructure: pastures, barns, milking stations, solar arrays. Bottom has livestock to buy. Each building costs cash and drains energy per day. Place them strategically near your animals for maximum efficiency.',
    selector: '#left-panel',
    position: 'right',
  },
  {
    title: 'Resource Bar',
    desc: 'Track your empire at a glance. $ = Cash, MLK = Milk, WOL = Wool, EGG = Eggs, PWR = Energy, DAT = AI Data. Animals produce goods, you sell them for cash, then reinvest into tech and buildings.',
    selector: '#top-bar',
    position: 'below',
  },
  {
    title: '3D Farm View',
    desc: 'Your interactive world. Click animals to inspect them, click tiles to build. Drag to rotate the camera, scroll to zoom, right-drag to pan. Seasons change the landscape -- sakura in spring, snow in winter.',
    selector: '#canvas-wrap',
    position: 'center',
  },
  {
    title: 'Quest Bar',
    desc: 'Your mission tracker. Follow 12 quests from Phase 1 through completion. Each quest rewards cash when finished. Click the [?] button for hints when stuck.',
    selector: '#quest-bar',
    position: 'below',
  },
  {
    title: 'Station Status',
    desc: 'Farm overview at a glance: animal count, buildings placed, owned land tiles, tech progress, daily income vs costs, and total lifetime earnings. Watch the income-to-cost ratio.',
    selector: '#section-station',
    position: 'left',
  },
  {
    title: 'Market Data',
    desc: 'Live commodity prices for milk, wool, and eggs. Prices fluctuate daily with random walks. The arrows show price trends. Sell when prices are high -- Fall season gives a +30% sell bonus.',
    selector: '#section-market',
    position: 'left',
  },
  {
    title: 'Research Goals',
    desc: '8 milestones to chase: First Herd (10 animals), Tech Pioneer (3 techs), Big Ranch (150 tiles), and more. Each milestone gives permanent rewards like cash, energy, or a free drone.',
    selector: '#milestones-list',
    position: 'left',
  },
  {
    title: 'Speed Controls',
    desc: 'Control time flow. Pause (||) to plan your moves, Normal (1x) to watch, or speed up to 10x. Keyboard shortcuts: 0 = pause, 1-4 = speed levels. Fast-forward through slow days.',
    selector: '.speed-controls',
    position: 'below',
  },
  {
    title: 'Energy System',
    desc: 'Every building drains power. Build Solar Arrays to generate energy. If PWR hits zero, buildings go offline and production halves. Summer gives +20% solar, winter -33%. Smart Grid tech saves 25%.',
    selector: '#res-energy',
    position: 'below',
  },
  {
    title: 'Tech Tree',
    desc: '13 AI technologies across 4 tiers. Start with GPS Tracking and Health Monitor. Work toward CowGorithm v2 and Carbon Credits. Tier 3+ requires an AI Command Center building. Press T to open.',
    selector: '.action-btn.tech',
    position: 'right',
  },
  {
    title: 'Expedition Logs',
    desc: 'Your farm\'s event feed. Every sale, weather event, milestone, animal birth, and day change is logged here. Scroll back to review your farm\'s history and track what happened.',
    selector: '#bottom-bar',
    position: 'above',
  },
];

export class GuidedTour {
  constructor() {
    this.currentStep = 0;
    this.active = false;
    this.overlay = null;
    this.card = null;
    this.ring = null;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.currentStep = 0;
    this._createElements();
    this._showStep();
  }

  _createElements() {
    // Overlay (dims everything)
    this.overlay = document.createElement('div');
    this.overlay.className = 'tour-overlay';
    this.overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    document.body.appendChild(this.overlay);

    // Highlight ring (positioned over target element)
    this.ring = document.createElement('div');
    this.ring.className = 'tour-ring';
    document.body.appendChild(this.ring);

    // Description card
    this.card = document.createElement('div');
    this.card.className = 'tour-card';
    document.body.appendChild(this.card);
  }

  _showStep() {
    const step = TOUR_STEPS[this.currentStep];
    const total = TOUR_STEPS.length;

    // Update highlight ring (clamped to viewport + scrollable parent)
    if (step.selector) {
      const el = document.querySelector(step.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Start with element rect + 4px padding
        let top = rect.top - 4;
        let left = rect.left - 4;
        let right = rect.right + 4;
        let bottom = rect.bottom + 4;

        // Clamp to nearest scrollable parent's visible area
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
          const ps = getComputedStyle(parent);
          if (ps.overflowY === 'auto' || ps.overflowY === 'scroll') {
            const pr = parent.getBoundingClientRect();
            top = Math.max(top, pr.top);
            bottom = Math.min(bottom, pr.bottom);
            left = Math.max(left, pr.left);
            right = Math.min(right, pr.right);
            break;
          }
          parent = parent.parentElement;
        }

        // Clamp to viewport
        top = Math.max(0, top);
        left = Math.max(0, left);
        right = Math.min(vw, right);
        bottom = Math.min(vh, bottom);

        this.ring.style.display = 'block';
        this.ring.style.top = `${top}px`;
        this.ring.style.left = `${left}px`;
        this.ring.style.width = `${Math.max(0, right - left)}px`;
        this.ring.style.height = `${Math.max(0, bottom - top)}px`;
      } else {
        this.ring.style.display = 'none';
      }
    } else {
      this.ring.style.display = 'none';
    }

    // Build progress dots
    const dots = TOUR_STEPS.map((_, i) =>
      `<span class="tour-dot${i === this.currentStep ? ' active' : ''}"></span>`
    ).join('');

    // Build card HTML
    const isFirst = this.currentStep === 0;
    const isLast = this.currentStep === total - 1;

    this.card.innerHTML = `
      <div class="tour-counter">STEP ${this.currentStep + 1} OF ${total}</div>
      <div class="tour-title">${step.title}</div>
      <div class="tour-desc">${step.desc}</div>
      <div class="tour-footer">
        <div class="tour-dots">${dots}</div>
        <div class="tour-btns">
          ${isFirst
            ? '<button class="tour-btn skip" data-action="end">Skip</button>'
            : '<button class="tour-btn back" data-action="back">Back</button>'}
          ${isLast
            ? '<button class="tour-btn next" data-action="end">Done</button>'
            : '<button class="tour-btn next" data-action="next">Next</button>'}
        </div>
      </div>
    `;

    // Wire button clicks (event delegation)
    this.card.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'next') this.next();
        else if (action === 'back') this.back();
        else if (action === 'end') this.end();
      });
    });

    // Position card
    this._positionCard(step);
  }

  _positionCard(step) {
    const card = this.card;
    // Reset all positioning
    card.style.top = '';
    card.style.left = '';
    card.style.right = '';
    card.style.bottom = '';
    card.style.transform = '';

    if (!step.selector || step.position === 'center') {
      card.style.top = '50%';
      card.style.left = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const el = document.querySelector(step.selector);
    if (!el) {
      card.style.top = '50%';
      card.style.left = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = el.getBoundingClientRect();
    const gap = 16;
    const cardW = 340;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    switch (step.position) {
      case 'right': {
        let top = Math.max(20, rect.top);
        let left = rect.right + gap;
        // If card would overflow right, flip to left
        if (left + cardW > vw - 20) {
          left = Math.max(20, rect.left - cardW - gap);
        }
        card.style.top = `${top}px`;
        card.style.left = `${left}px`;
        break;
      }
      case 'left': {
        let top = Math.max(20, Math.min(rect.top, vh - 260));
        let left = rect.left - cardW - gap;
        // If card would overflow left, flip to right
        if (left < 20) {
          left = rect.right + gap;
        }
        card.style.top = `${top}px`;
        card.style.left = `${left}px`;
        break;
      }
      case 'below': {
        let top = rect.bottom + gap;
        let left = Math.max(20, Math.min(rect.left, vw - cardW - 20));
        // If card overflows bottom, put above
        if (top + 200 > vh) {
          top = Math.max(20, rect.top - 200 - gap);
        }
        card.style.top = `${top}px`;
        card.style.left = `${left}px`;
        break;
      }
      case 'above': {
        let left = Math.max(20, Math.min(rect.left, vw - cardW - 20));
        let topPos = rect.top - gap - 220; // estimated card height ~220
        // If card would go off top, place below instead
        if (topPos < 20) {
          topPos = Math.max(20, rect.bottom + gap);
        }
        card.style.top = `${topPos}px`;
        card.style.left = `${left}px`;
        break;
      }
    }
  }

  next() {
    if (this.currentStep < TOUR_STEPS.length - 1) {
      this.currentStep++;
      this._showStep();
    }
  }

  back() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this._showStep();
    }
  }

  end() {
    this.active = false;
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    if (this.ring) { this.ring.remove(); this.ring = null; }
    if (this.card) { this.card.remove(); this.card = null; }
  }
}
