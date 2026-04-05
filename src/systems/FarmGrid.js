import * as THREE from 'three';
import { GRID, COLORS, SEASON_COLORS } from '../core/Constants.js';
import { gameState } from '../core/GameState.js';
import { createTree } from '../entities/TreeFactory.js';

export class FarmGrid {
  constructor(scene) {
    this.scene = scene;
    this.terrainMesh = null;
    this.trees = [];
    this.colorUpdateCounter = 0;
    this.currentSeason = 'spring';
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
    this.trees.forEach(t => this.scene.remove(t));
    this.trees = [];

    // Create terrain plane
    const width = GRID.COLS * GRID.TILE_SIZE;
    const depth = GRID.ROWS * GRID.TILE_SIZE;
    const geo = new THREE.PlaneGeometry(width, depth, GRID.COLS, GRID.ROWS);
    geo.rotateX(-Math.PI / 2); // Lay flat
    // Shift so tile [0,0] is at world origin corner
    geo.translate(width / 2, 0, depth / 2);

    // Enable vertex colors
    const colors = new Float32Array(geo.attributes.position.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    this.updateTerrainColors();
    this.placeTrees();
  }

  updateTerrainColors() {
    // Map vertex colors based on tile data
    // PlaneGeometry(w, h, segW, segH) creates (segW+1) x (segH+1) vertices
    // Each vertex at grid intersection - color based on nearest tile
    const geo = this.terrainMesh.geometry;
    const colorAttr = geo.attributes.color;
    const posAttr = geo.attributes.position;

    for (let i = 0; i < posAttr.count; i++) {
      const wx = posAttr.getX(i);
      const wz = posAttr.getZ(i);
      const col = Math.min(Math.max(Math.floor(wx / GRID.TILE_SIZE), 0), GRID.COLS - 1);
      const row = Math.min(Math.max(Math.floor(wz / GRID.TILE_SIZE), 0), GRID.ROWS - 1);
      const tile = gameState.map[row]?.[col];

      let r, g, b;
      if (!tile || tile.type === 'water') {
        // Blue water
        r = 0.13; g = 0.59; b = 0.95;
      } else if (tile.type === 'forest') {
        r = 0.11; g = 0.37; b = 0.13;
      } else {
        // Grass - shade by grassLevel and ownership, season-aware
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
        } else {
          r = 0.2; g = 0.25; b = 0.15;
          if (this.currentSeason === 'winter') { r = 0.35; g = 0.35; b = 0.33; }
          else if (this.currentSeason === 'fall') { r = 0.3; g = 0.25; b = 0.15; }
        }
      }

      colorAttr.setXYZ(i, r, g, b);
    }
    colorAttr.needsUpdate = true;
  }

  placeTrees() {
    for (let row = 0; row < GRID.ROWS; row++) {
      for (let col = 0; col < GRID.COLS; col++) {
        if (gameState.map[row][col].type === 'forest') {
          const tree = createTree();
          tree.position.set(
            col * GRID.TILE_SIZE + GRID.TILE_SIZE / 2,
            0,
            row * GRID.TILE_SIZE + GRID.TILE_SIZE / 2
          );
          this.scene.add(tree);
          this.trees.push(tree);
        }
      }
    }
  }

  updateTreeColors() {
    const foliageColors = {
      spring: 0x2d6a1e,
      summer: 0x3a7a28,
      fall:   0xc47a1a,
      winter: 0x6a6a60,
    };
    const color = foliageColors[this.currentSeason] || 0x2d6a1e;
    for (const tree of this.trees) {
      // children[1] is foliage cone (children[0] is trunk)
      if (tree.children[1]) {
        tree.children[1].material.color.setHex(color);
      }
    }
  }

  updateWater(elapsedTime) {
    // Animate water tile vertices with subtle Y wave
    const geo = this.terrainMesh.geometry;
    const posAttr = geo.attributes.position;

    for (let i = 0; i < posAttr.count; i++) {
      const wx = posAttr.getX(i);
      const wz = posAttr.getZ(i);
      const col = Math.min(Math.max(Math.floor(wx / GRID.TILE_SIZE), 0), GRID.COLS - 1);
      const row = Math.min(Math.max(Math.floor(wz / GRID.TILE_SIZE), 0), GRID.ROWS - 1);
      const tile = gameState.map[row]?.[col];

      if (tile && tile.type === 'water') {
        posAttr.setY(i, Math.sin(elapsedTime * 2 + wx + wz) * 0.08);
      }
    }
    posAttr.needsUpdate = true;
  }

  // Throttled color update (call every N frames, not every frame)
  maybeUpdateColors() {
    this.colorUpdateCounter++;
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
}
