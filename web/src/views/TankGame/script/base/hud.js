import { getScore } from "@/api/score.js";
import { getUserInfo } from "@/utils/user";
import { ITEMS } from "./items.js";

// ====================== HUD ======================
export async function loadHighScore() {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.employeeId) return;
    const res = await getScore(userInfo.employeeId);
    const score = res?.data?.highScore;
    if (typeof score === "number" && score > window.hiScore) {
      window.hiScore = score;
      localStorage.setItem("tank-hi", String(window.hiScore));
    }
    const bossScore = res?.data?.highBossKills;
    if (typeof bossScore === "number" && bossScore > window.hiBossKills) {
      window.hiBossKills = bossScore;
    }
    updateHud();
  } catch (err) {
    console.error("获取最高击杀数失败:", err);
  }
}

export function updateHud() {
  const heartEl = document.getElementById("hud-heart");
  if (heartEl) {
    let s = "";
    for (let i = 0; i < window.player.maxHp; i++) s += i < window.player.hp ? "❤️" : "🖤";
    heartEl.textContent = s;
  }
  const sc = document.getElementById("hud-score");
  if (sc) sc.textContent = window.kills;
  const bsc = document.getElementById("hud-boss-score");
  if (bsc) bsc.textContent = window.bossKills;
  const hi = document.getElementById("hud-hi");
  if (hi) hi.textContent = Math.max(window.hiScore, window.kills);
  let mine = document.getElementById("hud-mine");
  if (window.player.mines > 0) {
    if (!mine) {
      const el = document.createElement("span");
      el.className = "bar";
      el.id = "hud-mine";
      el.innerHTML = "💣 <b>0</b>";
      const buff = document.getElementById("hud-buff");
      buff.parentNode.insertBefore(el, buff);
      mine = el;
    }
    const mineB = mine.querySelector("b");
    if (mineB) mineB.textContent = window.player.mines;
  } else if (mine) {
    mine.remove();
  }
  const buff = document.getElementById("hud-buff");
  if (buff) {
    const arr = [];
    if (window.player.shieldT > window.gtMs)
      arr.push("🛡️" + Math.ceil((window.player.shieldT - window.gtMs) / 1000) + "s");
    if (window.player.fireT > window.gtMs)
      arr.push("⚡" + Math.ceil((window.player.fireT - window.gtMs) / 1000) + "s");
    if (window.player.speedT > window.gtMs)
      arr.push("💨" + Math.ceil((window.player.speedT - window.gtMs) / 1000) + "s");
    if (window.player.spreadT > window.gtMs)
      arr.push("✨" + Math.ceil((window.player.spreadT - window.gtMs) / 1000) + "s");
    if (window.player.drones > 0)
      arr.push(
        "🚁×" +
          Math.min(window.player.drones, ITEMS.find((i) => i.id === "drone").max),
      );
    if (window.player.bounces) arr.push("🔄");
    buff.textContent = arr.length ? arr.join(" ") : "";
  }
}
