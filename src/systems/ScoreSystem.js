// src/systems/ScoreSystem.js -- Scoring, checksums, and run data for leaderboard

import { gameState } from '../core/GameState.js';
import { SCORE_WEIGHTS, GRID, TECH_DEFS } from '../core/Constants.js';

const SALT = 'c0wg0r1thm_2026';
const GAME_VERSION = 'v3.1';

export function countBuildings() {
  let count = 0;
  for (let r = 0; r < GRID.ROWS; r++) {
    for (let c = 0; c < GRID.COLS; c++) {
      if (gameState.map[r][c].building) count++;
    }
  }
  return count;
}

export function computeMogulScore() {
  const w = SCORE_WEIGHTS;
  return Math.round(
    (gameState.totalEarnings * w.earnings)
    + (gameState.animals.length * w.animal)
    + (gameState.techs.length * w.tech)
    + (gameState.completedMilestones.length * w.milestone)
    + (gameState.completedQuests.length * w.quest)
    + (Math.min(gameState.money, w.cashCap) * w.cashRate)
    + (countBuildings() * w.building)
  );
}

export async function computeChecksum(runData) {
  const payload = [
    runData.completionDay || 0,
    runData.mogulScore || 0,
    runData.stats.totalEarnings,
    runData.stats.techsUnlocked,
    runData.stats.animalsOwned,
    Math.round(runData.stats.cashOnHand),
    SALT,
  ].join('|');

  const encoded = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function buildRunData(mode, playerName) {
  const stats = {
    totalEarnings: Math.round(gameState.totalEarnings),
    totalSpent: Math.round(gameState.totalSpent),
    animalsOwned: gameState.animals.length,
    techsUnlocked: gameState.techs.length,
    milestonesCompleted: gameState.completedMilestones.length,
    questsCompleted: gameState.completedQuests.length,
    buildingsOwned: countBuildings(),
    cashOnHand: Math.round(gameState.money),
  };

  return {
    runId: crypto.randomUUID(),
    playerName: playerName || 'Anonymous',
    mode,
    completionDay: mode === 'speedrun' ? gameState.completionDay : gameState.day,
    mogulScore: mode === 'mogul' ? computeMogulScore() : 0,
    stats,
    date: new Date().toISOString(),
    version: GAME_VERSION,
    checksum: '', // filled async after build
  };
}

export async function submitRun(runData) {
  runData.checksum = await computeChecksum(runData);

  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.error || 'Submission failed' };
    }
    const data = await res.json();
    return { ok: true, rank: data.rank };
  } catch (e) {
    return { ok: false, error: 'Network error' };
  }
}

export async function fetchLeaderboard(mode, limit = 50) {
  try {
    const res = await fetch(`/api/leaderboard?mode=${mode}&limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.entries || [];
  } catch (e) {
    return [];
  }
}
