// src/main.js — Main Orchestrator
// Wires Three.js scene, all systems, UI, and game loop together.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { eventBus, Events } from './core/EventBus.js';
import { gameState } from './core/GameState.js';
import { GRID, GAME, CAMERA, COLORS, getSeason, TECH_DEFS } from './core/Constants.js';

// Systems
import { FarmGrid } from './systems/FarmGrid.js';
import { AnimalSystem } from './systems/AnimalSystem.js';
import { BuildingSystem } from './systems/BuildingSystem.js';
import { EconomySystem } from './systems/EconomySystem.js';
import { TechSystem } from './systems/TechSystem.js';
import { QuestSystem } from './systems/QuestSystem.js';
import { MilestoneSystem } from './systems/MilestoneSystem.js';
import { WeatherSystem } from './systems/WeatherSystem.js';
import { InputSystem } from './systems/InputSystem.js';
import { DayNightSystem } from './systems/DayNightSystem.js';

// Entities
import { ParticleSystem } from './entities/ParticleSystem.js';

// UI
import { UIManager } from './ui/UIManager.js';
import { TitleScreen } from './ui/TitleScreen.js';
import { Tutorial } from './ui/Tutorial.js';
import { TechModal } from './ui/TechModal.js';
import { DecisionModal } from './ui/DecisionModal.js';

// Audio
import { AudioManager } from './audio/AudioManager.js';

class Game {
  constructor() {
    // Three.js renderer
    this.clock = new THREE.Clock();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.SKY);

    // Camera
    this.camera = new THREE.PerspectiveCamera(GAME.FOV, 1, GAME.NEAR, GAME.FAR);
    this.camera.position.set(CAMERA.TARGET_X, CAMERA.HEIGHT, CAMERA.TARGET_Z + CAMERA.DISTANCE);

    // Lights
    this.ambientLight = new THREE.AmbientLight(COLORS.AMBIENT, COLORS.AMBIENT_INTENSITY);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(COLORS.DIR_LIGHT, COLORS.DIR_INTENSITY);
    this.dirLight.position.set(30, 40, 30);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.left = -40;
    this.dirLight.shadow.camera.right = 40;
    this.dirLight.shadow.camera.top = 40;
    this.dirLight.shadow.camera.bottom = -40;
    this.scene.add(this.dirLight);

    // Attach renderer to DOM
    const wrap = document.getElementById('canvas-wrap');
    wrap.appendChild(this.renderer.domElement);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(CAMERA.TARGET_X, 0, CAMERA.TARGET_Z);
    this.controls.enablePan = true;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = CAMERA.MIN_DISTANCE;
    this.controls.maxDistance = CAMERA.MAX_DISTANCE;
    this.controls.minPolarAngle = CAMERA.MIN_POLAR;
    this.controls.maxPolarAngle = CAMERA.MAX_POLAR;
    this.controls.update();

    // --- Init systems (order matters: dependencies first) ---
    this.audio = new AudioManager();
    this.farmGrid = new FarmGrid(this.scene);
    this.buildingSystem = new BuildingSystem(this.scene, this.farmGrid);
    this.animalSystem = new AnimalSystem(this.scene, this.buildingSystem);
    this.economySystem = new EconomySystem(this.buildingSystem);
    this.techSystem = new TechSystem(this.buildingSystem);
    this.questSystem = new QuestSystem(this.buildingSystem);
    this.milestoneSystem = new MilestoneSystem(this.buildingSystem);
    this.weatherSystem = new WeatherSystem(this.buildingSystem);
    this.dayNightSystem = new DayNightSystem(this.scene, this.dirLight, this.ambientLight);
    this.particles = new ParticleSystem(this.scene);
    this.animalSystem.particles = this.particles;
    this.inputSystem = new InputSystem(this.camera, this.renderer.domElement, this.farmGrid);

    // UI
    this.titleScreen = new TitleScreen();
    this.tutorial = new Tutorial();
    this.techModal = new TechModal(this.techSystem);
    this.decisionModal = new DecisionModal();

    eventBus.on('decision:offer', ({ event }) => {
      this.decisionModal.show(event, (opt, idx) => {
        this._handleDecision(event, opt, idx);
      });
    });

    this.uiManager = new UIManager(this);

    // Game tick accumulator
    this.dayTickAccum = 0;
    this.visualTimeAccum = 0;
    this.running = false;

    // Resize handler
    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    // Wire tech tree toggle (InputSystem emits 'ui:toggleTechTree' on T key)
    eventBus.on('ui:toggleTechTree', () => {
      if (this.techModal.overlay && this.techModal.overlay.classList.contains('active')) {
        this.techModal.close();
      } else {
        this.techModal.open();
      }
    });

