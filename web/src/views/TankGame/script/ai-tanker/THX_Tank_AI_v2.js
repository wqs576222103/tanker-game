const memory = {
  lastX: null,
  lastY: null,
  lastMovedAt: 0,
  lastMineAt: -99999,
  lastDir: 'up',
  unstuckUntil: 0,
  unstuckDir: null,
};

const DIR = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const DIR_NAMES = [
  'up',
  'down',
  'left',
  'right',
];

function emptyAction() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    mine: false,
  };
}

function action(
  dirName,
  fire = true,
  mine = false
) {
  return {
    up: dirName === 'up',
    down: dirName === 'down',
    left: dirName === 'left',
    right: dirName === 'right',
    fire,
    mine,
  };
}

/*
 * ================================
 * 基础坐标函数
 * ================================
 */

function center(o) {
  return {
    x: o.x + (o.w || 0) / 2,
    y: o.y + (o.h || 0) / 2,
  };
}

function distance(
  ctx,
  a,
  b
) {
  if (
    typeof ctx.distance ===
    'function'
  ) {
    try {
      return ctx.distance(
        a.x,
        a.y,
        b.x,
        b.y
      );
    }
    catch (_) {}
  }

  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );
}

function cellOfPoint(
  ctx,
  p
) {
  if (
    typeof ctx.cellOf ===
    'function'
  ) {
    try {
      return ctx.cellOf(
        p.x,
        p.y
      );
    }
    catch (_) {}
  }

  return {
    c:
      Math.floor(
        p.x / ctx.CELL
      ),

    r:
      Math.floor(
        p.y / ctx.CELL
      ),
  };
}

function cellCenter(
  ctx,
  c,
  r
) {
  if (
    typeof ctx.centerOf ===
    'function'
  ) {
    try {
      return ctx.centerOf(
        c,
        r
      );
    }
    catch (_) {}
  }

  return {
    x:
      c * ctx.CELL +
      ctx.CELL / 2,

    y:
      r * ctx.CELL +
      ctx.CELL / 2,
  };
}

/*
 * ================================
 * 地图
 * ================================
 */

function isObstacle(
  ctx,
  c,
  r
) {
  if (
    typeof ctx.isObstacle ===
    'function'
  ) {
    try {
      return !!ctx.isObstacle(
        c,
        r
      );
    }
    catch (_) {}
  }

  if (
    typeof ctx.mapAt !==
    'function'
  ) {
    return false;
  }

  const t =
    ctx.mapAt(
      c,
      r
    );

  return (
    t === ctx.TILE.WALL ||
    t === ctx.TILE.CRACK ||
    t === ctx.TILE.BORDER
  );
}

function isBlocked(
  ctx,
  dirName
) {
  if (!ctx.player) {
    return true;
  }

  if (
    typeof ctx.isBlocked ===
    'function'
  ) {
    try {
      return !!ctx.isBlocked(
        DIR[dirName]
      );
    }
    catch (_) {}
  }

  const pc =
    cellOfPoint(
      ctx,
      center(ctx.player)
    );

  const d =
    DIR[dirName];

  return isObstacle(
    ctx,
    pc.c + d.x,
    pc.r + d.y
  );
}

function freeDistance(
  ctx,
  dirName
) {
  if (
    typeof ctx.getFreeDistance ===
    'function'
  ) {
    try {
      return ctx.getFreeDistance(
        DIR[dirName]
      );
    }
    catch (_) {}
  }

  return (
    isBlocked(
      ctx,
      dirName
    )
      ? 0
      : ctx.CELL * 2
  );
}

/*
 * ================================
 * 地雷
 * ================================
 */

function mineCells(ctx) {
  const set =
    new Set();

  for (
    const m
    of ctx.mines || []
  ) {
    const c =
      cellOfPoint(
        ctx,
        {
          x: m.x,
          y: m.y,
        }
      );

    set.add(
      `${c.c},${c.r}`
    );
  }

  return set;
}

/*
 * ================================
 * 子弹分析
 * ================================
 */

function getEnemyBullets(
  ctx,
  dt
) {
  if (
    ctx.utils &&
    typeof ctx.utils.getEnemyBullets ===
      'function'
  ) {
    try {
      return (
        ctx.utils.getEnemyBullets(
          1,
          dt || 16
        ) || []
      );
    }
    catch (_) {}
  }

  return (
    ctx.bullets || []
  ).filter(
    b =>
      !ctx.isEnemyBullet || ctx.isEnemyBullet(b)
  );
}

function bulletVector(b) {
  let vx =
    Number.isFinite(b.vx)
      ? b.vx
      : (
          (b.dir?.x || 0) *
          (b.speed || 1)
        );

  let vy =
    Number.isFinite(b.vy)
      ? b.vy
      : (
          (b.dir?.y || 0) *
          (b.speed || 1)
        );

  const len =
    Math.hypot(
      vx,
      vy
    );

  if (
    len < 0.0001
  ) {
    return null;
  }

  return {
    x: vx / len,
    y: vy / len,
  };
}

/*
 * 计算一个位置被子弹击中的风险。
 *
 * 不是简单看距离，
 * 而是看：
 *
 * 1. 子弹是否朝这里飞
 * 2. 是否处于子弹弹道
 * 3. 子弹距离还有多远
 */
