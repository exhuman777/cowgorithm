// src/core/Constants.js

export const GRID = { COLS: 32, ROWS: 20, TILE_SIZE: 2 };
export const GAME = { DAY_TICKS: 600, FOV: 50, NEAR: 0.1, FAR: 500, MAX_DELTA: 0.05 };

export const CAMERA = {
  HEIGHT: 30, DISTANCE: 35,
  MIN_DISTANCE: 15, MAX_DISTANCE: 60,
  TARGET_X: 32, TARGET_Y: 0, TARGET_Z: 20,
  MIN_POLAR: 0.3, MAX_POLAR: 1.2,
};

export const COLORS = {
  SKY: 0x87ceeb, SKY_NIGHT: 0x0a1628, SKY_SUNSET: 0xff7b54,
  AMBIENT: 0xffffff, AMBIENT_INTENSITY: 0.5,
  DIR_LIGHT: 0xffffff, DIR_INTENSITY: 0.8,
  GRASS: 0x4a7c2e, GRASS_DRY: 0x8a7a3a, WATER: 0x2196f3,
  FOREST: 0x1b5e20, OWNED_BORDER: 0x06b6d4,
  UNOWNED: 0x3a3a3a,
};

export const SEASON_NAMES = ['Spring', 'Summer', 'Fall', 'Winter'];
export const SEASON_DURATION = 30; // game-days per season

export const SEASON_COLORS = {
  spring: { grass: [0.29, 0.55, 0.18], sky: 0x8ecae6, sunset: 0xff9eb5, forest: [0.11, 0.40, 0.13] },
  summer: { grass: [0.48, 0.60, 0.23], sky: 0x87ceeb, sunset: 0xff7b54, forest: [0.13, 0.42, 0.15] },
  fall:   { grass: [0.54, 0.42, 0.17], sky: 0x7ba7bc, sunset: 0xc44536, forest: [0.45, 0.30, 0.12] },
  winter: { grass: [0.55, 0.55, 0.50], sky: 0xb0c4d8, sunset: 0x8a7fa0, forest: [0.30, 0.30, 0.28] },
};

export const SEASON_EFFECTS = {
  spring: { prodMod: 1.2, feedMod: 1.0, priceMod: 1.0, breedMod: 2.0 },
  summer: { prodMod: 1.0, feedMod: 1.0, priceMod: 1.0, breedMod: 1.0 },
  fall:   { prodMod: 1.0, feedMod: 1.0, priceMod: 1.3, breedMod: 1.0 },
  winter: { prodMod: 0.7, feedMod: 1.5, priceMod: 1.0, breedMod: 0.0 },
};

export const SOLAR_SEASON_MOD = {
  spring: 1.0,
  summer: 1.2,
  fall: 0.85,
  winter: 0.67,
};

export function getSeason(day) {
  const idx = Math.floor(((day - 1) % (SEASON_DURATION * 4)) / SEASON_DURATION);
  return ['spring', 'summer', 'fall', 'winter'][idx];
}

export function getSeasonProgress(day) {
  return ((day - 1) % SEASON_DURATION) / SEASON_DURATION;
}

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
  koi_pond: { name: 'Koi Pond', cost: 8000, color: 0x9e7c4a, desc: 'Fish farm on water. Produces 2 fish/day.', energyCost: 1, range: 0, bonusType: null, bonusAmt: 0 },
};

export const ANIMAL_DEFS = {
  cow:     { name: 'Dairy Cow', cost: 1500, product: 'milk', prodAmt: 1, prodValue: 15, feedCost: 3, housing: 'barn', sellValue: 800, color: 0xffffff },
  beef:    { name: 'Beef Cattle', cost: 1200, product: 'meat', prodAmt: 0, prodValue: 0, feedCost: 2.5, housing: 'barn', maturityDays: 60, matureValue: 3000, sellValue: 600, color: 0x8b4513 },
  sheep:   { name: 'Sheep', cost: 300, product: 'wool', prodAmt: 1, prodValue: 7, feedCost: 1, housing: 'barn', sellValue: 150, color: 0xf5f5f5 },
  goat:    { name: 'Goat', cost: 250, product: 'milk', prodAmt: 1, prodValue: 5, feedCost: 1, housing: 'barn', sellValue: 120, color: 0xd2b48c },
  chicken: { name: 'Chicken', cost: 20, product: 'eggs', prodAmt: 1, prodValue: 2, feedCost: 0.2, housing: 'coop', sellValue: 5, color: 0xffd700 },
};

