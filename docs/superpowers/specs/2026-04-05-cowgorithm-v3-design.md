# COWGORITHM v3 Design Spec

## Overview

COWGORITHM v3 upgrades the 3D farm simulator with a dark cloudwave theme option, energy as a real strategic constraint, viewport-contained modals, local personal-best leaderboard, sakura trees with ambient world particles, and a rebuilt visual land system.

**Stack**: Vite + Three.js (vanilla JS). Single `index.html` with inline CSS. No backend.

**Aesthetic direction**: Hybrid cloudwave. Dark navy base, amber identity accent (Exhuman DNA), sakura pink secondary, soft cyan tertiary. Soft, dreamy, post-avant-garde internet. Not neon. Not aggressive. Like a cloudwave mix on SoundCloud.

---

## 1. Dual Theme System (Light + Dark)

### Requirement
Add dark mode as a toggle. Current beige FAWKEK theme stays as default. User can switch between them. Preference saved to localStorage.

### Dark Theme CSS Variables
```
--bg-base: #0a0f1a          (dark navy)
--bg-panel: #141e2e         (panel backgrounds)
--border: #1a2a3a           (panel borders)
--ink: #c0d0e0              (primary text, light slate)
--ink-muted: #607080        (secondary text)
--accent: #e6993a           (amber, Exhuman identity)
--accent-dim: rgba(230,153,58,0.12)
--accent-secondary: #f0b0c0 (sakura pink, section titles)
--accent-tertiary: #88c8e0  (soft cyan, tech/data)
--emerald: #88e0b0          (positive values)
--red: #e06060              (negative values, alerts)
--amber: #f0c060            (energy, warnings)
--cyan: #88c8e0             (data, AI elements)
--box-bg: rgba(20,30,46,0.6)
--grid-line: rgba(192,208,224,0.04)
```

### Light Theme (Current FAWKEK - unchanged)
All existing CSS variable values stay as-is. No modifications to the light theme.

### Theme Toggle
- Toggle button in top bar (next to Sound button): "LIGHT" / "DARK"
- Also available on title screen as a small toggle
- Applies `data-theme="dark"` attribute to `<html>` element
- CSS uses `[data-theme="dark"]` selector to override variables
- Preference stored in `localStorage.cowgorithm_theme`
- Loads saved preference on startup, defaults to light

### Resource Icon Visibility Fix
Both themes must have clearly readable resource icons in the top bar:
- Dark mode: MLK=`#a0d0ff`, WOL=`#d4c0a0`, EGG=`#ffd080`, PWR=`#f0c060`, DAT=`#88c8e0`
- Light mode: keep current colors but verify contrast ratio >4.5:1

### Title Screen
- Light: current beige grid
- Dark: dark navy grid, subtle ambient glow on "COWGORITHM" text (text-shadow with amber)

### 3D Viewport
The 3D canvas (`#canvas-wrap`) background is already dark in both themes. No change needed there. The sky/lighting is controlled by DayNightSystem and is independent of the UI theme.

---

## 2. Energy as Real Constraint

### Current Problem
Energy barely matters. Solar Array gives 15/day, animals cost 0.5/day each. One solar covers 30 animals. No tension.

### New Energy Model

**Building energy consumption (per game-day):**
| Building | Energy/day |
|----------|-----------|
| Pasture | 0 |
| Barn | 2 |
| Milking Station | 3 |
| Shearing Shed | 2 |
| Chicken Coop | 1 |
| Feed Silo | 1 |
| Solar Array | 0 (generator) |
| Drone Station | 5 |
| Vet Lab | 3 |
| AI Center | 8 |

**Animal energy consumption**: 0.5/day each (unchanged).

**Solar output**: 15/day base, modified by season:
- Spring: 15/day (1.0x)
- Summer: 18/day (1.2x)
- Fall: 13/day (0.85x)
- Winter: 10/day (0.67x)

**Starting energy pool**: 50 (down from 100). This is a buffer, not infinite supply.

**Energy deficit consequences (energy <= 0):**
- Buildings stop providing bonuses (milking station range bonus = 0, silo feed reduction = 0, etc.)
- Animal production drops 50%
- Cannot unlock new tech (tech tree buttons disabled with "LOW POWER" warning)
- Energy cannot go below -20 (hard floor, prevents death spiral)

**Energy warnings:**
- Energy bar in top bar changes color: normal = cyan, <30% capacity = amber, <10% = red pulsing
- Toast notification at 20%: "Energy reserves low. Build more Solar Arrays."
- Toast at 0%: "POWER FAILURE. Buildings offline."

**New tech: Smart Grid (Tier 2)**
- Cost: $12,000
- Requires: Solar Collars
- Effect: -25% building energy consumption
- Description: "Intelligent power distribution. Buildings use 25% less energy."

