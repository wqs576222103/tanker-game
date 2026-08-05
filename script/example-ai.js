// ====================== 示例 AI：随机游走 ======================
//
// 玩家可以在页面中导入自定义 AI 脚本文件（.js / .mjs / .txt），
// 脚本只需要实现以下「接口」即可被直接运行。
//
// ---------------------------------------------------------------
// 接口约定（AI 脚本只需要实现这些方法）：
//
//   export default {
//     name: "我的AI",                 // 可选：显示名称
//     onLoad(ctx)       { },          // 可选：脚本被加载/启用时调用
//     onRoundStart(ctx) { },          // 可选：每局开始时调用
//     decide(ctx, dt) {               // 必选：每帧调用，返回本帧要执行的按键
//       return {
//         up: bool, down: bool, left: bool, right: bool,
//         fire: true,                 // 持续按住=连续射击（有内置冷却）
//         mine: false,
//       };
//     },
//     onDeath(ctx, reason) { },       // 可选：玩家死亡时调用
//     onDisabled(ctx) { },            // 可选：被关闭时调用
//   };
//
// 也可以不使用 ES 模块，直接定义全局对象 window.__AI__ = { decide(ctx, dt){...} }。
//
// ctx（沙箱）是游戏状态的只读快照，结构见 buildContext()。
// ---------------------------------------------------------------

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
