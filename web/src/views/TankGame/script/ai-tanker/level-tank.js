export default {
  name: "关卡AI",

  onLoad(ctx) {
    console.log("[AI] 关卡AI已加载，模式:", ctx.levelMode ? "关卡" : "生存");
  },

  onRoundStart(ctx) {
    console.log("[AI] 新一局开始，击杀目标:", ctx.levelKillsRequired);
  },

  decide(ctx, dt) {
    if (!ctx.player) return {};

    // 关卡模式：向敌军出生点推进，同时射击和躲避
    if (ctx.levelMode) {
      return this.decideLevel(ctx, dt);
    }

    // 非关卡模式：退化为随机游走
    this.dirTimer = (this.dirTimer || 0) - dt;
    if (!this.dir || this.dirTimer <= 0) {
      const dirs = ["up", "down", "left", "right"];
      this.dir = dirs[Math.floor(Math.random() * dirs.length)];
      this.dirTimer = 0.5 + Math.random() * 1.1;
    }
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

  decideLevel(ctx, dt) {
    const player = ctx.player;
    if (!player) return {};

    if (!this.levelState) {
      this.levelState = {
        dirTimer: 0,
        fireTimer: 0,
        currentDir: "down",
      };
    }
    const state = this.levelState;

    // 向顶部敌军出生区域移动（取两个出生点中间方向）
    state.dirTimer -= dt;
    if (state.dirTimer <= 0) {
      state.currentDir =
        Math.random() < 0.5 ? "up" : Math.random() < 0.5 ? "left" : "right";
      state.dirTimer = 0.3 + Math.random() * 0.5;
    }

    // 有敌人时持续射击
    state.fireTimer -= dt;
    let fire = false;
    if (state.fireTimer <= 0 && ctx.enemies && ctx.enemies.length > 0) {
      fire = true;
      state.fireTimer = 0.4 + Math.random() * 0.6;
    }

    // 躲避威胁子弹
    let dodgeUp = false,
      dodgeDown = false,
      dodgeLeft = false,
      dodgeRight = false;
    if (ctx.bullets) {
      for (const b of ctx.bullets) {
        if (b.owner !== "enemy") continue;
        const dist = ctx.distance(b.x, b.y, player.x + 10, player.y + 10);
        if (dist < 60) {
          if (b.vy < 0) dodgeDown = true;
          if (b.vy > 0) dodgeUp = true;
          if (b.vx < 0) dodgeRight = true;
          if (b.vx > 0) dodgeLeft = true;
        }
      }
    }

    let up = state.currentDir === "up" || dodgeUp;
    let down = state.currentDir === "down" || dodgeDown;
    let left = state.currentDir === "left" || dodgeLeft;
    let right = state.currentDir === "right" || dodgeRight;
    if (up && down) up = false;
    if (left && right) left = false;

    return { up, down, left, right, fire, mine: false };
  },

  onDeath(ctx, reason) {
    console.log("[AI] 关卡AI阵亡，原因:", reason);
    this.levelState = null;
  },
};
