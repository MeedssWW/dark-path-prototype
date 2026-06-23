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
  // Allow boss summoning anytime, require 5 souls
  if (state[`${side}Souls`] < 5) return;
  
  // If already in combat, can't summon
  if (state.currentEnemy && !state.currentEnemy.bossSide) return;
  
  // End current combat if any
  if (state.currentEnemy) {
    state.enemyGroup = [];
    state.currentEnemy = null;
  }
  
  // Clear any lingering alive enemies
  state.enemyGroup = [];
  
  // Restore hero HP to max
  const hero = getHeroStats();
  state.heroHp = hero.maxHp;
  
  addLog(state, side === "heaven" ? "Пять душ открыли врата Рая." : "Пять душ открыли врата Ада.");
  spawnEnemy(state, false, side);
  saveState();
  render();
}

function setupLootSwipes() {
  let startX = 0, currentX = 0, isDragging = false;
  if (!els.lootCard) return;

  // Touch события
  els.lootCard.addEventListener('touchstart', (e) => {
    if (!state.pendingLoot) return;
    startX = e.touches[0].clientX;
    currentX = 0;
    isDragging = true;
    els.lootCard.classList.add('dragging');
    els.lootCard.style.transition = 'none';
  }, { passive: true });

  els.lootCard.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX - startX;
    const rotation = currentX * 0.05;
    els.lootCard.style.transform = `translate(calc(-50% + ${currentX}px), -50%) rotate(${rotation}deg)`;
    
    // Визуальная подсказка
    els.lootCard.classList.remove('swipe-left', 'swipe-right');
    if (currentX > 50) els.lootCard.classList.add('swipe-right');
    else if (currentX < -50) els.lootCard.classList.add('swipe-left');
  }, { passive: true });

  els.lootCard.addEventListener('touchend', handleSwipeEnd);

  // Mouse события
  els.lootCard.addEventListener('mousedown', (e) => {
    if (!state.pendingLoot) return;
    startX = e.clientX;
    currentX = 0;
    isDragging = true;
    els.lootCard.classList.add('dragging');
    els.lootCard.style.transition = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    currentX = e.clientX - startX;
    const rotation = currentX * 0.05;
    els.lootCard.style.transform = `translate(calc(-50% + ${currentX}px), -50%) rotate(${rotation}deg)`;
    
    // Визуальная подсказка
    els.lootCard.classList.remove('swipe-left', 'swipe-right');
    if (currentX > 50) els.lootCard.classList.add('swipe-right');
    else if (currentX < -50) els.lootCard.classList.add('swipe-left');
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    handleSwipeEnd();
  });

  function handleSwipeEnd() {
    if (!isDragging) return;
    isDragging = false;
    els.lootCard.classList.remove('dragging', 'swipe-left', 'swipe-right');
    els.lootCard.style.transition = 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.3s';
    
    const threshold = 100;
    
    if (currentX > threshold) {
      // Свайп вправо — надеть
      els.lootCard.style.transform = 'translate(calc(150%), -50%) rotate(20deg)';
      els.lootCard.style.opacity = '0';
      setTimeout(() => {
        equipPendingLoot();
        checkMilestones(state);
        saveState();
        render();
        resetLootCardStyle();
      }, 300);
    } else if (currentX < -threshold) {
      // Свайп влево — продать
      els.lootCard.style.transform = 'translate(calc(-250%), -50%) rotate(-20deg)';
      els.lootCard.style.opacity = '0';
      setTimeout(() => {
        sellPendingLoot();
        checkMilestones(state);
        saveState();
        render();
        resetLootCardStyle();
      }, 300);
    } else {
      // Возврат на место
      resetLootCardStyle();
    }
  }

  function resetLootCardStyle() {
    els.lootCard.style.transform = '';
    els.lootCard.style.opacity = '';
    els.lootCard.style.transition = '';
  }
}

function init() {
  bindElements();
  setupClassOverlay();
  setupTutorial();
  updateEpicStat();
  render();
  checkMilestones(state);
  setupLootSwipes();

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

  // Setup bottom tab switching
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");
  
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab;
      
      // Reset tab — special action
      if (tabName === "reset") {
        if (!confirm("Сбросить прогресс?")) return;
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem("dark-path-prototype-save-v1");
        combatAnimating = false;
        setState(structuredClone(defaultState));
        tutorialIndex = 0;
        startTickLoop();
        render();
        return;
      }
      
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      
      tabPanels.forEach((panel) => {
        if (panel.dataset.tab === tabName) {
          panel.classList.remove("hidden");
        } else {
          panel.classList.add("hidden");
        }
      });
    });
  });

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

  // resetRun is now handled through the "reset" tab

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