export const ANIMAL_NAMES = {
  cow: ['Bessie','Daisy','Buttercup','Clover','Rosie','Maggie','Dolly','Luna','Stella','Flora','Ginger','Honey','Maple','Willow','Pearl','Ruby','Sage','Ivy','Fern','Hazel'],
  beef: ['Angus','Brutus','Tank','Duke','Rex','Hank','Atlas','Thor','Bruno','Chuck','Bison','Rocky','Blaze','Diesel','Maximus','Goliath','Bear','Titan','Maverick','Storm'],
  sheep: ['Woolly','Cotton','Cloud','Misty','Snowball','Fluffy','Lamb','Blossom','Pebble','Marshmallow','Fuzzy','Nimbus','Fleece','Cashmere','Silk','Velvet','Dusty','Windy','Breeze','Dawn'],
  goat: ['Billy','Nanny','Pepper','Gizmo','Ziggy','Scout','Bandit','Bramble','Thistle','Clementine','Patches','Tango','Whiskers','Juniper','Acorn','Basil','Cinnamon','Nutmeg','Wren','Pip'],
  chicken: ['Nugget','Henrietta','Clucky','Eggbert','Pecky','Feathers','Goldie','Sunny','Yolko','Scramble','Omelet','Popcorn','Ginger','Speckle','Dottie','Henny','Rosie','Cocoa','Biscuit','Maple'],
};

export const TECH_DEFS = [
  { id: 'gps', name: 'GPS Tracking', tier: 1, cost: 5000, desc: 'Track animal positions. +10% production.', effect: { prodBonus: 0.1 } },
  { id: 'health_mon', name: 'Health Monitor', tier: 1, cost: 5000, desc: 'Early disease alerts. -25% disease chance.', effect: { diseaseReduce: 0.25 } },
  { id: 'solar_collar', name: 'Solar Collars', tier: 1, cost: 5000, desc: 'Self-charging collars. -30% energy costs.', effect: { energySave: 0.3 } },
  { id: 'virtual_fence', name: 'Virtual Fencing', tier: 2, cost: 15000, desc: 'AI-guided boundaries. +15% pasture efficiency.', effect: { grassBonus: 0.15 }, requires: ['gps', 'health_mon'] },
  { id: 'fertility_ai', name: 'Fertility AI', tier: 2, cost: 15000, desc: 'Breed optimization. New animals every 30 days.', effect: { breeding: true }, requires: ['health_mon'] },
  { id: 'drone_scout', name: 'Drone Scouting', tier: 2, cost: 15000, desc: 'Aerial monitoring. +20% grass regrowth.', effect: { grassRegrow: 0.2 }, requires: ['gps', 'solar_collar'] },
  { id: 'smart_grid', name: 'Smart Grid', tier: 2, cost: 12000, desc: 'Intelligent power distribution. Buildings use 25% less energy.', effect: { buildingEnergySave: 0.25 }, requires: ['solar_collar'] },
  { id: 'cowgorithm_v1', name: 'CowGorithm v1', tier: 3, cost: 35000, desc: 'Herd route optimization. +25% all production.', effect: { prodBonus: 0.25 }, requires: ['virtual_fence', 'drone_scout'], needsAI: true },
  { id: 'pred_vet', name: 'Predictive Vet AI', tier: 3, cost: 35000, desc: 'ML disease prediction. -60% disease, auto-treat.', effect: { diseaseReduce: 0.6, autoHeal: 1 }, requires: ['virtual_fence', 'fertility_ai'], needsAI: true },
  { id: 'auto_robots', name: 'Farm Robots', tier: 3, cost: 35000, desc: 'Autonomous feeding. -50% feed costs.', effect: { feedSave: 0.5 }, requires: ['drone_scout'], needsAI: true },
  { id: 'cowgorithm_v2', name: 'CowGorithm v2', tier: 4, cost: 75000, desc: 'Full herd AI. +50% all production.', effect: { prodBonus: 0.5 }, requires: ['cowgorithm_v1', 'pred_vet'], needsAI: true },
  { id: 'vertical_farm', name: 'Vertical Feed Farm', tier: 4, cost: 75000, desc: 'Indoor AI farming. Feed cost = zero.', effect: { feedSave: 1 }, requires: ['auto_robots', 'pred_vet'], needsAI: true },
  { id: 'carbon', name: 'Carbon Credits', tier: 4, cost: 75000, desc: 'Sustainability cert. +$750/day.', effect: { dailyBonus: 750 }, requires: ['cowgorithm_v2', 'vertical_farm'], needsAI: true },
];