function bulletRiskAt(
  ctx,
  p,
  dt
) {
  let risk = 0;

  const bullets =
    getEnemyBullets(
      ctx,
      dt
    );

  const lane =
    ctx.CELL * 0.85;

  for (
    const b
    of bullets
  ) {
    const v =
      bulletVector(b);

    if (!v) {
      continue;
    }

    const bx = b.x;
    const by = b.y;

    const rx =
      p.x - bx;

    const ry =
      p.y - by;

    /*
     * 玩家在子弹飞行方向上
     * 还有多远
     */
    const forward =
      rx * v.x +
      ry * v.y;

    /*
     * 已经飞过去
     * 或者太远
     */
    if (
      forward <
        -ctx.CELL * 0.4 ||
      forward >
        ctx.CELL * 10
    ) {
      continue;
    }

    /*
     * 玩家距离弹道直线的距离
     */
    const perpendicular =
      Math.abs(
        rx * v.y -
        ry * v.x
      );

    if (
      perpendicular >
      lane
    ) {
      continue;
    }

    const laneFactor =
      1 -
      perpendicular /
        lane;

    const distanceFactor =
      1 -
      Math.min(
        Math.max(
          forward,
          0
        ),
        ctx.CELL * 10
      ) /
        (
          ctx.CELL *
          10
        );

    risk +=
      110 *
        laneFactor +
      90 *
        distanceFactor;

    /*
     * 三格以内
     */
    if (
      forward <
      ctx.CELL * 3
    ) {
      risk += 130;
    }

    /*
     * 1.5 格以内
     */
    if (
      forward <
      ctx.CELL * 1.5
    ) {
      risk += 240;
    }

    /*
     * 几乎在正弹道上
     */
    if (
      perpendicular <
      ctx.CELL * 0.35
    ) {
      risk += 90;
    }
  }

  return risk;
}

/*
 * ================================
 * 坦克 / Boss 碰撞风险
 * ================================
 */

function collisionRiskAt(
  ctx,
  p
) {
  let risk = 0;

  const player =
    ctx.player;

  const playerRadius =
    Math.max(
      player.w ||
        ctx.CELL,
      player.h ||
        ctx.CELL
    ) / 2;

  /*
   * Boss
   */
  if (
    ctx.boss &&
    (
      ctx.boss.hp == null ||
      ctx.boss.hp > 0
    )
  ) {
    const bp =
      center(ctx.boss);

    const bossRadius =
      Math.max(
        ctx.boss.w ||
          ctx.CELL,
        ctx.boss.h ||
          ctx.CELL
      ) / 2;

    const d =
      distance(
        ctx,
        p,
        bp
      );

    /*
     * 硬碰撞区
     */
    const hard =
      playerRadius +
      bossRadius +
      ctx.CELL *
        0.55;

    /*
     * Boss 警戒区
     */
    const soft =
      hard +
      ctx.CELL *
        2.2;

    if (
      d < hard
    ) {
      risk +=
        12000 +
        (
          hard -
          d
        ) *
          700;
    }
    else if (
      d < soft
    ) {
      risk +=
        900 *
        (
          1 -
          (
            d -
            hard
          ) /
            (
              soft -
              hard
            )
        );
    }
  }

  /*
   * 普通敌人
   */
  for (
    const e
    of ctx.enemies || []
  ) {
    if (
      e.hp != null &&
      e.hp <= 0
    ) {
      continue;
    }

    const ep =
      center(e);

    const enemyRadius =
      Math.max(
        e.w ||
          ctx.CELL,
        e.h ||
          ctx.CELL
      ) / 2;

    const d =
      distance(
        ctx,
        p,
        ep
      );

    const hard =
      playerRadius +
      enemyRadius +
      ctx.CELL *
        0.2;

    const soft =
      hard +
      ctx.CELL *
        1.1;

    if (
      d < hard
    ) {
      risk +=
        7000 +
        (
          hard -
          d
        ) *
          350;
    }
    else if (
      d < soft
    ) {
      risk +=
        420 *
        (
          1 -
          (
            d -
            hard
          ) /
            (
              soft -
              hard
            )
        );
    }
  }

  return risk;
}

/*
 * ================================
 * 地图边缘风险
 * ================================
 */

function edgeRisk(
  ctx,
  p
) {
  const c =
    cellOfPoint(
      ctx,
      p
    );

  let risk = 0;

  if (
    c.c <= 0 ||
    c.r <= 0 ||
    c.c >=
      ctx.COLS - 1 ||
    c.r >=
      ctx.ROWS - 1
  ) {
    risk += 300;
  }
  else if (
    c.c <= 1 ||
    c.r <= 1 ||
    c.c >=
      ctx.COLS - 2 ||
    c.r >=
      ctx.ROWS - 2
  ) {
    risk += 60;
  }

  return risk;
}

/*
 * ================================
 * 综合风险
 * ================================
 */

function positionRisk(
  ctx,
  p,
  dt
) {
  return (
    bulletRiskAt(
      ctx,
      p,
      dt
    ) * 5.0 +

    collisionRiskAt(
      ctx,
      p
    ) * 5.0 +

    edgeRisk(
      ctx,
      p
    )
  );
}