    // Win detection on tech unlock
    eventBus.on(Events.TECH_UNLOCKED, () => this.checkWinCondition());

    // Show continue button if save exists
    if (gameState.hasSave()) this.titleScreen.showContinueButton();

    // Expose for UI onclick handlers
    window.game = this;
  }

  startNewGame() {
    this.audio.init();
    gameState.reset();
    this.farmGrid.rebuild();
    this.buildingSystem.init();
    this.animalSystem.init();
    this.titleScreen.hide();
    document.getElementById('game-container').classList.add('active');
    this.onResize();
    this.running = true;
    this.uiManager.init();
    if (!gameState.tutorialDone) this.tutorial.start();
    this.renderer.setAnimationLoop(() => this.animate());
  }

  loadAndStart() {
    this.audio.init();
    gameState.load();
    this.farmGrid.rebuild();
    this.buildingSystem.init();
    this.animalSystem.initFromState();
    this.titleScreen.hide();
    document.getElementById('game-container').classList.add('active');
    this.onResize();
    this.running = true;
    this.uiManager.init();
    this.renderer.setAnimationLoop(() => this.animate());
  }

  animate() {
    const rawDelta = this.clock.getDelta();
    const delta = Math.min(rawDelta, GAME.MAX_DELTA);

    this.controls.update();

    // Game logic ticks (speed-adjusted)
    if (this.running && gameState.gameSpeed > 0) {
      const ticksThisFrame = gameState.gameSpeed;
      for (let i = 0; i < ticksThisFrame; i++) {
        this.gameTick();
      }
    }

    // Visual updates (every frame regardless of speed)
    // Visual day/night runs on real wall-clock time: 60-second cycle
    this.visualTimeAccum += rawDelta;
    gameState.visualDayProgress = (this.visualTimeAccum % 60) / 60;

    this.animalSystem.updateVisuals(delta);
    this.farmGrid.updateWater(this.clock.elapsedTime);
    this.farmGrid.maybeUpdateColors();
    this.dayNightSystem.update(gameState.visualDayProgress);
    this.particles.update(delta, this.clock.elapsedTime);

    // Fireflies at night
    const isNight = gameState.visualDayProgress > 0.5 && gameState.visualDayProgress < 0.9;
    if (isNight && !this.particles.firefliesActive) {
      this.particles.startFireflies();
    } else if (!isNight && this.particles.firefliesActive) {
      this.particles.stopFireflies();
    }

    this.uiManager.update();

    this.renderer.render(this.scene, this.camera);
  }

  gameTick() {
    this.dayTickAccum++;
    if (this.dayTickAccum >= GAME.DAY_TICKS) {
      this.dayTickAccum = 0;
      this.newDay();
    }
    gameState.dayProgress = this.dayTickAccum / GAME.DAY_TICKS;

    this.animalSystem.tick();
    this.questSystem.checkQuests();
  }

  newDay() {
    gameState.day++;

    // Update season
    const season = getSeason(gameState.day);
    this.dayNightSystem.setSeason(season);
    if (this.farmGrid.setSeason) this.farmGrid.setSeason(season);

    if (season === 'winter') {
      this.particles.startSnow();
    } else {
      this.particles.stopSnow();
    }

    // Sakura petals in spring
    if (season === 'spring') {
      this.particles.setSakuraPositions(this.farmGrid.getSakuraPositions());
      this.particles.startPetals();
    } else {
      this.particles.stopPetals();
    }

    this.economySystem.newDay();
    this.weatherSystem.checkWeatherEvent();

    // Grass regrowth with tech bonuses
    const techGrassRegrow = this.economySystem.getTechEffect('grassRegrow');
    const techGrassBonus = this.economySystem.getTechEffect('grassBonus');
    this.farmGrid.growGrass(gameState.weatherBonus, techGrassRegrow, techGrassBonus);

    // Auto-heal from Predictive Vet AI
    if (this.economySystem.getTechEffect('autoHeal') > 0) {
      for (const animal of gameState.animals) {
        if (animal.sick) {
          animal.sick = false;
          animal.health = 100;
        }
      }
    }

    // Breeding from Fertility AI
    this.animalSystem.tryBreeding();

    this.milestoneSystem.checkMilestones();
    if (gameState.day % 10 === 0) gameState.save();
    eventBus.emit(Events.NOTIFICATION, { msg: 'Day ' + gameState.day + ' begins.' });
  }

  onResize() {
    const wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // --- Methods called by UI onclick handlers ---

  selectBuild(type) {
    gameState.selectedBuild = gameState.selectedBuild === type ? null : type;
    gameState.selectedAnimal = null;
    this.inputSystem.demolishMode = false;
    this.inputSystem.expandMode = false;
    eventBus.emit(Events.BUILD_MODE_CHANGED, { type: gameState.selectedBuild });
  }

  buyAnimal(type) {
    this.audio.init();
    this.animalSystem.buyAnimal(type);
  }

  sellProducts() {
    this.audio.init();
    this.economySystem.sellProducts();
  }

  openTechTree() { this.techModal.open(); }
  closeTechTree() { this.techModal.close(); }
  setSpeed(s) { gameState.gameSpeed = s; }

  toggleAutoSell() {
    this.audio.init();
    gameState.autoSell = !gameState.autoSell;
  }

  toggleSound() {
    this.audio.init();
    gameState.soundEnabled = !gameState.soundEnabled;
    this.audio.enabled = gameState.soundEnabled;
  }

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

  autoManageAll() { this.animalSystem.autoManageAll(); }
  startProgramming(action) { this.inputSystem.startProgramming(action); }
  sellAnimal() { this.animalSystem.sellSelectedAnimal(); }
  healAnimal() { this.animalSystem.healSelectedAnimal(); }
  tutorialNext() { this.tutorial.next(); }
  tutorialEnd() { this.tutorial.end(); }
  toggleDemolish() { this.inputSystem.setDemolishMode(!this.inputSystem.demolishMode); }
  toggleExpand() { this.inputSystem.setExpandMode(!this.inputSystem.expandMode); }

  toggleQuestHint() {
    this.uiManager.toggleQuestHint();
  }

  // Called by UIManager onclick handlers for animal actions
  sendAnimalToTask(action) {
    this.inputSystem.startProgramming(action);
  }

  // Toggle auto-manage on the currently selected animal
  toggleAnimalAuto() {
    const animal = gameState.selectedAnimal;
    if (!animal) return;
    const hasGPS = gameState.techs.includes('gps');
    if (!hasGPS) {
      eventBus.emit(Events.NOTIFICATION, { text: 'Unlock GPS Tracking first!', type: 'error' });
      return;
    }
    animal.autoManage = !animal.autoManage;
    eventBus.emit(Events.NOTIFICATION, { text: `${animal.name} auto-manage: ${animal.autoManage ? 'ON' : 'OFF'}`, type: 'info' });
  }

  _handleDecision(event, opt, idx) {
    if (opt.cost && gameState.money < opt.cost) {
      eventBus.emit(Events.NOTIFICATION, { msg: 'Not enough money!' });
      return;
    }
    if (opt.cost) {
      gameState.money -= opt.cost;
      gameState.totalSpent += opt.cost;
    }
    switch (opt.reward) {
      case 'sheep5':
        for (let i = 0; i < 5; i++) this.animalSystem.buyAnimal('sheep');
        break;
      case 'stormProtect':
        gameState.stormProtected = true;
        break;
      case 'milkContract':
        gameState.milkContractDays = 30;
        break;
      case 'landPlot':
        for (let r = 3; r < 7; r++) for (let c = 8; c < 12; c++) {
          if (gameState.map[r]?.[c] && !gameState.map[r][c].owned) gameState.map[r][c].owned = true;
        }
        break;
      case 'dataSell':
        gameState.money += 5000;
        gameState.totalEarnings += 5000;
        break;
      case 'techSpeed':
        gameState.techDiscount = Math.min(gameState.techDiscount + 0.1, 0.5);
        break;
    }
    eventBus.emit(Events.NOTIFICATION, { msg: `Decision: ${opt.label}` });
  }

  checkWinCondition() {
    if (gameState.completionDay > 0) return; // Already won this run
    const totalTechs = TECH_DEFS.length;
    if (gameState.techs.length >= totalTechs) {
      gameState.completionDay = gameState.day;
      this.showWinScreen();
    }
  }

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

  // Demolish the currently selected building
  demolishSelected() {
    const building = gameState.selectedBuilding;
    if (!building) return;
    eventBus.emit(Events.BUILDING_DEMOLISHED, { col: building.col, row: building.row });
    gameState.selectedBuilding = null;
    eventBus.emit(Events.SELECTION_CHANGED, { type: null, entity: null });
  }
}

// Boot
const game = new Game();

// Expose window functions for onclick handlers in HTML
window.startNewGame = () => game.startNewGame();
window.loadAndStart = () => game.loadAndStart();

// Game-creator required globals
window.render_game_to_text = () => {
  const buildingCount = gameState.map.flat().filter(t => t.building).length;
  return JSON.stringify({
    coordinateSystem: 'Three.js: X=right, Y=up, Z=toward camera. Grid: 32 cols x 20 rows.',
    mode: game.running ? 'playing' : 'title',
    day: gameState.day,
    money: gameState.money,
    animals: gameState.animals.length,
    techs: gameState.techs.length,
    buildings: buildingCount,
  });
};

window.advanceTime = (ms) => new Promise(resolve => setTimeout(resolve, ms));