export const QUESTS = [
  { id: 'q1', text: 'Place a Milking Station near your cows', reward: 2000, hint: 'Click "Milking Station" ($8,000) in left panel, then click a green tile near your cows' },
  { id: 'q2', text: 'Sell your milk products for cash', reward: 1000, hint: 'Wait for cows to produce milk, then press S or click "Sell Products"' },
  { id: 'q3', text: 'Grow your herd to 5 Dairy Cows', reward: 1500, hint: 'Click "Dairy Cow" ($1,500) in left panel' },
  { id: 'q4', text: 'Build a Solar Array for energy', reward: 2000, hint: 'Click "Solar Array" ($10,000) in left panel, place on owned land' },
  { id: 'q5', text: 'Open Tech Tree (T) and unlock GPS Tracking', reward: 2000, hint: 'Press T to open Tech Tree. GPS Tracking is $5,000, Tier 1' },
  { id: 'q6', text: 'Program a cow: click it, then Send to Milk', reward: 2000, hint: 'Click a cow. In right panel, click "Send to Milk". Then click your milking station' },
  { id: 'q7', text: 'Unlock Health Monitor in Tech Tree', reward: 1500, hint: 'Press T. Health Monitor is $5,000, Tier 1' },
  { id: 'q8', text: 'Unlock Solar Collars in Tech Tree', reward: 1500, hint: 'Press T. Solar Collars is $5,000, Tier 1' },
  { id: 'q9', text: 'Diversify! Buy Sheep, Goats, or Chickens', reward: 1000, hint: 'Click Sheep ($300) or Chicken ($20). Chickens need a Coop ($3,000)' },
  { id: 'q10', text: 'Build a Koi Pond on water', reward: 2000, hint: 'Click "Koi Pond" ($8,000) and place it on a water tile' },
  { id: 'q11', text: 'Sell fish at the market', reward: 1500, hint: 'Wait for koi ponds to produce fish, then press S or click "Sell Products"' },
  { id: 'q12', text: 'Survive your first winter (day 31+)', reward: 3000, hint: 'Keep your farm running through the first full season cycle' },
  { id: 'q13', text: 'Take and repay a loan', reward: 2500, hint: 'Click "Take Loan" then pay it back when you have enough cash' },
  { id: 'q14', text: 'Breed your first animal', reward: 2000, hint: 'Unlock Fertility AI in the Tech Tree to enable automatic breeding' },
  { id: 'q15', text: 'Raise Beef Cattle to maturity', reward: 3000, hint: 'Buy Beef Cattle ($1,200) and wait 60 days for it to mature' },
  { id: 'q16', text: 'Own 3+ different building types', reward: 1500, hint: 'Build different structures like Barn, Milking Station, Solar Array, etc.' },
  { id: 'q17', text: 'Earn $25,000 total', reward: 3000, hint: 'Keep selling products and completing quests to grow your earnings' },
  { id: 'q18', text: 'Build an AI Command Center ($25,000)', reward: 5000, hint: 'Save up $25,000. AI Center unlocks Tier 3+ tech' },
  { id: 'q19', text: 'Unlock CowGorithm v1 for auto-management', reward: 10000, hint: 'Requires Virtual Fencing + Drone Scouting + AI Center' },
  { id: 'q20', text: 'Reach 20 animals and unlock ALL 13 techs', reward: 50000, hint: 'Build barns/coops, buy animals, unlock remaining techs' },
];