/*
 * ================================
 * 移动方向评分
 * ================================
 */

function directionSafetyScore(
  ctx,
  dirName,
  dt
) {
  if (
    isBlocked(
      ctx,
      dirName
    )
  ) {
    return -1000000;
  }

  const p =
    center(
      ctx.player
    );

  const d =
    DIR[dirName];

  /*
   * 模拟往该方向走一步
   */
  const step =
    ctx.CELL *
    0.85;

  const probe = {
    x:
      p.x +
      d.x * step,

    y:
      p.y +
      d.y * step,
  };

  let score = 0;

  /*
   * 风险越高分越低
   */
  score -=
    positionRisk(
      ctx,
      probe,
      dt
    );

  /*
   * 前面空间越大越好
   */
  score +=
    Math.min(
      freeDistance(
        ctx,
        dirName
      ),
      ctx.CELL * 6
    ) *
      0.18;

  /*
   * 不踩地雷
   */
  const c =
    cellOfPoint(
      ctx,
      probe
    );

  if (
    mineCells(ctx)
      .has(
        `${c.c},${c.r}`
      )
  ) {
    score -= 8000;
  }

  /*
   * 轻微移动惯性
   *
   * 防止疯狂左右抖
   */
  if (
    dirName ===
    memory.lastDir
  ) {
    score += 8;
  }

  return score;
}

function chooseSafestDirection(
  ctx,
  dt,
  allowed =
    DIR_NAMES
) {
  let best = null;
  let bestScore =
    -Infinity;

  for (
    const d
    of allowed
  ) {
    const s =
      directionSafetyScore(
        ctx,
        d,
        dt
      );

    if (
      s >
      bestScore
    ) {
      bestScore = s;
      best = d;
    }
  }

  return best;
}

/*
 * ================================
 * 碰撞紧急逃生
 * ================================
 */

function nearestCollisionThreat(
  ctx
) {
  const p =
    center(
      ctx.player
    );

  let best = null;

  /*
   * Boss 3 格内
   */
  if (
    ctx.boss &&
    (
      ctx.boss.hp == null ||
      ctx.boss.hp > 0
    )
  ) {
    const bp =
      center(ctx.boss);

    const d =
      distance(
        ctx,
        p,
        bp
      );

    if (
      d <
      ctx.CELL * 3
    ) {
      best = {
        kind: 'boss',
        p: bp,
        d,
      };
    }
  }

  /*
   * 普通敌人 1.8 格内
   */
  for (
    const e
    of ctx.enemies || []
  ) {
    if (
      e.hp != null &&
      e.hp <= 0
    ) {
      continue;
    }

    const ep =
      center(e);

    const d =
      distance(
        ctx,
        p,
        ep
      );

    if (
      d <
        ctx.CELL *
          1.8 &&
      (
        !best ||
        d < best.d
      )
    ) {
      best = {
        kind:
          'enemy',

        p: ep,

        d,
      };
    }
  }

  return best;
}

/*
 * 出现撞击风险时：
 *
 * 找既远离敌人，
 * 又避开子弹的方向。
 */
function emergencyCollisionEscape(
  ctx,
  dt
) {
  const threat =
    nearestCollisionThreat(
      ctx
    );

  if (!threat) {
    return null;
  }

  const p =
    center(
      ctx.player
    );

  let best = null;

  let bestScore =
    -Infinity;

  for (
    const dirName
    of DIR_NAMES
  ) {
    if (
      isBlocked(
        ctx,
        dirName
      )
    ) {
      continue;
    }

    const d =
      DIR[dirName];

    const probe = {
      x:
        p.x +
        d.x *
          ctx.CELL,

      y:
        p.y +
        d.y *
          ctx.CELL,
    };

    /*
     * 往这个方向走之后，
     * 距敌人增加多少
     */
    const away =
      distance(
        ctx,
        probe,
        threat.p
      ) -
      threat.d;

    /*
     * 远离碰撞目标
     * +
     * 综合安全性
     */
    const score =
      away * 60 +
      directionSafetyScore(
        ctx,
        dirName,
        dt
      );

    if (
      score >
      bestScore
    ) {
      bestScore =
        score;

      best =
        dirName;
    }
  }

  return best;
}

/*
 * ================================
 * 子弹紧急闪避
 * ================================
 */

function immediateDodge(
  ctx,
  dt
) {
  const p =
    center(
      ctx.player
    );

  const currentRisk =
    bulletRiskAt(
      ctx,
      p,
      dt
    );

  /*
   * v1 是 85
   *
   * v2 提前到 45
   */
  if (
    currentRisk <
    45
  ) {
    return null;
  }

  const candidates =
    DIR_NAMES
      .map(
        d => ({
          d,

          s:
            directionSafetyScore(
              ctx,
              d,
              dt
            ),
        })
      )
      .sort(
        (a, b) =>
          b.s -
          a.s
      );

  if (
    !candidates.length ||
    candidates[0].s <
      -500000
  ) {
    return null;
  }

  return (
    candidates[0].d
  );
}

/*
 * ================================
 * 道具
 * ================================
 */