**Balance rationale:**
- Starting farm (3 cows, farmhouse): 1.5 energy/day from animals. Buffer of 50 lasts 33 days alone.
- First milking station adds 3/day = 4.5 total drain. Buffer lasts ~11 days. Urgency to build solar.
- One solar (15/day) covers: milking(3) + barn(2) + 10 animals(5) = 10 drain. Comfortable headroom.
- Mid-game with AI center(8) + drone(5) + 2x milking(6) + barn(2) + 20 animals(10) = 31 drain. Needs 2-3 solars.
- Late-game full buildout: ~50-60 drain. Needs 4+ solars, or Smart Grid tech to reduce.
- Winter squeeze: solar drops to 10/day, so a player comfortable in summer may hit deficit in winter. Forces seasonal planning.

---

## 3. Viewport-Contained Modals

### Decision Events
- Rendered inside `#canvas-wrap` as absolute-positioned elements
- Position: top-center of viewport, 20px from top
- Max-width: 320px
- Semi-transparent dark overlay only within the canvas area (not fullscreen)
- Game world continues rendering behind (dimmed ~40% opacity overlay on canvas only)
- Styled with the active theme's variables
- Close on choice selection (no X button needed - must choose)

### Tutorial Steps
- Same treatment: small cards inside viewport, not fullscreen overlays
- Overlay steps show as centered cards within canvas
- Action-gated steps show as top-anchored hint cards
- "Skip Tutorial" and "Next" buttons within the card

### Tech Tree Modal
- Stays as a larger overlay (needs space for the 12-card grid)
- Updates styling to match active theme
- No change to positioning

### Weather/Event Toasts
- Already positioned correctly (top-center fixed). No change needed.

---

## 4. Leaderboard (Local PB, Global-Ready)

### Win Condition
Completion of all 12 techs (triggers "Full Automation" milestone). The game-day count at that moment is the score. Lower = better.

### Data Shape
```js
{
  runId: crypto.randomUUID(),    // unique run identifier
  playerName: 'Anonymous',       // editable on win screen
  completionDay: 187,            // game-days to complete all tech
  completionSeason: 'Fall',      // season when completed
  date: '2026-04-05T21:30:00Z', // real-world timestamp
  version: 'v3',                 // game version for future compat
  hash: ''                       // reserved for future server validation
}
```

### localStorage
- Key: `cowgorithm_pb` - stores best (lowest day) completed run
- Key: `cowgorithm_runs` - stores array of all completed runs (max 20, oldest trimmed)

### UI
- **Title screen**: if PB exists, show "Personal Best: X days" below the tagline
- **Win screen**: new overlay on tech tree completion showing:
  - "FARM FULLY AUTOMATED" header
  - Completion day count (large, prominent)
  - "Personal Best: X days" comparison (green if new PB, neutral if not)
  - Name input field (for future global leaderboard)
  - "New Farm" button to restart
  - "Continue Playing" button to keep going
- **No global leaderboard yet** - data shape supports it, implementation deferred

### Speed Multiplier Note
Score counts game-days only. Real-time speed (1x, 2x, 5x, 10x) has no effect on the score. A player on 10x and a player on 1x reaching day 150 have the same score.

---

## 5. Sakura Trees + World Visuals

### Sakura Tree Variant
New function in `TreeFactory.js`: `createSakuraTree()`
- Rounder crown shape (SphereGeometry instead of ConeGeometry for foliage)
- Pink foliage color: random between `#f0b0c0` and `#e890a8`
- Same trunk as regular tree (brown cylinder)
- Same random scale variation (0.8 - 1.2)
- Seasonal color behavior:
  - Spring: pink (`#f0b0c0`)
  - Summer: green (same as regular trees)
  - Fall: orange-pink (`#e0a080`)
  - Winter: foliage shrunk to 30% scale with gray-white tint (`#c0c0c0`), simulating bare branches with frost

### Sakura Placement
- 30-40% of border trees (the ring around the farm) replaced with sakura variant
- Selection is random but consistent per session (seeded by a fixed offset)
- Trees that are sakura in Spring show seasonal colors in other seasons

### Sakura Petal Particles
New particle type in `ParticleSystem.js`:
- Active only in Spring season
- Small pink planes (PlaneGeometry 0.08x0.08) with random rotation
- Spawn from sakura tree positions, drift downward + sideways (wind effect)
- Gentle sine-wave horizontal drift
- Fade out near ground (y < 1)
- Spawn rate: ~2-3 per second total across all sakura trees
- Max active: 40 petals
- Color: `#f0b0c0` with 70% opacity

### Fireflies (Night)
- Active during night phase of visual day/night cycle (visualProgress 0.5-0.9)
- Small point lights or emissive spheres, yellow-green (`#c0e080`)
- Float in slow random paths above grass tiles (y: 1-3)
- Gentle pulse on opacity (sine wave)
- Max active: 20
- Spawn only over owned grass tiles

