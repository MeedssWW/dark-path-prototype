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
  addLog(state, `Выбран класс: ${cls?.name || classKey}.`);

  startCinematic(classKey);
}

let cinematicSlides = [];
let currentSlideIndex = 0;

function startCinematic(classKey) {
  // Define sequence
  if (classKey === "dark_knight") {
    cinematicSlides = [
      { type: "image", src: "assets/events/s2.png", text: "Засада на тракте... Я помню только крики, звон стали и сильный удар по шлему." },
      { type: "image", src: "assets/events/s3.png", text: "Мародеры перебили всех, но моя броня спасла мне жизнь. Мои люди мертвы, но приказ остается приказом." },
      { type: "video", src: "assets/events/s4.mp4", text: "В нагрудном кармане всё еще лежит Письмо с печатью Короля. Я должен дойти до столицы Морна, чего бы это ни стоило. Во имя Эренгарда." }
    ];
  } else if (classKey === "hunter") {
    cinematicSlides = [
      { type: "image", src: "assets/events/s5.png", text: "Дьявол... это была идеальная засада. Я пропустил удар в голову и отключился. Какая бездарная резня." },
      { type: "image", src: "assets/events/s6.png", text: "И кто теперь заплатит мне за охрану этого сброда? Главное, что Письмо на месте. Эти идиоты забрали припасы, но оставили самое ценное." },
      { type: "video", src: "assets/events/s7.mp4", text: "За доставку этого пергамента Корона пообещала столько золота, что хватит на собственный замок. Плевать на мертвецов, пора браться за дело." }
    ];
  } else if (classKey === "cultist") {
    cinematicSlides = [
      { type: "image", src: "assets/events/s8.png", text: "Засада была внезапной. Духи не предупредили меня... или просто хотели насладиться резней. Я очнулся среди крови моих мертвых спутников." },
      { type: "image", src: "assets/events/s9.png", text: "У меня остался лишь ритуальный кинжал и этот кусок пергамента. Я чувствую, как от Письма исходит гнилостная аура." },
      { type: "video", src: "assets/events/s10.mp4", text: "Короли думают, что управляют миром, но духи знают правду: это послание принесет жатву, которой лес еще не видел. И я стану ее вестником." }
    ];
  }

  currentSlideIndex = 0;
  state.awaitingEvent = true; // block game loop
  renderCinematicSlide();
}

let cinematicTimeout1;
let cinematicTimeout2;

function renderCinematicSlide() {
  const overlay = document.getElementById("cinematicOverlay");
  const eyelidTop = document.getElementById("eyelidTop");
  const eyelidBottom = document.getElementById("eyelidBottom");
  const img = document.getElementById("cinematicImage");
  const vid = document.getElementById("cinematicVideo");
  const textEl = document.getElementById("cinematicText");
  const nextHint = document.getElementById("cinematicNextHint");

  if (!overlay) return;

  if (currentSlideIndex >= cinematicSlides.length) {
    // Finish cinematic
    overlay.classList.add("hidden");
    vid.pause();
    showActTitle();
    return;
  }

  clearTimeout(cinematicTimeout1);
  clearTimeout(cinematicTimeout2);
  
  overlay.classList.remove("hidden");
  eyelidTop.style.height = "50%"; // Eyes closed
  eyelidBottom.style.height = "50%";
  textEl.style.opacity = "0";
  if (nextHint) nextHint.style.opacity = "0";

  const slide = cinematicSlides[currentSlideIndex];
  textEl.textContent = slide.text;

  if (slide.type === "image") {
    vid.style.display = "none";
    vid.pause();
    img.src = slide.src;
    img.style.display = "block";
  } else {
    img.style.display = "none";
    vid.src = slide.src;
    vid.style.display = "block";
    vid.play();
  }

  // 1) Open eyes (0.5s delay)
  cinematicTimeout1 = setTimeout(() => {
    eyelidTop.style.height = "0%";
    eyelidBottom.style.height = "0%";
    
    // 2) Show text and hint (2s after eyes open)
    cinematicTimeout2 = setTimeout(() => {
      textEl.style.opacity = "1";
      if (nextHint) nextHint.style.opacity = "1";
    }, 2000);
  }, 500);
}

