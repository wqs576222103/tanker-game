# AI 编写指南（ctx 沙箱说明）

### 生成脚本必须为javaScript

`ctx` 是游戏状态的**只读快照**，每次调用 `decide(ctx, dt)` 时都会被重新构建。
AI 脚本只需实现以下方法即可运行：

```js
export default {
  name: "我的AI",
  onLoad(ctx) {}, // 可选：脚本被加载/启用时调用
  onRoundStart(ctx) {}, // 可选：每局开始时调用
  decide(ctx, dt) {
    // 必选，每帧调用，返回本帧执行的操作
    return {
      up: bool,
      down: bool,
      left: bool,
      right: bool,
      fire: true, // 持续 true = 连续射击（内置冷却）
      mine: false, // 布置地雷
    };
  },
  onDeath(ctx, reason) {}, // 可选：玩家死亡时调用
  onDisabled(ctx) {}, // 可选：被关闭时调用
};
```

> 也可以不使用 ES 模块，直接定义全局对象 `window.__AI__ = { decide(ctx, dt){...} }`。

---

## 一、地图常量

| 字段   | 说明                                                                                      |
| ------ | ----------------------------------------------------------------------------------------- |
| `CELL` | 单个格子边长（像素），固定 20                                                             |
| `COLS` | 地图列数（格子数），固定 20                                                               |
| `ROWS` | 地图行数（格子数），固定 20                                                               |
| `W`    | 画布总宽（像素），=` COLS * CELL`                                                         |
| `H`    | 画布总高（像素），=`ROWS * CELL`                                                          |
| `DIRS` | 方向常量：`{ up, down, left, right }`，每个值为 `{x, y}` 单位向量（如 `left:{x:-1,y:0}`） |
| `TILE` | 地图格子类型枚举，取值如下                                                                |

`TILE` 的字段：

| 常量          | 值  | 含义                           |
| ------------- | --- | ------------------------------ |
| `TILE.EMPTY`  | 0   | 空地，可通过                   |
| `TILE.WALL`   | 1   | 砖墙，不可破坏，阻挡子弹与移动 |
| `TILE.GATE`   | 2   | 传送门                         |
| `TILE.BORDER` | 3   | 地图边界（越界即视为它）       |
| `TILE.CRACK`  | 4   | 碎石墙，可被子弹破坏           |
| `TILE.GRASS`  | 5   | 草丛，可通过、隐藏坦克         |

---

## 二、游戏即时信息

| 字段    | 类型   | 说明                                                |
| ------- | ------ | --------------------------------------------------- |
| `state` | string | 游戏状态：`"start" / "playing" / "paused" / "over"` |
| `score` | number | 当前分数                                            |
| `gtMs`  | number | 本局已进行时间（毫秒）                              |

### `player`（玩家坦克，死亡时为 `null`）

| 字段                       | 类型    | 说明                           |
| -------------------------- | ------- | ------------------------------ |
| `x , y`                    | number  | 左上角坐标（像素）             |
| `w , h`                    | number  | 宽高（像素）                   |
| `dirName`                  | string  | 朝向名称：`up/down/left/right` |
| `dir`                      | {x,y}   | 朝向单位向量                   |
| `hp / maxHp`               | number  | 当前 / 最大生命值              |
| `shieldT`                  | number  | 护盾剩余时间（毫秒）           |
| `fireT / speedT / spreadT` | number  | 射速 / 移速 / 散弹效果剩余时间 |
| `drones`                   | number  | 无人机数量                     |
| `mines`                    | number  | 剩余地雷数量                   |
| `inGrass`                  | boolean | 是否在草丛中                   |

### `enemies`（敌方坦克数组）

每个元素含：`id, x, y, w, h, dirName, dir:{x,y}, speed, hp, maxHp, color, isAI`

> 在 AI 对决模式中，`enemies` 仅包含与其他坦克 teamId 不同的存活坦克（即所有其他 AI）。

### `bullets`（子弹数组）

每个元素含：`x, y, dir:{x,y}, vx, vy, speed, owner, dmg, bounced`

> **注意**：在单人对战 Boss 模式中，`owner` 为字符串 `"player"`；在 **AI 对决模式**（Battle Arena）中，`owner` 为坦克的 `teamId`（数字）。
> 建议使用 `ctx.isEnemyBullet(bullet)` 来判断子弹是否来自敌方，兼容两种模式。

