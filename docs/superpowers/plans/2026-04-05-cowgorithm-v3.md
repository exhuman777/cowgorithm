# COWGORITHM v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade COWGORITHM with dark cloudwave theme toggle, energy as a real strategic constraint, viewport-contained modals, local PB leaderboard, sakura trees, ambient world particles, and rebuilt land visuals.

**Architecture:** All changes are in-place modifications to an existing Vite + Three.js vanilla JS game. Single `index.html` with inline CSS, JS modules in `src/`. No backend, no test framework. Verification is `npm run build` + visual checks via `npm run dev`.

**Tech Stack:** Vite 7, Three.js 0.183, vanilla JS modules, inline CSS in index.html

**Spec:** `docs/superpowers/specs/2026-04-05-cowgorithm-v3-design.md`

---

### Task 1: Constants + GameState data updates

**Files:**
- Modify: `src/core/Constants.js`
- Modify: `src/core/GameState.js`

Adds building energy costs, Smart Grid tech, solar season modifiers, new tutorial steps, and gameState fields for theme/leaderboard/energy-deficit.

- [ ] **Step 1: Add energy costs to BUILDING_DEFS in Constants.js**

In `src/core/Constants.js`, add `energyCost` to each building definition:

```js
export const BUILDING_DEFS = {
  farmhouse: { name: 'Farmhouse', cost: 0, color: 0x8b4513, desc: 'Your home base', energyCost: 0 },
  pasture:   { name: 'Pasture', cost: 200, color: 0x2d6b11, desc: 'Managed grassland, faster regrowth', energyCost: 0 },
  barn:      { name: 'Barn', cost: 5000, color: 0x8b6914, capacity: 10, desc: 'Houses up to 10 large animals', energyCost: 2 },
  milking:   { name: 'Milking Station', cost: 8000, color: 0xe0e0e0, range: 5, bonus: 'dairy', bonusAmt: 0.5, desc: '+50% milk in range', energyCost: 3 },
  shearing:  { name: 'Shearing Shed', cost: 6000, color: 0xd4a574, range: 5, bonus: 'wool', bonusAmt: 0.5, desc: '+50% wool in range', energyCost: 2 },
  coop:      { name: 'Chicken Coop', cost: 3000, color: 0xc4a35a, capacity: 20, animalType: 'chicken', desc: 'Houses up to 20 chickens', energyCost: 1 },
  silo:      { name: 'Feed Silo', cost: 4000, color: 0x708090, range: 8, bonus: 'feed', bonusAmt: 0.3, desc: '-30% feed cost in range', energyCost: 1 },
  solar:     { name: 'Solar Array', cost: 10000, color: 0x1e3a5f, range: 8, energyGen: 15, desc: '+15 energy/day', energyCost: 0 },
  drone:     { name: 'Drone Station', cost: 15000, color: 0x4a4a5a, range: 12, desc: 'Pasture monitoring', energyCost: 5 },
  vet:       { name: 'Vet Lab', cost: 12000, color: 0xc8e6c9, range: 6, desc: '-30% disease chance nearby', energyCost: 3 },
  ai_center: { name: 'AI Command Center', cost: 25000, color: 0x1a5a8a, desc: 'Enables Tier 3+ tech', energyCost: 8 },
};
```

- [ ] **Step 2: Add solar season modifiers to Constants.js**

After `SEASON_EFFECTS`, add:

```js
export const SOLAR_SEASON_MOD = {
  spring: 1.0,
  summer: 1.2,
  fall: 0.85,
  winter: 0.67,
};
```

- [ ] **Step 3: Add Smart Grid tech to TECH_DEFS**