export const MILESTONES = [
  { id: 'm1', name: 'First Herd', desc: 'Own 10 animals', target: 10, reward: '$2,000', rewardMoney: 2000 },
  { id: 'm2', name: 'Tech Pioneer', desc: 'Unlock 3 techs', target: 3, reward: '+5 energy/day', rewardEnergy: 5 },
  { id: 'm3', name: 'Big Ranch', desc: 'Own 150 land tiles', target: 150, reward: '$5,000', rewardMoney: 5000 },
  { id: 'm4', name: 'CowGorithm Online', desc: 'Unlock CowGorithm v1', target: 1, reward: 'Free drone', rewardFreeDrone: true },
  { id: 'm5', name: '$50K Club', desc: 'Earn $50,000 total', target: 50000, reward: '$10,000', rewardMoney: 10000 },
  { id: 'm6', name: 'Zoo Keeper', desc: 'Own all 5 animal types', target: 5, reward: '$3,000', rewardMoney: 3000 },
  { id: 'm7', name: 'Solar Empire', desc: 'Build 3 solar arrays', target: 3, reward: '+20 energy/day', rewardEnergy: 20 },
  { id: 'm8', name: 'Full Automation', desc: 'Unlock all 13 techs', target: 13, reward: 'You WIN!', rewardWin: true },
  { id: 'm9', name: 'Fish Farmer', desc: 'Sell 50+ fish', target: 50, reward: '$3,000', rewardMoney: 3000 },
  { id: 'm10', name: 'Debt Free', desc: 'Repay a loan', target: 1, reward: '$2,000', rewardMoney: 2000 },
  { id: 'm11', name: 'Cattle Baron', desc: 'Own 25 animals', target: 25, reward: '$5,000', rewardMoney: 5000 },
  { id: 'm12', name: 'Market Master', desc: 'Earn $100K from sales', target: 100000, reward: '$15,000', rewardMoney: 15000 },
  { id: 'm13', name: 'Seasonal Survivor', desc: 'Survive 4 full seasons', target: 121, reward: '+10 energy/day', rewardEnergy: 10 },
];

export const WEATHER_EVENTS = [
  { name: 'Sunny Day', prob: 0.07, seasonBoost: { summer: 2 }, msg: 'Perfect weather! Grass grows 2x today.' },
  { name: 'Rain Storm', prob: 0.05, seasonBoost: { spring: 2 }, msg: 'Heavy rain. Grass 3x, production -20%.' },
  { name: 'Market Boom', prob: 0.05, seasonBoost: { fall: 2 }, msg: 'Prices up! +30% sell prices today.' },
  { name: 'Disease', prob: 0.035, seasonBoost: { winter: 2 }, msg: 'Disease outbreak!' },
  { name: 'Premium Buyer', prob: 0.04, seasonBoost: {}, msg: 'Buyer offers +50% premium!' },
  { name: 'Drought', prob: 0.025, seasonBoost: { summer: 3 }, msg: 'Drought. Grass regrowth halved.' },
  { name: 'Gov Subsidy', prob: 0.03, seasonBoost: {}, msg: 'Government farming subsidy! +$3,000.' },
  { name: 'Tech Grant', prob: 0.025, seasonBoost: {}, msg: 'AI research grant! Next tech 50% off.' },
  { name: 'Festival', prob: 0.04, seasonBoost: { fall: 3 }, msg: 'Local farm festival! Animal happiness +20.' },
  { name: 'Predator Alert', prob: 0.03, seasonBoost: {}, msg: 'Predator spotted! Chickens stressed.' },
  { name: 'Pest Infestation', prob: 0.03, seasonBoost: { summer: 2 }, msg: 'Pests! Chickens stop producing for 3 days.', duration: 3, effect: 'pestBlock' },
  { name: 'Equipment Failure', prob: 0.02, seasonBoost: {}, msg: 'Equipment malfunction! A building is disabled for 2 days.', duration: 2, effect: 'buildingDisable' },
  { name: 'Market Crash', prob: 0.02, seasonBoost: {}, msg: 'Market crash! One product -50% for 5 days.', duration: 5, effect: 'marketCrash' },
  { name: 'Frost', prob: 0.03, seasonBoost: { winter: 10 }, seasonOnly: 'winter', msg: 'Frost! Grass stops growing for 3 days.', duration: 3, effect: 'frostBlock' },
  { name: 'Stampede', prob: 0.02, seasonBoost: { spring: 2 }, msg: 'Stampede! Some chickens were lost.' },
  { name: 'Traveling Merchant', prob: 0.03, seasonBoost: {}, msg: 'A traveling merchant offers animals at 50% off today!', duration: 1, effect: 'merchantDiscount' },
  { name: 'Celebrity Endorsement', prob: 0.02, seasonBoost: {}, msg: 'Celebrity endorsement! One product sells at 3x for 2 days.', duration: 2, effect: 'celebrityBoost' },
  { name: 'Perfect Weather', prob: 0.02, seasonBoost: { spring: 2 }, msg: 'Perfect weather streak! +50% production for 3 days.', duration: 3, effect: 'perfectWeather' },
  { name: 'Golden Calf', prob: 0.005, seasonBoost: {}, msg: 'A golden calf was born on your farm! 2x production permanently.' },
  { name: 'Meteor Shower', prob: 0.01, seasonBoost: {}, msg: 'Meteor shower draws tourists! +$5,000.' },
  { name: 'Locusts', prob: 0.02, seasonBoost: { summer: 3 }, msg: 'Locust swarm! Grass regrowth halved for 3 days.', duration: 3, effect: 'locusts' },
  { name: 'Rainbow', prob: 0.03, seasonBoost: { spring: 2 }, msg: 'A rainbow appears! All animals +15 happiness.' },
  { name: 'Heat Wave', prob: 0.025, seasonBoost: { summer: 3 }, msg: 'Heat wave! Animals stressed, but fish thrive.', duration: 2, effect: 'heatWave' },
  { name: 'Blizzard', prob: 0.02, seasonBoost: { winter: 5 }, seasonOnly: 'winter', msg: 'Blizzard! Energy drain 2x, animals suffer.', duration: 3, effect: 'blizzard' },
  { name: 'Harvest Moon', prob: 0.03, seasonBoost: { fall: 3 }, msg: 'Harvest moon! All production +30% for 2 days.', duration: 2, effect: 'harvestMoon' },
  { name: 'Animal Escape', prob: 0.02, seasonBoost: {}, msg: 'An animal escaped the farm!' },
  { name: 'Tax Audit', prob: 0.015, seasonBoost: {}, msg: 'Tax audit! Pay 5% of your cash.' },
];