### `items`（场上道具数组）

每个元素含：`x, y, type, name, age, life`

可用类型：`drone`(无人机) `spread`(散弹) `fire`(射速) `speed`(移速) `shield`(护盾) `mine`(地雷) `heal`(生命) `bounce`(墙面反弹一次子弹)

### `mines`（地雷数组）

每个元素含：`x, y`

### `drones`（无人机数组）

每个元素含：`x, y, hp`

### `boss`（Boss，存在且存活时为对象，否则 `null`）

含：`x, y, w, h, dirName, dir:{x,y}, speed, hp, maxHp`

### `gates`（传送门数组）

每个元素含：`cells`（本门格子数组）、`partnerCells`（配对门格子数组）
每个格子 `{ column, row }`

### `enemiesInGrass`（草丛中的敌方 id 数组）

只可知哪些敌方在草丛，具体位置未知。

---

## 三、工具方法（`ctx.xxx`）

| 方法                       | 说明                                                                     |
| -------------------------- | ------------------------------------------------------------------------ |
| `cellOf(x, y)`             | 像素坐标 → 格子 `{c, r}`（c 列，r 行）                                   |
| `centerOf(c, r)`           | 格子 → 中心像素坐标                                                      |
| `distance(x1,y1,x2,y2)`    | 两点欧氏距离                                                             |
| `mapAt(column,row)`        | 取格子类型（越界返回 `TILE.BORDER`）                                     |
| `crackHpAt(column,row)`    | 碎石墙剩余 HP（无损的石头返回 0）                                        |
| `isObstacle(column,row)`   | 是否为障碍（墙/边界/碎石）                                               |
| `isPathClear(x1,y1,x2,y2)` | 两点（含两端）之间能否直线通行（需同列或同行）                           |
| `isBlocked(dir)`           | 玩家朝 `dir` 方向移动一格是否会撞墙/边界（**宽度感知**，检查坦克包围盒） |
| `getFreeDistance(dir)`     | 玩家朝 `dir` 方向到最近障碍的距离（像素，**宽度感知**）                  |
| `isEnemyBullet(bullet)`    | 判断子弹是否来自敌方（兼容单人/AI对决两种模式）                          |
| `selfTeamId`               | 当前坦克的阵营 ID（仅 AI 对决模式有效，数字）                            |

---

## 四、`utils`（更强的辅助工具，`ctx.utils.xxx`）

| 方法                                    | 说明                           |
| --------------------------------------- | ------------------------------ |
| `getTankPositions()`                    | 所有存活坦克位置               |
| `getPlayerPosition()`                   | 玩家位置（死亡返回 null）      |
| `getEnemyPositions()`                   | 所有敌人位置（含朝向与速度）   |
| `predictEnemyPositions(frames, dt)`     | 预测敌人 `frames` 帧后的位置   |
| `getBulletPositions(frames, dt)`        | 所有子弹位置（含下一帧预测）   |
| `getPlayerBullets(frames, dt)`          | 玩家子弹                       |
| `getEnemyBullets(frames, dt)`           | 敌方子弹（含方向与下一帧位置） |
| `getObstaclePositions()`                | 所有墙/碎石位置                |
| `getDestructibleObstacles()`            | 可破坏的碎石墙（含 hp）        |
| `getIndestructibleObstacles()`          | 不可破坏的砖墙                 |
| `getGrassPositions()`                   | 草丛位置                       |
| `getTanksInGrass()`                     | 草丛中隐藏的坦克信息           |
| `getTanksInRange(x,y,range)`            | 指定范围内的坦克               |
| `getGatePositions()`                    | 传送门位置                     |
| `getItemPositions()`                    | 道具位置                       |
| `getMinePositions()`                    | 地雷位置                       |
| `getBossPosition()`                     | Boss 位置（无则 null）         |
| `isPositionOccupied(x,y,excludeTankId)` | 位置是否被其它坦克占用         |
| `isPositionObstacle(x,y)`               | 位置是否为障碍                 |
| `getCellType(column,row)`               | 取格子类型                     |

---

## 坐标约定

- 所有像素坐标为坦克/对象的**左上角**，中心点为 `x + w/2, y + h/2`。
- `cellOf` / `mapAt` / `isObstacle` 用的格子下标：c 为列，r 为行，`map[r][c]`。
- 坦克尺寸为 `w = h = 20px`，实际占据一个格子宽。
