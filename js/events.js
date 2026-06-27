import { events, storyEvents } from "./data.js";
import { state, addLog, getHeroStats, saveState, updateStars } from "./state.js";
import { generateLoot } from "./loot.js";
import { spawnEnemy } from "./combat.js";
import { audio } from "./audio.js";

export function startEvent() {
  let event = null;

  // Story event triggers
  if (!state.storyFlags) state.storyFlags = {};
  if (!state.psyche) state.psyche = { loyalty: 0, doubt: 0, humanity: 0 };
  
  if (!state.storyFlags.intro_knight && state.sector >= 2) {
    event = storyEvents.find(e => e.key === "lore_intro_knight");
  } else if (!state.storyFlags.met_deserter && state.sector >= 3) {
    event = storyEvents.find(e => e.key === "moral_deserter");
  } else if (!state.storyFlags.met_patrol && state.sector >= 5) {
    event = storyEvents.find(e => e.key === "moral_patrol");
  } else if (!state.storyFlags.met_alchemist && state.sector >= 6) {
    event = storyEvents.find(e => e.key === "fugitive_alchemist");
  }

  // Fallback to random event
  if (!event) {
    event = events[Math.floor(Math.random() * events.length)];
  }

  state.awaitingEvent = true;
  state.currentEvent = { ...event, choices: event.choices.map((c) => ({ ...c })) };
  addLog(state, `Событие: ${event.title}`);
  audio.playEvent();
}

export function finishEvent(s) {
  const spawnedFight = Boolean(s.currentEnemy || (s.enemyGroup && s.enemyGroup.some((e) => e.hp > 0)));
  const countsEncounter = s.currentEvent?.countsEncounter !== false;
  s.awaitingEvent = false;
  s.currentEvent = null;
  if (!spawnedFight && countsEncounter) s.encounter += 1;
  saveState();
}

function addBuff(s, stat, value, message) {
  s.heroHp = Math.max(1, s.heroHp - Math.round(getHeroStats().health * 0.08));
  s.buffs[stat] = (s.buffs[stat] || 0) + value;
  addLog(s, message);
}

export function sendSoul(s, side) {
  if (side === "heaven") {
    s.heavenSouls = Math.min(5, s.heavenSouls + 1);
    const stats = getHeroStats();
    s.heroHp = Math.min(stats.health, s.heroHp + Math.round(stats.health * 0.12));
    s.buffs.accuracy = (s.buffs.accuracy || 0) + 0.04;
    addLog(s, "Душа в Раю: +исцеление, +точность до конца сектора.");
    audio.playHeal();
  } else {
    s.hellSouls = Math.min(5, s.hellSouls + 1);
    s.buffs.damage = (s.buffs.damage || 0) + 0.1;
    s.buffs.bleed = (s.buffs.bleed || 0) + 0.04;
    addLog(s, "Душа в Аду: +урон и кровотечение до конца сектора.");
  }
}