function itemPriority(
  ctx,
  item
) {
  const hpRatio =
    ctx.player.hp /
    Math.max(
      1,
      ctx.player.maxHp
    );

  const base = {
    heal:
      hpRatio < 0.35
        ? 150
        : hpRatio < 0.65
          ? 95
          : 18,

    shield:
      hpRatio < 0.45
        ? 125
        : 82,

    spread: 88,

    fire: 84,

    drone: 78,

    speed: 70,

    mine:
      ctx.player.mines <= 1
        ? 68
        : 36,
  };

  return (
    base[item.type] ||
    20
  );
}

function chooseItem(
  ctx,
  dt
) {
  const p =
    center(
      ctx.player
    );

  let best = null;

  let bestScore =
    -Infinity;

  for (
    const item
    of ctx.items || []
  ) {
    const ip = {
      x: item.x,
      y: item.y,
    };

    const d =
      distance(
        ctx,
        p,
        ip
      );

    let score =
      itemPriority(
        ctx,
        item
      ) *
        100 -
      d * 1.4;

    /*
     * 道具周围如果危险，
     * 不要为了吃道具送命。
     */
    const risk =
      positionRisk(
        ctx,
        ip,
        dt
      );

    score -=
      Math.min(
        risk,
        5000
      ) *
        0.7;

    /*
     * 普通道具太远不值得追
     */
    if (
      d >
        ctx.CELL *
          12 &&
      item.type !==
        'heal' &&
      item.type !==
        'shield'
    ) {
      score -= 700;
    }

    /*
     * 快消失的道具
     */
    if (
      item.life != null &&
      item.age != null
    ) {
      const remaining =
        item.life -
        item.age;

      if (
        remaining <
        800
      ) {
        score -= 350;
      }
    }

    if (
      score >
      bestScore
    ) {
      bestScore =
        score;

      best =
        item;
    }
  }

  return (
    bestScore >=
      2800
      ? best
      : null
  );
}

/*
 * ================================
 * 战斗目标
 * ================================
 */

function chooseCombatTarget(
  ctx
) {
  const p =
    center(
      ctx.player
    );

  const candidates =
    [];

  /*
   * Boss
   */
  if (
    ctx.boss &&
    (
      ctx.boss.hp == null ||
      ctx.boss.hp > 0
    )
  ) {
    const bp =
      center(ctx.boss);

    const d =
      distance(
        ctx,
        p,
        bp
      );

    candidates.push({
      kind:
        'boss',

      obj:
        ctx.boss,

      p:
        bp,

      score:
        16000 -
        d,
    });
  }

  /*
   * 普通敌人
   */
  for (
    const e
    of ctx.enemies || []
  ) {
    if (
      e.hp != null &&
      e.hp <= 0
    ) {
      continue;
    }

    const ep =
      center(e);

    const d =
      distance(
        ctx,
        p,
        ep
      );

    const hpRatio =
      e.hp /
      Math.max(
        1,
        e.maxHp ||
          e.hp ||
          1
      );

    /*
     * 残血优先补刀
     */
    candidates.push({
      kind:
        'enemy',

      obj:
        e,

      p:
        ep,

      score:
        12000 -
        d +
        (
          1 -
          hpRatio
        ) *
          1800,
    });
  }

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  return (
    candidates[0] ||
    null
  );
}

/*
 * ================================
 * BFS 寻路
 * ================================
 */

function canOccupyCell(
  ctx,
  c,
  r,
  mines
) {
  /*
   * 越界
   */
  if (
    c < 0 ||
    r < 0 ||
    c >= ctx.COLS ||
    r >= ctx.ROWS
  ) {
    return false;
  }

  /*
   * 墙 / 碎石
   */
  if (
    isObstacle(
      ctx,
      c,
      r
    )
  ) {
    return false;
  }

  /*
   * 地雷
   */
  if (
    mines &&
    mines.has(
      `${c},${r}`
    )
  ) {
    return false;
  }

  const cp =
    cellCenter(
      ctx,
      c,
      r
    );

  /*
   * 游戏提供的占用检查
   */
  if (
    ctx.utils &&
    typeof ctx.utils.isPositionOccupied ===
      'function'
  ) {
    try {
      if (
        ctx.utils.isPositionOccupied(
          cp.x,
          cp.y
        )
      ) {
        return false;
      }
    }
    catch (_) {}
  }

  /*
   * Boss 周围直接设为禁区。
   *
   * 修复 v1：
   * BFS 会直接追进 Boss。
   */
  if (
    ctx.boss &&
    (
      ctx.boss.hp == null ||
      ctx.boss.hp > 0
    )
  ) {
    const bp =
      center(
        ctx.boss
      );

    if (
      distance(
        ctx,
        cp,
        bp
      ) <
      ctx.CELL * 1.8
    ) {
      return false;
    }
  }

  /*
   * 普通敌人所在位置
   * 也不允许直接进入
   */
  for (
    const e
    of ctx.enemies || []
  ) {
    if (
      e.hp != null &&
      e.hp <= 0
    ) {
      continue;
    }

    if (
      distance(
        ctx,
        cp,
        center(e)
      ) <
      ctx.CELL * 1
    ) {
      return false;
    }
  }

  return true;
}

