export default {
    name: "贪吃生存者",

    // 脚本加载时调用
    onLoad(ctx) {
        console.log("AI 已加载：贪吃生存者模式启动");
    },

    // 每局开始时调用
    onRoundStart(ctx) {
        // 重置一些可能的状态（如果需要）
    },

    // 核心决策循环
    decide(ctx, dt) {
        const player = ctx.player;
        if (!player) return {}; // 如果玩家已淘汰，返回空操作

        const enemies = ctx.enemies;
        const items = ctx.items;
        const utils = ctx.utils;

        // 1. 状态评估：判断是否处于危险状态
        // 危险定义：血量低 (<40) 或 有敌方子弹在附近 (<150px)
        const isLowHp = player.hp < 40;
        const enemyBullets = utils.getEnemyBullets(0, dt);
        const nearestBullet = enemyBullets.reduce((nearest, b) => {
            const d = ctx.distance(player.x + player.w / 2, player.y + player.h / 2, b.x, b.y);
            return d < 150 && (!nearest || d < nearest.dist) ? { bullet: b, dist: d } : nearest;
        }, null);

        const isUnderFire = nearestBullet !== null;
        const isDanger = isLowHp || isUnderFire;

        // 2. 行为决策
        let target = null; // 目标点 {x, y}

        if (isDanger) {
            // --- 紧急避险逻辑 ---
            if (isUnderFire) {
                // 策略：垂直于子弹方向躲避
                // 子弹方向是 {x, y}，垂直方向可以是 {-y, x} 或 {y, -x}
                // 我们选择一个能让坦克远离子弹的方向
                const bulletDir = nearestBullet.bullet.dir;
                // 简单的垂直向量
                const dodgeDir = { x: -bulletDir.y, y: bulletDir.x };

                // 检查哪个方向是安全的（不撞墙）
                if (!ctx.isBlocked(dodgeDir)) {
                    // 向躲避方向移动一小段距离作为临时目标
                    target = {
                        x: player.x + dodgeDir.x * 100,
                        y: player.y + dodgeDir.y * 100
                    };
                } else {
                    // 如果躲避方向有墙，尝试反方向
                    const backDir = { x: bulletDir.x, y: bulletDir.y };
                    if (!ctx.isBlocked(backDir)) {
                        target = { x: player.x - backDir.x * 100, y: player.y - backDir.y * 100 };
                    }
                }
            }

            if (!target && isLowHp) {
                // 如果只是血少但没子弹，寻找最近的草丛躲进去
                const grasses = utils.getGrassPositions();
                const myPos = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
                let nearestGrass = null;
                let minDist = 9999;

                grasses.forEach(g => {
                    const center = ctx.centerOf(g.c, g.r);
                    const d = ctx.distance(myPos.x, myPos.y, center.x, center.y);
                    if (d < minDist) {
                        minDist = d;
                        nearestGrass = center;
                    }
                });
                target = nearestGrass;
            }

        } else {
            // --- 道具拾取逻辑 ---
            if (items && items.length > 0) {
                // 寻找最近的一个道具
                const myCenterX = player.x + player.w / 2;
                const myCenterY = player.y + player.h / 2;

                let nearestItem = null;
                let minDist = 9999;

                items.forEach(item => {
                    const d = ctx.distance(myCenterX, myCenterY, item.x, item.y);
                    // 优先捡护盾和回血，其次是攻击类
                    let priority = 1;
                    if (item.type === 'shield' || item.type === 'heal') priority = 10;
                    if (item.type === 'fire' || item.type === 'spread') priority = 5;

                    // 加权距离：优先级越高， perceived distance 越短
                    const weightedDist = d / priority;

                    if (weightedDist < minDist) {
                        minDist = weightedDist;
                        nearestItem = item;
                    }
                });

                if (nearestItem) {
                    target = { x: nearestItem.x, y: nearestItem.y };
                }
            }
        }

        // 3. 执行移动
        let up = false, down = false, left = false, right = false;

        if (target) {
            const myCenterX = player.x + player.w / 2;
            const myCenterY = player.y + player.h / 2;

            const dx = target.x - myCenterX;
            const dy = target.y - myCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            // 归一化方向
            const dirX = dx / dist;
            const dirY = dy / dist;

            // 简单的移动逻辑：哪个轴偏差大优先走哪个，或者同时走
            // 注意：isBlocked 检测的是如果往该方向走一步是否会撞墙
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) { // 只有距离大于5才移动，防止抖动
                if (Math.abs(dx) > Math.abs(dy)) {
                    // 优先水平移动
                    if (dx > 0 && !ctx.isBlocked(ctx.DIRS.right)) right = true;
                    else if (dx < 0 && !ctx.isBlocked(ctx.DIRS.left)) left = true;
                } else {
                    // 优先垂直移动
                    if (dy > 0 && !ctx.isBlocked(ctx.DIRS.down)) down = true;
                    else if (dy < 0 && !ctx.isBlocked(ctx.DIRS.up)) up = true;
                }

                // 如果主方向被堵死，尝试另一个方向
                if (!up && !down && !left && !right) {
                    if (dx > 0 && !ctx.isBlocked(ctx.DIRS.right)) right = true;
                    else if (dx < 0 && !ctx.isBlocked(ctx.DIRS.left)) left = true;
                    else if (dy > 0 && !ctx.isBlocked(ctx.DIRS.down)) down = true;
                    else if (dy < 0 && !ctx.isBlocked(ctx.DIRS.up)) up = true;
                }
            }
        } else {
            // --- 防挂机逻辑 ---
            // 如果没有目标（没道具也不危险），随机游走防止被系统判定挂机
            // 简单的策略：朝当前朝向直走，撞墙就右转
            if (ctx.isBlocked(player.dir)) {
                // 撞墙了，尝试向右转90度
                const rightDir = { x: player.dir.y, y: -player.dir.x }; // 简单的90度旋转
                if (!ctx.isBlocked(rightDir)) {
                    if (rightDir.x > 0) right = true;
                    if (rightDir.x < 0) left = true;
                    if (rightDir.y > 0) down = true;
                    if (rightDir.y < 0) up = true;
                } else {
                    // 右边也有墙，那就后退
                    if (!ctx.isBlocked({ x: -player.dir.x, y: -player.dir.y })) {
                        if (player.dir.y > 0) up = true;
                        if (player.dir.y < 0) down = true;
                        if (player.dir.x > 0) left = true;
                        if (player.dir.x < 0) right = true;
                    }
                }
            } else {
                // 前方通畅，直走
                if (player.dir.x > 0) right = true;
                if (player.dir.x < 0) left = true;
                if (player.dir.y > 0) down = true;
                if (player.dir.y < 0) up = true;
            }
        }

        // 4. 攻击逻辑
        // 只有在没有明确移动目标（或者目标很近）且前方有敌人时才开火
        let fire = false;
        if (!isDanger && target) {
            // 简单的瞄准逻辑：如果敌人在准星附近
            // 这里为了简化，只要前方有敌人就开火
            // 使用 utils 获取敌人位置
            const enemies = utils.getEnemyPositions();
            // 检查前方扇形区域是否有敌人（简化为矩形检测）
            // 实际上文档没提供简单的射线检测，我们用距离判断
            // 如果最近敌人在前方且距离适中
        }

        // 默认开启连射，因为文档说 fire: true 是持续射击（内置冷却）
        // 但为了保命，如果正在逃跑（isDanger），最好别开火（开火通常会减速或暴露位置，虽然文档没说减速）
        // 这里设定为：只要活着就一直开火，增加击杀机会
        fire = true;

        return { up, down, left, right, fire, mine: false };
    },

    onDeath(ctx, reason) {
        console.log("AI 被淘汰，原因:", reason);
    }
};