const effectHandlers = {
  altar_damage: (s) => addBuff(s, "damage", 0.15, "Алтарь усилил клинок."),
  altar_armor: (s) => addBuff(s, "armor", 0.12, "Кожа героя покрылась рунами."),
  altar_crit: (s) => addBuff(s, "crit", 0.08, "Взгляд героя стал холоднее."),
  chest_open: (s) => {
    if (Math.random() < 0.64) {
      s.pendingLoot = generateLoot(false, 0.8);
      addLog(s, "Сундук открылся и выдал предмет.");
      audio.playLoot();
    } else {
      addLog(s, "Сундук оказался мимиком.");
      spawnEnemy(s, true);
    }
  },
  chest_pass: (s) => {
    s.nextEliteChance = Math.max(s.nextEliteChance, 0.35);
    addLog(s, "Герой проходит мимо. Следующий бой может быть элитным.");
  },
  forge_pay: (s) => {
    if (s.gold < 80) {
      addLog(s, "Не хватает золота для кузницы.");
      return;
    }
    s.gold -= 80;
    if (Math.random() < 0.55) {
      s.pendingLoot = generateLoot(false, 0.45);
      addLog(s, "Кузница выдала новый предмет.");
      audio.playLoot();
    } else {
      s.upgrades += 1;
      updateStars(s);
      addLog(s, "Кузница усилила героя.");
    }
  },
  forge_skip: (s) => addLog(s, "Герой оставляет кузницу позади."),
  soul_heaven: (s) => sendSoul(s, "heaven"),
  soul_hell: (s) => sendSoul(s, "hell"),
  shrine_heal: (s) => {
    const stats = getHeroStats();
    s.heroHp = Math.min(stats.health, s.heroHp + Math.round(stats.health * 0.45));
    addLog(s, "Святилище восстановило здоровье героя.");
    audio.playHeal();
  },
  shrine_gold: (s) => {
    const stats = getHeroStats();
    const damage = Math.round(stats.health * 0.18);
    s.heroHp = Math.max(1, s.heroHp - damage);
    const gold = 110 + s.sector * 12;
    s.gold += gold;
    addLog(s, `Герой отдал кровь и получил ${gold} G.`);
  },
  trap_check: (s) => {
    const stats = getHeroStats();
    if (Math.random() < stats.evasion + 0.22) {
      const gold = 55 + s.sector * 7;
      s.gold += gold;
      addLog(s, `Герой избежал ловушки и нашел ${gold} G.`);
    } else {
      const dmg = Math.round(stats.health * 0.16);
      s.heroHp = Math.max(1, s.heroHp - dmg);
      addLog(s, `Ловушка ранила героя на ${dmg} HP.`);
    }
  },
  cross_safe: (s) => {
    const gold = 28 + s.sector * 5;
    s.gold += gold;
    addLog(s, `Тихий проход принёс ${gold} G.`);
  },
  cross_elite: (s) => spawnEnemy(s, true),
  cross_risk: (s) => {
    if (Math.random() < 0.5) {
      s.pendingLoot = generateLoot(false, 1.2);
      addLog(s, "Рискованный путь принес добычу.");
      audio.playLoot();
    } else {
      spawnEnemy(s, true);
    }
  },
  pact_loot: (s) => {
    const stats = getHeroStats();
    const lost = Math.max(1, Math.round(stats.health * 0.2));
    s.heroHp = Math.max(1, s.heroHp - lost);
    s.pendingLoot = generateLoot(false, 1.5);
    addLog(s, `Жертва принесла редкий предмет. -${lost} HP.`);
    audio.playLoot();
  },
  pact_gold: (s) => {
    const gold = 55 + s.sector * 9;
    s.gold += gold;
    addLog(s, `Герой взял ${gold} G и сохранил силы.`);
  },
  relic_power: (s) => {
    const stats = getHeroStats();
    const lost = Math.max(1, Math.round(stats.health * 0.08));
    s.heroHp = Math.max(1, s.heroHp - lost);
    s.buffs.damage = (s.buffs.damage || 0) + 0.12;
    s.buffs.bleed = (s.buffs.bleed || 0) + 0.06;
    addLog(s, `Реликт пробудил ярость: +урон, +кровотечение, -${lost} HP.`);
  },
  relic_guard: (s) => {
    const stats = getHeroStats();
    const lost = Math.max(1, Math.round(stats.health * 0.08));
    s.heroHp = Math.max(1, s.heroHp - lost);
    s.buffs.armor = (s.buffs.armor || 0) + 0.14;
    s.buffs.accuracy = (s.buffs.accuracy || 0) + 0.04;
    addLog(s, `Реликт дарует защиту: +броня, +точность, -${lost} HP.`);
  },
  cache_gold: (s) => {
    const gold = 75 + s.sector * 11;
    s.gold += gold;
    addLog(s, `Тайник принес ${gold} G.`);
  },
  cache_heal: (s) => {
    const stats = getHeroStats();
    const healed = Math.round(stats.health * 0.28);
    s.heroHp = Math.min(stats.health, s.heroHp + healed);
    addLog(s, `Отдых восстановил ${healed} HP.`);
    audio.playHeal();
  },
  market_item: (s) => {
    if (s.gold < 80) {
      s.pendingLoot = generateLoot(false, 0.65);
      addLog(s, "Не хватило золота, но торговец дал старую реликвию.");
      audio.playLoot();
      return;
    }
    s.gold -= 80;
    s.pendingLoot = generateLoot(false, 0.9);
    addLog(s, "Предмет куплен у призрачного торговца.");
    audio.playLoot();
  },
  market_run: (s) => {
    s.nextEliteChance = Math.max(s.nextEliteChance, 0.38);
    addLog(s, "Герой идет дальше — следующий бой может стать элитным.");
  },
  oath_buff: (s) => {
    s.buffs.damage = (s.buffs.damage || 0) + 0.1;
    s.buffs.crit = (s.buffs.crit || 0) + 0.04;
    s.nextEliteChance = Math.max(s.nextEliteChance, 0.45);
    addLog(s, "Клятва усилила героя, но следующая битва будет опаснее.");
  },
  oath_safe: (s) => {
    const gold = 45 + s.sector * 6;
    s.gold += gold;
    addLog(s, `Герой сохраняет нервы и получает ${gold} G.`);
  },
  vision_debuff: (s) => {
    s.buffs.accuracy = (s.buffs.accuracy || 0) + 0.05;
    s.buffs.combo = (s.buffs.combo || 0) + 0.02;
    addLog(s, "Видение показывает слабости врагов: точность и комбо увеличены.");
  },
  vision_gold: (s) => {
    const gold = 38 + s.sector * 7;
    s.gold += gold;
    addLog(s, `Видение подсказало сокровище: +${gold} G.`);
  },
  unlock_bosses: (s) => {
    s.storyFlags.intro_knight = true;
    s.bossUnlocked = true;
    s.journalEntries.push({
      title: "Откровение у костра",
      text: "Я встретил безумца, который поведал мне о Душах Рая и Ада. Он утверждает, что собрав пять таких Душ, можно открыть Врата и бросить вызов их стражам. Кроме того, он упомянул, что предметы схожего происхождения резонируют друг с другом... Стоит быть внимательнее к экипировке."
    });
    addLog(s, "Вы открыли Дневник и получили знания о Вратах и Синергиях.");
  },
  deserter_help: (s) => {
    s.storyFlags.met_deserter = true;
    s.psyche.humanity += 10;
    const stats = getHeroStats();
    s.heroHp = Math.min(stats.health, s.heroHp + Math.round(stats.health * 0.15));
    s.journalEntries.push({
      title: "Раненый враг",
      text: "Я перевязал раны дезертиру из армии противника. Война делает нас животными, но я решил остаться человеком. В благодарность он дал мне немного целебных трав."
    });
    addLog(s, "Человечность возросла. Здоровье восстановлено.");
    audio.playHeal();
  },
  deserter_kill: (s) => {
    s.storyFlags.met_deserter = true;
    s.psyche.humanity -= 15;
    s.gold += 35;
    s.journalEntries.push({
      title: "Слабость недопустима",
      text: "Я добил дезертира. Война не прощает слабости, и у него было немного золота. Это просто необходимость."
    });
    addLog(s, "Жестокость возросла. Получено золото.");
  },
  patrol_lie: (s) => {
    s.storyFlags.met_patrol = true;
    s.psyche.doubt += 15;
    s.journalEntries.push({
      title: "Ложь во спасение",
      text: "Я солгал патрулю Короны и пошел обходным путем. Почему я прячусь от своих же солдат? Письмо, которое я несу... возможно, в нем кроется что-то, что мне самому бы не понравилось."
    });
    addLog(s, "Сомнение растет. Вы избежали конфликта.");
  },
  patrol_truth: (s) => {
    s.storyFlags.met_patrol = true;
    s.psyche.loyalty += 15;
    s.nextEliteChance = Math.max(s.nextEliteChance, 0.4);
    s.journalEntries.push({
      title: "Долг и честь",
      text: "Я показал патрулю Приказ. Они козырнули и указали мне прямую, но опасную дорогу. Мой долг перед Короной священен."
    });
    addLog(s, "Лояльность растет. Следующий враг может быть элитным.");
  },
  alchemist_buy: (s) => {
    s.storyFlags.met_alchemist = true;
    if (s.gold >= 100) {
      s.gold -= 100;
      s.resources = s.resources || { iron: 0, soulDust: 0, reagent: 0 };
      s.resources.reagent = (s.resources.reagent || 0) + 1;
      addLog(s, "Вы купили редкий алхимический реагент.");
    } else {
      addLog(s, "Не хватает золота. Алхимик скрылся.");
    }
  },
  alchemist_rob: (s) => {
    s.storyFlags.met_alchemist = true;
    s.psyche.humanity -= 15;
    s.resources = s.resources || { iron: 0, soulDust: 0, reagent: 0 };
    s.resources.reagent = (s.resources.reagent || 0) + 1;
    addLog(s, "Вы забрали реагент силой. Человечность падает.");
    spawnEnemy(s, true); // The alchemist fights back or a monster attacks
  },
  alchemist_ignore: (s) => {
    s.storyFlags.met_alchemist = true;
    addLog(s, "Вы прошли мимо алхимика.");
  }
};

export function runEventEffect(effectKey, s = state) {
  const fn = effectHandlers[effectKey];
  if (fn) fn(s);
  else addLog(s, "Выбор сделан.");
}