Insert after `drone_scout` (it's Tier 2, requires solar_collar):

```js
{ id: 'smart_grid', name: 'Smart Grid', tier: 2, cost: 12000, desc: 'Intelligent power distribution. Buildings use 25% less energy.', effect: { buildingEnergySave: 0.25 }, requires: ['solar_collar'] },
```

- [ ] **Step 4: Add 4 new tutorial steps to TUTORIAL_STEPS**

Insert after step index 4 ("Watch Production"):

```js
{ title: 'Power Your Farm', text: 'Every building consumes energy. Watch the PWR bar in the top bar.\n\nBuild Solar Arrays to generate power. If energy hits zero, buildings go offline.', type: 'overlay' },
```

Insert after "Sell Products" step (now index 6):

```js
{ title: 'Watch the Market', text: 'Prices change daily. The /\\ and \\/ arrows show trends.\n\nSell when prices are rising. Fall season gives +30% sell prices.', type: 'overlay' },
```

Insert after "Tech Tree" action step (now index 8):

```js
{ title: 'The Seasons', text: 'Every 30 game-days, the season changes.\n\nSpring boosts breeding. Summer is stable. Fall boosts prices. Winter is harsh - less production, higher feed, less solar power. Plan ahead.', type: 'overlay' },
```

Append as final step (index 11):

```js
{ title: 'Expect the Unexpected', text: 'Events appear in the viewport. Neighbors sell livestock, storms threaten, investors make offers.\n\nChoose wisely - every decision costs or saves days.', type: 'overlay' },
```

- [ ] **Step 5: Update GameState fields**

In `src/core/GameState.js`, in `reset()`, change `this.energy = 100` to `this.energy = 50` and add new fields:

```js
this.energy = 50;
// ... existing fields ...
this.energyDeficit = false; // true when energy <= 0
this.completionDay = 0;     // day when all techs unlocked (0 = not yet)
```

In `toJSON()`, add:

```js
energyDeficit: this.energyDeficit,
completionDay: this.completionDay,
```

- [ ] **Step 6: Commit**

```bash
git add src/core/Constants.js src/core/GameState.js
git commit -m "feat: add energy costs, Smart Grid tech, solar season mods, tutorial steps, gameState fields"
```

---

### Task 2: Dark theme CSS in index.html

**Files:**
- Modify: `index.html`

Adds `[data-theme="dark"]` CSS variable overrides and theme-aware selectors for all UI elements.

- [ ] **Step 1: Add dark theme CSS variables**

In `index.html`, after the `:root{...}` block (line ~21), add:

```css
[data-theme="dark"]{
  --bg-base:#0a0f1a;--ink:#c0d0e0;
  --accent:#e6993a;--accent-dim:rgba(230,153,58,0.12);
  --box-bg:rgba(20,30,46,0.6);
  --grid-line:rgba(192,208,224,0.04);
  --emerald:#88e0b0;--emerald-light:#88e0b0;
  --amber:#f0c060;--amber-light:#f0c060;
  --red:#e06060;--cyan:#88c8e0;
  --mono:'JetBrains Mono',monospace;--sans:'Inter',sans-serif;
}
```

- [ ] **Step 2: Add dark theme overrides for hardcoded rgba(15,15,15,...) values**

Many elements use hardcoded `rgba(15,15,15,...)` for muted text and borders. Add dark-mode overrides:

```css
[data-theme="dark"] .build-btn{background:rgba(20,30,46,0.5);border-color:rgba(192,208,224,0.1);color:var(--ink)}
[data-theme="dark"] .build-btn:hover{border-color:var(--ink);background:rgba(192,208,224,0.05)}
[data-theme="dark"] .build-btn.active{background:var(--ink);color:var(--bg-base)}
[data-theme="dark"] .build-btn.active .bname,[data-theme="dark"] .build-btn.active .cost,[data-theme="dark"] .build-btn.active .hotkey{color:var(--bg-base)}
[data-theme="dark"] .build-btn .bname{color:var(--ink)}
[data-theme="dark"] .build-btn .hotkey{color:rgba(192,208,224,0.4)}
[data-theme="dark"] .panel-title{background:rgba(10,15,26,0.95);color:#f0b0c0}
[data-theme="dark"] .panel-title::before{background:#f0b0c0}
[data-theme="dark"] .panel-title svg{stroke:#f0b0c0}
[data-theme="dark"] .info-title{color:#f0b0c0}
[data-theme="dark"] .info-title::before{background:#f0b0c0}
[data-theme="dark"] .info-section{border-color:rgba(192,208,224,0.08);background:var(--box-bg)}
[data-theme="dark"] .info-section .label{color:rgba(192,208,224,0.5)}
[data-theme="dark"] .stat-row .lbl{color:rgba(192,208,224,0.5)}
[data-theme="dark"] .milestone{border-color:rgba(192,208,224,0.1);border-left-color:var(--accent);background:var(--box-bg)}
[data-theme="dark"] .milestone .m-title{color:#f0b0c0}
[data-theme="dark"] .milestone .m-desc{color:rgba(192,208,224,0.5)}
[data-theme="dark"] .milestone .m-bar{background:rgba(192,208,224,0.08)}
[data-theme="dark"] .milestone.done{border-left-color:var(--emerald)}
[data-theme="dark"] .milestone.done .m-title{color:var(--emerald)}
[data-theme="dark"] .market-row .flat{color:rgba(192,208,224,0.5)}
[data-theme="dark"] .action-btn{border-color:var(--ink);color:var(--ink)}
[data-theme="dark"] .action-btn:hover{background:rgba(192,208,224,0.05)}
[data-theme="dark"] .action-btn.sell-btn{background:var(--ink);color:var(--bg-base)}
[data-theme="dark"] .action-btn.sell-btn:hover{background:var(--accent);border-color:var(--accent)}
[data-theme="dark"] .action-btn.tech{border-color:var(--accent);color:var(--accent)}
[data-theme="dark"] .action-btn.tech:hover{background:var(--accent);color:var(--bg-base)}
[data-theme="dark"] .action-btn.danger{border-color:var(--red);color:var(--red)}
[data-theme="dark"] .notif{color:rgba(192,208,224,0.6)}
[data-theme="dark"] .speed-btn{color:rgba(192,208,224,0.4)}
[data-theme="dark"] .speed-btn.active{background:var(--ink);color:var(--bg-base)}
[data-theme="dark"] .speed-btn:hover{color:var(--ink)}
[data-theme="dark"] .sel-btn{border-color:var(--ink);color:var(--ink)}
[data-theme="dark"] .sel-btn:hover{background:var(--ink);color:var(--bg-base)}
[data-theme="dark"] .sel-btn.heal{border-color:var(--emerald);color:var(--emerald)}
[data-theme="dark"] .sel-btn.sell{border-color:var(--amber);color:var(--amber)}
[data-theme="dark"] .sel-btn.demolish{border-color:var(--red);color:var(--red)}
[data-theme="dark"] .top-toggle{border-color:var(--ink);color:rgba(192,208,224,0.5)}
[data-theme="dark"] .top-toggle.on{background:var(--ink);color:var(--bg-base)}
[data-theme="dark"] .modal-overlay{background:rgba(10,15,26,.92)}
[data-theme="dark"] .modal{background:var(--bg-base);border-color:rgba(192,208,224,0.15)}
[data-theme="dark"] .modal h2{color:var(--ink)}
[data-theme="dark"] .modal-close{color:rgba(192,208,224,0.4)}
[data-theme="dark"] .modal-close:hover{color:var(--accent)}
[data-theme="dark"] .modal-desc{color:rgba(192,208,224,0.5)}
[data-theme="dark"] .tech-card{border-color:rgba(192,208,224,0.1);background:var(--box-bg)}
[data-theme="dark"] .tech-card:hover{border-color:var(--ink);box-shadow:0 2px 8px rgba(0,0,0,.3)}
[data-theme="dark"] .toast{background:var(--bg-base);border-color:var(--ink);color:var(--ink)}
[data-theme="dark"] .res-tooltip{background:var(--bg-base);border-color:var(--ink);color:var(--ink);box-shadow:0 2px 8px rgba(0,0,0,.3)}
[data-theme="dark"] .build-tooltip{background:var(--bg-base);border-color:var(--ink);box-shadow:0 2px 8px rgba(0,0,0,.3)}
[data-theme="dark"] .log-cursor{color:var(--accent)}
[data-theme="dark"] ::-webkit-scrollbar-track{background:var(--bg-base)}
[data-theme="dark"] ::-webkit-scrollbar-thumb{background:rgba(192,208,224,0.15)}
[data-theme="dark"] ::-webkit-scrollbar-thumb:hover{background:var(--accent)}
```

- [ ] **Step 3: Add dark mode title screen overrides**

```css
[data-theme="dark"] #title-screen{background:var(--bg-base);background-image:linear-gradient(to right,var(--grid-line) 1px,transparent 1px),linear-gradient(to bottom,var(--grid-line) 1px,transparent 1px);background-size:5vw 5vh}
[data-theme="dark"] .title-logo{color:var(--ink);text-shadow:0 0 40px rgba(230,153,58,0.3)}
[data-theme="dark"] .title-sub{color:var(--accent)}
[data-theme="dark"] .title-tagline{color:rgba(192,208,224,0.6)}
[data-theme="dark"] .title-feat{border-color:rgba(192,208,224,0.15)}
[data-theme="dark"] .title-feat .fe{color:#f0b0c0}
[data-theme="dark"] .title-feat .fl{color:rgba(192,208,224,0.5)}
[data-theme="dark"] .title-btn{border-color:var(--ink);color:var(--ink)}
[data-theme="dark"] .title-btn.primary{background:var(--ink);color:var(--bg-base)}
[data-theme="dark"] .title-btn.primary:hover{background:var(--accent);border-color:var(--accent)}
[data-theme="dark"] .title-btn.secondary:hover{border-color:var(--accent);color:var(--accent)}
[data-theme="dark"] .title-credits{color:rgba(192,208,224,0.3)}
```

- [ ] **Step 4: Add theme toggle button HTML to top bar**

In the top bar, after the Sound toggle button, add:

```html
<button class="top-toggle" id="theme-btn" onclick="window.game?.toggleTheme()" title="Toggle dark mode">Light</button>
```

Also add a small theme toggle to the title screen, before `title-credits`:

```html
<button class="title-btn secondary" style="padding:8px 20px;font-size:.7rem;position:absolute;top:20px;right:20px" id="title-theme-btn" onclick="document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'':'dark';localStorage.setItem('cowgorithm_theme',document.documentElement.dataset.theme||'light');const b=document.getElementById('title-theme-btn');if(b)b.textContent=document.documentElement.dataset.theme==='dark'?'Light Mode':'Dark Mode'">Dark Mode</button>
```

- [ ] **Step 5: Add theme init script before main module**

At the bottom of `<body>`, before `<script type="module" src="/src/main.js">`, add:

```html
<script>
(function(){var t=localStorage.getItem('cowgorithm_theme');if(t==='dark')document.documentElement.dataset.theme='dark';})();
</script>
```

- [ ] **Step 6: Fix resource icon colors for dark mode**

Update the inline `style` attributes on resource icon spans for better dark-mode visibility. Change:
- MLK icon: `color:#c4e8ff` stays (good on both)
- WOL icon: `color:#e8d5c4` stays (good on both)
- EGG icon: `color:#ffe8c4` change to `color:#ffd080` (brighter on dark)
- Keep PWR and DAT as-is (already using CSS vars)

In the market data section (right panel), update the market row label colors:
- Milk: `color:#c4e8ff` stays
- Wool: `color:#e8d5c4` stays
- Eggs: `color:#ffe8c4` change to `color:#ffd080`

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: dark cloudwave theme CSS with toggle button"
```

---

### Task 3: Theme toggle logic in JS

**Files:**
- Modify: `src/ui/UIManager.js`
- Modify: `src/main.js`

- [ ] **Step 1: Add toggleTheme method to Game class in main.js**

After `toggleSound()`:

```js
toggleTheme() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  if (isDark) {
    delete document.documentElement.dataset.theme;
    localStorage.setItem('cowgorithm_theme', 'light');
  } else {
    document.documentElement.dataset.theme = 'dark';
    localStorage.setItem('cowgorithm_theme', 'dark');
  }
}
```

- [ ] **Step 2: Update theme button text in UIManager.update()**

In `UIManager.js`, in `updateToggleButtons()`, add after the soundBtn line:

```js
const themeBtn = document.getElementById('theme-btn');
if (themeBtn) themeBtn.textContent = document.documentElement.dataset.theme === 'dark' ? 'Dark' : 'Light';
```

- [ ] **Step 3: Commit**

```bash
git add src/main.js src/ui/UIManager.js
git commit -m "feat: theme toggle JS logic with localStorage persistence"
```

---

### Task 4: Energy constraint logic

**Files:**
- Modify: `src/systems/EconomySystem.js`

- [ ] **Step 1: Rewrite energy section in newDay()**

Replace the existing energy calculation block (section 4 in `newDay()`) with:

```js
// 4. Energy: solar generation vs building + animal drain
const solarCount = this.buildingSystem.countBuildings('solar');
const solarSeasonMod = { spring: 1.0, summer: 1.2, fall: 0.85, winter: 0.67 };
const solarBase = solarCount * BUILDING_DEFS.solar.energyGen;
const solarOutput = solarBase * (solarSeasonMod[season] || 1.0);

