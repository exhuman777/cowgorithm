import * as THREE from 'three';
import { GRID } from '../core/Constants.js';
import { gameState } from '../core/GameState.js';
import { eventBus, Events } from '../core/EventBus.js';

export class InputSystem {
  constructor(camera, domElement, farmGrid) {
    this.camera = camera;
    this.domElement = domElement;
    this.farmGrid = farmGrid;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredTile = null; // {col, row} of currently hovered tile
    this.demolishMode = false;
    this.expandMode = false;

    // Ground plane for raycasting (invisible, at Y=0)
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Event listeners
    this.domElement.addEventListener('click', (e) => this.onCanvasClick(e));
    this.domElement.addEventListener('mousemove', (e) => this.onCanvasHover(e));

    // Keyboard
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  getWorldPosition(event) {
    // Convert screen coords to normalized device coords
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast to ground plane
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, intersection);
    return hit ? intersection : null;
  }

  onCanvasClick(event) {
    const worldPos = this.getWorldPosition(event);
    if (!worldPos) return;

    const { col, row } = this.farmGrid.worldToTile(worldPos.x, worldPos.z);
    const tile = this.farmGrid.getTileAt(col, row);
    if (!tile) return;

    // Programming mode: routing animal to a building
    if (gameState.programmingAnimal && gameState.programmingAction) {
      if (tile.building) {
        eventBus.emit(Events.ANIMAL_TASK_ASSIGNED, {
          animal: gameState.programmingAnimal,
          action: gameState.programmingAction,
          col, row,
        });
        gameState.programmingAnimal = null;
        gameState.programmingAction = null;
      }
      return;
    }

    // Expand mode
    if (this.expandMode) {
      if (!tile.owned) {
        eventBus.emit(Events.LAND_EXPANDED, { col, row });
      }
      return;
    }

    // Demolish mode
    if (this.demolishMode) {
      if (tile.building && tile.building.type !== 'farmhouse') {
        eventBus.emit(Events.BUILDING_DEMOLISHED, { col, row });
      }
      return;
    }

    // Build mode
    if (gameState.selectedBuild) {
      const buildType = gameState.selectedBuild;
      if (buildType === 'pasture') {
        eventBus.emit(Events.PASTURE_PLACED, { col, row });
      } else {
        eventBus.emit(Events.BUILDING_PLACED, { col, row, type: buildType });
      }
      return;
    }

    // Selection mode: check if clicking near an animal or on a building
    // Check animals first (within 1 tile distance)
    const clickWorldX = col * GRID.TILE_SIZE + GRID.TILE_SIZE / 2;
    const clickWorldZ = row * GRID.TILE_SIZE + GRID.TILE_SIZE / 2;

    let closestAnimal = null;
    let closestDist = 2.5; // Max selection distance in world units
    for (const animal of gameState.animals) {
      const ax = animal.x * GRID.TILE_SIZE;
      const az = animal.y * GRID.TILE_SIZE;
      const dist = Math.sqrt((ax - worldPos.x) ** 2 + (az - worldPos.z) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        closestAnimal = animal;
      }
    }

    if (closestAnimal) {
      gameState.selectedAnimal = closestAnimal;
      gameState.selectedBuilding = null;
      eventBus.emit(Events.SELECTION_CHANGED, { type: 'animal', entity: closestAnimal });
      return;
    }

    // Check building
    if (tile.building) {
      gameState.selectedBuilding = { ...tile.building, col, row };
      gameState.selectedAnimal = null;
      eventBus.emit(Events.SELECTION_CHANGED, { type: 'building', entity: { ...tile.building, col, row } });
      return;
    }

    // Clicked empty tile: deselect
    gameState.selectedAnimal = null;
    gameState.selectedBuilding = null;
    eventBus.emit(Events.SELECTION_CHANGED, { type: null, entity: null });
  }

  onCanvasHover(event) {
    const worldPos = this.getWorldPosition(event);
    if (!worldPos) { this.farmGrid.clearHover(); return; }
    const { col, row } = this.farmGrid.worldToTile(worldPos.x, worldPos.z);
    this.hoveredTile = { col, row };

    // Show hover indicator in expand mode
    if (this.expandMode) {
      const tile = this.farmGrid.getTileAt(col, row);
      if (tile && !tile.owned) {
        // Check if adjacent to owned land
        const neighbors = [
          this.farmGrid.getTileAt(col-1, row), this.farmGrid.getTileAt(col+1, row),
          this.farmGrid.getTileAt(col, row-1), this.farmGrid.getTileAt(col, row+1),
        ];
        const adjacentOwned = neighbors.some(n => n && n.owned);
        const buyable = adjacentOwned && tile.type !== 'water';
        this.farmGrid.setHover(col, row, buyable);
      } else {
        this.farmGrid.clearHover();
      }
    } else {
      this.farmGrid.clearHover();
    }
  }

  onKeyDown(event) {
    // Don't handle if typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

    switch (event.key.toLowerCase()) {
      case 'p':
        gameState.selectedBuild = gameState.selectedBuild === 'pasture' ? null : 'pasture';
        eventBus.emit(Events.BUILD_MODE_CHANGED, { type: gameState.selectedBuild });
        break;
      case 'b':
        gameState.selectedBuild = gameState.selectedBuild === 'barn' ? null : 'barn';
        eventBus.emit(Events.BUILD_MODE_CHANGED, { type: gameState.selectedBuild });
        break;
      case 't':
        // Toggle tech tree -- UI handles this
        eventBus.emit('ui:toggleTechTree');
        break;
      case 's':
        eventBus.emit(Events.PRODUCTS_SOLD, {});
        break;
      case 'escape':
        gameState.selectedBuild = null;
        this.demolishMode = false;
        this.expandMode = false;
        gameState.programmingAnimal = null;
        gameState.programmingAction = null;
        gameState.selectedAnimal = null;
        gameState.selectedBuilding = null;
        eventBus.emit(Events.BUILD_MODE_CHANGED, { type: null });
        eventBus.emit(Events.SELECTION_CHANGED, { type: null, entity: null });
        break;
      case '0': gameState.gameSpeed = 0; break;
      case '1': gameState.gameSpeed = 1; break;
      case '2': gameState.gameSpeed = 2; break;
      case '3': gameState.gameSpeed = 5; break;
      case '4': gameState.gameSpeed = 10; break;
    }
  }

  setDemolishMode(active) {
    this.demolishMode = active;
    this.expandMode = false;
    gameState.selectedBuild = null;
    eventBus.emit(Events.BUILD_MODE_CHANGED, { type: active ? 'demolish' : null });
  }

  setExpandMode(active) {
    this.expandMode = active;
    this.demolishMode = false;
    gameState.selectedBuild = null;
    if (!active) this.farmGrid.clearHover();
    eventBus.emit(Events.BUILD_MODE_CHANGED, { type: active ? 'expand' : null });
  }

  startProgramming(action) {
    if (!gameState.selectedAnimal) return;
    gameState.programmingAnimal = gameState.selectedAnimal;
    gameState.programmingAction = action;
    // Player now clicks a target building
  }
}
