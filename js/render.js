import {
  slots,
  statLabels,
  percentStats,
  slotEmojis,
  itemEmojis,
  heroClasses,
  artifacts,
} from "./data.js";
import {
  state,
  normalizeState,
  getHeroStats,
  locationForSector,
  upgradeCost,
  rerollCost,
  getActiveSynergies,
  getSetBonuses,
  clamp,
  starHitsRequired,
} from "./state.js";
import { getDropWeights, compareItems, formatStatValue } from "./loot.js";
import { getAliveEnemies } from "./state.js";
import { runEventEffect, finishEvent } from "./events.js";

import { setSpeedMultiplier as setFxSpeed, initFx, setCombatStatus } from "./fx.js";

export { setCombatStatus };

export const els = {};

export function bindElements() {
  initFx();
  [
    "locationName",
    "sectorNumber",
    "sectorProgressBar",
    "encounterPips",
    "heroHpText",
    "heroHpBar",
    "enemyName",
    "enemyHpText",
    "enemyHpBar",
    "enemyPack",
    "enemyStage",
    "enemyPortrait",
    "enemyImage",
    "enemyTraits",
    "roadScene",
    "playerWeapon",
    "playerOffhand",
    "combatStatus",
    "starCharge",
    "eventPanel",
    "eventKind",
    "eventTitle",
    "eventText",
    "eventActions",
    "battleLog",
    "pauseToggle",
    "goldValue",
    "upgradeCount",
    "starCount",
    "statsGrid",
    "upgradeHero",
    "upgradeCost",
    "heavenSouls",
    "hellSouls",
    "summonHeaven",
    "summonHell",
    "lootCard",
    "lootName",
    "lootStats",
    "lootCompare",
    "lootIcon",
    "lootRarityBadge",
    "equipLoot",
    "sellLoot",
    "rerollLoot",
    "gearGrid",
    "dropSectorText",
    "dropChances",
    "resetRun",
    "audioToggle",
    "musicPlayer",
    "buffBar",
    "synergyBar",
    "classBadge",
    "classOverlay",
    "tutorialOverlay",
    "rerollCost",
    "gearModal",
    "openGearModal",
    "closeGearModal",
    "artifactsList",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

export function setSpeedMultiplier(v) {
  setFxSpeed(v);
}

function getSlotEmoji(item) {
  if (item?.type?.visual && itemEmojis[item.type.visual]) return itemEmojis[item.type.visual];
  return item ? slotEmojis[item.slot] || "⬡" : "⬡";
}

function getItemVisual(item) {
  if (!item) return "";
  if (item.type?.visual) return item.type.visual;
  if (item.slot === "weapon") return "sword";
  if (item.slot === "talisman") return "orb";
  return item.slot;
}

function formatItemStats(item) {
  return Object.entries(item.stats)
    .map(([key, value]) => `${statLabels[key]} +${percentStats.has(key) ? `${Math.round(value * 100)}%` : Math.round(value)}`)
    .join(", ");
}

const locationVideoMap = {
  "Черный Лес": "Черный_Лес.mp4",
  "Разбитая Цитадель": "Разбитая_Цитадель.mp4",
  "Пылающее Подземелье": "Пылающее_Подземелье.mp4",
};

function enemySpritePath(name) {
  // Remove prefixes like "Элитный" from enemy names to use base sprite
  let cleanName = name.replace(/^Элитный\s+/, "");
  const fileName = cleanName.replace(/ /g, "_");
  return `./assets/enemies/${fileName}.png`;
}

function renderComparison(comparison, current) {
  const absDelta = Math.abs(comparison.delta);
  const verdict = !current
    ? { text: "Слот пустой", className: "better" }
    : comparison.delta >= 5
      ? { text: `Заметно лучше (${Math.round(comparison.delta)})`, className: "better" }
      : comparison.delta >= 1.5
        ? { text: `Лучше на ${Math.round(comparison.delta)} силы`, className: "better" }
        : comparison.delta <= -5
          ? { text: `Заметно хуже (${Math.round(absDelta)})`, className: "worse" }
          : comparison.delta <= -1.5
            ? { text: `Хуже на ${Math.round(absDelta)} силы`, className: "worse" }
            : { text: "Примерно равно", className: "equal" };

  const total = current
    ? `<div class="compare-total ${verdict.className}">Суммарно: ${comparison.delta > 0 ? "+" : ""}${Math.round(comparison.delta)}</div>`
    : "";

  const rows = comparison.statRows
    .map((row) => {
      const className = row.delta > 0 ? "better" : row.delta < 0 ? "worse" : "equal";
      return `<div class="compare-row ${className}">
        <span>${row.label}</span>
        <strong>${formatStatValue(row.key, row.current)} → ${formatStatValue(row.key, row.next)}</strong>
        <em>${formatStatValue(row.key, row.delta, true)}</em>
      </div>`;
    })
    .join("");
  return `${total}<div class="compare-verdict ${verdict.className}">${verdict.text}</div>${rows}`;
}

function renderBuffBar() {
  if (!els.buffBar) return;
  const chips = Object.entries(state.buffs).map(([key, val]) => {
    const name = statLabels[key] || key;
    const text = percentStats.has(key) ? `+${Math.round(val * 100)}%` : `+${val}`;
    return `<span class="buff-chip">${name} ${text}</span>`;
  });
  els.buffBar.innerHTML = chips.length ? chips.join("") : '<span class="buff-chip muted">Баффы до конца сектора</span>';
}

function renderSynergyBar(heroStats) {
  if (!els.synergyBar) return;
  const active = getActiveSynergies(heroStats);
  const sets = getSetBonuses(state.inventory);
  const parts = [
    ...active.map((s) => `<span class="synergy-chip active">${s.name}</span>`),
    ...sets.map((s) => `<span class="synergy-chip set">${s.label}</span>`),
  ];
  els.synergyBar.innerHTML = parts.join("") || '<span class="synergy-chip muted">Собери синергии из лута</span>';
}

function renderEnemyPack() {
  const enemies = getAliveEnemies();
  if (!els.enemyPack) return;
  els.enemyPack.innerHTML = enemies
    .map((enemy, index) => {
      const active = state.currentEnemy?.id === enemy.id ? "active" : "";
      const imgSrc = enemySpritePath(enemy.name);
      return `<span class="${active} ${enemy.bossSide ? "boss" : ""} ${enemy.elite ? "elite" : ""} enemy-pack-${enemy.visual || "beast"}" style="--i:${index}; --hp:${clamp(enemy.hp / enemy.maxHp, 0, 1)}" title="${enemy.name}">
        <img src="${imgSrc}" alt="${enemy.name}" class="enemy-pack-img" onerror="this.style.display='none'">
      </span>`;
    })
    .join("");
  els.enemyPack.classList.toggle("hidden", enemies.length <= 1);
}

function renderEvent() {
  // Guard: if event state is inconsistent, auto-recover
  if (state.awaitingEvent && !state.currentEvent) {
    state.awaitingEvent = false;
  }
  if (!state.awaitingEvent || !state.currentEvent) {
    els.eventPanel?.classList.add("hidden");
    return;
  }
  const event = state.currentEvent;
  els.eventPanel?.classList.remove("hidden");
  if (els.eventKind) els.eventKind.textContent = event.kind;
  if (els.eventTitle) els.eventTitle.textContent = event.title;
  if (els.eventText) els.eventText.textContent = event.text;
  if (!els.eventActions) return;
  els.eventActions.innerHTML = "";
  event.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = choice.label;
    button.addEventListener("click", () => {
      runEventEffect(choice.effectKey, state);
      finishEvent(state);
      render();
    });
    els.eventActions.appendChild(button);
  });
}