### Dust Particles (Animal Movement)
- When an animal moves (position changes between frames), spawn 2-3 tiny brown particles at foot level
- Color: `#d2b48c`, very small (0.03 radius)
- Quick lifetime: 0.4s
- Rise slightly then fade
- Only when animal is actually moving, not during idle bob

### Water Shimmer
- Water tiles get animated material: sine wave on opacity (0.6 - 0.8 range)
- Subtle color shift between two blues on a slow cycle
- Applied to existing water tile materials in `FarmGrid.js`

### Grass Sway
- Owned grass tiles get a subtle color animation: sine wave on green channel
- Very gentle: +/- 5% brightness variation
- Different phase per tile (based on tile position) so it looks like wind
- Applied during the render loop, not per-frame material creation

### Rebuilt Land Plots
**Current problem**: owned vs unowned tiles have harsh borders. Expanding land feels like painting squares.

**New approach:**
- All terrain tiles are always visible (grass, with darker/desaturated tint for unowned)
- Unowned tiles: same terrain mesh but `saturation * 0.3`, `brightness * 0.5`
- Owned tiles: full color, season-appropriate
- Border between owned and unowned: soft glow line (emissive edge, sakura pink in dark mode, cyan in light mode)
- Expanding "reveals" the tile - quick brighten animation (0.3s lerp from dim to full color)
- No grid lines visible on owned tiles (clean continuous terrain)
- Grid lines faintly visible on unowned tiles (shows purchasable grid)
- Trees on unowned land are dimmed/silhouetted versions

---

## 6. Expanded Tutorial

### Current: 8 Steps
Steps 1-8 remain as-is but with viewport-contained card rendering (Section 3).

### New Steps (inserted at appropriate points):

**Step 5.5: Energy Management** (after "Watch Production")
- Title: "Power Your Farm"
- Text: "Every building consumes energy. Watch the PWR bar in the top bar. Build Solar Arrays to generate power. If energy hits zero, buildings go offline."
- Type: overlay

**Step 6.5: Market Timing** (after "Sell Products")
- Title: "Watch the Market"
- Text: "Prices change daily. The /\ and \\/ arrows show trends. Sell when prices are rising. Fall season gives +30% sell prices."
- Type: overlay

**Step 7.5: Seasons** (after "Tech Tree")
- Title: "The Seasons"
- Text: "Every 30 game-days, the season changes. Spring boosts breeding. Summer is stable. Fall boosts prices. Winter is harsh - less production, higher feed, less solar power. Plan ahead."
- Type: overlay

**Step 8.5: Decision Events** (after "Your Journey Begins" - becomes step 11)
- Title: "Expect the Unexpected"
- Text: "Events appear in the viewport. Neighbors sell livestock, storms threaten, investors make offers. Choose wisely - every decision costs or saves days."
- Type: overlay

### Total: 12 tutorial steps

---

## 7. Files Changed

| File | Changes |
|------|---------|
| `index.html` | Dark theme CSS variables, `[data-theme="dark"]` overrides, theme toggle button, win screen overlay, decision modal moves inside canvas-wrap, tutorial card restyled |
| `src/core/Constants.js` | Building energy costs added to BUILDING_DEFS, Smart Grid added to TECH_DEFS, new tutorial steps, starting energy = 50 |
| `src/core/GameState.js` | Add `theme`, `personalBest`, `completionDay` fields |
| `src/systems/EconomySystem.js` | Building energy drain per day, energy deficit logic, seasonal solar modifier |
| `src/systems/DayNightSystem.js` | No changes (sky independent of UI theme) |
| `src/entities/TreeFactory.js` | Add `createSakuraTree()`, seasonal color updates for sakura variant |
| `src/entities/ParticleSystem.js` | Add sakura petal particles, firefly system, dust particles |
| `src/systems/FarmGrid.js` | Water shimmer animation, grass sway, rebuilt owned/unowned tile visuals, expansion animation |
| `src/ui/UIManager.js` | Theme toggle logic, energy warning states, win screen, PB display |
| `src/ui/DecisionModal.js` | Render inside canvas-wrap instead of fullscreen overlay |
| `src/ui/Tutorial.js` | Render inside canvas-wrap, add 4 new steps |
| `src/ui/TitleScreen.js` | Theme toggle, PB display, dark mode styling |
| `src/ui/TechModal.js` | Energy deficit "LOW POWER" disable state |
| `src/main.js` | Theme initialization, sakura tree placement, ambient particle orchestration, win detection + leaderboard save |

---

## 8. Out of Scope

- Global online leaderboard (deferred - data shape ready)
- Multiplayer
- New animal types
- New building types (except energy balance may warrant it later)
- Mobile/touch support
- Sound overhaul
- Save/load to cloud