function bfsNextDirection(
  ctx,
  targetCell
) {
  const start =
    cellOfPoint(
      ctx,
      center(ctx.player)
    );

  const mines =
    mineCells(ctx);

  const key =
    (c, r) =>
      `${c},${r}`;

  const startKey =
    key(
      start.c,
      start.r
    );

  const targetKey =
    key(
      targetCell.c,
      targetCell.r
    );

  if (
    startKey ===
    targetKey
  ) {
    return null;
  }

  /*
   * 目标本身非法，
   * 不寻路。
   */
  if (
    !canOccupyCell(
      ctx,
      targetCell.c,
      targetCell.r,
      mines
    )
  ) {
    return null;
  }

  const q = [
    {
      c: start.c,
      r: start.r,
    },
  ];

  const prev =
    new Map();

  prev.set(
    startKey,
    null
  );

  let found =
    false;

  for (
    let qi = 0;
    qi < q.length &&
    qi <
      ctx.COLS *
        ctx.ROWS;
    qi++
  ) {
    const cur =
      q[qi];

    for (
      const name
      of DIR_NAMES
    ) {
      const d =
        DIR[name];

      const nc =
        cur.c +
        d.x;

      const nr =
        cur.r +
        d.y;

      const nk =
        key(
          nc,
          nr
        );

      if (
        prev.has(nk)
      ) {
        continue;
      }

      if (
        !canOccupyCell(
          ctx,
          nc,
          nr,
          mines
        )
      ) {
        continue;
      }

      prev.set(
        nk,
        {
          c:
            cur.c,

          r:
            cur.r,

          via:
            name,
        }
      );

      if (
        nk ===
        targetKey
      ) {
        found =
          true;

        break;
      }

      q.push({
        c: nc,
        r: nr,
      });
    }

    if (found) {
      break;
    }
  }

  if (!found) {
    return null;
  }

  let c =
    targetCell.c;

  let r =
    targetCell.r;

  let parent =
    prev.get(
      key(
        c,
        r
      )
    );

  /*
   * 从目标倒推，
   * 找第一步。
   */
  while (parent) {
    if (
      parent.c ===
        start.c &&
      parent.r ===
        start.r
    ) {
      return (
        parent.via
      );
    }

    c =
      parent.c;

    r =
      parent.r;

    parent =
      prev.get(
        key(
          c,
          r
        )
      );
  }

  return null;
}

/*
 * ================================
 * 射击线路判断
 * ================================
 */

function hasClearCellLine(
  ctx,
  a,
  b
) {
  if (
    a.c !== b.c &&
    a.r !== b.r
  ) {
    return false;
  }

  const ac =
    cellCenter(
      ctx,
      a.c,
      a.r
    );

  const bc =
    cellCenter(
      ctx,
      b.c,
      b.r
    );

  if (
    typeof ctx.isPathClear ===
    'function'
  ) {
    try {
      return !!ctx.isPathClear(
        ac.x,
        ac.y,
        bc.x,
        bc.y
      );
    }
    catch (_) {}
  }

  const dc =
    Math.sign(
      b.c -
      a.c
    );

  const dr =
    Math.sign(
      b.r -
      a.r
    );

  let c =
    a.c + dc;

  let r =
    a.r + dr;

  while (
    c !== b.c ||
    r !== b.r
  ) {
    if (
      isObstacle(
        ctx,
        c,
        r
      )
    ) {
      return false;
    }

    c += dc;
    r += dr;
  }

  return true;
}

/*
 * 当前是否已经和目标
 * 形成同行 / 同列射击关系。
 */
function aimDirectionIfAligned(
  ctx,
  targetPoint
) {
  const pc =
    cellOfPoint(
      ctx,
      center(ctx.player)
    );

  const tc =
    cellOfPoint(
      ctx,
      targetPoint
    );

  /*
   * 同一列
   */
  if (
    pc.c ===
      tc.c &&
    hasClearCellLine(
      ctx,
      pc,
      tc
    )
  ) {
    return (
      tc.r <
      pc.r
        ? 'up'
        : 'down'
    );
  }

  /*
   * 同一行
   */
  if (
    pc.r ===
      tc.r &&
    hasClearCellLine(
      ctx,
      pc,
      tc
    )
  ) {
    return (
      tc.c <
      pc.c
        ? 'left'
        : 'right'
    );
  }

  return null;
}

/*
 * ================================
 * 找射击位置
 * ================================
 */

