import { enemyArchetypes, BALANCE } from "./data.js";
import {
  state,
  locationForSector,
  getHeroStats,
  addLog,
  saveState,
  clamp,
  starHitsRequired,
  updateEpicStat,
  getAliveEnemies,
} from "./state.js";
import { generateLoot } from "./loot.js";
import { startEvent, sendSoul } from "./events.js";
import { startDialogue } from "./dialogue.js";
import { audio } from "./audio.js";
import { showFloatingNumber, showEnemyEffect, flashStarBurst } from "./fx.js";
import { checkMilestones, showMilestoneToast } from "./milestones.js";
import { triggerHeroAttackAnim } from "./render.js";

export function rollEnemyCount(sector) {
  if (sector < 8) return 1;
  if (sector < 20) return Math.random() < 0.28 ? 2 : 1;
  if (sector < 40) {
    const r = Math.random();
    if (r < 0.22) return 3;
    if (r < 0.55) return 2;
    return 1;
  }
  const r = Math.random();
  if (r < 0.18) return 3;
  if (r < 0.58) return 2;
  return 1;
}

function pickMob(location) {
  const entry = location.mobs[Math.floor(Math.random() * location.mobs.length)];
  if (typeof entry === "string") return { name: entry, archetype: "beast" };
  return entry;
}

function applyArchetypeMods(enemy, archetypeKey, elite, bossSide) {
  const arch = enemyArchetypes[archetypeKey] || enemyArchetypes.beast;
  enemy.visual = arch.visual;
  enemy.traits = [...arch.traits];
  if (elite) enemy.traits.push("Элитный");
  if (bossSide === "heaven") {
    enemy.traits.push("Судья");
    enemy.evasion += 0.06;
    enemy.armor = Math.round(enemy.armor * 1.35);
    enemy.damage = Math.round(enemy.damage * 0.88);
  }
  if (bossSide === "hell") {
    enemy.traits.push("Палач");
    enemy.damage = Math.round(enemy.damage * 1.22);
    enemy.bleedOnHit = 0.35;
  }
  if (archetypeKey === "beast") enemy.evasion += 0.03;
  if (archetypeKey === "knight") enemy.armor = Math.round(enemy.armor * 1.2);
  if (archetypeKey === "demon") enemy.damage = Math.round(enemy.damage * 1.08);
  if (archetypeKey === "ghost") enemy.evasion += 0.05;
}

export function spawnEnemy(s = state, elite = false, bossSide = null) {
  const location = locationForSector(s.sector);
  // Limit enemy scaling to prevent exponential difficulty
  const sectorCap = Math.min(s.sector, 50);
  const scaling = 1 + sectorCap * 0.08;
  const count = bossSide ? 1 : rollEnemyCount(s.sector);
  
  // Boss stats are FIXED regardless of tier
  let bossStats = null;
  if (bossSide === "heaven") {
    bossStats = { hp: 950, damage: 65, armor: 32, evasion: 0.18, accuracy: 0.85, healOnHit: 0.28 };
  } else if (bossSide === "hell") {
    bossStats = { hp: 1100, damage: 78, armor: 28, evasion: 0.12, accuracy: 0.92, bleedOnHit: 0.35 };
  }
  
  s.enemyGroup = Array.from({ length: count }, (_, index) => {
    const mob = pickMob(location);
    const name = bossSide
      ? `${bossSide === "heaven" ? "Серафим Суда" : "Палач Бездны"}`
      : mob.name;
    const packPenalty = count > 1 ? 0.72 : 1;
    
    let enemy;
    if (bossSide) {
      // Use fixed boss stats
      enemy = {
        id: crypto.randomUUID(),
        name: name,
        bossSide,
        elite: false,
        visual: bossSide === "heaven" ? "ghost" : "demon",
        traits: [],
        hp: bossStats.hp,
        maxHp: bossStats.hp,
        damage: bossStats.damage,
        armor: bossStats.armor,
        evasion: bossStats.evasion,
        accuracy: bossStats.accuracy,
        bleedStacks: [],
        bleedOnHit: bossStats.bleedOnHit || 0,
        healOnHit: Math.round(bossStats.healOnHit ? bossStats.damage * bossStats.healOnHit : 0),
      };
    } else {
      // Normal enemy scaling
      enemy = {
        id: crypto.randomUUID(),
        name: elite ? `Элитный ${name}` : count > 1 ? `${name} ${index + 1}` : name,
        bossSide,
        elite,
        visual: "beast",
        traits: [],
        hp: Math.round(
          (82 + sectorCap * 12) * scaling * packPenalty * (elite ? 1.65 : 1)
        ),
        maxHp: 0,
        damage: Math.round(
          (11 + sectorCap * 1.6) * (count > 1 ? 0.78 : 1) * (elite ? 1.48 : 1)
        ),
        armor: Math.round((3 + sectorCap * 0.22) * (elite ? 1.24 : 1)),
        evasion: clamp(0.04 + sectorCap * 0.0012 + (elite ? 0.04 : 0), 0.03, 0.24),
        accuracy: clamp(0.82 + Math.min(0.14, sectorCap * 0.001) + (elite ? 0.04 : 0), 0.65, 0.97),
        bleedStacks: [],
        bleedOnHit: 0,
        healOnHit: 0,
      };
    }
    
    if (bossSide === "heaven") {
      enemy.traits.push("Судья");
    }
    if (bossSide === "hell") {
      enemy.traits.push("Палач");
    }
    enemy.maxHp = enemy.hp;
    if (!bossSide) applyArchetypeMods(enemy, mob.archetype, elite, null);
    return enemy;
  });
  s.currentEnemy = s.enemyGroup[0];
  s.awaitingEvent = false;
  s.currentEvent = null;
  if (bossSide) audio.playBoss();
  addLog(s, count > 1 ? `На дороге группа врагов: ${count}.` : `${s.currentEnemy.name} выходит на дорогу.`);
  return s;
}

