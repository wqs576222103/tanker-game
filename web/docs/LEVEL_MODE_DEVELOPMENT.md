# 坦克游戏关卡模式开发文档

## 一、概述

关卡模式是坦克游戏的附加玩法，提供固定地图和明确目标的挑战。玩家通过特定关卡后可解锁下一关。

### 核心特性
- **固定地图**：每关使用预设地图，不再随机生成
- **明确目标**：击杀数、夺旗、生存时间等多种胜利条件
- **进度保存**：自动保存通关时间和解锁状态
- **难度递增**：后续关卡可逐步增加挑战性

---

## 二、架构说明

### 文件结构

```
web/src/
├── views/
│   ├── TankGame/
│   │   ├── script/
│   │   │   ├── base.js          # 核心游戏引擎（已修改）
│   │   │   └── levels.js        # 关卡配置（新增）
│   │   └── components/
│   │       └── Map/             # 游戏地图组件（复用）
│   └── LevelMode/
│       ├── index.vue            # 关卡选择页（新增）
│       └── LevelGame.vue        # 关卡游戏页（新增）
└── router/
    └── index.js                 # 路由配置（已修改）
```

### 数据流

```
用户点击"关卡模式"
    ↓
进入 /levels 路由（LevelSelect.vue）
    ↓
选择关卡 → /level/:id 路由（LevelGame.vue）
    ↓
加载关卡配置 → 设置关卡模式 → 初始化游戏
    ↓
游戏进行 → 检查胜利条件
    ↓
完成/失败 → 更新进度 → 返回选择或下一关
```

---

## 三、如何开发新关卡

### Step 1: 编辑 levels.js

打开 `web/src/views/TankGame/script/levels.js`，在 `LEVELS` 数组中添加新关卡：

```javascript
export const LEVELS = [
  // ... 已有关卡 ...
  
  {
    id: 2,                          // 关卡ID（必须连续）
    name: 'Boss之战',               // 关卡名称
    description: '击败强大的Boss！', // 描述
    map: level2Map,                 // 地图数据
    crackHp: initCrackHp(level2Map), // 碎石墙耐久
    playerSpawn: { c: 22, r: 26 },  // 玩家重生点
    enemySpawns: [                   // 敌人生成点
      { c: 5, r: 3 },
      { c: 39, r: 3 }
    ],
    objective: {                     // 胜利条件
      type: 'killBoss',              // 条件类型
      target: 1,                     // 目标值
      description: '击败Boss'
    },
    maxEnemies: 8,                   // 最大敌人数
    baseEnemyHp: 3,                  // 敌人基础血量
    enemySpeed: 70,                  // 敌人速度
    bossThreshold: 0                 // Boss触发条件（0=立即）
  }
];
```

### Step 2: 设计地图

#### 方法A：字符串模板（推荐）

使用字符映射创建地图：

```javascript
const level2Map = createMap(`
#########################################
#.......................................#
#.█████████████████████████████████████.#
#.#░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░#
#.█████████████████████████████████████.#
#.......................................#
#.█████████████████████████████████████.#
#.......................................#
#..玩家基地#...#...#...#...#...#...#...#
#########################################
`);
```

**字符映射表：**
| 字符 | 类型 | 说明 |
|------|------|------|
| `#` | BORDER | 边境墙（不可破坏） |
| `.` | EMPTY | 空地 |
| `█` | WALL | 墙壁（不可破坏） |
| `▓` | CRACK | 碎石墙（可破坏） |
| `░` | GRASS | 草丛（可隐藏） |
| `◈` | GATE | 传送门 |

#### 方法B：程序化生成

```javascript
function createCustomMap() {
  const map = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
  
  // 添加边境
  addBorder(map);
  
  // 添加墙壁
  addWalls(map);
  
  // 添加碎石墙
  addCrackWalls(map);
  
  // 添加草丛
  addGrass(map);
  
  return map;
}
```

### Step 3: 配置胜利条件

#### 条件类型

| type | 说明 | target含义 |
|------|------|-----------|
| `killCount` | 击杀指定数量敌人 | 需要击杀的敌人数量 |
| `captureFlag` | 夺取旗帜 | 需要夺取的次数（通常为1） |
| `surviveTime` | 生存指定时间 | 生存时间（秒） |
| `killBoss` | 击败Boss | 需要击败的Boss数量 |

#### 示例配置

**击杀型：**
```javascript
objective: {
  type: 'killCount',
  target: 20,
  description: '消灭20个敌人'
}
```

**夺旗型：**
```javascript
objective: {
  type: 'captureFlag',
  target: 1,
  description: '夺取敌方旗帜并带回基地'
},
flag: {
  x: 22 * 20,      // 旗帜X坐标（像素）
  y: 3 * 20,       // 旗帜Y坐标（像素）
  team: 'enemy'    // 旗帜所属队伍
}
```

**生存型：**
```javascript
objective: {
  type: 'surviveTime',
  target: 60,
  duration: 120,   // 生存时间（秒）
  description: '生存2分钟'
}
```

