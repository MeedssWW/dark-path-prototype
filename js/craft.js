import { state, saveState, addLog } from "./state.js";
import { generateItem } from "./loot.js";
import { checkMilestones } from "./milestones.js";
import { slots } from "./data.js";

window.craftGrid = [null, null, null, null, null, null, null, null, null];
window.selectedCraftResource = null;

const RECIPES = [
  { result: "weapon", pattern: [null, "iron", null, null, "iron", null, null, "wood", null] }, // Меч
  { result: "weapon", pattern: [null, "iron", null, null, "wood", null, null, "wood", null] }, // Кинжал/Меч послабее
  { result: "chest", pattern: ["iron", null, "iron", "iron", "iron", "iron", "iron", "iron", "iron"] },
  { result: "helmet", pattern: ["iron", "iron", "iron", "iron", null, "iron", null, null, null] },
  { result: "shoulder", pattern: ["iron", "iron", "iron", "iron", null, "iron", "iron", null, "iron"] },
  { result: "boots", pattern: [null, null, null, "iron", null, "iron", "iron", null, "iron"] },
  { result: "ring", pattern: [null, "resin", null, "iron", null, "iron", null, "iron", null] },
  { result: "necklace", pattern: [null, "iron", null, null, "resin", null, null, "iron", null] },
  { result: "talisman", pattern: [null, "soulDust", null, "bone", "reagent", "bone", null, "soulDust", null] }
];

// Map UI keys to actual state.resources keys
const RES_MAP = {
  iron: "iron",
  soul_dust: "soulDust",
  bone: "bone",
  resin: "resin",
  reagent: "reagent",
  wood: "wood"
};

const RES_NAMES = {
  iron: "Железо",
  soulDust: "Пыль Душ",
  bone: "Кость",
  resin: "Смола",
  reagent: "Реагент",
  wood: "Древесина"
};

window.selectCraftResource = function(resKey) {
  window.selectedCraftResource = resKey;
  renderCraftUI();
};

window.showRecipesModal = function() {
  const modal = document.getElementById("recipesModal");
  const list = document.getElementById("recipesList");
  if (!modal || !list) return;

  if (!state.unlockedRecipes || state.unlockedRecipes.length === 0) {
    list.innerHTML = "<p style='color:#777; width:100%; text-align:center;'>У вас нет открытых рецептов.</p>";
  } else {
    list.innerHTML = state.unlockedRecipes.map(resKey => {
      const recipe = RECIPES.find(r => r.result === resKey);
      if (!recipe) return '';
      const name = slots.find(s => s.key === resKey)?.name || resKey;
      
      const gridHtml = recipe.pattern.map(p => {
        const bg = p ? `url(./assets/items/${p}.png)` : 'none';
        return `<div style="width:24px; height:24px; border:1px solid #444; background: ${bg} center/contain no-repeat #2a2a2a;"></div>`;
      }).join("");

      return `
        <div style="background: rgba(255,255,255,0.05); border: 1px solid #555; border-radius: 8px; padding: 10px; display:flex; flex-direction:column; align-items:center;">
          <h4 style="margin: 0 0 10px 0; color: #ddd;">${name}</h4>
          <div style="display:grid; grid-template-columns: repeat(3, 24px); gap: 2px;">
            ${gridHtml}
          </div>
        </div>
      `;
    }).join("");
  }
  
  modal.classList.remove("hidden-popup");
};

window.clickCraftSlot = function(index) {
  if (!window.selectedCraftResource) {
    // If click on a filled slot without selection, remove the item back to inventory
    if (window.craftGrid[index]) {
      const res = window.craftGrid[index];
      state.resources[res] = (state.resources[res] || 0) + 1;
      window.craftGrid[index] = null;
      saveState();
      renderCraftUI();
    }
    return;
  }

  const resKey = RES_MAP[window.selectedCraftResource] || window.selectedCraftResource;
  
  if (window.craftGrid[index] === resKey) return; // already there
  
  // Return existing item
  if (window.craftGrid[index]) {
    const oldRes = window.craftGrid[index];
    state.resources[oldRes] = (state.resources[oldRes] || 0) + 1;
  }

  // Deduct new item if we have it
  if (!state.resources) state.resources = {};
  if ((state.resources[resKey] || 0) > 0) {
    state.resources[resKey]--;
    window.craftGrid[index] = resKey;
  } else {
    showCraftMsg("Не хватает ресурса: " + RES_NAMES[resKey], "#e55");
  }

  saveState();
  renderCraftUI();
};