function renderStats(heroStats) {
  if (!els.statsGrid) return;
  els.statsGrid.innerHTML = Object.keys(statLabels)
    .map((key) => {
      const value = heroStats[key];
      const text = percentStats.has(key) ? `${Math.round(value * 100)}%` : Math.round(value);
      return `<div class="stat-row"><span>${statLabels[key]}</span><strong>${text}</strong></div>`;
    })
    .join("");
}

function renderHands() {
  const weapon = state.inventory.weapon;
  const offhand = state.inventory.talisman;
  const weaponVisual = getItemVisual(weapon);
  const offhandVisual = getItemVisual(offhand);
  els.roadScene?.classList.toggle("has-weapon", Boolean(weapon));
  els.roadScene?.classList.toggle("has-offhand", Boolean(offhand));
  if (els.playerWeapon) els.playerWeapon.className = `sword ${weaponVisual ? `weapon-${weaponVisual}` : ""}`.trim();
  if (els.playerOffhand) els.playerOffhand.className = `talisman-orb ${offhandVisual ? `offhand-${offhandVisual}` : ""}`.trim();
}

function renderLoot() {
  if (!state.pendingLoot) {
    els.lootCard?.classList.add("hidden");
    return;
  }
  const item = state.pendingLoot;
  const current = state.inventory[item.slot];
  const comparison = compareItems(item, current);
  els.lootCard?.classList.remove("hidden");
  if (els.lootCard && els.lootCard.dataset.itemId !== item.id) {
    els.lootCard.dataset.itemId = item.id;
    els.lootCard.classList.remove("loot-drop");
    void els.lootCard.offsetWidth;
    els.lootCard.classList.add("loot-drop");
  }
  if (els.lootName) {
    els.lootName.textContent = item.name;
    els.lootName.style.color = item.rarity.color;
  }
  if (els.lootIcon) {
    els.lootIcon.className = "item-icon-emoji large";
    els.lootIcon.textContent = getSlotEmoji(item);
    els.lootIcon.style.cssText = `background: radial-gradient(circle, ${item.rarity.color}33, transparent 70%); border-color: ${item.rarity.color}55; text-shadow: 0 0 16px ${item.rarity.color}; font-size: 32px;`;
  }
  if (els.lootRarityBadge) {
    els.lootRarityBadge.textContent = item.rarity.name;
    els.lootRarityBadge.style.borderColor = item.rarity.color;
    els.lootRarityBadge.style.color = item.rarity.color;
  }
  if (els.lootStats) els.lootStats.textContent = `${item.slotName}: ${formatItemStats(item)}. Продажа: ${item.value} G`;
  if (els.lootCompare) els.lootCompare.innerHTML = renderComparison(comparison, current);
}

