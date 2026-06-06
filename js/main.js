import { BALANCE, heroClasses, tutorialSteps, SAVE_KEY } from "./data.js";
import {
  state,
  defaultState,
  saveState,
  getHeroStats,
  upgradeCost,
  updateStars,
  addLog,
  setState,
  updateEpicStat,
} from "./state.js";
import {
  maybeNextEncounter,
  heroAttack,
  enemyAttack,
  resolveBleed,
  reviveAtSectorStart,
  spawnEnemy,
} from "./combat.js";
import { equipPendingLoot, sellPendingLoot, rerollPendingLoot } from "./loot.js";
import { audio } from "./audio.js";
import { bindElements, render, els, setCombatStatus, setSpeedMultiplier } from "./render.js";
import { getSpeedMultiplier } from "./fx.js";
import { getAliveEnemies } from "./state.js";
import { checkMilestones } from "./milestones.js";

let tickTimer = null;
let combatAnimating = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms / getSpeedMultiplier()));
}

async function playCombatPhase(className, label, duration) {
  render();
  setCombatStatus(label);
  els.roadScene?.classList.add(className);
  await wait(duration);
  els.roadScene?.classList.remove(className);
}

async function combatTick() {
  if (combatAnimating) return;
  if (!state.heroClass) return render();
  if (state.paused || state.awaitingEvent || state.pendingLoot) return render();

  maybeNextEncounter();
  if (!state.currentEnemy) return render();
  combatAnimating = true;

  // Safety: force-unlock combatAnimating after 4 seconds in case of any error
  const safetyTimer = setTimeout(() => { combatAnimating = false; }, 4000);

  try {
    const heroStats = getHeroStats();
    if (state.heroHp > heroStats.health) state.heroHp = heroStats.health;
    state.maxHeroHp = heroStats.health;

    render();
    setCombatStatus("Кровотечение");
    resolveBleed();
    if (!state.currentEnemy) {
      saveState();
      render();
      return;
    }

    await playCombatPhase("hero-attack", "Атака героя", 420);
    heroAttack(heroStats);
    saveState();
    render();
    if (!state.currentEnemy) return;

    await wait(260);
    await playCombatPhase("enemy-attack", "Атака врага", 430);
    enemyAttack(heroStats);
    if (state.heroHp <= 0) reviveAtSectorStart(heroStats);

    saveState();
    render();
  } finally {
    clearTimeout(safetyTimer);
    combatAnimating = false;
  }
}

function startTickLoop() {
  clearInterval(tickTimer);
  tickTimer = setInterval(combatTick, Math.round(BALANCE.tickMs / getSpeedMultiplier()));
}

function selectClass(classKey) {
  state.heroClass = classKey;
  const cls = heroClasses.find((c) => c.key === classKey);
  addLog(state, `Путь выбран: ${cls?.name || classKey}.`);
  saveState();
  render();
}

function setupClassOverlay() {
  const grid = document.getElementById("classChoices");
  if (!grid) return;
  grid.innerHTML = heroClasses
    .map(
      (c) => `<button type="button" class="class-card" data-class="${c.key}">
      <strong>${c.name}</strong>
      <p>${c.desc}</p>
    </button>`
    )
    .join("");
  grid.querySelectorAll("[data-class]").forEach((btn) => {
    btn.addEventListener("click", () => selectClass(btn.dataset.class));
  });
}

let tutorialIndex = 0;

function setupTutorial() {
  const nextBtn = document.getElementById("tutorialNext");
  const skipBtn = document.getElementById("tutorialSkip");
  const update = () => {
    const step = tutorialSteps[tutorialIndex];
    const title = document.getElementById("tutorialTitle");
    const text = document.getElementById("tutorialText");
    const progress = document.getElementById("tutorialProgress");
    if (title) title.textContent = step.title;
    if (text) text.textContent = step.text;
    if (progress) progress.textContent = `${tutorialIndex + 1} / ${tutorialSteps.length}`;
    if (nextBtn) nextBtn.textContent = tutorialIndex >= tutorialSteps.length - 1 ? "В бой" : "Далее";
  };
  nextBtn?.addEventListener("click", () => {
    if (tutorialIndex >= tutorialSteps.length - 1) {
      state.tutorialDone = true;
      saveState();
      render();
      return;
    }
    tutorialIndex += 1;
    update();
  });
  skipBtn?.addEventListener("click", () => {
    state.tutorialDone = true;
    saveState();
    render();
  });
  update();
}

function upgradeHero() {
  const cost = upgradeCost();
  if (state.gold < cost) return;
  state.gold -= cost;
  state.upgrades += 1;
  const stats = getHeroStats();
  state.heroHp = Math.min(stats.health, state.heroHp + Math.round(stats.health * 0.18));
  updateStars(state);
  addLog(state, `Герой улучшен. Уровень: ${state.upgrades}.`);
  saveState();
  render();
}

function summonBoss(side) {
  if (state[`${side}Souls`] < 5 || state.currentEnemy || state.awaitingEvent) return;
  if (getAliveEnemies().length) return;
  addLog(state, side === "heaven" ? "Пять душ открыли врата Рая." : "Пять душ открыли врата Ада.");
  spawnEnemy(state, false, side);
  saveState();
  render();
}

function init() {
  bindElements();
  setupClassOverlay();
  setupTutorial();
  updateEpicStat();
  render();
  checkMilestones(state);

  els.pauseToggle?.addEventListener("click", () => {
    state.paused = !state.paused;
    saveState();
    render();
  });

  document.getElementById("speedToggle")?.addEventListener("click", () => {
    const next = getSpeedMultiplier() === 1 ? 2 : 1;
    setSpeedMultiplier(next);
    document.body.classList.toggle("speed-2x", next === 2);
    const btn = document.getElementById("speedToggle");
    if (btn) btn.textContent = `${next}x`;
    startTickLoop();
  });

  els.upgradeHero?.addEventListener("click", upgradeHero);
  els.equipLoot?.addEventListener("click", () => {
    equipPendingLoot();
    saveState();
    render();
  });
  els.sellLoot?.addEventListener("click", () => {
    sellPendingLoot();
    saveState();
    render();
  });
  els.rerollLoot?.addEventListener("click", () => {
    if (rerollPendingLoot()) {
      saveState();
      render();
    }
  });
  els.summonHeaven?.addEventListener("click", () => summonBoss("heaven"));
  els.summonHell?.addEventListener("click", () => summonBoss("hell"));

  els.openGearModal?.addEventListener("click", () => {
    els.gearModal?.classList.remove("hidden");
  });

  els.closeGearModal?.addEventListener("click", () => {
    els.gearModal?.classList.add("hidden");
  });

  els.gearModal?.addEventListener("click", (e) => {
    if (e.target === els.gearModal) {
      els.gearModal.classList.add("hidden");
    }
  });

  els.resetRun?.addEventListener("click", () => {
    if (!confirm("Сбросить прогресс?")) return;
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem("dark-path-prototype-save-v1");
    combatAnimating = false;
    setState(structuredClone(defaultState));
    tutorialIndex = 0;
    startTickLoop();
    render();
  });

  els.audioToggle?.addEventListener("click", async () => {
    await audio.toggleMusic(els.musicPlayer, els.audioToggle);
    if (!els.musicPlayer?.paused) return;
    if (!document.querySelector(".audio-hint")) {
      addLog(state, "Музыка: ♪ (MP3 или синтез). Положи hide-cs01-slowed.mp3 в assets/.");
      render();
    }
  });

  startTickLoop();
}

init();
