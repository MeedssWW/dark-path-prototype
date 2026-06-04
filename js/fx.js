let speedMultiplier = 1;
let roadSceneEl = null;
let enemyStageEl = null;
let enemyPortraitEl = null;
let combatStatusEl = null;

export function initFx() {
  roadSceneEl = document.getElementById("roadScene");
  enemyStageEl = document.getElementById("enemyStage");
  enemyPortraitEl = document.getElementById("enemyPortrait");
  combatStatusEl = document.getElementById("combatStatus");
}

export function setSpeedMultiplier(v) {
  speedMultiplier = v;
}

export function getSpeedMultiplier() {
  return speedMultiplier;
}

export function showFloatingNumber(text, type = "normal", target = "enemy") {
  const container = target === "enemy" ? enemyStageEl : document.getElementById("heroHudFloat");
  if (!container) return;
  const el = document.createElement("div");
  el.className = `floating-number fn-${type}`;
  el.textContent = text;
  el.style.left = `${30 + Math.random() * 40}%`;
  container.appendChild(el);
  setTimeout(() => el.remove(), speedMultiplier > 1 ? 600 : 1200);
}

export function showEnemyEffect(effectClass) {
  if (!enemyPortraitEl) return;
  enemyPortraitEl.classList.remove(effectClass);
  void enemyPortraitEl.offsetWidth;
  enemyPortraitEl.classList.add(effectClass);
  setTimeout(() => enemyPortraitEl.classList.remove(effectClass), speedMultiplier > 1 ? 300 : 600);
}

export function flashStarBurst() {
  roadSceneEl?.classList.add("star-burst-flash");
  setTimeout(() => roadSceneEl?.classList.remove("star-burst-flash"), 500);
}

export function setCombatStatus(label) {
  if (combatStatusEl) combatStatusEl.textContent = label;
}
