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
    "playerWeaponImg",
    "playerOffhandImg",
    "realLeftArm",
    "realRightArm",
    "combatStatus",
    "starCharge",
    "eventOverlay",
    "eventTag",
    "eventTitle",
    "eventText",
    "eventChoices",
    "eventImage",
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
    "itemDetailsOverlay",
    "detailSlotName",
    "closeItemDetails",
    "detailIcon",
    "detailName",
    "detailLevel",
    "detailStats",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

export function setSpeedMultiplier(v) {
  setFxSpeed(v);
}

// Chroma Key (Green Screen Removal) utility
const chromaCache = new Map();
function processChromaKey(src) {
  if (chromaCache.has(src)) return Promise.resolve(chromaCache.get(src));
  
  return new Promise((resolve) => {
    const img = new Image();
    // Do NOT set crossOrigin, since we are on the same domain it causes CORS cache poisoning on GH Pages
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Downscale for massive performance boost
      let scale = 1;
      const maxDim = 256; 
      if (img.width > maxDim || img.height > maxDim) {
        scale = maxDim / Math.max(img.width, img.height);
      }
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);
      
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i], g = data[i+1], b = data[i+2];
          // Detect strong green: Green is dominant
          if (g > 120 && r < 120 && b < 120 && g > r * 1.5 && g > b * 1.5) {
            let maxOther = Math.max(r, b);
            if (g > maxOther + 40) {
              data[i+3] = 0; // Fully transparent
            } else {
              data[i+3] = Math.max(0, 255 - (g - maxOther) * 3);
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
        // Use webp for smaller data URL, faster decoding
        const dataUrl = canvas.toDataURL("image/webp", 0.8);
        chromaCache.set(src, dataUrl);
        resolve(dataUrl);
      } catch (e) {
        console.error("Chroma key error", e);
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

function loadFpAssets() {
  const v = 8; // Fixed cache buster to avoid redownloading 2MB every refresh
  processChromaKey(`./assets/first_person/left_arm.png?v=${v}`).then(url => {
    if(els.realLeftArm) { els.realLeftArm.src = url; }
  });
  processChromaKey(`./assets/first_person/right_arm.png?v=${v}`).then(url => {
    if(els.realRightArm) { els.realRightArm.src = url; }
  });
  processChromaKey(`./assets/first_person/sword.png?v=${v}`).then(url => {
    if(els.playerWeaponImg) { els.playerWeaponImg.src = url; }
  });
  processChromaKey(`./assets/first_person/talisman.png?v=${v}`).then(url => {
    if(els.playerOffhandImg) { els.playerOffhandImg.src = url; }
  });
}

function getSlotIcon(item) {
  const slot = item ? item.slot : null;
  return slot ? `./assets/equipment/${slot}.png` : '';
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
  if (!state.bossUnlocked) {
    els.synergyBar.innerHTML = '<span class="synergy-chip muted">Неизвестно</span>';
  } else {
    els.synergyBar.innerHTML = parts.join("") || '<span class="synergy-chip muted">Нет синергий</span>';
  }
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
    els.eventOverlay?.classList.add("hidden");
    return;
  }
  const event = state.currentEvent;
  els.eventOverlay?.classList.remove("hidden");
  if (els.eventTag) els.eventTag.textContent = event.kind || "Событие";
  if (els.eventTitle) els.eventTitle.textContent = event.title;
  if (els.eventText) els.eventText.textContent = event.text;
  
  if (els.eventImage) {
    if (event.image) {
      els.eventImage.src = event.image;
      els.eventImage.style.display = "block";
    } else {
      els.eventImage.style.display = "none";
    }
  }

  if (!els.eventChoices) return;
  els.eventChoices.innerHTML = "";
  event.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = choice.label;
    button.addEventListener("click", () => {
      runEventEffect(choice.effectKey, state);
      finishEvent(state);
      render();
    });
      els.eventChoices.appendChild(button);
  });
  
  els.speedToggle?.addEventListener("click", () => {
    state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 4 : 1;
    setSpeedMultiplier(state.speed);
    els.speedToggle.textContent = `${state.speed}x`;
    if (state.speed > 1) els.speedToggle.classList.add("active");
    else els.speedToggle.classList.remove("active");
  });
  
  loadFpAssets();
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
  
  // Hand rendering
  if (els.realLeftArm) {
    els.realLeftArm.style.display = 'block';
  }
  if (els.realRightArm) {
    els.realRightArm.style.display = 'block';
  }

  // Weapon and Offhand
  if (els.playerWeaponImg) {
    if (weapon) {
      els.playerWeaponImg.style.display = 'block';
      els.playerWeaponImg.src = `./assets/equipment/${weapon.type.key}.png`;
    } else {
      els.playerWeaponImg.style.display = 'none';
    }
  }
  if (els.playerOffhandImg) {
    if (offhand) {
      els.playerOffhandImg.style.display = 'block';
      els.playerOffhandImg.src = `./assets/equipment/${offhand.type.key}.png`;
    } else {
      els.playerOffhandImg.style.display = 'none';
    }
  }
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
    const iconKey = item.type?.visual || item.slot;
    const iconSrc = `./assets/equipment/${iconKey}.png`;
    els.lootIcon.className = 'item-icon-img large';
    els.lootIcon.innerHTML = `<img src="${iconSrc}" alt="${item.type?.name || item.slot}" onerror="this.style.display='none'">`;
    els.lootIcon.style.cssText = `border-color: ${item.rarity.color}55; box-shadow: 0 0 20px ${item.rarity.color}33;`;
  }
  if (els.lootRarityBadge) {
    els.lootRarityBadge.textContent = item.rarity.name;
    els.lootRarityBadge.style.borderColor = item.rarity.color;
    els.lootRarityBadge.style.color = item.rarity.color;
  }
  if (els.lootStats) els.lootStats.innerHTML = `<span style="color:var(--gold); font-weight:bold;">УР. ${item.level}</span> • ${item.slotName}. Продажа: ${item.value} G`;
  if (els.lootCompare) els.lootCompare.innerHTML = renderComparison(comparison, current);
}