function findFiringCell(
  ctx,
  targetPoint,
  isBoss
) {
  const start =
    cellOfPoint(
      ctx,
      center(ctx.player)
    );

  const tc =
    cellOfPoint(
      ctx,
      targetPoint
    );

  const mines =
    mineCells(ctx);

  let best = null;
  let bestScore =
    Infinity;

  /*
   * Boss：
   * 尽量保持 4~8 格。
   *
   * 普通敌人：
   * 3~7 格。
   */
  const minRange =
    isBoss
      ? 4
      : 3;

  const maxRange =
    isBoss
      ? 8
      : 7;

  for (
    const name
    of DIR_NAMES
  ) {
    const d =
      DIR[name];

    for (
      let range =
        minRange;
      range <=
        maxRange;
      range++
    ) {
      const c =
        tc.c +
        d.x *
          range;

      const r =
        tc.r +
        d.y *
          range;

      if (
        !canOccupyCell(
          ctx,
          c,
          r,
          mines
        )
      ) {
        continue;
      }

      /*
       * 必须能形成
       * 直线火力
       */
      if (
        !hasClearCellLine(
          ctx,
          {
            c,
            r,
          },
          tc
        )
      ) {
        continue;
      }

      const cp =
        cellCenter(
          ctx,
          c,
          r
        );

      /*
       * 碰撞风险太高
       */
      if (
        collisionRiskAt(
          ctx,
          cp
        ) >
        80
      ) {
        continue;
      }

      /*
       * 离当前位置越近越好
       */
      let score =
        Math.abs(
          c -
          start.c
        ) +
        Math.abs(
          r -
          start.r
        ) +
        range *
          0.12;

      /*
       * 不喜欢贴墙
       */
      if (
        c <= 1 ||
        r <= 1 ||
        c >=
          ctx.COLS - 2 ||
        r >=
          ctx.ROWS - 2
      ) {
        score += 5;
      }

      if (
        score <
        bestScore
      ) {
        bestScore =
          score;

        best = {
          c,
          r,
        };
      }
    }
  }

  return best;
}

/*
 * 找不到完美射击位时，
 * 找一个安全接近位置。
 *
 * 关键：
 *
 * 永远不会寻路到敌人本体。
 */
function findSafeApproachCell(
  ctx,
  targetPoint,
  isBoss
) {
  const targetCell =
    cellOfPoint(
      ctx,
      targetPoint
    );

  const playerCell =
    cellOfPoint(
      ctx,
      center(ctx.player)
    );

  const mines =
    mineCells(ctx);

  let best = null;
  let bestScore =
    Infinity;

  const minRadius =
    isBoss
      ? 4
      : 3;

  const maxRadius =
    isBoss
      ? 7
      : 6;

  for (
    let radius =
      minRadius;
    radius <=
      maxRadius;
    radius++
  ) {
    for (
      let dc =
        -radius;
      dc <= radius;
      dc++
    ) {
      for (
        let dr =
          -radius;
        dr <= radius;
        dr++
      ) {
        /*
         * 只检查这一圈
         */
        if (
          Math.abs(dc) !==
            radius &&
          Math.abs(dr) !==
            radius
        ) {
          continue;
        }

        const c =
          targetCell.c +
          dc;

        const r =
          targetCell.r +
          dr;

        if (
          !canOccupyCell(
            ctx,
            c,
            r,
            mines
          )
        ) {
          continue;
        }

        const cp =
          cellCenter(
            ctx,
            c,
            r
          );

        /*
         * 敌人碰撞风险高
         */
        if (
          collisionRiskAt(
            ctx,
            cp
          ) >
          80
        ) {
          continue;
        }

        let score =
          Math.abs(
            c -
            playerCell.c
          ) +
          Math.abs(
            r -
            playerCell.r
          );

        /*
         * 能直接攻击，
         * 大幅加分。
         */
        if (
          hasClearCellLine(
            ctx,
            {
              c,
              r,
            },
            targetCell
          )
        ) {
          score -= 8;
        }

        /*
         * 地图边缘惩罚
         */
        if (
          c <= 1 ||
          r <= 1 ||
          c >=
            ctx.COLS - 2 ||
          r >=
            ctx.ROWS - 2
        ) {
          score += 5;
        }

        if (
          score <
          bestScore
        ) {
          bestScore =
            score;

          best = {
            c,
            r,
          };
        }
      }
    }

    /*
     * 找到最近一圈即可
     */
    if (best) {
      break;
    }
  }

  return best;
}

/*
 * ================================
 * 碎石墙
 * ================================
 */

function adjacentCrackDirection(
  ctx
) {
  const pc =
    cellOfPoint(
      ctx,
      center(ctx.player)
    );

  let best = null;
  let bestHp =
    Infinity;

  for (
    const name
    of DIR_NAMES
  ) {
    const d =
      DIR[name];

    const c =
      pc.c +
      d.x;

    const r =
      pc.r +
      d.y;

    let t;

    try {
      t =
        ctx.mapAt(
          c,
          r
        );
    }
    catch (_) {
      continue;
    }

    if (
      t !==
      ctx.TILE.CRACK
    ) {
      continue;
    }

    let hp = 999;

    if (
      typeof ctx.crackHpAt ===
      'function'
    ) {
      try {
        const v =
          ctx.crackHpAt(
            c,
            r
          );

        if (
          Number.isFinite(v)
        ) {
          hp = v;
        }
      }
      catch (_) {}
    }

    if (
      hp <
      bestHp
    ) {
      bestHp =
        hp;

      best =
        name;
    }
  }

  return best;
}

/*
 * ================================
 * 防卡死
 * ================================
 */

