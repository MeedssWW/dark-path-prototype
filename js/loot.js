import { rarities, slots, itemTypes, statLabels, percentStats } from "./data.js";
import { state, addLog, updateEpicStat, rerollCost } from "./state.js";

export function rollItemType(slotKey) {
  const pool = itemTypes[slotKey];
  if (!pool)
    return {
      key: slotKey,
      name: slots.find((slot) => slot.key === slotKey)?.name.toLowerCase() || "предмет",
      visual: slotKey,
    };
  return pool[Math.floor(Math.random() * pool.length)];
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function statRoll(stat, power, major) {
  const scale = major ? 1 : 0.55;
  if (stat === "damage") return round1((5 + power * 3.8) * scale);
  if (stat === "health") return Math.round((24 + power * 18) * scale);
  if (stat === "armor") return round1((2 + power * 1.3) * scale);
  if (stat === "accuracy") return round3((0.018 + power * 0.006) * scale);
  if (stat === "combo") return round3((0.018 + power * 0.008) * scale);
  if (stat === "crit") return round3((0.016 + power * 0.008) * scale);
  if (stat === "evasion") return round3((0.012 + power * 0.006) * scale);
  if (stat === "lifeSteal") return round3((0.008 + power * 0.004) * scale);
  if (stat === "bleed") return round3((0.014 + power * 0.008) * scale);
  return round1(power * scale);
}

function nameSuffix() {
  const names = ["тумана", "костей", "клятвы", "сумрака", "пепла", "стража", "проклятия", "звезды"];
  return names[Math.floor(Math.random() * names.length)];
}

export function getDropWeights(sector) {
  const progress = Math.max(0, sector - 1);
  const raw = rarities.map((rarity, index) => {
    if (index === 0) return Math.max(12, 78 - progress * 1.4);
    const unlock = index * 4;
    const growth = Math.max(0, progress - unlock);
    return Math.pow(growth + 1, 1.55) / Math.pow(index + 1, 1.85);
  });
  return raw.map((weight, index) => ({ rarity: rarities[index], weight }));
}

function rollRarity(sector, bonusLuck = 0, lootBias = null) {
  const weights = getDropWeights(sector + bonusLuck * 8);
  if (lootBias === "heaven") {
    weights.forEach((w, i) => {
      if (i >= 3) w.weight *= 1.35;
    });
  }
  if (lootBias === "hell") {
    weights.forEach((w, i) => {
      if (w.rarity.key === "rare" || w.rarity.key === "epic") w.weight *= 1.2;
      if (i >= 5) w.weight *= 1.25;
    });
  }
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weights) {
    roll -= item.weight;
    if (roll <= 0) return item.rarity;
  }
  return rarities[0];
}

export function generateLoot(forceBoss = false, bonusLuck = 0, lootBias = null) {
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const type = rollItemType(slot.key);
  const rarity = rollRarity(state.sector + (forceBoss ? 18 : 0), bonusLuck, lootBias);
  
  const baseLevel = state.sector * 10;
  const levelVariance = Math.floor(Math.random() * 5);
  const itemLevel = Math.max(1, baseLevel + levelVariance);
  
  const power = rarity.power * (itemLevel / 10 + 1) * (forceBoss ? 1.25 : 1);
  
  const item = {
    id: crypto.randomUUID(),
    slot: slot.key,
    slotName: slot.name,
    type,
    rarity,
    level: itemLevel,
    name: `${rarity.name} ${type.name} ${nameSuffix()}`,
    value: Math.round(rarity.value * (itemLevel / 5 + 1)),
    stats: {},
  };
  
  const allStats = ["damage", "health", "armor", "accuracy", "combo", "crit", "evasion", "lifeSteal", "bleed"];
  const chosenStats = [];
  
  // First pick slot-specific stats
  for (const s of slot.stats) {
    if (chosenStats.length < rarity.stats) {
      chosenStats.push(s);
    }
  }
  
  // If we need more stats, pick from the remaining pool
  const remainingPool = allStats.filter(s => !chosenStats.includes(s));
  while (chosenStats.length < rarity.stats && remainingPool.length > 0) {
    const idx = Math.floor(Math.random() * remainingPool.length);
    chosenStats.push(remainingPool[idx]);
    remainingPool.splice(idx, 1);
  }
  
  chosenStats.forEach((stat, index) => {
    const isMajor = index === 0; // First stat is major
    item.stats[stat] = statRoll(stat, power, isMajor);
  });
  
  return item;
}

export function itemScore(item) {
  if (!item) return 0;
  return Object.entries(item.stats).reduce((score, [key, value]) => {
    if (key === "damage") return score + value * 5;
    if (key === "health") return score + value * 0.45;
    if (key === "armor") return score + value * 4.4;
    if (key === "accuracy") return score + value * 170;
    if (key === "combo") return score + value * 220;
    if (key === "crit") return score + value * 210;
    if (key === "evasion") return score + value * 230;
    if (key === "lifeSteal") return score + value * 260;
    if (key === "bleed") return score + value * 190;
    return score + value;
  }, item.rarity.power * 4);
}

export function formatStatValue(key, value, signed = false) {
  const sign = signed && value > 0 ? "+" : "";
  if (percentStats.has(key)) return `${sign}${Math.round(value * 100)}%`;
  return `${sign}${Math.round(value)}`;
}

export function compareItems(item, current) {
  const newScore = itemScore(item);
  const currentScore = itemScore(current);
  const statKeys = Array.from(new Set([...Object.keys(item.stats), ...Object.keys(current?.stats || {})]));
  return {
    newScore,
    currentScore,
    delta: newScore - currentScore,
    statRows: statKeys.map((key) => ({
      key,
      label: statLabels[key],
      next: item.stats[key] || 0,
      current: current?.stats?.[key] || 0,
      delta: (item.stats[key] || 0) - (current?.stats?.[key] || 0),
    })),
  };
}

export function equipPendingLoot() {
  if (!state.pendingLoot) return;
  const old = state.inventory[state.pendingLoot.slot];
  if (old) state.gold += Math.floor(old.value * 0.45);
  state.inventory[state.pendingLoot.slot] = state.pendingLoot;
  addLog(state, `Надет предмет: ${state.pendingLoot.name}.`);
  state.pendingLoot = null;
  updateEpicStat();
}

export function sellPendingLoot() {
  if (!state.pendingLoot) return;
  state.gold += state.pendingLoot.value;
  addLog(state, `Предмет продан за ${state.pendingLoot.value} G.`);
  state.pendingLoot = null;
}

export function rerollPendingLoot() {
  if (!state.pendingLoot) return;
  const cost = rerollCost();
  if (state.gold < cost) {
    addLog(state, `Не хватает золота для перековки (${cost} G).`);
    return false;
  }
  state.gold -= cost;
  const wasBoss = state.pendingLoot.rarity.power >= 3;
  state.pendingLoot = generateLoot(wasBoss, 0.5);
  addLog(state, `Предмет перекован за ${cost} G.`);
  return true;
}