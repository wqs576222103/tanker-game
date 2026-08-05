// ====================== 示例 AI：巡游猎手 ======================
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
  name: "巡游猎手",

  onLoad(ctx) {
    console.log("[AI] 巡游猎手已加载");
  },

  onRoundStart(ctx) {
    console.log("[AI] 新一局开始，当前分数", ctx.score);
  },

  // 每帧调用，返回按键动作
  decide(ctx, dt) {
    if (!ctx.player) return {};

    const p = ctx.player;
    const pcx = p.x + p.w / 2;
    const pcy = p.y + p.h / 2;

    // 1. 逃离最近的敌方子弹
    let danger = null;
    for (const b of ctx.bullets) {
      if (b.owner === "player") continue;
      const d = ctx.distance(pcx, pcy, b.x, b.y);
      const speed = Math.hypot(b.vx, b.vy) || 1;
      const timeToReach = d / speed;
      // 预测子弹是否朝我飞来
      const nx = b.x + b.vx * timeToReach;
      const ny = b.y + b.vy * timeToReach;
      if (ctx.distance(nx, ny, pcx, pcy) < d * 0.4 && d < 180) {
        danger = b;
      }
    }

    if (danger) {
      const angle = Math.atan2(pcy - danger.y, pcx - danger.x);
      const esc = angle + Math.PI / 2; // 垂直方向逃离
      const ex = Math.cos(esc);
      const ey = Math.sin(esc);
      return {
        left: ex < -0.3,
        right: ex > 0.3,
        up: ey < -0.3,
        down: ey > 0.3,
        fire: true,
        mine: false,
      };
    }

    // 2. 朝最近敌人移动并射击
    let target = null;
    let best = Infinity;
    for (const e of ctx.enemies) {
      const ecx = e.x + e.w / 2;
      const ecy = e.y + e.h / 2;
      const d = ctx.distance(pcx, pcy, ecx, ecy);
      if (d < best) {
        best = d;
        target = { x: ecx, y: ecy };
      }
    }

    // 3. 没有敌人就去找道具
    if (!target) {
      let bd = Infinity;
      for (const it of ctx.items) {
        const ix = it.x + ctx.CELL / 2;
        const iy = it.y + ctx.CELL / 2;
        const d = ctx.distance(pcx, pcy, ix, iy);
        if (d < bd) {
          bd = d;
          target = { x: ix, y: iy };
        }
      }
    }

    if (!target) return { fire: true };

    const dx = target.x - pcx;
    const dy = target.y - pcy;

    // 同一直线且路径通畅时开火
    const sameRow = Math.abs(dy) < ctx.CELL;
    const sameCol = Math.abs(dx) < ctx.CELL;
    const clear = ctx.isPathClear(pcx, pcy, target.x, target.y);
    const fire = (sameRow || sameCol) && clear;

    return {
      left: dx < -ctx.CELL,
      right: dx > ctx.CELL,
      up: dy < -ctx.CELL,
      down: dy > ctx.CELL,
      fire,
      mine: p.hp <= 1 && p.mines > 0 && Math.hypot(dx, dy) < 150,
    };
  },

  onDeath(ctx, reason) {
    console.log("[AI] 阵亡，原因：", reason);
  },
};
