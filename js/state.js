import {
  SAVE_KEY,
  heroClasses,
  synergyDefs,
  setBonusByRarity,
  locations,
  BALANCE,
} from "./data.js";

export const defaultState = {
  sector: 1,
  encounter: 0,
  gold: 80,
  upgrades: 0,
  stars: 0,
  heroHp: 120,
  maxHeroHp: 120,
  heavenSouls: 0,
  hellSouls: 0,
  heavenBossTier: 1,
  hellBossTier: 1,
  paused: false,
  bossUnlocked: false,
  journalEntries: [],
  storyFlags: {},
  psyche: { loyalty: 0, doubt: 0, humanity: 0 },
  awaitingEvent: false, currentDialogue: null, storyAffinity: {},
  currentEvent: null,
  currentEnemy: null,
  enemyGroup: [],
  pendingLoot: null,
  buffs: {},
  starHits: 0,
  inventory: {},
  log: ["Герой входит на темную дорогу."],
  heroClass: null,
  tutorialDone: false,
  milestonesSeen: {},
  nextEliteChance: 0,
  stats: { heavenBosses: 0, hellBosses: 0, epicSlots: 0 },
  artifacts: [],
};

export let state = loadState();

export function setState(next) {
  state = next;
}

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved) {
      const merged = { ...structuredClone(defaultState), ...saved };
      // Reset volatile combat state on page reload to prevent stuck overlays/modals
      merged.paused = false;
      merged.awaitingEvent = false;
      merged.currentEvent = null;
      merged.currentEnemy = null;
      merged.enemyGroup = [];
      merged.pendingLoot = null;
      merged.starHits = 0;
      merged.currentDialogue = null;
      merged.pendingDialogue = null;
      merged.walkDelay = 0;
      if (!merged.stats) merged.stats = { heavenBosses: 0, hellBosses: 0, epicSlots: 0 };
      if (!merged.milestonesSeen) merged.milestonesSeen = {};
      // Validate heroClass still exists in current data
      if (merged.heroClass) {
        const valid = heroClasses.find((c) => c.key === merged.heroClass);
        if (!valid) merged.heroClass = null;
      }
      return normalizeState(merged);
    }
  } catch {
    /* try v1 */
  }
  try {
    const v1 = JSON.parse(localStorage.getItem("dark-path-prototype-save-v1"));
    if (v1) {
      const merged = { ...structuredClone(defaultState), ...v1, paused: false };
      merged.awaitingEvent = false;
      merged.currentEvent = null;
      merged.currentEnemy = null;
      merged.enemyGroup = [];
      merged.pendingLoot = null;
      return normalizeState(merged);
    }
  } catch {
    /* fresh */
  }
  return normalizeState(structuredClone(defaultState));
}

export function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function normalizeState(s) {
  if (s.currentEnemy && (!Array.isArray(s.enemyGroup) || !s.enemyGroup.length)) {
    s.enemyGroup = [s.currentEnemy];
  }
  if (!s.currentEnemy && Array.isArray(s.enemyGroup) && s.enemyGroup.length) {
    s.currentEnemy = s.enemyGroup.find((enemy) => enemy.hp > 0) || null;
  }
  if (!Array.isArray(s.enemyGroup)) s.enemyGroup = [];
  if (!s.stats) s.stats = { heavenBosses: 0, hellBosses: 0, epicSlots: 0 };
  
  // Recover from broken intro state
  if (s.heroClass && !s.awaitingEvent && (!s.storyFlags || !s.storyFlags.intro_done)) {
    s.heroClass = null;
    s.awaitingEvent = false;
  }
  
  return s;
}

export function equipPendingLoot(s = state) {
  if (!s.pendingLoot) return;
  const item = s.pendingLoot;
  // Предметы в inventory хранятся по ключу слота (weapon, chest и т.д.)
  s.inventory[item.slot] = item;
  s.pendingLoot = null;
  updateEpicStat(s);
  addLog(s, `Надето: ${item.name}`);
  saveState();
}

export function sellPendingLoot(s = state) {
  if (!s.pendingLoot) return;
  const item = s.pendingLoot;
  const gold = item.rarity?.value || 15;
  s.gold += gold;
  s.pendingLoot = null;
  addLog(s, `Продано: ${item.name} за ${gold} G`);
  saveState();
}

export function locationForSector(sector) {
  return locations[Math.floor((sector - 1) / BALANCE.sectorsPerLocation) % locations.length];
}

export function getClassDef() {
  return heroClasses.find((c) => c.key === state.heroClass) || null;
}

export function starHitsRequired() {
  const cls = getClassDef();
  return cls?.starHitsRequired || 5;
}

function countRaritySlots(inventory, minKey) {
  const order = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "ancient", "divine", "relic"];
  const minIdx = order.indexOf(minKey);
  return Object.values(inventory).filter((item) => order.indexOf(item.rarity.key) >= minIdx).length;
}