export const DECISION_EVENTS = [
  { id: 'neighbor_sale', title: 'Neighbor Selling Livestock', desc: '5 sheep at 40% off. Total: $900.', options: [{ label: 'Buy ($900)', cost: 900, reward: 'sheep5' }, { label: 'Decline' }] },
  { id: 'storm_warning', title: 'Storm Warning', desc: 'Reinforce your barn for $2,000 or risk building damage.', options: [{ label: 'Reinforce ($2,000)', cost: 2000, reward: 'stormProtect' }, { label: 'Risk It' }] },
  { id: 'investor_offer', title: 'Investor Offer', desc: 'Sell all milk at fixed $12/unit for 30 days.', options: [{ label: 'Accept Contract', reward: 'milkContract' }, { label: 'Decline' }] },
  { id: 'land_auction', title: 'Land Auction', desc: 'Prime 4x4 plot for $3,000.', options: [{ label: 'Buy ($3,000)', cost: 3000, reward: 'landPlot' }, { label: 'Pass' }] },
  { id: 'research_deal', title: 'Research Partnership', desc: 'Share data for $5,000 or keep for +10% tech speed.', options: [{ label: 'Sell Data ($5,000)', reward: 'dataSell' }, { label: 'Keep (+10% tech)', reward: 'techSpeed' }] },
  { id: 'rival_farm', title: 'Rival Farm', desc: 'A rival farm is expanding. Compete or cooperate?', options: [{ label: 'Pay $5K to compete', cost: 5000, reward: 'rivalCompete' }, { label: 'Cooperate', reward: 'rivalCooperate' }] },
  { id: 'insurance', title: 'Farm Insurance', desc: 'Insure your farm against the next disaster for $3,000.', options: [{ label: 'Buy Insurance ($3K)', cost: 3000, reward: 'insurance' }, { label: 'Decline' }] },
  { id: 'genetic_lab', title: 'Genetic Lab', desc: 'A lab offers permanent +15% animal production for $8,000.', options: [{ label: 'Invest ($8K)', cost: 8000, reward: 'geneticLab' }, { label: 'Decline' }] },
  { id: 'water_rights', title: 'Water Rights', desc: 'Buy water rights to unlock koi tiles.', options: [{ label: 'Full rights ($4K, 4 tiles)', cost: 4000, reward: 'waterFull' }, { label: 'Negotiate ($1.5K, 2 tiles)', cost: 1500, reward: 'waterPartial' }] },
  { id: 'apprentice', title: 'Hire Apprentice', desc: 'Hire help for 20 days: auto-heal sick animals + 10% production.', options: [{ label: 'Hire ($10K total)', cost: 10000, reward: 'apprentice' }, { label: 'Decline' }] },
  { id: 'black_market', title: 'Black Market', desc: 'Sell products at 2x now, but -10% prices for 30 days. Or report for a bonus.', options: [{ label: 'Sell (2x now, -10% later)', reward: 'blackMarketSell' }, { label: 'Report (+$2K, +5% prices)', reward: 'blackMarketReport' }] },
  { id: 'crop_rotation', title: 'Crop Rotation', desc: 'Invest $2,000 in crop rotation for +30% grass regrowth for 30 days.', options: [{ label: 'Invest ($2K)', cost: 2000, reward: 'cropRotation' }, { label: 'Decline' }] },
];