function renderGear() {
  if (!els.gearGrid) return;
  els.gearGrid.innerHTML = slots
    .map((slot) => {
      const item = state.inventory[slot.key];
      const emoji = slotEmojis[slot.key] || "⬡";
      if (!item) {
        return `<div class="gear-slot empty"><div class="item-icon-emoji">${emoji}</div><div><span>${slot.name}</span><strong>пусто</strong></div></div>`;
      }
      return `<div class="gear-slot" style="border-color:${item.rarity.color}55">
        <div class="item-icon-emoji" style="background: radial-gradient(circle, ${item.rarity.color}22, transparent 70%); border-color: ${item.rarity.color}44">${getSlotEmoji(item)}</div>
        <div><span>${slot.name}</span><strong style="color:${item.rarity.color}">${item.rarity.name} ${item.type?.name || slot.name}</strong><small>${formatItemStats(item)}</small></div>
      </div>`;
    })
    .join("");
}

function renderArtifacts() {
  if (!els.artifactsList) return;
  if (!state.artifacts || state.artifacts.length === 0) {
    els.artifactsList.innerHTML = '<p class="muted-text">нет артефактов</p>';
    return;
  }
  els.artifactsList.innerHTML = state.artifacts
    .map((artifactId) => {
      const artifact = artifacts.find((a) => a.id === artifactId);
      if (!artifact) return "";
      return `<div class="artifact-badge" title="${artifact.description}" style="border-color: ${artifact.rarity === "legendary" ? "#ffb84d" : "#62a8ff"}">
        <strong style="color: ${artifact.rarity === "legendary" ? "#ffb84d" : "#62a8ff"}">${artifact.name}</strong>
        <small>${artifact.description}</small>
      </div>`;
    })
    .join("");
}

function renderDrops() {
  if (!els.dropSectorText || !els.dropChances) return;
  els.dropSectorText.textContent = `Сектор ${state.sector}`;
  const weights = getDropWeights(state.sector);
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  els.dropChances.innerHTML = weights
    .map((item) => {
      const percent = (item.weight / total) * 100;
      return `<div class="chance-row"><span style="color:${item.rarity.color}">${item.rarity.name}</span><strong>${percent.toFixed(percent < 1 ? 2 : 1)}%</strong></div>`;
    })
    .join("");
}