window.clearCraftGrid = function() {
  window.craftGrid.forEach((res, index) => {
    if (res) {
      state.resources[res] = (state.resources[res] || 0) + 1;
      window.craftGrid[index] = null;
    }
  });
  window.selectedCraftResource = null;
  saveState();
  renderCraftUI();
  showCraftMsg("Сетка очищена", "#ccc");
};

function checkRecipe() {
  for (const recipe of RECIPES) {
    let match = true;
    for (let i = 0; i < 9; i++) {
      if (window.craftGrid[i] !== recipe.pattern[i]) {
        match = false;
        break;
      }
    }
    if (match) return recipe.result;
  }
  return null;
}

window.attemptGridCraft = function() {
  const resultSlot = checkRecipe();
  
  if (!resultSlot) {
    showCraftMsg("Неизвестный рецепт!", "#e55");
    return;
  }

  // Clear grid (items are already deducted from inventory when placed)
  window.craftGrid.fill(null);

  // Determine rarity
  const roll = Math.random();
  let rarityKey = "common";
  if (roll > 0.95) rarityKey = "legendary";
  else if (roll > 0.8) rarityKey = "epic";
  else if (roll > 0.5) rarityKey = "rare";
  else if (roll > 0.2) rarityKey = "uncommon";

  const itemLevel = state.sector * 10;
  const item = generateItem(resultSlot, itemLevel, rarityKey);
  
  // Add directly to inventory
  const old = state.inventory[item.slot];
  if (old) state.gold += Math.floor(old.value * 0.45);
  state.inventory[item.slot] = item;
  
  addLog(state, `Скрафчен предмет: ${item.name}`);
  showCraftMsg(`Успех! Создано: ${item.name}`, item.rarity.color || "#6c4");
  
  saveState();
  checkMilestones(state);
  
  import("./render.js").then(({ render }) => render());
  renderCraftUI();
};

function showCraftMsg(msg, color) {
  const resultEl = document.getElementById("craftingResult");
  if (resultEl) {
    resultEl.textContent = msg;
    resultEl.style.color = color;
    setTimeout(() => { if (resultEl.textContent === msg) resultEl.textContent = ""; }, 3000);
  }
}

export function renderCraftUI() {
  const countersEl = document.getElementById("resourceCounters");
  const gridEl = document.getElementById("minecraftGrid");
  const previewEl = document.getElementById("craftPreview");
  if (!countersEl || !gridEl) return;

  if (!state.resources) state.resources = {};

  // Render resource counters
  const resList = ["iron", "soul_dust", "bone", "resin", "reagent", "wood"];
  countersEl.innerHTML = resList.map(resKey => {
    const stateKey = RES_MAP[resKey];
    const count = state.resources[stateKey] || 0;
    const isSelected = window.selectedCraftResource === resKey;
    const selStyle = isSelected ? "box-shadow: 0 0 10px #ffea00; border-color: #ffea00; transform: scale(1.1);" : "border-color: #444;";
    
    return `<div onclick="window.selectCraftResource('${resKey}')" style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; padding: 4px; border: 2px solid transparent; border-radius: 8px; transition: all 0.2s; ${selStyle}" title="${RES_NAMES[stateKey]}">
      <img src="./assets/items/${resKey}.png" style="width:36px; height:36px; filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));" onerror="this.style.display='none'">
      <span style="font-size: 14px; font-weight: bold; color: ${count > 0 ? '#eee' : '#666'};">${count}</span>
    </div>`;
  }).join("");

  // Render 3x3 grid
  gridEl.innerHTML = window.craftGrid.map((res, idx) => {
    const imgSrc = res ? `./assets/items/${Object.keys(RES_MAP).find(k => RES_MAP[k] === res)}.png` : '';
    const imgHtml = res ? `<img src="${imgSrc}" style="width: 80%; height: 80%; object-fit: contain;">` : '';
    return `<div onclick="window.clickCraftSlot(${idx})" style="width: 100%; height: 100%; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: inset 0 0 5px rgba(0,0,0,0.5);">
      ${imgHtml}
    </div>`;
  }).join("");

  // Check preview
  const resultSlot = checkRecipe();
  if (resultSlot) {
    previewEl.innerHTML = `<img src="./assets/equipment/${resultSlot}.png" style="width: 48px; height: 48px; filter: drop-shadow(0 0 10px rgba(255,215,0,0.5));">`;
  } else {
    previewEl.innerHTML = `<span style="color:#555; font-size:12px;">Пусто</span>`;
  }
}