// Building energy drain
const smartGridSave = this.getTechEffect('buildingEnergySave');
let buildingDrain = 0;
for (let row = 0; row < 20; row++) {
  for (let col = 0; col < 32; col++) {
    const tile = gameState.map[row]?.[col];
    if (tile && tile.building) {
      const def = BUILDING_DEFS[tile.building.type];
      if (def && def.energyCost) {
        buildingDrain += def.energyCost;
      }
    }
  }
}
buildingDrain *= (1 - smartGridSave);

// Animal drain
const animalDrain = gameState.animals.length * 0.5;
const energySave = this.getTechEffect('energySave');
const totalDrain = buildingDrain + animalDrain * (1 - energySave);
const netEnergy = solarOutput + gameState.energyBonus - totalDrain;

gameState.energy += netEnergy;
gameState.energy = Math.max(-20, gameState.energy); // Hard floor at -20

// Energy deficit state
const wasDeficit = gameState.energyDeficit;
gameState.energyDeficit = gameState.energy <= 0;

// Warnings
const maxEnergy = 50 + solarCount * 15; // rough capacity estimate
const energyPct = gameState.energy / maxEnergy;
if (energyPct <= 0 && !wasDeficit) {
  eventBus.emit(Events.TOAST, { text: 'POWER FAILURE. Buildings offline.', color: '#e06060', duration: 4000 });
} else if (energyPct <= 0.2 && energyPct > 0) {
  eventBus.emit(Events.TOAST, { text: 'Energy reserves low. Build more Solar Arrays.', color: '#f0c060', duration: 3000 });
}
```

- [ ] **Step 2: Add energyDeficit check to building bonus methods**

Add a helper method to EconomySystem:

```js
getBuildingBonus(bonusType) {
  if (gameState.energyDeficit) return 0; // Buildings offline
  // Existing bonus calculation continues as before
}
```

Note: Building bonuses are actually applied in `AnimalSystem.js` and `BuildingSystem.js` by checking building proximity. The deficit flag needs to be checked there. Add to `EconomySystem`:

```js
isDeficit() {
  return gameState.energyDeficit;
}
```

Then in `AnimalSystem.js`, wherever building range bonuses are applied (production calculations), add a check:

```js
// Before applying bonus:
const deficit = gameState.energyDeficit;
const bonusMultiplier = deficit ? 0 : bonusDef.bonusAmt;
```

- [ ] **Step 3: Apply production penalty during deficit**

In `AnimalSystem.js`, in the production tick where `prodAmt` is calculated, add after existing modifiers:

```js
if (gameState.energyDeficit) prodAmt *= 0.5;
```

- [ ] **Step 4: Commit**

```bash
git add src/systems/EconomySystem.js src/systems/AnimalSystem.js
git commit -m "feat: energy as real constraint with building drain, deficit logic, warnings"
```

---

### Task 5: Energy UI warnings + Tech tree energy gate

**Files:**
- Modify: `src/ui/UIManager.js`
- Modify: `src/ui/TechModal.js`
- Modify: `index.html`

- [ ] **Step 1: Add energy warning styling to top bar**

In `index.html`, add CSS:

```css
.resource.energy-warn .val{color:var(--amber)!important;animation:none}
.resource.energy-crit .val{color:var(--red)!important;animation:energyPulse 1s ease-in-out infinite}
@keyframes energyPulse{0%,100%{opacity:1}50%{opacity:.4}}
```

Add `id="res-energy"` to the energy resource div in the HTML.

- [ ] **Step 2: Update UIManager to set energy warning classes**

In `UIManager.js`, add to `updateResources()` after setting energy text:

```js
const energyDiv = document.getElementById('res-energy');
if (energyDiv) {
  energyDiv.classList.remove('energy-warn', 'energy-crit');
  const maxEnergy = 50 + (this.game.buildingSystem?.countBuildings('solar') || 0) * 15;
  const pct = gameState.energy / maxEnergy;
  if (pct <= 0.1) energyDiv.classList.add('energy-crit');
  else if (pct <= 0.3) energyDiv.classList.add('energy-warn');
}
```

- [ ] **Step 3: Add LOW POWER gate to TechModal**

In `TechModal.js`, in `render()`, when status is `'available'`, add a deficit check:

```js
if (status === 'available' && gameState.energyDeficit) {
  card.style.opacity = '0.4';
  card.style.cursor = 'not-allowed';
  // Replace cost text with LOW POWER warning
  const costDiv = card.querySelector('div:last-child');
  if (costDiv) costDiv.innerHTML = `<span style="color:var(--red)">LOW POWER</span>`;
} else if (status === 'available') {
  // existing click handler
}
```

Actually, since the card innerHTML is set directly, modify the cost line:

```js
const costText = status === 'unlocked' ? 'UNLOCKED'
  : (status === 'available' && gameState.energyDeficit) ? '<span style="color:var(--red)">LOW POWER</span>'
  : `$${cost.toLocaleString()}`;