function showActTitle() {
  const actOverlay = document.getElementById("actTitleOverlay");
  const actText = document.getElementById("actTitleText");
  if (!actOverlay || !actText) return finishAwakening();

  actOverlay.classList.remove("hidden");
  actText.innerHTML = "Акт 1<br><span style='font-size:18px; color:#ccc; letter-spacing:8px;'>Кровавый Тракт</span>";
  
  // Fade in
  setTimeout(() => {
    actOverlay.style.opacity = "1";
  }, 100);

  // Fade out after 4 seconds
  setTimeout(() => {
    actOverlay.style.opacity = "0";
    setTimeout(() => {
      actOverlay.classList.add("hidden");
      finishAwakening();
    }, 2000);
  }, 4000);
}

function finishAwakening() {
  state.awaitingEvent = false;
  state.storyFlags.intro_done = true;
  saveState();
  render();
}

// Hook up cinematic click to continue
document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("cinematicOverlay");
  const nextHint = document.getElementById("cinematicNextHint");
  const eyelidTop = document.getElementById("eyelidTop");
  const eyelidBottom = document.getElementById("eyelidBottom");
  if (overlay) {
    overlay.addEventListener("click", () => {
      // Only allow click if hint is visible
      if (!nextHint || nextHint.style.opacity !== "1") return;
      if (eyelidTop) eyelidTop.style.height = "50%"; // Eyes close
      if (eyelidBottom) eyelidBottom.style.height = "50%";
      setTimeout(() => {
        currentSlideIndex++;
        renderCinematicSlide();
      }, 800); // wait for fade to black
    });
  }
});

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
  
  // End current combat if any (to allow interrupting standard fights)
  if (state.currentEnemy) {
    state.enemyGroup = [];
    state.currentEnemy = null;
  }
  
  // Clear any lingering alive enemies
  state.enemyGroup = [];
  
  // Restore hero HP to max
  const hero = getHeroStats();
  state.heroHp = hero.health; // Fix: use health instead of maxHp
  
  addLog(state, side === "heaven" ? "Врата Рая открыты." : "Врата Ада открыты.");
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
  const bottomContent = document.getElementById("bottomContent");
  const bottomContentTitle = document.getElementById("bottomContentTitle");
  const closeBottomContent = document.getElementById("closeBottomContent");

  function closePopup() {
    tabButtons.forEach((b) => b.classList.remove("active"));
    bottomContent.classList.add("hidden-popup");
    bottomContent.classList.remove("open");
  }

  closeBottomContent?.addEventListener("click", closePopup);

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
      
      const isCurrentlyActive = btn.classList.contains("active");
      
      if (isCurrentlyActive) {
        closePopup();
        return;
      }

      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      
      // Show popup
      bottomContent.classList.remove("hidden-popup");
      bottomContent.classList.add("open");
      
      // Update title based on span text inside button
      const titleSpan = btn.querySelector("span:not(.tab-icon)");
      if (bottomContentTitle && titleSpan) {
        bottomContentTitle.textContent = titleSpan.textContent;
      }
      
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

  els.closeItemDetails?.addEventListener("click", () => {
    els.itemDetailsOverlay?.classList.add("hidden");
  });
  els.itemDetailsOverlay?.addEventListener("click", (e) => {
    if (e.target === els.itemDetailsOverlay) {
      els.itemDetailsOverlay.classList.add("hidden");
    }
  });

  // Event delegation for gear-cell clicks
  document.addEventListener("click", (e) => {
    const gearCell = e.target.closest(".gear-cell");
    if (gearCell && gearCell.dataset.slot) {
      const slotKey = gearCell.dataset.slot;
      import("./render.js").then(({ showItemDetails }) => {
        showItemDetails(slotKey);
      });
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