export const TUTORIAL_STEPS = [
  { title: 'Welcome, Farmer', text: 'You inherited a small farm with 3 dairy cows and $15,000.\n\nYour goal: build the world\'s most advanced AI-powered farm.\n\nFollow this walkthrough to learn the basics.', type: 'overlay' },
  { title: 'Your Resources', text: 'The top bar shows your resources:\n$ = Cash | MLK = Milk | WOL = Wool | EGG = Eggs | FSH = Fish\nPWR = Energy | DAT = AI Data\n\nEverything runs on cash. Produce goods, sell them, invest.', type: 'overlay', highlight: '#top-bar' },
  { title: 'Meet Your Cows', text: 'Click on one of your cows in the 3D view to see its stats.\n\nEach animal has health, happiness, and production rate.', type: 'action', waitFor: 'animalSelected' },
  { title: 'Build a Milking Station', text: 'Click "Milking Station" in the left panel, then click a green tile near your cows.\n\nThis boosts milk production +50% for nearby cows.', type: 'action', waitFor: 'buildingPlaced', highlightBtn: '[data-build="milking"]' },
  { title: 'Watch Production', text: 'Your cows are now producing milk faster.\nWatch the floating numbers above them.\n\nLet a few days pass to accumulate milk.', type: 'overlay' },
  { title: 'Power Your Farm', text: 'Every building consumes energy. Watch the PWR bar in the top bar.\n\nBuild Solar Arrays to generate power. If energy hits zero, buildings go offline.', type: 'overlay' },
  { title: 'Sell Products', text: 'Press S or click "Sell Products" to convert your milk into cash.\n\nMarket prices change daily. Sell when prices are high.', type: 'action', waitFor: 'productsSold', highlightBtn: '.action-btn.sell-btn' },
  { title: 'Watch the Market', text: 'Prices change daily. The /\\ and \\/ arrows show trends.\n\nSell when prices are rising. Fall season gives +30% sell prices.', type: 'overlay' },
  { title: 'Tech Tree', text: 'Press T to open the Technology Tree.\n\nThis is your path from basic farming to full AI automation.\nStart with Tier 1: GPS Tracking, Health Monitor.', type: 'action', waitFor: 'techOpened' },
  { title: 'The Seasons', text: 'Every 30 game-days, the season changes.\n\nSpring boosts breeding. Summer is stable. Fall boosts prices. Winter is harsh - less production, higher feed, less solar power. Plan ahead.', type: 'overlay' },
  { title: 'Your Journey Begins', text: 'Follow the quest bar at the top for guidance.\n\nSpring > Summer > Fall > Winter\nEach season brings new challenges and opportunities.\n\nGood luck, farmer.', type: 'overlay' },
  { title: 'Expect the Unexpected', text: 'Events appear in the viewport. Neighbors sell livestock, storms threaten, investors make offers.\n\nChoose wisely - every decision costs or saves days.', type: 'overlay' },
];