```

And only attach click handler when `status === 'available' && !gameState.energyDeficit`.

- [ ] **Step 4: Add id to energy resource div in HTML**

Find the energy resource div and add `id="res-energy"`:

```html
<div class="resource" id="res-energy">
```

- [ ] **Step 5: Commit**

```bash
git add index.html src/ui/UIManager.js src/ui/TechModal.js
git commit -m "feat: energy UI warnings (pulse, color) + tech tree LOW POWER gate"
```

---

### Task 6: Viewport-contained decision modal

**Files:**
- Modify: `index.html`
- Modify: `src/ui/DecisionModal.js`

- [ ] **Step 1: Move decision modal HTML inside canvas-wrap**

In `index.html`, remove the existing decision modal overlay from after `</div><!-- game-container -->` and place it inside `#canvas-wrap`:

Delete the standalone `<!-- DECISION EVENT MODAL -->` block (lines 567-573).

Inside `<div id="canvas-wrap"></div>`, change it to:

```html
<div id="canvas-wrap">
  <!-- VIEWPORT DECISION MODAL -->
  <div id="decision-overlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.4);z-index:10;pointer-events:auto">
    <div id="decision-card" style="position:absolute;top:20px;left:50%;transform:translateX(-50%);max-width:320px;width:90%;background:var(--bg-base);border:1px solid var(--accent);padding:16px 20px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:11">
      <h3 id="decision-title" style="font-size:.9rem;font-family:var(--mono);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;color:var(--ink)">Event</h3>
      <p id="decision-desc" style="font-size:.75rem;color:rgba(128,128,128,0.8);margin-bottom:12px;font-family:var(--sans)"></p>
      <div id="decision-options" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"></div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Update DecisionModal.js for new DOM structure**

Replace the full `DecisionModal` class:

```js
// src/ui/DecisionModal.js
import { gameState } from '../core/GameState.js';

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
        btn.style.cssText = 'padding:6px 16px;font-size:.7rem';
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
          this.close();
          if (this.onChoose) this.onChoose(opt, idx);
        });
        this.optionsEl.appendChild(btn);
      });
    }
    if (this.overlay) this.overlay.style.display = 'block';
  }

  close() {
    if (this.overlay) this.overlay.style.display = 'none';
    this.currentEvent = null;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html src/ui/DecisionModal.js
git commit -m "feat: viewport-contained decision modal (small card inside 3D area)"
```

---

### Task 7: Viewport-contained tutorial

**Files:**
- Modify: `index.html`
- Modify: `src/ui/Tutorial.js`

- [ ] **Step 1: Move tutorial overlay inside canvas-wrap**

Remove the standalone `<!-- TUTORIAL OVERLAY -->` block from the HTML. Inside `#canvas-wrap`, after the decision overlay, add:

```html
  <!-- VIEWPORT TUTORIAL -->
  <div id="tutorial-overlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.35);z-index:20;pointer-events:auto">
    <div id="tut-card" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);max-width:400px;width:90%;background:var(--bg-base);border:1px solid var(--accent);padding:24px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3)"></div>
  </div>
```

- [ ] **Step 2: Update Tutorial.js show/hide to use display instead of class**

In `Tutorial.js`, change `start()`:

```js
start() {
  this.step = gameState.tutorialStep || 0;
  this.showStep();
  if (this.overlay) this.overlay.style.display = 'block';
}
```

Change `end()` to use:

```js
if (this.overlay) this.overlay.style.display = 'none';
```

- [ ] **Step 3: Update Tutorial.js card styling for viewport context**

The card innerHTML in `showStep()` uses `tut-btn` classes which still work. The card now renders inside the 3D viewport - ensure the card title uses `var(--ink)` and buttons use theme variables (they already reference CSS vars, so this works automatically).

- [ ] **Step 4: Commit**

```bash
git add index.html src/ui/Tutorial.js
git commit -m "feat: viewport-contained tutorial (cards inside 3D area)"
```

---

### Task 8: Leaderboard (local PB + win screen)

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/ui/TitleScreen.js`

- [ ] **Step 1: Add win screen overlay HTML to index.html**

After the toast container, before the script tags:

```html
<!-- WIN SCREEN -->
<div id="win-overlay" style="display:none;position:fixed;inset:0;background:rgba(10,15,26,.95);z-index:500;align-items:center;justify-content:center;flex-direction:column;backdrop-filter:blur(8px)">
  <div style="text-align:center;max-width:480px;padding:40px">
    <div style="font-family:var(--mono);font-size:2rem;font-weight:700;color:var(--accent);letter-spacing:4px;margin-bottom:8px">FARM FULLY AUTOMATED</div>
    <div style="font-family:var(--mono);font-size:.8rem;color:rgba(192,208,224,0.6);margin-bottom:24px;letter-spacing:2px">ALL 12 TECHNOLOGIES UNLOCKED</div>
    <div id="win-days" style="font-family:var(--mono);font-size:4rem;font-weight:700;color:#88e0b0;margin-bottom:8px">0</div>
    <div style="font-family:var(--mono);font-size:.9rem;color:rgba(192,208,224,0.7);margin-bottom:24px">GAME DAYS</div>
    <div id="win-pb" style="font-family:var(--mono);font-size:.8rem;margin-bottom:24px;color:rgba(192,208,224,0.5)"></div>
    <div style="margin-bottom:24px">
      <input id="win-name" type="text" placeholder="Your name (for future leaderboard)" maxlength="20" style="background:rgba(20,30,46,0.8);border:1px solid rgba(192,208,224,0.2);color:#c0d0e0;padding:8px 16px;font-family:var(--mono);font-size:.8rem;width:100%;max-width:280px;text-align:center">
    </div>
    <div style="display:flex;gap:12px;justify-content:center">
      <button class="title-btn primary" onclick="window.game?.newGameFromWin()">New Farm</button>
      <button class="title-btn secondary" onclick="document.getElementById('win-overlay').style.display='none'" style="color:#c0d0e0;border-color:rgba(192,208,224,0.3)">Continue Playing</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add PB display to title screen HTML**

After `title-tagline` div, add:

```html
<div id="title-pb" style="font-family:var(--mono);font-size:.8rem;color:var(--accent);margin-bottom:16px;display:none"></div>
```

- [ ] **Step 3: Update TitleScreen.js to show PB**

```js
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
```

- [ ] **Step 4: Add win detection + PB save in main.js**

In `Game` class, add a method:

```js
checkWinCondition() {
  if (gameState.completionDay > 0) return; // Already won this run
  if (gameState.techs.length >= 12) {
    gameState.completionDay = gameState.day;
    this.showWinScreen();
  }
}
```

```js
showWinScreen() {
  const day = gameState.completionDay;
  const season = getSeason(day);

  // Save run
  const run = {
    runId: crypto.randomUUID(),
    playerName: 'Anonymous',
    completionDay: day,
    completionSeason: season,
    date: new Date().toISOString(),
    version: 'v3',
    hash: '',
  };

  // Update PB
  let isNewPB = false;
  try {
    const rawPB = localStorage.getItem('cowgorithm_pb');
    const pb = rawPB ? JSON.parse(rawPB) : null;
    if (!pb || day < pb.completionDay) {
      localStorage.setItem('cowgorithm_pb', JSON.stringify(run));
      isNewPB = true;
    }

    // Save to runs array
    const rawRuns = localStorage.getItem('cowgorithm_runs');
    const runs = rawRuns ? JSON.parse(rawRuns) : [];
    runs.push(run);
    if (runs.length > 20) runs.shift();
    localStorage.setItem('cowgorithm_runs', JSON.stringify(runs));
  } catch (e) {}

  // Show win overlay
  const overlay = document.getElementById('win-overlay');
  const daysEl = document.getElementById('win-days');
  const pbEl = document.getElementById('win-pb');
  if (daysEl) daysEl.textContent = day;
  if (pbEl) {
    if (isNewPB) {
      pbEl.textContent = 'NEW PERSONAL BEST!';
      pbEl.style.color = '#88e0b0';
    } else {
      try {
        const pb = JSON.parse(localStorage.getItem('cowgorithm_pb'));
        pbEl.textContent = `Personal Best: ${pb.completionDay} days`;
      } catch (e) {}
    }
  }
  if (overlay) overlay.style.display = 'flex';
}
```

```js
newGameFromWin() {
  // Save name if entered
  const nameInput = document.getElementById('win-name');
  if (nameInput && nameInput.value.trim()) {
    try {
      const rawPB = localStorage.getItem('cowgorithm_pb');
      if (rawPB) {
        const pb = JSON.parse(rawPB);
        pb.playerName = nameInput.value.trim();
        localStorage.setItem('cowgorithm_pb', JSON.stringify(pb));
      }
    } catch (e) {}
  }
  document.getElementById('win-overlay').style.display = 'none';
  location.reload();
}
```

- [ ] **Step 5: Call checkWinCondition on tech unlock**

In `main.js`, in the constructor, add listener:

```js
eventBus.on(Events.TECH_UNLOCKED, () => this.checkWinCondition());
```

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.js src/ui/TitleScreen.js
git commit -m "feat: local PB leaderboard + win screen on tech tree completion"
```

---

### Task 9: Sakura tree factory

**Files:**
- Modify: `src/entities/TreeFactory.js`

- [ ] **Step 1: Add createSakuraTree function**

Replace the entire `TreeFactory.js`:

```js
import * as THREE from 'three';

export function createTree() {
  const group = new THREE.Group();
  group.userData.isSakura = false;

  // Trunk
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 7), trunkMat);
  trunk.position.y = 0.3;
  trunk.castShadow = true;
  group.add(trunk);

  // Foliage cone
  const foliageMat = new THREE.MeshLambertMaterial({ color: 0x2d6a1e });
  const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.5, 6), foliageMat);
  foliage.position.y = 1.35;
  foliage.castShadow = true;
  group.add(foliage);

  // Random variation
  const scale = 0.8 + Math.random() * 0.4;
  group.scale.setScalar(scale);
  group.rotation.y = Math.random() * Math.PI * 2;

  return group;
}