export function getActiveSynergies(stats, heroClass, inventory = null) {
  return synergyDefs.filter((syn) => {
    if (syn.classReq && syn.classReq !== heroClass) return false;
    if (syn.needsItems && inventory) {
      if (!syn.needsItems.every(slot => inventory[slot])) return false;
    }
    if (syn.needs) {
      return Object.entries(syn.needs).every(([key, need]) => {
        const val = stats[key] || 0;
        return val >= need;
      });
    }
    return true;
  });
}

export function getSetBonuses(inventory) {
  const counts = {};
  Object.values(inventory).forEach((item) => {
    const k = item.rarity.key;
    counts[k] = (counts[k] || 0) + 1;
  });
  const bonuses = [];
  Object.entries(counts).forEach(([key, count]) => {
    const group = setBonusByRarity[key];
    if (!group) return;
    const tiers = Array.isArray(group) ? group : [group];
    tiers.forEach((tier) => {
      if (count >= tier.count) {
        bonuses.push({ ...tier, rarityKey: key, count });
      }
    });
  });
  return bonuses;
}

export function getHeroStats(s = state) {
  const cls = heroClasses.find((c) => c.key === s.heroClass);
  const defaultBase = { health: 120, damage: 10, armor: 5, combo: 0.1, crit: 0.05, evasion: 0.05, accuracy: 0.85, lifeSteal: 0, bleed: 0 };
  const defaultScale = { health: 10, damage: 1, armor: 0.5 };
  
  const cBase = cls?.base || defaultBase;
  const cScale = cls?.scaling || defaultScale;

  const base = {
    health: cBase.health + s.upgrades * cScale.health,
    damage: cBase.damage + s.upgrades * cScale.damage,
    armor: cBase.armor + s.upgrades * cScale.armor,
    combo: cBase.combo + s.stars * 0.015,
    crit: cBase.crit + s.stars * 0.012,
    evasion: cBase.evasion,
    accuracy: cBase.accuracy,
    lifeSteal: cBase.lifeSteal,
    bleed: cBase.bleed,
  };

  Object.values(s.inventory).forEach((item) => {
    Object.entries(item.stats).forEach(([key, value]) => {
      base[key] = (base[key] || 0) + value;
    });
  });

  Object.entries(s.buffs).forEach(([key, value]) => {
    base[key] =
      key === "damage" || key === "armor" || key === "health" ? base[key] * (1 + value) : base[key] + value;
  });

  const preClamp = { ...base };
  getActiveSynergies(preClamp, s.heroClass, s.inventory).forEach((syn) => {
    Object.entries(syn.bonus).forEach(([key, value]) => {
      base[key] = (base[key] || 0) + value;
    });
  });

  getSetBonuses(s.inventory).forEach((set) => {
    Object.entries(set.bonus).forEach(([key, value]) => {
      base[key] = (base[key] || 0) + value;
    });
  });

  if (s.psyche) {
    if (s.psyche.loyalty > 0) base.armor += s.psyche.loyalty * 0.15; // 1 лояльность = 0.15 брони
    if (s.psyche.humanity > 0) base.lifeSteal += s.psyche.humanity * 0.002; // 1 человечность = 0.2% вампиризма
    if (s.psyche.doubt > 0) base.crit += s.psyche.doubt * 0.005; // 1 сомнение = 0.5% крита
  }

  base.combo = clamp(base.combo, 0, 0.72);
  base.crit = clamp(base.crit, 0, 0.72);
  base.evasion = clamp(base.evasion, 0, 0.55);
  base.accuracy = clamp(base.accuracy, 0.45, 0.98);
  base.lifeSteal = clamp(base.lifeSteal, 0, 0.35);
  base.bleed = clamp(base.bleed, 0, 0.68);
  base.health = Math.round(base.health);
  return base;
}

export function upgradeCost(s = state) {
  return Math.floor(BALANCE.upgradeBase * Math.pow(BALANCE.upgradeGrowth, s.upgrades));
}

export function rerollCost(s = state) {
  return Math.floor(BALANCE.rerollCostBase * Math.pow(1.15, s.sector));
}

export function updateEpicStat(s = state) {
  s.stats.epicSlots = countRaritySlots(s.inventory, "epic");
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function addLog(s, message) {
  s.log.unshift(message);
  s.log = s.log.slice(0, 34);
}

export function updateStars(s = state) {
  const stars = Math.floor(s.upgrades / 5);
  if (stars > s.stars) addLog(s, `Получена звезда ${stars}. Способность усилилась.`);
  s.stars = stars;
}

export function getAliveEnemies(s = state) {
  if (!Array.isArray(s.enemyGroup) || !s.enemyGroup.length) return s.currentEnemy ? [s.currentEnemy] : [];
  return s.enemyGroup.filter((enemy) => enemy.hp > 0);
}