export function maybeNextEncounter() {
  if (state.currentEnemy || getAliveEnemies().length || state.awaitingEvent || state.pendingLoot || state.currentDialogue) return;

  const prevSector = state.sector;
  if (state.encounter >= 5) {
    const stats = getHeroStats();
    const heal = stats.health - state.heroHp;
    state.sector += 1;
    state.encounter = 0;
    state.buffs = {};
    state.heroHp = stats.health;
    state.nextEliteChance = 0;
    addLog(state, `Сектор ${state.sector - 1} пройден. Герой полностью восстановил здоровье${heal > 0 ? ` (+${Math.round(heal)} HP)` : ""}.`);
    showMilestoneToast("Сектор пройден", `Добро пожаловать в сектор ${state.sector}. Баффы локации сброшены.`);
    const newLoc = locationForSector(state.sector);
    const oldLoc = locationForSector(prevSector);
    if (newLoc.tint !== oldLoc.tint) {
      showMilestoneToast("Новая локация", newLoc.name);
      audio.playMilestone();
    }
    checkMilestones(state);
  }

  // --- STORY DIALOGUE TRIGGERS ---
  if (!state.currentDialogue && !state.pendingDialogue) {
    if (state.sector === 1 && state.encounter === 1 && !state.stats.metOldMan) {
      state.stats.metOldMan = true;
      state.walkDelay = Date.now() + 5000;
      state.pendingDialogue = "old_man";
      return;
    }
    if (state.encounter === 0) {
      if (state.sector === 4 && !state.stats.metElara) {
        state.stats.metElara = true;
        state.walkDelay = Date.now() + 5000;
        state.pendingDialogue = "elara";
        return;
      }
      if (state.sector === 8 && !state.stats.metGarrick) {
        state.stats.metGarrick = true;
        state.walkDelay = Date.now() + 5000;
        state.pendingDialogue = "garrick";
        return;
      }
      if (state.sector === 10 && !state.stats.metSideNPC) {
        state.stats.metSideNPC = true;
        state.walkDelay = Date.now() + 5000;
        const roll = Math.random();
        if (roll < 0.33) state.pendingDialogue = "dying_soldier";
        else if (roll < 0.66) state.pendingDialogue = "blind_witch";
        else state.pendingDialogue = "looter";
        return;
      }
    }
  }

  const eliteRollBase = state.nextEliteChance > 0 ? state.nextEliteChance : BALANCE.eliteChance + state.sector * BALANCE.eliteChanceGrowth;
  const eliteRoll = Math.min(BALANCE.eliteChanceMax, eliteRollBase);
  const isElite = Math.random() < eliteRoll;
  if (state.nextEliteChance > 0) state.nextEliteChance = 0;
  spawnEnemy(state, isElite);
}

function getHitChance(accuracy, evasion) {
  return clamp(accuracy - evasion, 0.12, 0.98);
}

