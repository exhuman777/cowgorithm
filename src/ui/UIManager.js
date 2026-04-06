// src/ui/UIManager.js
import { gameState } from '../core/GameState.js';
import { eventBus, Events } from '../core/EventBus.js';
import { QUESTS, MILESTONES, TECH_DEFS, ANIMAL_DEFS, BUILDING_DEFS } from '../core/Constants.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.dom = {};
    this.hintVisible = false;
  }

  init() {
    // Cache all DOM refs
    this.dom = {
      money: document.getElementById('r-money'),
      milk: document.getElementById('r-milk'),
      wool: document.getElementById('r-wool'),
      eggs: document.getElementById('r-eggs'),
      fish: document.getElementById('r-fish'),
      energy: document.getElementById('r-energy'),
      data: document.getElementById('r-data'),
      netIncome: document.getElementById('net-income'),
      dayCounter: document.getElementById('day-counter'),
      questPhase: document.getElementById('quest-phase'),
      questText: document.getElementById('quest-text'),
      questHint: document.getElementById('quest-hint'),
      questHintBtn: document.getElementById('quest-hint-btn'),
      questProgress: document.getElementById('quest-progress'),
      statAnimals: document.getElementById('stat-animals'),
      statBuildings: document.getElementById('stat-buildings'),
      statLand: document.getElementById('stat-land'),
      statTechs: document.getElementById('stat-techs'),
      statIncome: document.getElementById('stat-income'),
      statCosts: document.getElementById('stat-costs'),
      statTotal: document.getElementById('stat-total'),
      marketMilk: document.getElementById('market-milk'),
      marketWool: document.getElementById('market-wool'),
      marketEggs: document.getElementById('market-eggs'),
      marketFish: document.getElementById('market-fish'),
      milestonesList: document.getElementById('milestones-list'),
      selectedPanel: document.getElementById('selected-panel'),
      selectedPanelTitle: document.getElementById('selected-panel-title'),
      selectedPanelBody: document.getElementById('selected-panel-body'),
      activeEffects: document.getElementById('active-effects'),
      effectsList: document.getElementById('effects-list'),
      loanTakeBtn: document.getElementById('loan-take-btn'),
      loanRepayBtn: document.getElementById('loan-repay-btn'),
      loanAmount: document.getElementById('loan-amount'),
      logFeed: document.getElementById('log-feed'),
      floatTexts: document.getElementById('float-texts'),
      toastContainer: document.getElementById('toast-container'),
      autoSellBtn: document.getElementById('auto-sell-btn'),
      soundBtn: document.getElementById('sound-btn'),
      questBar: document.getElementById('quest-bar'),
    };

    // Set up event listeners
    eventBus.on(Events.NOTIFICATION, (data) => this.addNotification(data));
    eventBus.on(Events.FLOAT_TEXT, (data) => this.addFloatText(data));
    eventBus.on(Events.TOAST, (data) => this.addToast(data));
    eventBus.on(Events.SELECTION_CHANGED, () => this.updateSelectedPanel());
    eventBus.on(Events.BUILD_MODE_CHANGED, () => this.updateBuildButtons());
  }

  update() {
    this.updateResources();
    this.updateNetIncome();
    this.updateDayCounter();
    this.updateQuestBar();
    this.updateMarketPrices();
    this.updateMilestones();
    this.updateStationStats();
    this.updateSelectedPanel();
    this.updateActiveEffects();
    this.updateLoanUI();
    this.updateSpeedButtons();
    this.updateToggleButtons();
    this.updateCanvasCursor();
  }

  // --- Resources ---

  updateResources() {
    const d = this.dom;
    if (d.money) d.money.textContent = this.formatMoney(gameState.money);
    if (d.milk) d.milk.textContent = Math.floor(gameState.milk);
    if (d.wool) d.wool.textContent = Math.floor(gameState.wool);
    if (d.eggs) d.eggs.textContent = Math.floor(gameState.eggs);
    if (d.fish) d.fish.textContent = Math.floor(gameState.fish);
    if (d.energy) d.energy.textContent = Math.floor(gameState.energy);
    const energyDiv = document.getElementById('res-energy');
    if (energyDiv) {
      energyDiv.classList.remove('energy-warn', 'energy-crit');
      const maxEnergy = 50 + (this.game.buildingSystem?.countBuildings('solar') || 0) * 15;
      const pct = gameState.energy / maxEnergy;
      if (pct <= 0.1) energyDiv.classList.add('energy-crit');
      else if (pct <= 0.3) energyDiv.classList.add('energy-warn');
    }
    if (d.data) d.data.textContent = Math.floor(gameState.data);
  }

  // --- Net Income ---

  updateNetIncome() {
    const d = this.dom;
    if (!d.netIncome) return;
    const net = gameState.lastDayIncome - gameState.lastDayCosts;
    const sign = net >= 0 ? '+' : '';
    d.netIncome.textContent = `${sign}${this.formatMoney(net)}/day`;
    d.netIncome.className = 'net-income ' + (net >= 0 ? 'pos' : 'neg');
  }

  // --- Day Counter ---

  updateDayCounter() {
    const d = this.dom;
    if (!d.dayCounter) return;
    const seasonNames = ['Spring', 'Summer', 'Fall', 'Winter'];
    const seasonIdx = Math.floor(((gameState.day - 1) % 120) / 30);
    d.dayCounter.textContent = `Day ${gameState.day} | ${seasonNames[seasonIdx]}`;
  }

  // --- Quest Bar ---

  updateQuestBar() {
    const d = this.dom;
    const questSystem = this.game.questSystem;
    if (!questSystem) return;

    const quest = questSystem.getCurrentQuest();
    const phase = questSystem.getPhase();
    const idx = questSystem.getCurrentQuestIndex();

    if (d.questPhase) d.questPhase.textContent = `PHASE ${phase}`;
    if (d.questText) d.questText.textContent = quest ? quest.text : 'All quests complete!';
    if (d.questProgress) d.questProgress.textContent = `${idx + 1}/${QUESTS.length}`;

    // Update hint visibility
    if (d.questHint && this.hintVisible && quest) {
      d.questHint.style.display = 'block';
      d.questHint.textContent = quest.hint || '';
    } else if (d.questHint && !this.hintVisible) {
      d.questHint.style.display = 'none';
    }
  }

  toggleQuestHint() {
    this.hintVisible = !this.hintVisible;
    this.updateQuestBar();
  }

  // --- Market Prices ---

  updateMarketPrices() {
    const d = this.dom;
    const prices = gameState.marketPrices;
    const prev = gameState.prevMarketPrices;

    this.setMarketCell(d.marketMilk, prices.milk, prev.milk, 'milk');
    this.setMarketCell(d.marketWool, prices.wool, prev.wool, 'wool');
    this.setMarketCell(d.marketEggs, prices.eggs, prev.eggs, 'eggs');
    this.setMarketCell(d.marketFish, prices.fish, prev.fish, 'fish');
  }

  setMarketCell(el, price, prevPrice, product) {
    if (!el) return;
    let trendClass = 'flat';
    let trendSymbol = '--';
    if (price > prevPrice) { trendClass = 'up'; trendSymbol = '/\\'; }
    else if (price < prevPrice) { trendClass = 'down'; trendSymbol = '\\/'; }

    // 7-day trend from price history
    let weekTrend = '';
    const history = gameState.priceHistory?.[product];
    if (history && history.length >= 3) {
      const first = history[0];
      const last = history[history.length - 1];
      const slope = (last - first) / first;
      if (slope > 0.05) weekTrend = '<span class="week-trend up" title="7d trend: rising">+</span>';
      else if (slope < -0.05) weekTrend = '<span class="week-trend down" title="7d trend: falling">-</span>';
      else weekTrend = '<span class="week-trend flat" title="7d trend: stable">=</span>';
    }

    el.className = trendClass;
    el.innerHTML = `$${price.toFixed(1)} <span class="trend">${trendSymbol}</span>${weekTrend}`;
  }

  // --- Milestones ---

  updateMilestones() {
    const d = this.dom;
    if (!d.milestonesList) return;
    const milestoneSystem = this.game.milestoneSystem;
    if (!milestoneSystem) return;

    let html = '';
    for (const ms of MILESTONES) {
      const done = gameState.completedMilestones.includes(ms.id);
      const progress = milestoneSystem.getMilestoneProgress(ms);
      const pct = Math.min(100, (progress / ms.target) * 100);
      const progressText = ms.target >= 1000 ? `${this.formatMoney(progress)}/${this.formatMoney(ms.target)}` : `${Math.min(progress, ms.target)}/${ms.target}`;

      html += `
        <div class="milestone ${done ? 'done' : ''}">
          <div class="m-title">${ms.name}</div>
          <div class="m-desc">${ms.desc} - ${done ? ms.reward : progressText}</div>
          <div class="m-bar"><div class="m-fill" style="width:${pct}%"></div></div>
        </div>`;
    }
    d.milestonesList.innerHTML = html;
  }

  // --- Station Stats ---

  updateStationStats() {
    const d = this.dom;
    const buildingSystem = this.game.buildingSystem;
    if (!buildingSystem) return;

    if (d.statAnimals) d.statAnimals.textContent = gameState.animals.length;

    // Count all buildings (excluding farmhouse)
    let buildingCount = 0;
    for (const type of Object.keys(BUILDING_DEFS)) {
      if (type === 'farmhouse') continue;
      buildingCount += buildingSystem.countBuildings(type);
    }
    if (d.statBuildings) d.statBuildings.textContent = buildingCount;

    if (d.statLand) d.statLand.textContent = buildingSystem.countOwned();
    if (d.statTechs) d.statTechs.textContent = `${gameState.techs.length}/${TECH_DEFS.length}`;
    if (d.statIncome) d.statIncome.textContent = `$${Math.floor(gameState.lastDayIncome).toLocaleString()}`;
    if (d.statCosts) d.statCosts.textContent = `$${Math.floor(gameState.lastDayCosts).toLocaleString()}`;
    if (d.statTotal) d.statTotal.textContent = this.formatMoney(gameState.totalEarnings);
  }

  // --- Selected Panel ---

  updateSelectedPanel() {
    const d = this.dom;
    if (!d.selectedPanel) return;

    const animal = gameState.selectedAnimal;
    const building = gameState.selectedBuilding;

    if (animal) {
      d.selectedPanel.style.display = 'block';
      this.renderAnimalPanel(animal);
    } else if (building) {
      d.selectedPanel.style.display = 'block';
      this.renderBuildingPanel(building);
    } else {
      d.selectedPanel.style.display = 'none';
    }
  }

  renderAnimalPanel(animal) {
    const d = this.dom;
    const def = ANIMAL_DEFS[animal.type];
    if (!def) return;

    if (d.selectedPanelTitle) d.selectedPanelTitle.textContent = animal.name;

    const healthPct = Math.max(0, Math.min(100, animal.health || 100));
    const happyPct = Math.max(0, Math.min(100, animal.happiness || 100));
    const hasGPS = gameState.techs.includes('gps');
    const isSick = animal.sick || false;
    const efficiency = ((healthPct / 100) * (happyPct / 100) * 100).toFixed(0);
    const dailyProd = def.prodAmt * def.prodValue * (healthPct / 100);
    const netDaily = (dailyProd - def.feedCost).toFixed(1);

    let buttonsHtml = '';
    if (hasGPS) {
      if (def.product === 'milk') buttonsHtml += `<button class="sel-btn heal" onclick="window.game?.sendAnimalToTask('milk')">Send to Milk</button>`;
      if (def.product === 'wool') buttonsHtml += `<button class="sel-btn heal" onclick="window.game?.sendAnimalToTask('shear')">Send to Shear</button>`;
    }
    if (isSick) buttonsHtml += `<button class="sel-btn heal" onclick="window.game?.healAnimal()">Heal ($200)</button>`;
    const sellValue = animal.sellValue || def.sellValue || 0;
    buttonsHtml += `<button class="sel-btn sell" onclick="window.game?.sellAnimal()">Sell ($${sellValue})</button>`;
    const autoLabel = animal.autoManage ? 'Auto: ON' : 'Auto: OFF';
    buttonsHtml += `<button class="sel-btn heal" onclick="window.game?.toggleAnimalAuto()">${autoLabel}</button>`;

    if (d.selectedPanelBody) {
      d.selectedPanelBody.innerHTML = `
        <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-family:var(--mono);font-size:.68rem;font-weight:700">${def.name}</span>
          ${isSick ? '<span style="color:var(--red);font-size:.6rem;font-weight:700">SICK</span>' : ''}
          ${animal.golden ? '<span style="color:var(--amber);font-size:.6rem;font-weight:700">GOLDEN</span>' : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-family:var(--mono);font-size:.6rem;margin-bottom:6px">
          <span class="stat-muted">Age</span><span style="text-align:right">${animal.age || 0}d</span>
          <span class="stat-muted">Prod/day</span><span style="text-align:right;color:var(--emerald)">+${dailyProd.toFixed(1)} ${def.product}</span>
          <span class="stat-muted">Feed/day</span><span style="text-align:right;color:var(--red)">-$${def.feedCost}</span>
          <span class="stat-muted">Net/day</span><span style="text-align:right;font-weight:700;color:${parseFloat(netDaily) >= 0 ? 'var(--emerald)' : 'var(--red)'}">$${netDaily}</span>
          <span class="stat-muted">Efficiency</span><span style="text-align:right">${efficiency}%</span>
          <span class="stat-muted">Lifetime</span><span style="text-align:right">$${Math.floor(animal.lifetimeEarnings || 0)}</span>
        </div>
        <div style="margin-bottom:4px">
          <div style="display:flex;justify-content:space-between;font-size:.58rem;margin-bottom:2px;font-family:var(--mono)">
            <span class="stat-muted">Health</span>
            <span>${Math.floor(healthPct)}%</span>
          </div>
          <div style="height:3px;background:var(--grid-line);overflow:hidden">
            <div style="height:100%;width:${healthPct}%;background:${healthPct > 50 ? 'var(--emerald)' : healthPct > 25 ? 'var(--amber)' : 'var(--red)'};transition:width .3s"></div>
          </div>
        </div>
        <div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:.58rem;margin-bottom:2px;font-family:var(--mono)">
            <span class="stat-muted">Happiness</span>
            <span>${Math.floor(happyPct)}%</span>
          </div>
          <div style="height:3px;background:var(--grid-line);overflow:hidden">
            <div style="height:100%;width:${happyPct}%;background:var(--emerald);transition:width .3s"></div>
          </div>
        </div>
        ${animal.task ? `<div style="font-size:.58rem;color:var(--accent);margin-bottom:4px;font-family:var(--mono)">Task: ${animal.task.type}</div>` : ''}
        <div style="margin-top:4px">${buttonsHtml}</div>
      `;
    }
  }

  renderBuildingPanel(building) {
    const d = this.dom;
    const def = BUILDING_DEFS[building.type];
    if (!def) return;

    if (d.selectedPanelTitle) d.selectedPanelTitle.textContent = def.name;

    const animalsInRange = def.range ? gameState.animals.filter(a => {
      const dx = Math.abs(a.x - building.col);
      const dy = Math.abs(a.y - building.row);
      return Math.sqrt(dx * dx + dy * dy) <= def.range;
    }).length : 0;

    let infoHtml = `<div style="font-family:var(--sans);font-size:.7rem;color:var(--ink);opacity:0.7;margin-bottom:6px">${def.desc}</div>`;
    infoHtml += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-family:var(--mono);font-size:.6rem;margin-bottom:6px">`;
    if (def.range) infoHtml += `<span class="stat-muted">Range</span><span style="text-align:right">${def.range} tiles</span>`;
    if (def.range) infoHtml += `<span class="stat-muted">Animals</span><span style="text-align:right">${animalsInRange} in range</span>`;
    if (def.capacity) {
      const used = gameState.animals.filter(a => {
        if (def.animalType && a.type !== def.animalType) return false;
        const dx = Math.abs(a.x - building.col);
        const dy = Math.abs(a.y - building.row);
        return Math.sqrt(dx * dx + dy * dy) <= 3;
      }).length;
      infoHtml += `<span class="stat-muted">Capacity</span><span style="text-align:right">${used}/${def.capacity}</span>`;
    }
    if (def.energyGen) infoHtml += `<span class="stat-muted">Energy</span><span style="text-align:right;color:var(--amber)">+${def.energyGen}/day</span>`;
    if (def.bonusAmt) infoHtml += `<span class="stat-muted">Bonus</span><span style="text-align:right;color:var(--emerald)">+${def.bonusAmt * 100}% ${def.bonus}</span>`;
    infoHtml += `</div>`;

    if (building.type !== 'farmhouse') {
      infoHtml += `<button class="sel-btn demolish" style="margin-top:4px" onclick="window.game?.demolishSelected()">Demolish</button>`;
    }

    if (d.selectedPanelBody) d.selectedPanelBody.innerHTML = infoHtml;
  }

  // --- Active Effects ---

  updateActiveEffects() {
    const d = this.dom;
    if (!d.activeEffects || !d.effectsList) return;
    if (gameState.activeEffects.length === 0) {
      d.activeEffects.style.display = 'none';
      return;
    }
    d.activeEffects.style.display = 'block';
    let html = '';
    for (const effect of gameState.activeEffects) {
      const isBad = ['pestBlock', 'buildingDisable', 'marketCrash', 'frostBlock', 'locusts', 'heatWave', 'blizzard'].includes(effect.name);
      const color = isBad ? 'var(--red)' : 'var(--emerald)';
      html += `<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:.6rem;padding:2px 0;border-bottom:1px solid var(--grid-line)">
        <span style="color:${color}">${effect.name}</span>
        <span>${effect.daysLeft}d</span>
      </div>`;
    }
    d.effectsList.innerHTML = html;
  }

  // --- Loan UI ---

  updateLoanUI() {
    const d = this.dom;
    if (!d.loanTakeBtn || !d.loanRepayBtn) return;
    if (gameState.loan > 0) {
      d.loanTakeBtn.style.display = 'none';
      d.loanRepayBtn.style.display = '';
      const total = Math.ceil(gameState.loan + gameState.loanInterest);
      if (d.loanAmount) d.loanAmount.textContent = `($${total.toLocaleString()})`;
    } else {
      d.loanTakeBtn.style.display = '';
      d.loanRepayBtn.style.display = 'none';
    }
  }

  // --- Speed Buttons ---

  updateSpeedButtons() {
    const btns = document.querySelectorAll('.speed-btn');
    const speeds = [0, 1, 2, 5, 10];
    btns.forEach((btn, i) => {
      if (i < speeds.length) {
        btn.classList.toggle('active', gameState.gameSpeed === speeds[i]);
      }
    });
  }

  // --- Toggle Buttons ---

  updateToggleButtons() {
    const d = this.dom;
    if (d.autoSellBtn) d.autoSellBtn.classList.toggle('on', gameState.autoSell);
    if (d.soundBtn) d.soundBtn.classList.toggle('on', gameState.soundEnabled);
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) themeBtn.textContent = document.documentElement.dataset.theme === 'dark' ? 'Dark' : 'Light';
  }

  // --- Canvas Cursor ---

  updateCanvasCursor() {
    const wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    const inputSystem = this.game.inputSystem;
    if (!inputSystem) return;

    wrap.classList.remove('cursor-build', 'cursor-demolish', 'cursor-expand', 'cursor-program');

    if (inputSystem.demolishMode) {
      wrap.classList.add('cursor-demolish');
    } else if (inputSystem.expandMode) {
      wrap.classList.add('cursor-expand');
    } else if (gameState.programmingAnimal) {
      wrap.classList.add('cursor-program');
    } else if (gameState.selectedBuild) {
      wrap.classList.add('cursor-build');
    }
  }

  // --- Build Mode Buttons ---

  updateBuildButtons() {
    const inputSystem = this.game.inputSystem;
    const btns = document.querySelectorAll('.build-btn[data-build]');
    btns.forEach(btn => {
      const build = btn.getAttribute('data-build');
      if (build === 'expand') {
        btn.classList.toggle('active', inputSystem && inputSystem.expandMode);
      } else if (build === 'demolish') {
        btn.classList.toggle('active', inputSystem && inputSystem.demolishMode);
      } else {
        btn.classList.toggle('active', gameState.selectedBuild === build);
      }
    });
  }

  // --- Notification Log ---

  addNotification(data) {
    const d = this.dom;
    if (!d.logFeed) return;

    const msg = data.msg || data.text || '';
    const type = data.type || '';

    const entry = document.createElement('div');
    entry.className = `notif ${type}`;
    entry.innerHTML = `<span class="time">D${gameState.day}</span>${msg}`;

    d.logFeed.insertBefore(entry, d.logFeed.firstChild);

    // Cap at 50 entries
    while (d.logFeed.children.length > 50) {
      d.logFeed.removeChild(d.logFeed.lastChild);
    }
  }

  // --- Float Text ---

  addFloatText(data) {
    const d = this.dom;
    if (!d.floatTexts) return;

    // Cap active float texts to prevent visual clutter
    if (d.floatTexts.childElementCount >= 8) return;

    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = data.text || '';
    el.style.color = data.color || 'var(--emerald-light)';

    let x, y;
    // Project 3D world position to screen coordinates
    if (data.x != null && data.z != null && this.game.camera && this.game.renderer) {
      const vec = new (window.THREE || this._getThree()).Vector3(data.x, data.y || 2, data.z);
      vec.project(this.game.camera);
      const canvas = this.game.renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      x = rect.left + (vec.x * 0.5 + 0.5) * rect.width + (Math.random() - 0.5) * 30;
      y = rect.top + (-vec.y * 0.5 + 0.5) * rect.height - 20;
    } else {
      x = window.innerWidth / 2 + (Math.random() - 0.5) * 200;
      y = window.innerHeight / 2 + (Math.random() - 0.5) * 100;
    }
    el.style.left = x + 'px';
    el.style.top = y + 'px';

    d.floatTexts.appendChild(el);
    setTimeout(() => { el.remove(); }, 1500);
  }

  _getThree() {
    // Lazy import THREE for Vector3 projection
    if (!this._three) {
      this._three = { Vector3: this.game.camera.position.constructor };
    }
    return this._three;
  }

  // --- Toast ---

  addToast(data) {
    const d = this.dom;
    if (!d.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = data.text || '';
    if (data.color) {
      toast.style.color = data.color;
      toast.style.borderColor = data.color;
      toast.style.textShadow = `0 0 8px ${data.color}40`;
      toast.style.boxShadow = `0 0 30px ${data.color}30`;
    }

    d.toastContainer.appendChild(toast);

    const duration = data.duration || 3000;
    // Fade out before removal
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => { toast.remove(); }, 380);
    }, duration - 380);
  }

  // --- Helpers ---

  formatMoney(val) {
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`;
    return `${sign}$${Math.floor(abs)}`;
  }
}
