import { milestoneDefs } from "./data.js";
import { state } from "./state.js";
import { audio } from "./audio.js";

let toastTimer = null;

export function showMilestoneToast(title, text) {
  const el = document.getElementById("milestoneToast");
  if (!el) return;
  el.querySelector(".milestone-title").textContent = title;
  el.querySelector(".milestone-text").textContent = text;
  el.classList.add("visible");
  audio.playMilestone();
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 4200);
}

export function checkMilestones(s = state) {
  milestoneDefs.forEach((m) => {
    if (s.milestonesSeen[m.key]) return;
    if (m.check(s)) {
      s.milestonesSeen[m.key] = true;
      showMilestoneToast(m.title, m.text);
    }
  });
}
