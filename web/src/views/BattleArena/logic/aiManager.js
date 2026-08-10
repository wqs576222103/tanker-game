import { reactive } from "vue";
import { aiTanks, gameState, AI_COLORS } from "./gameState.js";

export function loadAIFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      try {
        const blob = new Blob([text], { type: "text/javascript" });
        const url = URL.createObjectURL(blob);
        let mod = null;
        try {
          mod = await import(/* @vite-ignore */ url);
        } finally {
          URL.revokeObjectURL(url);
        }
        const obj = (mod && mod.default) || (mod && mod.__AI__);
        if (obj && typeof obj.decide === "function") {
          resolve(obj);
          return;
        }
      } catch (e) {
        // 回退到 eval 方式
      }
      delete window.__AI__;
      try {
        (0, eval)(text);
      } catch (err) {
        reject(new Error("脚本解析失败：" + err.message));
        return;
      }
      const obj = window.__AI__;
      if (!obj || typeof obj.decide !== "function") {
        reject(new Error("未找到有效 AI 对象"));
        return;
      }
      resolve(obj);
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsText(file);
  });
}

export async function importAIFiles(files) {
  const imports = Array.from(files).slice(0, 8 - aiTanks.value.length);
  for (const file of imports) {
    if (aiTanks.value.length >= 8) break;
    try {
      const aiModule = await loadAIFile(file);
      const name = aiModule.name || file.name.replace(/\.[^.]+$/, "");
      addAITank(name, aiModule);
    } catch (err) {
      alert(`导入 ${file.name} 失败: ${err.message}`);
    }
  }
}

export function addAITank(name, aiModule) {
  const existingIdx = aiTanks.value.findIndex((a) => a.name === name);
  if (existingIdx >= 0) {
    const existing = aiTanks.value[existingIdx];
    existing.aiModule = aiModule;
    existing.kills = 0;
    existing.deaths = 0;
    return;
  }
  if (aiTanks.value.length >= 8) return;
  const color = AI_COLORS[aiTanks.value.length];
  const aiObj = reactive({
    id: Math.random().toString(36).slice(2),
    name,
    color,
    aiModule,
    tank: null,
    kills: 0,
    deaths: 0,
  });
  aiTanks.value.push(aiObj);
}

export function removeAITank(idx) {
  aiTanks.value.splice(idx, 1);
}

export function clearAllAITanks() {
  aiTanks.value = [];
}