function updateStuckState(
  ctx,
  desiredDir,
  dt
) {
  const now =
    ctx.gtMs || 0;

  const p =
    ctx.player;

  if (
    memory.lastX ==
    null
  ) {
    memory.lastX =
      p.x;

    memory.lastY =
      p.y;

    memory.lastMovedAt =
      now;

    return;
  }

  const moved =
    Math.hypot(
      p.x -
        memory.lastX,

      p.y -
        memory.lastY
    );

  /*
   * 正常移动
   */
  if (
    moved >
    1.5
  ) {
    memory.lastMovedAt =
      now;

    memory.lastX =
      p.x;

    memory.lastY =
      p.y;

    return;
  }

  /*
   * 650ms 没移动
   */
  if (
    desiredDir &&
    now -
      memory.lastMovedAt >
      650 &&
    now >=
      memory.unstuckUntil
  ) {
    const alternatives =
      DIR_NAMES.filter(
        d =>
          d !==
          desiredDir
      );

    memory.unstuckDir =
      chooseSafestDirection(
        ctx,
        dt,
        alternatives
      );

    memory.unstuckUntil =
      now + 420;

    memory.lastMovedAt =
      now;
  }
}

function applyUnstuck(
  ctx,
  dir
) {
  const now =
    ctx.gtMs || 0;

  if (
    now <
      memory.unstuckUntil &&
    memory.unstuckDir
  ) {
    return (
      memory.unstuckDir
    );
  }

  return dir;
}

/*
 * ================================
 * 布雷
 * ================================
 */

function shouldMine(
  ctx,
  escaping
) {
  const now =
    ctx.gtMs || 0;

  if (
    !ctx.player.mines ||
    ctx.player.mines <= 0
  ) {
    return false;
  }

  /*
   * 防止瞬间把雷用光
   */
  if (
    now -
      memory.lastMineAt <
    1400
  ) {
    return false;
  }

  const p =
    center(
      ctx.player
    );

  let nearby =
    false;

  /*
   * Boss 接近
   */
  if (
    ctx.boss &&
    (
      ctx.boss.hp == null ||
      ctx.boss.hp > 0
    )
  ) {
    if (
      distance(
        ctx,
        p,
        center(
          ctx.boss
        )
      ) <
      ctx.CELL * 2.6
    ) {
      nearby =
        true;
    }
  }

  /*
   * 普通敌人接近
   */
  if (!nearby) {
    for (
      const e
      of ctx.enemies || []
    ) {
      if (
        e.hp != null &&
        e.hp <= 0
      ) {
        continue;
      }

      if (
        distance(
          ctx,
          p,
          center(e)
        ) <
        ctx.CELL * 2.4
      ) {
        nearby =
          true;

        break;
      }
    }
  }

  const lowHp =
    ctx.player.hp /
      Math.max(
        1,
        ctx.player.maxHp
      ) <
    0.4;

  /*
   * 敌人贴脸
   * 或残血逃跑
   */
  if (
    nearby ||
    (
      escaping &&
      lowHp
    )
  ) {
    memory.lastMineAt =
      now;

    return true;
  }

  return false;
}

/*
 * ================================
 * 内部状态重置
 * ================================
 */

function resetMemory(
  ctx
) {
  memory.lastX =
    ctx.player?.x ??
    null;

  memory.lastY =
    ctx.player?.y ??
    null;

  memory.lastMovedAt =
    ctx.gtMs || 0;

  memory.lastMineAt =
    -99999;

  memory.lastDir =
    ctx.player?.dirName ||
    'up';

  memory.unstuckUntil =
    0;

  memory.unstuckDir =
    null;
}

/*
 * ======================================================
 *
 *                 THX 猎杀者 V2
 *
 * ======================================================
 */

