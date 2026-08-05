// ====================== 示例 AI：随机游走 ======================
// 这是一个即插即用示例。在页面点击「📥 导入AI」选择本文件即可运行。
// 实现要点：必须提供 decide(ctx, dt)，返回要按下的方向/按键。
//
// ctx 提供只读游戏状态：
//   ctx.player    玩家信息（x,y,hp,dir,...）或 null
//   ctx.enemies   敌人数组
//   ctx.bullets   子弹数组（vx,vy 为速度）
//   ctx.items     道具数组
//   ctx.mines     地雷数组
//   ctx.drones    无人机数组
//   ctx.boss      boss 或 null
//   ctx.gates     传送门
//   ctx.mapAt(c,r)  格子类型（0空 1砖 2门 3边界 4碎石 5草丛）
//   ctx.isPathClear(x1,y1,x2,y2)
//   ctx.cellOf / ctx.centerOf / ctx.distance
// 常量：ctx.CELL / ctx.COLS / ctx.ROWS / ctx.W / ctx.H / ctx.DIRS / ctx.TILE

export default {
  name: "随机游走",

  onLoad(ctx) {
    console.log("[AI] 随机游走已加载");
  },

  onRoundStart(ctx) {
    console.log("[AI] 新一局开始，当前分数", ctx.score);
  },

  // 每帧调用，返回按键动作
  decide(ctx, dt) {
    if (!ctx.player) return {};

    // 内部状态：当前方向与方向计时器（与敌方坦克一致）
    this.dirTimer = (this.dirTimer || 0) - dt;
    if (!this.dir || this.dirTimer <= 0) {
      const dirs = ["up", "down", "left", "right"];
      this.dir = dirs[Math.floor(Math.random() * dirs.length)];
      this.dirTimer = 0.5 + Math.random() * 1.1;
    }

    // 随机开火（与敌方坦克一致：2.2~4.2 秒一次）
    this.fireTimer = (this.fireTimer || 0) - dt;
    let fire = false;
    if (this.fireTimer <= 0) {
      fire = true;
      this.fireTimer = 2.2 + Math.random() * 2.0;
    }

    return {
      up: this.dir === "up",
      down: this.dir === "down",
      left: this.dir === "left",
      right: this.dir === "right",
      fire,
      mine: false,
    };
  },

  onDeath(ctx, reason) {
    console.log("[AI] 阵亡，原因：", reason);
  },
};
