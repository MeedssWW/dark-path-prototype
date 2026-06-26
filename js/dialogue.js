import { dialogueData } from "./dialogueData.js";
import { state, updateEpicStat } from "./state.js";
import { render } from "./render.js";

export function startDialogue(npcKey) {
  const data = dialogueData[npcKey];
  if (!data) return;
  
  state.currentDialogue = {
    npc: npcKey,
    nodeId: "start",
    data: data
  };

  // Trigger blink transition
  const eyelidTop = document.getElementById("eyelidTop");
  const eyelidBottom = document.getElementById("eyelidBottom");
  const equipSection = document.getElementById("equipSection");
  const dialogueSection = document.getElementById("dialogueSection");
  
  if (eyelidTop && eyelidBottom) {
    eyelidTop.style.height = "50%";
    eyelidBottom.style.height = "50%";
    
    // Pause video if playing
    const vid = document.getElementById("locationVideo");
    if (vid && !vid.paused) vid.pause();
    
    setTimeout(() => {
      renderDialogueNode();
      if (equipSection) equipSection.classList.add("hidden");
      if (dialogueSection) dialogueSection.classList.remove("hidden");
      eyelidTop.style.height = "0%";
      eyelidBottom.style.height = "0%";
    }, 600);
  } else {
    renderDialogueNode();
    if (equipSection) equipSection.classList.add("hidden");
    if (dialogueSection) dialogueSection.classList.remove("hidden");
  }
}

function renderDialogueNode() {
  const dlg = state.currentDialogue;
  if (!dlg) return;
  
  const node = dlg.data[dlg.nodeId];
  if (!node) {
    endDialogue();
    return;
  }

  const textEl = document.getElementById("dialogueText");
  const choicesEl = document.getElementById("dialogueChoices");
  
  // Display NPC portrait in the enemy stage
  const enemyStage = document.getElementById("enemyStage");
  const enemyName = document.getElementById("enemyName");
  const enemyImage = document.getElementById("enemyImage");
  const enemyHpText = document.getElementById("enemyHpText");
  const enemyHpBar = document.getElementById("enemyHpBar");
  const enemyTraits = document.getElementById("enemyTraits");
  
  if (enemyStage && enemyImage && enemyName) {
    enemyStage.classList.remove("hidden");
    enemyImage.src = `./assets/npc/${dlg.npc}.png`;
    
    let displayName = "Незнакомец";
    if (dlg.npc === "old_man") displayName = "Старик";
    else if (dlg.npc === "elara") displayName = "Элара";
    else if (dlg.npc === "garrick") displayName = "Гаррик";
    enemyName.textContent = displayName;
    
    if (enemyHpText) enemyHpText.style.display = "none";
    if (enemyHpBar && enemyHpBar.parentElement) enemyHpBar.parentElement.style.display = "none";
    if (enemyTraits) enemyTraits.style.display = "none";
  }
  
  if (textEl) {
    textEl.innerHTML = "";
    // Typewriter effect
    let i = 0;
    const speed = 30; // ms per char
    
    // Clear old choices while typing
    if (choicesEl) choicesEl.innerHTML = "";
    
    function typeWriter() {
      if (i < node.text.length) {
        textEl.innerHTML += node.text.charAt(i);
        i++;
        setTimeout(typeWriter, speed);
      } else {
        renderChoices(node.options);
      }
    }
    typeWriter();
  }
}

function renderChoices(options) {
  const choicesEl = document.getElementById("dialogueChoices");
  if (!choicesEl) return;
  
  choicesEl.innerHTML = "";
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "dialogue-btn";
    btn.textContent = opt.text;
    btn.onclick = () => selectChoice(opt);
    choicesEl.appendChild(btn);
  });
}

function selectChoice(opt) {
  // Apply stats
  if (opt.stats) {
    if (!state.psyche) state.psyche = { loyalty: 0, doubt: 0, humanity: 0 };
    if (opt.stats.loyalty) state.psyche.loyalty += opt.stats.loyalty;
    if (opt.stats.doubt) state.psyche.doubt += opt.stats.doubt;
    if (opt.stats.humanity) state.psyche.humanity += opt.stats.humanity;
  }
  
  // Apply affinity
  if (opt.affinity !== undefined) {
    const npc = state.currentDialogue.npc;
    if (!state.storyAffinity) state.storyAffinity = {};
    state.storyAffinity[npc] = (state.storyAffinity[npc] || 0) + opt.affinity;
  }
  
  // Cost (e.g. gold)
  if (opt.cost) {
    const [type, amount] = opt.cost.split("_");
    if (type === "gold") state.gold = Math.max(0, state.gold - parseInt(amount));
  }
  
  if (opt.next === "EXIT") {
    endDialogue();
  } else if (opt.next === "COMBAT") {
    endDialogue(true); // true means trigger combat
  } else if (opt.next.startsWith("EXIT_")) {
    endDialogue();
  } else {
    state.currentDialogue.nodeId = opt.next;
    renderDialogueNode();
  }
}

function endDialogue(triggerCombat = false) {
  const equipSection = document.getElementById("equipSection");
  const dialogueSection = document.getElementById("dialogueSection");
  const eyelidTop = document.getElementById("eyelidTop");
  const eyelidBottom = document.getElementById("eyelidBottom");
  
  // Restore enemy UI elements
  const enemyHpText = document.getElementById("enemyHpText");
  const enemyHpBar = document.getElementById("enemyHpBar");
  const enemyTraits = document.getElementById("enemyTraits");
  if (enemyHpText) enemyHpText.style.display = "";
  if (enemyHpBar && enemyHpBar.parentElement) enemyHpBar.parentElement.style.display = "";
  if (enemyTraits) enemyTraits.style.display = "";
  
  if (eyelidTop && eyelidBottom) {
    eyelidTop.style.height = "50%";
    eyelidBottom.style.height = "50%";
    
    setTimeout(() => {
      state.currentDialogue = null;
      if (dialogueSection) dialogueSection.classList.add("hidden");
      if (equipSection) equipSection.classList.remove("hidden");
      
      const vid = document.getElementById("locationVideo");
      if (vid && vid.paused && !state.currentEnemy) vid.play();
      
      eyelidTop.style.height = "0%";
      eyelidBottom.style.height = "0%";
      
      if (triggerCombat) {
        // Trigger specific combat
      } else {
        render();
      }
    }, 600);
  } else {
    state.currentDialogue = null;
    if (dialogueSection) dialogueSection.classList.add("hidden");
    if (equipSection) equipSection.classList.remove("hidden");
    render();
  }
}