function renderGear() {
  if (!els.gearGrid) return;
  els.gearGrid.innerHTML = slots
    .map((slot) => {
      const item = state.inventory[slot.key];
      const iconKey = item?.type?.visual || slot.key;
      const iconSrc = `./assets/equipment/${iconKey}.png`;
      if (!item) {
        return `<div class="gear-cell empty" data-slot="${slot.key}" title="${slot.name}: Пусто">
          <div class="gear-cell-icon"><img src="./assets/equipment/${slot.key}.png" alt="${slot.name}" onerror="this.style.display='none'"></div>
          <span class="gear-cell-label">${slot.name}</span>
        </div>`;
      }
      return `<div class="gear-cell" data-slot="${slot.key}" style="--rarity-c:${item.rarity.color}">
        <div class="gear-cell-icon" style="border-color: ${item.rarity.color}66; box-shadow: 0 0 10px ${item.rarity.color}33">
          <img src="${iconSrc}" alt="${item.type?.name || slot.name}" onerror="this.style.display='none'">
        </div>
        <span class="gear-cell-label" style="color:${item.rarity.color}">${slot.name}</span>
      </div>`;
    })
    .join("");
}

function renderJournal() {
  const container = document.getElementById("journalEntries");
  if (!container) return;
  if (!state.journalEntries || state.journalEntries.length === 0) {
    container.innerHTML = '<p class="muted-text">Дневник пуст. Ищи ответы в пути.</p>';
    return;
  }
  container.innerHTML = state.journalEntries
    .map((entry) => `
      <div class="journal-entry">
        <strong>${entry.title}</strong>
        <p>${entry.text}</p>
      </div>
    `)
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
  renderJournal();
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

  // Hide or disable boss actions based on unlocks
  const bossActions = document.querySelector('.boss-actions');
  if (bossActions) {
    if (state.bossUnlocked) {
      bossActions.style.display = 'flex';
      if (els.summonHeaven) els.summonHeaven.disabled = state.heavenSouls < 5 || state.awaitingEvent;
      if (els.summonHell) els.summonHell.disabled = state.hellSouls < 5 || state.awaitingEvent;
    } else {
      bossActions.style.display = 'none';
    }
  }

  if (els.upgradeCost) els.upgradeCost.textContent = `Стоимость: ${upgradeCost()} G`;
  if (els.upgradeHero) els.upgradeHero.disabled = state.gold < upgradeCost();
  if (els.rerollLoot) els.rerollLoot.disabled = !state.pendingLoot || state.gold < rerollCost();
  if (els.rerollCost) els.rerollCost.textContent = `Перековка: ${rerollCost()} G`;

  updateOverlays();
}

export function showItemDetails(slotKey) {
  const item = state.inventory[slotKey];
  const slotData = slots.find((s) => s.key === slotKey);
  if (!item) {
    els.detailSlotName.textContent = slotData ? slotData.name : "Слот";
    els.detailName.textContent = "Пусто";
    els.detailLevel.textContent = "";
    els.detailStats.innerHTML = "<p style='color: var(--dim);'>В этом слоте нет снаряжения.</p>";
    els.detailIcon.innerHTML = `<img src="./assets/equipment/${slotKey}.png" alt="Пусто" onerror="this.style.display='none'" style="opacity: 0.3; filter: grayscale(1);">`;
    els.detailIcon.style.borderColor = "var(--line)";
    els.detailIcon.style.boxShadow = "none";
    els.itemDetailsOverlay?.classList.remove("hidden");
    return;
  }
  
  els.detailSlotName.textContent = slotData ? slotData.name : "Снаряжение";
  els.detailName.textContent = item.name;
  els.detailName.style.color = item.rarity.color;
  els.detailLevel.textContent = `УР. ${item.level || 1} • ${item.rarity.name}`;
  els.detailLevel.style.color = item.rarity.color;
  
  els.detailIcon.innerHTML = `<img src="./assets/equipment/${slotKey}.png" alt="${item.name}" onerror="this.style.display='none'">`;
  els.detailIcon.style.borderColor = `${item.rarity.color}66`;
  els.detailIcon.style.boxShadow = `0 0 10px ${item.rarity.color}33`;
  
  els.detailStats.innerHTML = Object.entries(item.stats)
    .map(([key, value]) => {
      const label = statLabels[key] || key;
      const formatted = formatStatValue(key, value, true);
      return `<div style="display: flex; justify-content: space-between; font-size: 13px;">
        <span style="color: var(--muted);">${label}</span>
        <strong style="color: var(--gold);">${formatted}</strong>
      </div>`;
    })
    .join("");
    
  els.itemDetailsOverlay?.classList.remove("hidden");
}
