import * as THREE from 'three';
import { GRID, COLORS, SEASON_COLORS } from '../core/Constants.js';
import { gameState } from '../core/GameState.js';
import { createTree, createSakuraTree, updateTreeSeason } from '../entities/TreeFactory.js';
import { eventBus, Events } from '../core/EventBus.js';

export class FarmGrid {
  constructor(scene) {
    this.scene = scene;
    this.terrainMesh = null;
    this.trees = [];
    this.colorUpdateCounter = 0;
    this.currentSeason = 'spring';
    this.swayTime = 0;
    this.revealTiles = []; // { col, row, progress }
    this.hoverMesh = null;

    eventBus.on(Events.LAND_EXPANDED, ({ col, row }) => {
      this.revealTiles.push({ col, row, progress: 0 });
    });
  }

  setSeason(season) {
    if (this.currentSeason !== season) {
      this.currentSeason = season;
      this.updateTreeColors();
    }
  }

  rebuild() {
    // Remove old terrain and trees
    if (this.terrainMesh) { this.scene.remove(this.terrainMesh); this.terrainMesh.geometry.dispose(); }
    if (this.hoverMesh) { this.scene.remove(this.hoverMesh); }
    this.trees.forEach(t => this.scene.remove(t));
    this.trees = [];

    // Create terrain plane — non-indexed for crisp per-tile coloring
    const width = GRID.COLS * GRID.TILE_SIZE;
    const depth = GRID.ROWS * GRID.TILE_SIZE;
    let geo = new THREE.PlaneGeometry(width, depth, GRID.COLS, GRID.ROWS);
    geo.rotateX(-Math.PI / 2);
    geo.translate(width / 2, 0, depth / 2);
    geo = geo.toNonIndexed(); // Each face gets unique vertices (no shared edges)

    const colors = new Float32Array(geo.attributes.position.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // Hover indicator quad
    const hGeo = new THREE.PlaneGeometry(GRID.TILE_SIZE, GRID.TILE_SIZE);
    hGeo.rotateX(-Math.PI / 2);
    const hMat = new THREE.MeshBasicMaterial({
      color: 0x44ffaa, transparent: true, opacity: 0.35, depthTest: true,
    });
    this.hoverMesh = new THREE.Mesh(hGeo, hMat);
    this.hoverMesh.position.y = 0.06;
    this.hoverMesh.visible = false;
    this.scene.add(this.hoverMesh);

    this.updateTerrainColors();
    this.placeTrees();
  }

  _tileColor(tile, col, row) {
    let r, g, b;
    if (!tile || tile.type === 'water') {
      r = 0.13; g = 0.59; b = 0.95;
    } else if (tile.type === 'forest') {
      const fc = SEASON_COLORS[this.currentSeason]?.forest || [0.11, 0.37, 0.13];
      const fMul = tile.owned ? 1.0 : 0.5;
      r = fc[0] * fMul; g = fc[1] * fMul; b = fc[2] * fMul;
    } else {
      const gl = (tile.grassLevel || 50) / 100;
      const sc = SEASON_COLORS[this.currentSeason]?.grass || [0.29, 0.49, 0.18];
      if (tile.owned) {
        if (tile.isPasture) {
          r = (sc[0] - 0.05) * (1 - gl) + (sc[0] + 0.05) * gl;
          g = (sc[1] - 0.15) * (1 - gl) + (sc[1] + 0.1) * gl;
          b = (sc[2] - 0.05) * (1 - gl) + (sc[2] + 0.02) * gl;
        } else {
          r = (sc[0] - 0.04) * (1 - gl) + sc[0] * gl;
          g = (sc[1] - 0.14) * (1 - gl) + sc[1] * gl;
          b = (sc[2] - 0.04) * (1 - gl) + sc[2] * gl;
        }
        const swayPhase = col * 0.5 + row * 0.7;
        const sway = Math.sin(this.swayTime * 1.5 + swayPhase) * 0.025;
        r += sway; g += sway; b += sway * 0.5;

        if (tile.type === 'grass') {
          const neighbors = [
            gameState.map[row-1]?.[col], gameState.map[row+1]?.[col],
            gameState.map[row]?.[col-1], gameState.map[row]?.[col+1],
          ];
          if (neighbors.some(n => n && !n.owned && n.type !== 'water')) {
            r += 0.04; g += 0.06; b += 0.08;
          }
        }
        const reveal = this.revealTiles.find(rt => rt.col === col && rt.row === row);
        if (reveal) {
          const flash = (1 - reveal.progress) * 0.15;
          r += flash; g += flash; b += flash;
        }
      } else {
        r = sc[0] * 0.4; g = sc[1] * 0.4; b = sc[2] * 0.4;
      }
    }
    return [r, g, b];
  }

  updateTerrainColors() {
    // Non-indexed geometry: every 3 vertices = 1 triangle face
    // Use face center to determine tile, set all 3 vertices same color
    const geo = this.terrainMesh.geometry;
    const colorAttr = geo.attributes.color;
    const posAttr = geo.attributes.position;
    const faceCount = posAttr.count / 3;

    for (let f = 0; f < faceCount; f++) {
      const i = f * 3;
      const cx = (posAttr.getX(i) + posAttr.getX(i+1) + posAttr.getX(i+2)) / 3;
      const cz = (posAttr.getZ(i) + posAttr.getZ(i+1) + posAttr.getZ(i+2)) / 3;
      const col = Math.min(Math.max(Math.floor(cx / GRID.TILE_SIZE), 0), GRID.COLS - 1);
      const row = Math.min(Math.max(Math.floor(cz / GRID.TILE_SIZE), 0), GRID.ROWS - 1);
      const tile = gameState.map[row]?.[col];

      const [r, g, b] = this._tileColor(tile, col, row);
      colorAttr.setXYZ(i, r, g, b);
      colorAttr.setXYZ(i+1, r, g, b);
      colorAttr.setXYZ(i+2, r, g, b);
    }
    colorAttr.needsUpdate = true;
  }

  placeTrees() {
    let treeIndex = 0;
    for (let row = 0; row < GRID.ROWS; row++) {
      for (let col = 0; col < GRID.COLS; col++) {
        if (gameState.map[row][col].type === 'forest') {
          // Deterministic sakura selection: ~35% of forest tiles
          const seed = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
          const isSakura = ((seed % 1 + 1) % 1) < 0.50;

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
                child.material.color.multiplyScalar(0.65);
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

  updateTreeColors() {
    for (const tree of this.trees) {
      if (tree.userData.dimmed) continue;
      updateTreeSeason(tree, this.currentSeason);
    }
  }

  getSakuraPositions() {
    return this.trees
      .filter(t => t.userData.isSakura && !t.userData.dimmed)
      .map(t => ({ x: t.position.x, z: t.position.z }));
  }

  updateWater(elapsedTime) {
    const geo = this.terrainMesh.geometry;
    const posAttr = geo.attributes.position;
    const colorAttr = geo.attributes.color;
    const faceCount = posAttr.count / 3;

    for (let f = 0; f < faceCount; f++) {
      const i = f * 3;
      const cx = (posAttr.getX(i) + posAttr.getX(i+1) + posAttr.getX(i+2)) / 3;
      const cz = (posAttr.getZ(i) + posAttr.getZ(i+1) + posAttr.getZ(i+2)) / 3;
      const col = Math.min(Math.max(Math.floor(cx / GRID.TILE_SIZE), 0), GRID.COLS - 1);
      const row = Math.min(Math.max(Math.floor(cz / GRID.TILE_SIZE), 0), GRID.ROWS - 1);
      const tile = gameState.map[row]?.[col];

      if (tile && tile.type === 'water') {
        for (let v = 0; v < 3; v++) {
          const vi = i + v;
          const wx = posAttr.getX(vi);
          const wz = posAttr.getZ(vi);
          posAttr.setY(vi, Math.sin(elapsedTime * 2 + wx + wz) * 0.08);
        }
        const shimmer = Math.sin(elapsedTime * 1.5 + cx * 0.5 + cz * 0.3) * 0.5 + 0.5;
        const r = 0.08 + shimmer * 0.05;
        const g = 0.50 + shimmer * 0.09;
        const b = 0.85 + shimmer * 0.1;
        colorAttr.setXYZ(i, r, g, b);
        colorAttr.setXYZ(i+1, r, g, b);
        colorAttr.setXYZ(i+2, r, g, b);
      }
    }
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  // Throttled color update (call every N frames, not every frame)
  maybeUpdateColors() {
    this.colorUpdateCounter++;
    this.swayTime += 0.016; // ~60fps

    // Update reveal animations
    for (let i = this.revealTiles.length - 1; i >= 0; i--) {
      this.revealTiles[i].progress += 0.05;
      if (this.revealTiles[i].progress >= 1) {
        this.revealTiles.splice(i, 1);
      }
    }

    if (this.colorUpdateCounter >= 30) { // Every 30 frames
      this.colorUpdateCounter = 0;
      this.updateTerrainColors();
    }
  }

  growGrass(weatherBonus, techGrassRegrow, techGrassBonus) {
    // Daily grass regrowth
    const baseRegrow = 2; // base regrowth per day
    const regrowRate = baseRegrow * weatherBonus * (1 + techGrassRegrow);
    for (let row = 0; row < GRID.ROWS; row++) {
      for (let col = 0; col < GRID.COLS; col++) {
        const tile = gameState.map[row][col];
        if (tile.type !== 'grass') continue;
        if (tile.grassLevel >= 100) continue;
        let rate = regrowRate;
        if (tile.isPasture) rate *= (1.5 + techGrassBonus); // pastures regrow faster
        tile.grassLevel = Math.min(100, tile.grassLevel + rate);
      }
    }
  }

  worldToTile(worldX, worldZ) {
    const col = Math.floor(worldX / GRID.TILE_SIZE);
    const row = Math.floor(worldZ / GRID.TILE_SIZE);
    return { col, row };
  }

  tileToWorld(col, row) {
    return {
      x: col * GRID.TILE_SIZE + GRID.TILE_SIZE / 2,
      y: 0,
      z: row * GRID.TILE_SIZE + GRID.TILE_SIZE / 2,
    };
  }

  getTileAt(col, row) {
    if (row >= 0 && row < GRID.ROWS && col >= 0 && col < GRID.COLS) {
      return gameState.map[row][col];
    }
    return null;
  }

  setHover(col, row, buyable) {
    if (!this.hoverMesh) return;
    if (col < 0 || row < 0 || col >= GRID.COLS || row >= GRID.ROWS) {
      this.hoverMesh.visible = false;
      return;
    }
    const wp = this.tileToWorld(col, row);
    this.hoverMesh.position.x = wp.x;
    this.hoverMesh.position.z = wp.z;
    this.hoverMesh.material.color.setHex(buyable ? 0x44ffaa : 0xff4444);
    this.hoverMesh.material.opacity = buyable ? 0.35 : 0.25;
    this.hoverMesh.visible = true;
  }

  clearHover() {
    if (this.hoverMesh) this.hoverMesh.visible = false;
  }

  getOwnedGrassPositions() {
    const positions = [];
    for (let row = 0; row < GRID.ROWS; row++) {
      for (let col = 0; col < GRID.COLS; col++) {
        const tile = gameState.map[row][col];
        if (tile.owned && tile.type === 'grass' && !tile.isPasture && !tile.building) {
          positions.push({
            x: col * GRID.TILE_SIZE + GRID.TILE_SIZE / 2,
            z: row * GRID.TILE_SIZE + GRID.TILE_SIZE / 2,
          });
        }
      }
    }
    return positions;
  }

  getRegularTreePositions() {
    return this.trees
      .filter(t => !t.userData.isSakura && !t.userData.dimmed)
      .map(t => ({ x: t.position.x, z: t.position.z }));
  }
}