export function createSakuraTree() {
  const group = new THREE.Group();
  group.userData.isSakura = true;

  // Trunk (same as regular, slightly thinner)
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3520 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.7, 7), trunkMat);
  trunk.position.y = 0.35;
  trunk.castShadow = true;
  group.add(trunk);

  // Rounder foliage (sphere instead of cone)
  const pinkShade = 0xf0b0c0 + Math.floor(Math.random() * 0x080808);
  const foliageMat = new THREE.MeshLambertMaterial({ color: pinkShade });
  const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), foliageMat);
  foliage.position.y = 1.2;
  foliage.castShadow = true;
  foliage.scale.set(1, 0.75, 1); // Slightly flattened
  group.add(foliage);

  // Random variation
  const scale = 0.8 + Math.random() * 0.4;
  group.scale.setScalar(scale);
  group.rotation.y = Math.random() * Math.PI * 2;

  return group;
}

// Season color maps
const TREE_SEASON_COLORS = {
  spring: 0x2d6a1e,
  summer: 0x3a7a28,
  fall:   0xc47a1a,
  winter: 0x6a6a60,
};

const SAKURA_SEASON_COLORS = {
  spring: 0xf0b0c0,
  summer: 0x2d6a1e,
  fall:   0xe0a080,
  winter: 0xc0c0c0,
};