export function reviveAtSectorStart(heroStats) {
  const lostGold = Math.min(state.gold, Math.floor(35 + state.sector * 8));
  state.gold -= lostGold;
  state.heroHp = heroStats.health;
  state.encounter = 0;
  state.currentEnemy = null;
  state.enemyGroup = [];
  state.awaitingEvent = false;
  state.currentEvent = null;
  state.pendingLoot = null;
  state.starHits = 0;
  addLog(state, `Герой погиб. Возрождение в начале сектора ${state.sector}. Потеряно ${lostGold} G.`);
}

export function heroAttack(heroStats) {
  triggerHeroAttackAnim();
  let swings = 0;
  do {
    swings += 1;
    const enemy = state.currentEnemy;
    if (!enemy) break;
    const hitChance = getHitChance(heroStats.accuracy, enemy.evasion || 0);
    if (Math.random() > hitChance) {
      addLog(state, `${enemy.name} уклонился.`);
      showFloatingNumber("УКЛОН", "dodge", "enemy");
      showEnemyEffect("effect-dodge");
      audio.playDodge();
    } else {
      let dmg = Math.max(2, heroStats.damage - enemy.armor * 0.55);
      const crit = Math.random() < heroStats.crit;
      if (crit) dmg *= 2;
      dmg = Math.round(dmg);
      enemy.hp -= dmg;
      state.starHits += 1;
      const heal = Math.round(dmg * heroStats.lifeSteal);
      if (heal > 0) state.heroHp = Math.min(heroStats.health, state.heroHp + heal);
      if (Math.random() < heroStats.bleed) {
        enemy.bleedStacks.push({ ticks: 3, damage: Math.max(2, Math.round(heroStats.damage * 0.26)) });
        addLog(state, `Кровотечение на ${enemy.name}.`);
        showFloatingNumber("КРОВОТЕЧЕНИЕ", "bleed", "enemy");
        showEnemyEffect("effect-bleed");
      }
      showFloatingNumber(crit ? `☠ ${dmg}` : `-${dmg}`, crit ? "crit" : "normal", "enemy");
      if (crit) {
        showEnemyEffect("effect-crit");
        audio.playCrit();
      } else audio.playHit();
      if (heal > 0) showFloatingNumber(`+${heal}`, "heal", "hero");

      const need = starHitsRequired();
      if (state.stars > 0 && state.starHits >= need) {
        state.starHits = 0;
        flashStarBurst();
        audio.playStar();
        
        switch (state.heroClass) {
          case "dark_knight": {
            const bashDmg = Math.round((heroStats.armor || 10) * (2 + state.stars * 0.5));
            enemy.hp -= bashDmg;
            state.buffs.armor = (state.buffs.armor || 0) + 0.1 * state.stars;
            addLog(state, `УДАР ЩИТОМ! ${bashDmg} урона. Броня усилена.`);
            showFloatingNumber(`🛡️ ${bashDmg}`, "star", "enemy");
            break;
          }
          case "hunter": {
            const bleedDmg = Math.round(heroStats.damage * (1 + state.stars * 0.5));
            enemy.bleedStacks.push({ ticks: 4, damage: bleedDmg });
            const healFrenzy = Math.round(bleedDmg * 2);
            state.heroHp = Math.min(heroStats.health, state.heroHp + healFrenzy);
            addLog(state, `КРОВАВОЕ БЕЗУМИЕ! Мощное кровотечение и +${healFrenzy} HP.`);
            showFloatingNumber(`🩸 Безумие`, "star", "enemy");
            showFloatingNumber(`+${healFrenzy}`, "heal", "hero");
            break;
          }
          case "cultist": {
            const sacHp = Math.round(state.heroHp * 0.1);
            if (state.heroHp > sacHp + 1) {
              state.heroHp -= sacHp;
              const sacDmg = Math.round((sacHp + heroStats.damage) * (3 + state.stars));
              enemy.hp -= sacDmg;
              addLog(state, `ТЕМНАЯ ЖЕРТВА! -${sacHp} HP ради ${sacDmg} урона!`);
              showFloatingNumber(`🔮 ${sacDmg}`, "star", "enemy");
              showFloatingNumber(`-${sacHp}`, "normal", "hero");
            } else {
              const burst = Math.round(heroStats.damage * (1.25 + state.stars * 0.25));
              enemy.hp -= burst;
              addLog(state, `Слабый взрыв: ${burst} урона (мало ХП для жертвы).`);
              showFloatingNumber(`💥 ${burst}`, "star", "enemy");
            }
            break;
          }
          default: {
            const burst = Math.round(heroStats.damage * (1.25 + state.stars * 0.25));
            enemy.hp -= burst;
            addLog(state, `Звёздная способность: ${burst} урона.`);
            showFloatingNumber(`💥 ${burst}`, "star", "enemy");
          }
        }
      }
      addLog(state, `${crit ? "Крит" : "Удар"}: ${dmg}${heal ? `, +${heal} HP` : ""}.`);
    }
  } while (state.currentEnemy && state.currentEnemy.hp > 0 && swings < 7 && Math.random() < heroStats.combo);

  if (swings > 1) {
    addLog(state, `Комбо: ${swings} удара.`);
    showFloatingNumber(`КОМБО x${swings}`, "combo", "enemy");
  }
  if (state.currentEnemy && state.currentEnemy.hp <= 0) defeatEnemy();
}

