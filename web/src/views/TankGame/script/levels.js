export const LEVELS = [
  {
    id: 1,
    name: "夺旗精英",
    description: "消灭敌军，夺取敌方旗帜！",
    objective: {
      type: "captureFlag",
      target: 5,
      description: "击杀5名敌人后夺取旗帜",
    },
  },
  {
    id: 2,
    name: "解救小狗",
    description: "击杀10个敌人后Boss出现，击败Boss获取钥匙，解救被困的小狗！",
    objective: {
      type: "rescueDog",
      target: 10,
      description: "击杀10个敌人后Boss出现，击败Boss获取钥匙解救小狗",
    },
  },
];

export function getLevelConfig(levelId) {
  return LEVELS.find((l) => l.id === levelId);
}

export function isLevelUnlocked(levelId) {
  try {
    const progress = JSON.parse(
      localStorage.getItem("tank-level-progress") || "{}",
    );
    return levelId <= (progress.unlockedLevel || 1);
  } catch {
    return levelId === 1;
  }
}

export function getUnlockedLevel() {
  try {
    const progress = JSON.parse(
      localStorage.getItem("tank-level-progress") || "{}",
    );
    return progress.unlockedLevel || 1;
  } catch {
    return 1;
  }
}

export function unlockNextLevel(currentLevelId) {
  try {
    const progress = JSON.parse(
      localStorage.getItem("tank-level-progress") || "{}",
    );
    const nextLevel = currentLevelId + 1;
    if (nextLevel > (progress.unlockedLevel || 1)) {
      progress.unlockedLevel = nextLevel;
      localStorage.setItem("tank-level-progress", JSON.stringify(progress));
    }
    return nextLevel;
  } catch {
    return currentLevelId + 1;
  }
}