function renderLog() {
  if (!els.battleLog) return;
  els.battleLog.innerHTML = state.log.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function updateOverlays() {
  const needClass = !state.heroClass;
  const needTutorial = state.heroClass && !state.tutorialDone;
  els.classOverlay?.classList.toggle("hidden", !needClass);
  els.tutorialOverlay?.classList.toggle("hidden", !needTutorial);
}

export function render() {
  normalizeState(state);
  const heroStats = getHeroStats();
  state.maxHeroHp = heroStats.health;
  if (state.heroHp > heroStats.health) state.heroHp = heroStats.health;
  const location = locationForSector(state.sector);
  document.body.dataset.location = location.tint;

  const bgEl = document.getElementById("roadSceneBg");
  const locationVideo = document.getElementById("locationVideo");
  if (els.roadScene && els.roadScene.dataset.bgTint !== location.tint) {
    els.roadScene.dataset.bgTint = location.tint;
    if (bgEl) bgEl.style.backgroundImage = `url('./assets/locations/${location.tint}.png')`;
  }

  if (locationVideo) {
    const videoFile = locationVideoMap[location.name];
    if (videoFile) {
      const src = `./assets/locations/${videoFile}`;
      if (locationVideo.getAttribute("src") !== src) {
        locationVideo.src = src;
        locationVideo.load();
      }
      locationVideo.style.display = "block";
    } else {
      locationVideo.src = "";
      locationVideo.style.display = "none";
    }
  }

  if (els.locationName) els.locationName.textContent = location.name;
  if (els.sectorNumber) els.sectorNumber.textContent = state.sector;
  if (els.sectorProgressBar) els.sectorProgressBar.style.width = `${(state.encounter / 5) * 100}%`;
  if (els.encounterPips)
    els.encounterPips.innerHTML = Array.from({ length: 5 }, (_, i) => `<span class="${i < state.encounter ? "done" : ""}"></span>`).join("");

  if (els.heroHpText) els.heroHpText.textContent = `${Math.max(0, Math.round(state.heroHp))} / ${heroStats.health}`;
  if (els.heroHpBar) els.heroHpBar.style.width = `${clamp((state.heroHp / heroStats.health) * 100, 0, 100)}%`;

  if (state.currentEnemy) {
    const e = state.currentEnemy;
    els.enemyStage?.classList.remove("hidden");
    if (els.enemyName) els.enemyName.textContent = e.name;
    if (els.enemyHpText) els.enemyHpText.textContent = `${Math.max(0, Math.round(e.hp))} / ${e.maxHp}`;
    if (els.enemyHpBar) els.enemyHpBar.style.width = `${clamp((e.hp / e.maxHp) * 100, 0, 100)}%`;
    els.enemyPortrait?.classList.toggle("boss", Boolean(e.bossSide));
    els.enemyPortrait?.classList.toggle("elite", e.elite);
    ["beast", "knight", "demon", "ghost"].forEach((v) => els.enemyPortrait?.classList.remove(`enemy-${v}`));
    if (e.visual) els.enemyPortrait?.classList.add(`enemy-${e.visual}`);
    if (els.enemyImage) {
      const src = enemySpritePath(e.name);
      els.enemyImage.src = src;
      els.enemyImage.alt = e.name;
      els.enemyImage.onerror = () => {
        els.enemyImage.style.display = 'none';
      };
      els.enemyImage.onload = () => {
        els.enemyImage.style.display = 'block';
      };
    }
    if (els.enemyTraits)
      els.enemyTraits.innerHTML = (e.traits || []).map((t) => `<span class="trait-chip">${escapeHtml(t)}</span>`).join("");
    if (els.combatStatus) els.combatStatus.textContent = e.bossSide ? "Босс призван" : e.elite ? "Элитный бой" : "Автобой";
  } else {
    els.enemyStage?.classList.add("hidden");
    if (els.enemyTraits) els.enemyTraits.innerHTML = "";
    if (els.combatStatus)
      els.combatStatus.textContent = state.awaitingEvent ? "Выбор" : state.paused ? "Пауза" : "Поиск встречи";
  }

  renderEnemyPack();
  const need = starHitsRequired();
  if (els.starCharge)
    els.starCharge.innerHTML = Array.from({ length: need }, (_, i) => `<span class="${i < state.starHits ? "filled" : ""}"></span>`).join("");

  renderEvent();
  renderStats(heroStats);
  renderHands();
  renderLoot();
  renderGear();
  renderArtifacts();
  renderDrops();
  renderLog();
  renderBuffBar();
  renderSynergyBar(heroStats);

  const cls = heroClasses.find((c) => c.key === state.heroClass);
  if (els.classBadge) els.classBadge.textContent = cls ? cls.name : "—";

  if (els.pauseToggle) els.pauseToggle.textContent = state.paused ? "Продолжить" : "Пауза";
  if (els.goldValue) els.goldValue.textContent = state.gold;
  if (els.upgradeCount) els.upgradeCount.textContent = state.upgrades;
  if (els.starCount) els.starCount.textContent = state.stars;
  if (els.heavenSouls) els.heavenSouls.textContent = `${state.heavenSouls} / 5`;
  if (els.hellSouls) els.hellSouls.textContent = `${state.hellSouls} / 5`;

  // Allow boss summoning anytime (except during events/choices)
  if (els.summonHeaven) els.summonHeaven.disabled = state.heavenSouls < 5 || state.awaitingEvent;
  if (els.summonHell) els.summonHell.disabled = state.hellSouls < 5 || state.awaitingEvent;
  if (els.upgradeCost) els.upgradeCost.textContent = `Стоимость: ${upgradeCost()} G`;
  if (els.upgradeHero) els.upgradeHero.disabled = state.gold < upgradeCost();
  if (els.rerollLoot) els.rerollLoot.disabled = !state.pendingLoot || state.gold < rerollCost();
  if (els.rerollCost) els.rerollCost.textContent = `Перековка: ${rerollCost()} G`;

  updateOverlays();
}