export function enemyAttack(heroStats) {
  for (const enemy of getAliveEnemies()) {
    const hitChance = getHitChance(enemy.accuracy, heroStats.evasion);
    if (Math.random() > hitChance) {
      addLog(state, `Герой уклонился от ${enemy.name}.`);
      showFloatingNumber("УКЛОН", "dodge", "hero");
      audio.playDodge();
      continue;
    }
    const reduced = enemy.damage * (100 / (100 + heroStats.armor * 7));
    let dmg = Math.max(1, Math.round(reduced));
    state.heroHp -= dmg;
    if (enemy.bleedOnHit && Math.random() < enemy.bleedOnHit) {
      addLog(state, `${enemy.name} ранит кровоточащей раной.`);
    }
    addLog(state, `${enemy.name}: ${dmg} урона.`);
    showFloatingNumber(`-${dmg}`, "enemy-hit", "hero");
    audio.playHit();
    if (enemy.healOnHit && Math.random() < 0.3) {
      const heal = Math.min(enemy.healOnHit, enemy.maxHp - enemy.hp);
      if (heal > 0) {
        enemy.hp += heal;
        addLog(state, `${enemy.name} восстанавливает ${heal} HP.`);
        showFloatingNumber(`+${heal}`, "heal", "enemy");
      }
    }
    if (state.heroHp <= 0) break;
  }
}

export function resolveBleed() {
  const enemy = state.currentEnemy;
  if (!enemy || !enemy.bleedStacks.length) return;
  let total = 0;
  enemy.bleedStacks = enemy.bleedStacks
    .map((stack) => {
      total += stack.damage;
      return { ...stack, ticks: stack.ticks - 1 };
    })
    .filter((stack) => stack.ticks > 0);
  enemy.hp -= total;
  if (total > 0) {
    addLog(state, `Кровотечение: ${total} урона.`);
    showFloatingNumber(`-${total}`, "bleed", "enemy");
    showEnemyEffect("effect-bleed");
  }
  if (enemy.hp <= 0) defeatEnemy();
}

export function defeatEnemy() {
  const enemy = state.currentEnemy;
  if (!enemy) return;
  const bossSide = enemy.bossSide;
  const gold = Math.round((22 + state.sector * 4) * (enemy.elite ? 1.7 : 1) * (bossSide ? 6 : 1));
  state.gold += gold;
  addLog(state, `${enemy.name} побежден. +${gold} G.`);

  state.enemyGroup = getAliveEnemies().filter((item) => item.id !== enemy.id);
  const nextEnemy = state.enemyGroup[0] || null;
  if (nextEnemy) {
    state.currentEnemy = nextEnemy;
    addLog(state, `${nextEnemy.name} впереди. Осталось: ${state.enemyGroup.length}.`);
    return;
  }

  state.currentEnemy = null;
  state.enemyGroup = [];
  state.encounter += bossSide ? 0 : 1;

  if (bossSide) {
    state[`${bossSide}BossTier`] += 1;
    state[`${bossSide}Souls`] = 0;
    state.stats[`${bossSide}Bosses`] = (state.stats[`${bossSide}Bosses`] || 0) + 1;
    state.pendingLoot = generateLoot(true, 0, bossSide);
    addLog(state, "Босс оставил ресурсы.");
    audio.playLoot();
    checkMilestones(state);
  } else {
    // No loot from the very first monster
    if (state.sector === 1 && state.encounter === 1) {
      state.pendingLoot = null;
    } else if (!state.pendingLoot && Math.random() < 0.58) {
      state.pendingLoot = generateLoot(false);
      audio.playLoot();
    }
  }
  updateEpicStat();
  saveState();
}
