// api/leaderboard.js -- Vercel serverless function for leaderboard
// Uses Vercel KV (Redis). Set KV_REST_API_URL and KV_REST_API_TOKEN in Vercel env.
// Falls back to in-memory storage for local dev.

const SALT = 'c0wg0r1thm_2026';
const MAX_ENTRIES = 100;

// Rate limiting: simple per-IP tracking
const rateLimits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const last = rateLimits.get(ip) || 0;
  if (now - last < 30000) return true;
  rateLimits.set(ip, now);
  // Cleanup old entries periodically
  if (rateLimits.size > 1000) {
    for (const [k, v] of rateLimits) {
      if (now - v > 60000) rateLimits.delete(k);
    }
  }
  return false;
}

// Sanity checks
function validateRun(run) {
  if (!run || typeof run !== 'object') return 'Invalid data';
  if (!run.mode || !['speedrun', 'mogul'].includes(run.mode)) return 'Invalid mode';
  if (!run.checksum || typeof run.checksum !== 'string') return 'Missing checksum';
  if (!run.playerName || typeof run.playerName !== 'string') return 'Missing name';
  if (run.playerName.length > 20) return 'Name too long';

  if (run.mode === 'speedrun') {
    if (!run.completionDay || run.completionDay < 50) return 'Impossible speedrun time';
    if (run.completionDay > 10000) return 'Suspicious run length';
  }

  if (run.mode === 'mogul') {
    if (typeof run.mogulScore !== 'number' || run.mogulScore < 0) return 'Invalid mogul score';
    if (run.mogulScore > 200000) return 'Suspicious mogul score';
  }

  if (run.stats) {
    if (run.stats.totalEarnings > 5000000) return 'Suspicious earnings';
    if (run.stats.animalsOwned > 200) return 'Suspicious animal count';
  }

  return null;
}

// Verify checksum
async function verifyChecksum(run) {
  const payload = [
    run.completionDay || 0,
    run.mogulScore || 0,
    run.stats?.totalEarnings || 0,
    run.stats?.techsUnlocked || 0,
    run.stats?.animalsOwned || 0,
    Math.round(run.stats?.cashOnHand || 0),
    SALT,
  ].join('|');

  const encoded = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expected = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === run.checksum;
}

// KV helpers (Vercel KV REST API)
async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const res = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return;

  await fetch(`${url}/set/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(JSON.stringify(value)),
  });
}

// In-memory fallback for local dev
const memStore = { speedrun: [], mogul: [] };

async function getEntries(mode) {
  const kvData = await kvGet(`leaderboard:${mode}`);
  if (kvData) return kvData;
  return memStore[mode] || [];
}

async function setEntries(mode, entries) {
  memStore[mode] = entries;
  await kvSet(`leaderboard:${mode}`, entries);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: fetch leaderboard
  if (req.method === 'GET') {
    const mode = req.query.mode || 'speedrun';
    const limit = Math.min(parseInt(req.query.limit) || 50, MAX_ENTRIES);

    if (!['speedrun', 'mogul'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode' });
    }

    const entries = await getEntries(mode);
    return res.status(200).json({ entries: entries.slice(0, limit) });
  }

  // POST: submit run
  if (req.method === 'POST') {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Rate limited. Wait 30 seconds.' });
    }

    const run = req.body;
    const validationError = validateRun(run);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const checksumValid = await verifyChecksum(run);
    if (!checksumValid) {
      return res.status(400).json({ error: 'Invalid checksum' });
    }

    // Store entry
    const entry = {
      runId: run.runId,
      playerName: run.playerName.slice(0, 20),
      completionDay: run.completionDay,
      mogulScore: run.mogulScore || 0,
      stats: run.stats,
      date: run.date,
      version: run.version,
    };

    const entries = await getEntries(run.mode);
    entries.push(entry);

    // Sort: speedrun ascending (fewer days = better), mogul descending (higher score = better)
    if (run.mode === 'speedrun') {
      entries.sort((a, b) => a.completionDay - b.completionDay);
    } else {
      entries.sort((a, b) => b.mogulScore - a.mogulScore);
    }

    // Trim to max
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;

    await setEntries(run.mode, entries);

    // Find rank
    const rank = entries.findIndex(e => e.runId === run.runId) + 1;

    return res.status(200).json({ ok: true, rank });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