**Boss型：**
```javascript
objective: {
  type: 'killBoss',
  target: 1,
  description: '击败Boss'
},
bossThreshold: 0   // 游戏开始立即出现Boss
```

### Step 4: 调整难度参数

| 参数 | 说明 | 建议值 |
|------|------|--------|
| `maxEnemies` | 最大敌人数 | 4-8 |
| `baseEnemyHp` | 敌人基础血量 | 2-4 |
| `enemySpeed` | 敌人移动速度 | 50-80 |
| `bossThreshold` | Boss触发击杀数 | 8-20 |

---

## 四、现有关卡详解

### Level 1: 夺旗精英

**主题**：玩家需要深入敌方阵地，夺取旗帜并安全返回。

**地图布局**：
- 上下两层敌方堡垒区（墙壁+碎石墙）
- 中央走廊作为战斗区域
- 底层为一方基地

**特殊机制**：
- 旗帜位于敌方堡垒顶部 (c:22, r:3)
- 玩家需携带旗帜返回基地 (c:22, r:26)
- 可破坏墙壁创造捷径

**难度曲线**：
- 敌人数量：最多6个
- 敌人血量：2点
- 敌人速度：60
- Boss触发：击杀8个敌人后

---

## 五、扩展建议

### 1. 添加更多胜利条件

在 `base.js` 的 `checkLevelWin()` 函数中添加新条件：

```javascript
export function checkLevelWin() {
  if (!window.levelMode || !window.levelConfig) return false;
  
  const { objective } = window.levelConfig;
  
  switch (objective.type) {
    case 'killCount':
      return window.kills >= objective.target;
    case 'captureFlag':
      return window.flagCaptured;
    case 'surviveTime':
      return window.gtMs >= (objective.duration || 60) * 1000;
    case 'killBoss':
      return window.bossKills > (window.levelLastBossKills || 0);
    case 'collectItems':  // 新条件：收集指定物品
      return window.collectedItems >= objective.target;
    default:
      return false;
  }
}
```

### 2. 添加关卡特殊机制

在 `levels.js` 中添加特殊逻辑：

```javascript
// 关卡特殊标记
{
  id: 3,
  name: '限时挑战',
  special: 'timeLimit',  // 特殊标记
  timeLimit: 180,        // 时间限制（秒）
  // ...
}
```

在 `base.js` 中处理：

```javascript
export function checkLevelWin() {
  // ... 原有逻辑 ...
  
  // 特殊机制处理
  if (window.levelConfig?.special === 'timeLimit') {
    if (window.gtMs >= window.levelConfig.timeLimit * 1000) {
      showLevelFailed('时间耗尽');
      return false;
    }
  }
  
  return false;
}
```

### 3. 添加关卡装饰物

在地图中添加特殊元素：

```javascript
// 地图中添加特殊标记
const levelMap = createMap(`
#########################################
#.......................................#
#...*.................................#
#.......................................#
#########################################
`);

// 解析特殊元素
function parseSpecialElements(map) {
  const specials = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[r][c] === '*') {
        specials.push({ type: 'powerUp', x: c * CELL, y: r * CELL });
      }
    }
  }
  return specials;
}
```

---

## 六、调试技巧

### 查看关卡配置

在浏览器控制台：

```javascript
// 查看当前关卡配置
console.log(window.levelConfig);

// 查看所有关卡
console.log(LEVELS);

// 查看关卡进度
console.log(localStorage.getItem('tank-level-progress'));
```

### 重置关卡进度

```javascript
// 清除所有关卡进度
localStorage.removeItem('tank-level-progress');

// 解锁所有关卡（调试用）
localStorage.setItem('tank-level-progress', JSON.stringify({
  unlockedLevel: 100
}));
```

### 测试特定关卡

直接访问URL：
```
http://localhost:5173/level/1  # 测试第1关
http://localhost:5173/level/2  # 测试第2关
```

---

## 七、常见问题

### Q1: 地图加载失败？

检查：
1. 地图数组维度是否正确（应为 ROWS × COLS）
2. 所有单元格值是否有效（0-5）
3. 玩家和敌人重生点是否在空地上

### Q2: 胜利条件不触发？

检查：
1. `objective.type` 是否正确
2. 全局状态是否正确设置（如 `window.flagCaptured`）
3. 事件监听是否正确绑定

### Q3: 关卡进度不保存？

检查：
1. localStorage 是否被禁用
2. 浏览器是否处于隐私模式
3. 控制台是否有存储错误

---

## 八、下一步开发

### 短期目标
- [ ] 完成 Level 2：Boss之战
- [ ] 完成 Level 3：限时生存
- [ ] 添加关卡难度选择

### 中期目标
- [ ] 支持多人关卡协作
- [ ] 添加关卡编辑器
- [ ] 实现关卡分享功能

### 长期目标
- [ ] 云端关卡存档
- [ ] 社区关卡系统
- [ ] 动态难度调整

---

**文档版本**: 1.0  
**最后更新**: 2026-09-11  
**维护者**: 开发团队