export default {

  name:
    'THX-猎杀者-v2',

  onLoad(ctx) {
    resetMemory(ctx);
  },

  onRoundStart(ctx) {
    resetMemory(ctx);
  },

  decide(
    ctx,
    dt
  ) {

    if (
      !ctx ||
      ctx.state !==
        'playing' ||
      !ctx.player
    ) {
      return emptyAction();
    }

    /*
     * ==================================================
     *
     * 0 号优先级
     *
     * Boss / 敌人碰撞逃生
     *
     * ==================================================
     */

    let dir =
      emergencyCollisionEscape(
        ctx,
        dt
      );

    if (dir) {

      updateStuckState(
        ctx,
        dir,
        dt
      );

      dir =
        applyUnstuck(
          ctx,
          dir
        );

      memory.lastDir =
        dir ||
        memory.lastDir;

      return action(
        dir ||
          memory.lastDir,

        true,

        shouldMine(
          ctx,
          true
        )
      );
    }

    /*
     * ==================================================
     *
     * 1 号优先级
     *
     * 子弹闪避
     *
     * ==================================================
     */

    dir =
      immediateDodge(
        ctx,
        dt
      );

    if (dir) {

      updateStuckState(
        ctx,
        dir,
        dt
      );

      dir =
        applyUnstuck(
          ctx,
          dir
        );

      memory.lastDir =
        dir ||
        memory.lastDir;

      /*
       * 闪避时仍然持续射击
       */
      return action(
        dir ||
          memory.lastDir,

        true,

        shouldMine(
          ctx,
          true
        )
      );
    }

    /*
     * ==================================================
     *
     * 2 号优先级
     *
     * 高价值道具
     *
     * ==================================================
     */

    const item =
      chooseItem(
        ctx,
        dt
      );

    if (item) {

      const itemCell =
        cellOfPoint(
          ctx,
          {
            x: item.x,
            y: item.y,
          }
        );

      dir =
        bfsNextDirection(
          ctx,
          itemCell
        ) ||
        chooseSafestDirection(
          ctx,
          dt
        );

      updateStuckState(
        ctx,
        dir,
        dt
      );

      dir =
        applyUnstuck(
          ctx,
          dir
        );

      memory.lastDir =
        dir ||
        memory.lastDir;

      return action(
        dir ||
          memory.lastDir,

        true,

        shouldMine(
          ctx,
          false
        )
      );
    }

    /*
     * ==================================================
     *
     * 3 号优先级
     *
     * 战斗
     *
     * ==================================================
     */

    const target =
      chooseCombatTarget(
        ctx
      );

    if (target) {

      const isBoss =
        target.kind ===
        'boss';

      const aim =
        aimDirectionIfAligned(
          ctx,
          target.p
        );

      const p =
        center(
          ctx.player
        );

      const targetDistance =
        distance(
          ctx,
          p,
          target.p
        );

      /*
       * Boss 比普通敌人
       * 保持更远安全距离
       */
      const tooClose =
        targetDistance <
        ctx.CELL *
          (
            isBoss
              ? 4
              : 2.2
          );

      /*
       * ================================================
       *
       * 已经与目标形成直线
       *
       * ================================================
       */

      if (aim) {

        /*
         * 太近：
         *
         * 优先逃，
         * 不继续冲脸。
         */
        if (tooClose) {

          const escape =
            emergencyCollisionEscape(
              ctx,
              dt
            ) ||
            chooseSafestDirection(
              ctx,
              dt
            );

          if (escape) {

            updateStuckState(
              ctx,
              escape,
              dt
            );

            dir =
              applyUnstuck(
                ctx,
                escape
              );

            memory.lastDir =
              dir ||
              memory.lastDir;

            return action(
              dir ||
                memory.lastDir,

              true,

              shouldMine(
                ctx,
                true
              )
            );
          }
        }

        /*
         * 已经面向目标：
         *
         * 原地持续输出。
         *
         * 这是 v2 非常重要的修改。
         *
         * v1 会继续往敌人冲。
         */
        if (
          ctx.player.dirName ===
          aim
        ) {
          return action(
            null,
            true,
            shouldMine(
              ctx,
              false
            )
          );
        }

        /*
         * 当前方向没有对准：
         *
         * 转向目标。
         *
         * 只有当前方向足够安全
         * 才允许。
         */
        if (
          !isBlocked(
            ctx,
            aim
          ) &&
          directionSafetyScore(
            ctx,
            aim,
            dt
          ) >
            -15000
        ) {
          memory.lastDir =
            aim;

          return action(
            aim,
            true,
            shouldMine(
              ctx,
              false
            )
          );
        }
      }

      /*
       * ================================================
       *
       * 没有形成射击线
       *
       * 寻找最佳射击位
       *
       * ================================================
       */

      const firingCell =
        findFiringCell(
          ctx,
          target.p,
          isBoss
        );

      dir =
        firingCell
          ? bfsNextDirection(
              ctx,
              firingCell
            )
          : null;

      /*
       * 找不到完美射击位。
       *
       * 只接近到安全区域。
       *
       * 注意：
       *
       * 不再 BFS 到敌人位置！
       */
      if (!dir) {

        const approachCell =
          findSafeApproachCell(
            ctx,
            target.p,
            isBoss
          );

        if (
          approachCell
        ) {
          dir =
            bfsNextDirection(
              ctx,
              approachCell
            );
        }
      }

      /*
       * 实在无路可走：
       *
       * 选择当前安全方向。
       */
      if (!dir) {
        dir =
          chooseSafestDirection(
            ctx,
            dt
          );
      }

      updateStuckState(
        ctx,
        dir,
        dt
      );

      dir =
        applyUnstuck(
          ctx,
          dir
        );

      memory.lastDir =
        dir ||
        memory.lastDir;

      return action(
        dir ||
          memory.lastDir,

        true,

        shouldMine(
          ctx,
          false
        )
      );
    }

    /*
     * ==================================================
     *
     * 4 号优先级
     *
     * 无敌人：
     *
     * 巡逻
     *
     * ==================================================
     */

    dir =
      chooseSafestDirection(
        ctx,
        dt
      );

    /*
     * 如果完全没路，
     * 尝试打碎碎石。
     */
    if (
      !dir ||
      directionSafetyScore(
        ctx,
        dir,
        dt
      ) <
        -500000
    ) {
      const crackDir =
        adjacentCrackDirection(
          ctx
        );

      if (
        crackDir
      ) {
        dir =
          crackDir;
      }
    }

    updateStuckState(
      ctx,
      dir,
      dt
    );

    dir =
      applyUnstuck(
        ctx,
        dir
      );

    memory.lastDir =
      dir ||
      memory.lastDir;

    return action(
      dir ||
        memory.lastDir,

      true,

      shouldMine(
        ctx,
        false
      )
    );
  },

  onDeath(
    ctx,
    reason
  ) {},

  onDisabled(ctx) {},
};