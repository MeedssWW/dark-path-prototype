import { state, saveState, addLog } from "./state.js";
import { generateItem, craftSpecificItem } from "./loot.js";
import { checkMilestones } from "./milestones.js";
import { slots, statLabels, percentStats } from "./data.js";

window.craftGrid = [null, null, null, null, null, null, null, null, null];
window.selectedCraftResource = null;

const RECIPES = [
  // Common Weapons
  { id: "iron_sword_common", type: "sword", rarity: "common", pattern: [null, "iron", null, null, "iron", null, null, "wood", null] }, // Железный Меч
  { id: "iron_axe_common", type: "axe", rarity: "common", pattern: ["iron", "iron", null, "iron", "wood", null, null, "wood", null] }, // Топор
  { id: "iron_dagger_common", type: "dagger", rarity: "common", pattern: [null, null, null, null, "iron", null, null, "wood", null] }, // Кинжал
  
  // Rare Weapons
  { id: "bone_scythe_rare", type: "scythe", rarity: "rare", pattern: ["bone", "bone", "iron", null, "wood", null, null, "wood", null] }, // Коса
  { id: "shadow_sword_rare", type: "sword", rarity: "rare", pattern: [null, "soulDust", null, null, "iron", null, null, "wood", null] }, // Теневой Меч

  // Common Armor
  { id: "plate_chest_common", type: "plate", rarity: "common", pattern: ["iron", null, "iron", "iron", "iron", "iron", "iron", "iron", "iron"] },
  { id: "iron_helm_common", type: "iron_helm", rarity: "common", pattern: ["iron", "iron", "iron", "iron", null, "iron", null, null, null] },
  { id: "iron_boots_common", type: "iron_boots", rarity: "common", pattern: [null, null, null, "iron", null, "iron", "iron", null, "iron"] },
  
  // Rare Armor
  { id: "bone_mask_rare", type: "bone_mask", rarity: "rare", pattern: ["bone", "bone", "bone", "bone", null, "bone", null, null, null] },
  
  // Accessories (Common)
  { id: "ring_band_common", type: "band", rarity: "common", pattern: [null, "resin", null, "iron", null, "iron", null, "iron", null] },
  { id: "necklace_pendant_common", type: "pendant", rarity: "common", pattern: [null, "iron", null, null, "resin", null, null, "iron", null] },
  
  // Talisman (Rare)
  { id: "talisman_orb_rare", type: "orb", rarity: "rare", pattern: [null, "soulDust", null, "bone", "reagent", "bone", null, "soulDust", null] }
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
      const recipe = RECIPES.find(r => r.id === resKey);
      if (!recipe) return '';
      
      let name = recipe.id;
      if (recipe.id.includes("sword")) name = "Меч";
      else if (recipe.id.includes("axe")) name = "Топор";
      else if (recipe.id.includes("dagger")) name = "Кинжал";
      else if (recipe.id.includes("scythe")) name = "Коса";
      else if (recipe.id.includes("chest")) name = "Нагрудник";
      else if (recipe.id.includes("helm")) name = "Шлем";
      else if (recipe.id.includes("boots")) name = "Сапоги";
      else if (recipe.id.includes("ring")) name = "Кольцо";
      else if (recipe.id.includes("necklace")) name = "Амулет";
      else if (recipe.id.includes("talisman")) name = "Сфера";
      
      const rarityColor = recipe.rarity === "common" ? "#ccc" : (recipe.rarity === "rare" ? "#4da6ff" : "#fff");

      const gridHtml = recipe.pattern.map(p => {
        const bg = p ? `url(./assets/items/${Object.keys(RES_MAP).find(k => RES_MAP[k] === p) || p}.png)` : 'none';
        return `<div style="width:24px; height:24px; border:1px solid #444; background: ${bg} center/contain no-repeat #2a2a2a;"></div>`;
      }).join("");

      return `
        <div style="background: rgba(255,255,255,0.05); border: 1px solid #555; border-radius: 8px; padding: 10px; display:flex; flex-direction:column; align-items:center;">
          <h4 style="margin: 0 0 10px 0; color: ${rarityColor};">${name} (${recipe.rarity})</h4>
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
    if (match) return recipe;
  }
  return null;
}

window.attemptGridCraft = function() {
  const recipe = checkRecipe();
  
  if (!recipe) {
    showCraftMsg("Неизвестный рецепт!", "#e55");
    return;
  }

  // Clear grid (items are already deducted from inventory when placed)
  window.craftGrid.fill(null);

  const itemLevel = state.sector * 10;
  const item = craftSpecificItem(recipe.type, recipe.rarity, itemLevel);
  
  if (!item) {
    showCraftMsg("Ошибка крафта: Предмет не найден", "#e55");
    return;
  }

  // Add directly to inventory
  let slotKey = null;
  const foundSlot = slots.find(s => s.name === item.slotName);
  if (foundSlot) {
     slotKey = foundSlot.key;
  } else {
     // fallback if not found
     slotKey = "weapon";
  }
  item.slot = slotKey;

  const oldItem = state.inventory[slotKey];
  if (oldItem) state.gold += Math.floor(oldItem.value * 0.45 || 10);
  state.inventory[slotKey] = item;
  
  const statsTextArray = Object.entries(item.stats).map(([k, v]) => {
    const isPercent = percentStats.has(k);
    return `+${isPercent ? Math.round(v * 100) + '%' : Math.round(v)} ${statLabels[k] || k}`;
  });
  const statsText = statsTextArray.join(", ");
  
  addLog(state, `Скрафчен предмет: ${item.name} (${statsText})`);
  showCraftMsg(`Успех! Создано: ${item.name} (${statsText})`, item.rarity.color || "#6c4");
  
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
  const recipe = checkRecipe();
  if (recipe) {
    previewEl.innerHTML = `<img src="./assets/items/${recipe.type}.png" style="width: 48px; height: 48px; filter: drop-shadow(0 0 10px rgba(255,215,0,0.5));" onerror="this.src='./assets/equipment/weapon.png'">`;
  } else {
    previewEl.innerHTML = `<span style="color:#555; font-size:12px;">Пусто</span>`;
  }
}