export function updateTreeSeason(tree, season) {
  const foliage = tree.children[1]; // children[0]=trunk, children[1]=foliage
  if (!foliage) return;

  if (tree.userData.isSakura) {
    foliage.material.color.setHex(SAKURA_SEASON_COLORS[season] || 0xf0b0c0);
    // Winter: shrink foliage to simulate bare branches
    if (season === 'winter') {
      foliage.scale.set(0.3, 0.3, 0.3);
    } else {
      foliage.scale.set(1, 0.75, 1);
    }
  } else {
    foliage.material.color.setHex(TREE_SEASON_COLORS[season] || 0x2d6a1e);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/TreeFactory.js
git commit -m "feat: sakura tree factory with seasonal color/scale changes"
```

---

### Task 10: Sakura tree placement + seasonal tree updates in FarmGrid

**Files:**
- Modify: `src/systems/FarmGrid.js`

- [ ] **Step 1: Import sakura tree factory and update placeTrees**

In `FarmGrid.js`, update the import:

```js
import { createTree, createSakuraTree, updateTreeSeason } from '../entities/TreeFactory.js';
```

Replace `placeTrees()`:

```js
placeTrees() {
  let treeIndex = 0;
  for (let row = 0; row < GRID.ROWS; row++) {
    for (let col = 0; col < GRID.COLS; col++) {
      if (gameState.map[row][col].type === 'forest') {
        // Deterministic sakura selection: ~35% of forest tiles
        const seed = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
        const isSakura = ((seed % 1 + 1) % 1) < 0.35;

        const tree = isSakura ? createSakuraTree() : createTree();
        tree.position.set(
          col * GRID.TILE_SIZE + GRID.TILE_SIZE / 2,
          0,
          row * GRID.TILE_SIZE + GRID.TILE_SIZE / 2
        );

        // Dim trees on unowned land
        if (!gameState.map[row][col].owned) {
          tree.children.forEach(child => {
            if (child.material) {
              child.material = child.material.clone();
              child.material.color.multiplyScalar(0.4);
            }
          });
          tree.userData.dimmed = true;
        }

        this.scene.add(tree);
        this.trees.push(tree);
        treeIndex++;
      }
    }
  }
}
```

- [ ] **Step 2: Replace updateTreeColors with updateTreeSeason-based version**

```js
updateTreeColors() {
  for (const tree of this.trees) {
    if (tree.userData.dimmed) continue; // Don't recolor dimmed trees
    updateTreeSeason(tree, this.currentSeason);
  }
}
```

- [ ] **Step 3: Store sakura positions for petal spawning**

Add a method to get sakura tree world positions:

```js
getSakuraPositions() {
  return this.trees
    .filter(t => t.userData.isSakura && !t.userData.dimmed)
    .map(t => ({ x: t.position.x, z: t.position.z }));
}
```

- [ ] **Step 4: Commit**

```bash
git add src/systems/FarmGrid.js
git commit -m "feat: sakura tree placement (35% of forest), seasonal colors, dimmed unowned trees"
```

---

### Task 11: Ambient particles (sakura petals, fireflies, dust)

**Files:**
- Modify: `src/entities/ParticleSystem.js`

- [ ] **Step 1: Add sakura petal system**

Add to `ParticleSystem` class:

```js
constructor(scene) {
  this.scene = scene;
  this.particles = [];
  this.snowing = false;
  this.snowParticles = [];
  this.petals = [];
  this.petalActive = false;
  this.sakuraPositions = [];
  this.fireflies = [];
  this.firefliesActive = false;
}

setSakuraPositions(positions) {
  this.sakuraPositions = positions;
}

startPetals() { this.petalActive = true; }
stopPetals() {
  this.petalActive = false;
  for (const p of this.petals) {
    this.scene.remove(p.mesh);
    p.mesh.geometry.dispose();
    p.mesh.material.dispose();
  }
  this.petals = [];
}

updatePetals(delta) {
  if (!this.petalActive || this.sakuraPositions.length === 0) return;

  // Spawn
  if (this.petals.length < 40 && Math.random() < 0.15) {
    const src = this.sakuraPositions[Math.floor(Math.random() * this.sakuraPositions.length)];
    const geo = new THREE.PlaneGeometry(0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf0b0c0, transparent: true, opacity: 0.7,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      src.x + (Math.random() - 0.5) * 2,
      2 + Math.random() * 3,
      src.z + (Math.random() - 0.5) * 2
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    this.scene.add(mesh);
    this.petals.push({
      mesh, age: 0, lifetime: 4 + Math.random() * 3,
      driftX: (Math.random() - 0.5) * 0.8,
      driftZ: (Math.random() - 0.5) * 0.4,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // Update
  for (let i = this.petals.length - 1; i >= 0; i--) {
    const p = this.petals[i];
    p.age += delta;
    p.mesh.position.y -= 0.3 * delta;
    p.mesh.position.x += (p.driftX + Math.sin(p.age * 2 + p.phase) * 0.3) * delta;
    p.mesh.position.z += p.driftZ * delta;
    p.mesh.rotation.x += delta * 0.5;
    p.mesh.rotation.z += delta * 0.3;

    // Fade near ground
    if (p.mesh.position.y < 1) {
      p.mesh.material.opacity = Math.max(0, p.mesh.position.y * 0.7);
    }

    if (p.age >= p.lifetime || p.mesh.position.y < 0) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      this.petals.splice(i, 1);
    }
  }
}
```

- [ ] **Step 2: Add firefly system**

```js
startFireflies() { this.firefliesActive = true; }
stopFireflies() {
  this.firefliesActive = false;
  for (const f of this.fireflies) {
    this.scene.remove(f.mesh);
    f.mesh.geometry.dispose();
    f.mesh.material.dispose();
  }
  this.fireflies = [];
}

updateFireflies(delta, elapsedTime) {
  if (!this.firefliesActive) return;

  // Spawn
  if (this.fireflies.length < 20 && Math.random() < 0.05) {
    const geo = new THREE.SphereGeometry(0.06, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xc0e080, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      8 + Math.random() * 48, // within farm area
      1 + Math.random() * 2,
      4 + Math.random() * 32
    );
    this.scene.add(mesh);
    this.fireflies.push({
      mesh, age: 0, lifetime: 5 + Math.random() * 5,
      baseY: mesh.position.y,
      driftX: (Math.random() - 0.5) * 0.4,
      driftZ: (Math.random() - 0.5) * 0.4,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // Update
  for (let i = this.fireflies.length - 1; i >= 0; i--) {
    const f = this.fireflies[i];
    f.age += delta;
    f.mesh.position.x += f.driftX * delta;
    f.mesh.position.z += f.driftZ * delta;
    f.mesh.position.y = f.baseY + Math.sin(f.age * 1.5 + f.phase) * 0.3;
    f.mesh.material.opacity = 0.4 + Math.sin(f.age * 3 + f.phase) * 0.4;

    if (f.age >= f.lifetime) {
      this.scene.remove(f.mesh);
      f.mesh.geometry.dispose();
      f.mesh.material.dispose();
      this.fireflies.splice(i, 1);
    }
  }
}
```

- [ ] **Step 3: Add dust particle spawner**

```js
spawnDust(worldX, worldZ) {
  for (let i = 0; i < 2; i++) {
    const geo = new THREE.SphereGeometry(0.03, 3, 3);
    const mat = new THREE.MeshBasicMaterial({ color: 0xd2b48c, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      worldX + (Math.random() - 0.5) * 0.3,
      0.1 + Math.random() * 0.1,
      worldZ + (Math.random() - 0.5) * 0.3
    );
    this.scene.add(mesh);
    this.particles.push({
      mesh,
      velocity: 0.2 + Math.random() * 0.2,
      lifetime: 0.4,
      age: 0,
    });
  }
}
```

- [ ] **Step 4: Call new update methods from update()**

Update the main `update(delta)` method:

```js
update(delta, elapsedTime) {
  // Existing particle update
  for (let i = this.particles.length - 1; i >= 0; i--) {
    const p = this.particles[i];
    p.age += delta;
    p.mesh.position.y += p.velocity * delta;
    p.mesh.material.opacity = 1 - (p.age / p.lifetime);
    if (p.age >= p.lifetime) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      this.particles.splice(i, 1);
    }
  }
  this.updateSnow(delta);
  this.updatePetals(delta);
  this.updateFireflies(delta, elapsedTime);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/entities/ParticleSystem.js
git commit -m "feat: sakura petals, fireflies, dust particles"
```

---

### Task 12: Water shimmer + grass sway in FarmGrid

**Files:**
- Modify: `src/systems/FarmGrid.js`

- [ ] **Step 1: Add water shimmer to updateWater**

In `FarmGrid.js`, update `updateWater(elapsedTime)` to also animate water colors:

```js
updateWater(elapsedTime) {
  const geo = this.terrainMesh.geometry;
  const posAttr = geo.attributes.position;
  const colorAttr = geo.attributes.color;

  for (let i = 0; i < posAttr.count; i++) {
    const wx = posAttr.getX(i);
    const wz = posAttr.getZ(i);
    const col = Math.min(Math.max(Math.floor(wx / GRID.TILE_SIZE), 0), GRID.COLS - 1);
    const row = Math.min(Math.max(Math.floor(wz / GRID.TILE_SIZE), 0), GRID.ROWS - 1);
    const tile = gameState.map[row]?.[col];

    if (tile && tile.type === 'water') {
      // Y wave
      posAttr.setY(i, Math.sin(elapsedTime * 2 + wx + wz) * 0.08);
      // Color shimmer between two blues
      const shimmer = Math.sin(elapsedTime * 1.5 + wx * 0.5 + wz * 0.3) * 0.5 + 0.5;
      const r = 0.08 + shimmer * 0.05;
      const g = 0.50 + shimmer * 0.09;
      const b = 0.85 + shimmer * 0.1;
      colorAttr.setXYZ(i, r, g, b);
    }
  }
  posAttr.needsUpdate = true;
  colorAttr.needsUpdate = true;
}
```

- [ ] **Step 2: Add grass sway to maybeUpdateColors**

In `updateTerrainColors()`, for owned grass tiles, add a time-based color variation. Store `this.swayTime = 0` in constructor, increment in a new method:

Add to constructor:
```js
this.swayTime = 0;
```

Update `maybeUpdateColors()`:
```js
maybeUpdateColors() {
  this.colorUpdateCounter++;
  this.swayTime += 0.016; // ~60fps
  if (this.colorUpdateCounter >= 30) {
    this.colorUpdateCounter = 0;
    this.updateTerrainColors();
  }
}
```

In `updateTerrainColors()`, for owned grass tiles (inside the owned branch), add after computing r, g, b:

```js
// Grass sway: subtle brightness wave
const swayPhase = col * 0.5 + row * 0.7;
const sway = Math.sin(this.swayTime * 1.5 + swayPhase) * 0.025;
r += sway;
g += sway;
b += sway * 0.5;
```

- [ ] **Step 3: Commit**

```bash
git add src/systems/FarmGrid.js
git commit -m "feat: water shimmer animation + grass sway effect"
```

---

### Task 13: Rebuilt land plot visuals

**Files:**
- Modify: `src/systems/FarmGrid.js`

- [ ] **Step 1: Update unowned tile colors for softer transition**

In `updateTerrainColors()`, replace the unowned grass color block:

```js
} else {
  // Unowned: same season grass but desaturated and dimmed
  const sc = SEASON_COLORS[this.currentSeason]?.grass || [0.29, 0.49, 0.18];
  r = sc[0] * 0.4;
  g = sc[1] * 0.4;
  b = sc[2] * 0.4;
}
```

- [ ] **Step 2: Add ownership border glow**

In `updateTerrainColors()`, after setting colors for owned tiles, detect border tiles (owned tile adjacent to unowned) and add a subtle brightness boost:

```js
// Border glow: owned tile adjacent to unowned gets a brightness boost
if (tile.owned && tile.type === 'grass') {
  const neighbors = [
    gameState.map[row-1]?.[col],
    gameState.map[row+1]?.[col],
    gameState.map[row]?.[col-1],
    gameState.map[row]?.[col+1],
  ];
  const isEdge = neighbors.some(n => n && !n.owned && n.type !== 'water');
  if (isEdge) {
    // Soft glow: slightly brighter
    r += 0.04;
    g += 0.06;
    b += 0.08;
  }
}
```

- [ ] **Step 3: Add expansion reveal animation**

When a tile is expanded (becomes owned), briefly flash it brighter. In `FarmGrid`, add:

```js
constructor(scene) {
  // ... existing ...
  this.revealTiles = []; // { col, row, progress }

  eventBus.on(Events.LAND_EXPANDED, ({ col, row }) => {
    this.revealTiles.push({ col, row, progress: 0 });
  });
}
```

Import eventBus at top:
```js
import { eventBus, Events } from '../core/EventBus.js';
```

In `maybeUpdateColors()`, before the terrain color update:

```js
// Update reveal animations
for (let i = this.revealTiles.length - 1; i >= 0; i--) {
  this.revealTiles[i].progress += 0.05;
  if (this.revealTiles[i].progress >= 1) {
    this.revealTiles.splice(i, 1);
  }
}
```

In `updateTerrainColors()`, when coloring owned tiles, check for reveal animation and add brightness:

```js
// Check for reveal animation
const reveal = this.revealTiles.find(rt => rt.col === col && rt.row === row);
if (reveal) {
  const flash = (1 - reveal.progress) * 0.15;
  r += flash;
  g += flash;
  b += flash;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/systems/FarmGrid.js
git commit -m "feat: rebuilt land plots with soft unowned tint, border glow, expansion reveal"
```

---

### Task 14: Ambient particle orchestration in main.js

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Update particle system calls in animate()**

In `animate()`, update the particles.update call to pass elapsedTime:

```js
this.particles.update(delta, this.clock.elapsedTime);
```

- [ ] **Step 2: Add seasonal particle management in newDay()**

In `newDay()`, after the existing season/snow logic:

```js
// Sakura petals in spring
if (season === 'spring') {
  this.particles.setSakuraPositions(this.farmGrid.getSakuraPositions());
  this.particles.startPetals();
} else {
  this.particles.stopPetals();
}
```

- [ ] **Step 3: Add firefly management based on visual day/night**

In `animate()`, after `gameState.visualDayProgress` is set, add:

```js
// Fireflies at night
const isNight = gameState.visualDayProgress > 0.5 && gameState.visualDayProgress < 0.9;
if (isNight && !this.particles.firefliesActive) {
  this.particles.startFireflies();
} else if (!isNight && this.particles.firefliesActive) {
  this.particles.stopFireflies();
}
```

- [ ] **Step 4: Add dust particles on animal movement**

In `AnimalSystem.js` (or in `main.js` animate loop), detect animal movement and spawn dust. The simplest approach is in `AnimalSystem.updateVisuals()`. Add a reference to particles:

In `main.js` constructor, after creating animalSystem:
```js
this.animalSystem.particles = this.particles;
```

In `AnimalSystem.js`, in `updateVisuals(delta)`, when updating animal positions, add after position set:

```js
// Dust particles when moving
if (this.particles && animal.targetX !== null && animal.targetY !== null) {
  const dx = Math.abs(animal.x - animal.targetX);
  const dy = Math.abs(animal.y - animal.targetY);
  if (dx > 0.05 || dy > 0.05) {
    if (Math.random() < 0.05) { // ~5% chance per frame per moving animal
      this.particles.spawnDust(
        animal.x * GRID.TILE_SIZE,
        animal.y * GRID.TILE_SIZE
      );
    }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/main.js src/systems/AnimalSystem.js
git commit -m "feat: ambient particle orchestration (petals, fireflies, dust)"
```

---

### Task 15: Inline style cleanup + dark mode compatibility in panels

**Files:**
- Modify: `src/ui/UIManager.js`
- Modify: `src/ui/TechModal.js`

- [ ] **Step 1: Replace hardcoded rgba(15,15,15,...) in UIManager inline styles**

In `UIManager.js`, in `renderAnimalPanel()` and `renderBuildingPanel()`, replace all instances of:
- `rgba(15,15,15,0.5)` with `var(--ink-muted, rgba(15,15,15,0.5))`
- `rgba(15,15,15,0.08)` with `var(--grid-line)`
- `rgba(15,15,15,0.7)` with `color:var(--ink);opacity:0.7`

Actually, since these are in inline `style` attributes and CSS variables work in inline styles, update the muted label color references:

Replace `color:rgba(15,15,15,0.5)` with `color:var(--ink);opacity:0.5` in the grid template spans.

Or simpler: add a CSS class `.muted` that handles both themes:

In `index.html`, add:
```css
.stat-muted{color:rgba(15,15,15,0.5)}
[data-theme="dark"] .stat-muted{color:rgba(192,208,224,0.5)}
```

Then in UIManager, use `class="stat-muted"` instead of inline color on label spans.

- [ ] **Step 2: Fix TechModal inline style colors**

In `TechModal.js`, replace hardcoded colors in the `render()` method:
- Tier header: `color:rgba(15,15,15,0.5)` -> use `color:var(--ink);opacity:0.5`
- Border bottom: `rgba(15,15,15,0.1)` -> `var(--grid-line)`
- Description: `rgba(15,15,15,0.6)` -> `color:var(--ink);opacity:0.6`
- Prerequisites: `rgba(15,15,15,0.5)` -> `color:var(--ink);opacity:0.5`
- Cost locked color: `rgba(15,15,15,0.4)` -> `color:var(--ink);opacity:0.4`

- [ ] **Step 3: Commit**

```bash
git add src/ui/UIManager.js src/ui/TechModal.js index.html
git commit -m "feat: dark mode compatible inline styles in panels and tech modal"
```

---

### Task 16: Final integration + production build

**Files:**
- All modified files

- [ ] **Step 1: Verify AnimalSystem has GRID import**

Ensure `AnimalSystem.js` imports GRID:
```js
import { GRID } from '../core/Constants.js';
```

- [ ] **Step 2: Verify all event imports in FarmGrid**

Ensure `FarmGrid.js` imports eventBus and Events:
```js
import { eventBus, Events } from '../core/EventBus.js';
```

- [ ] **Step 3: Run dev server and visual check**

```bash
cd ~/cowgorithm && npm run dev
```

Verify:
- Title screen loads with PB display (if exists) and theme toggle
- Dark mode toggle works on title screen and in-game
- All panels readable in both themes
- WOL/EGG/MLK visible in both modes
- Sakura trees visible in border forest (pink in spring)
- Petal particles drift down from sakura trees in spring
- Fireflies appear at night
- Water tiles shimmer
- Grass has subtle sway
- Unowned land is dimmed but visible (not black)
- Expanding land shows brief flash animation
- Decision events appear as small card inside 3D viewport
- Tutorial cards appear inside 3D viewport
- Energy drains each day, warning toast at low energy
- Tech tree shows LOW POWER when energy is zero
- Building all 12 techs triggers win screen
- Win screen shows day count and PB

- [ ] **Step 4: Run production build**

```bash
cd ~/cowgorithm && npm run build
```

Expected: builds successfully with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: COWGORITHM v3 final integration + production build"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Constants + GameState data | Constants.js, GameState.js |
| 2 | Dark theme CSS | index.html |
| 3 | Theme toggle JS | main.js, UIManager.js |
| 4 | Energy constraint logic | EconomySystem.js, AnimalSystem.js |
| 5 | Energy UI + tech gate | UIManager.js, TechModal.js, index.html |
| 6 | Viewport decision modal | index.html, DecisionModal.js |
| 7 | Viewport tutorial | index.html, Tutorial.js |
| 8 | Leaderboard + win screen | index.html, main.js, TitleScreen.js |
| 9 | Sakura tree factory | TreeFactory.js |
| 10 | Sakura placement + FarmGrid | FarmGrid.js |
| 11 | Ambient particles | ParticleSystem.js |
| 12 | Water shimmer + grass sway | FarmGrid.js |
| 13 | Rebuilt land plots | FarmGrid.js |
| 14 | Particle orchestration | main.js, AnimalSystem.js |
| 15 | Inline style dark mode fix | UIManager.js, TechModal.js, index.html |
| 16 | Final integration + build | All |
