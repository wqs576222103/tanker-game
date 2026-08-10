export default {

    name: "终极生存猎手AI",

    lastMove: "down",

    itemTarget: null,
    itemPath: [],


    onLoad(ctx) {

        this.lastMove = "down";
        this.itemTarget = null;
        this.itemPath = [];

    },


    onRoundStart(ctx) {

        this.lastMove = "down";
        this.itemTarget = null;
        this.itemPath = [];

    },


    decide(ctx, dt) {


        const me = ctx.player;


        if (!me) {
            return {};
        }



        const cx =
            me.x + me.w / 2;

        const cy =
            me.y + me.h / 2;



        const dirs = {

            up: {
                x: 0,
                y: -1
            },

            down: {
                x: 0,
                y: 1
            },

            left: {
                x: -1,
                y: 0
            },

            right: {
                x: 1,
                y: 0
            }

        };


        const dirList = [
            "up",
            "down",
            "left",
            "right"
        ];



        let action = {

            up: false,
            down: false,
            left: false,
            right: false,

            // 永久射击
            fire: true,

            mine: false
        };




        function move(d) {

            if (d) {

                action[d] = true;

            }

        }



        function canMove(d) {

            return !ctx.isBlocked(
                dirs[d]
            );

        }





        /*
        ==================================================
        1. 出生点保护
    
        防止左上/右上刷新坦克直接撞脸
        ==================================================
        */


        let spawnEnemy = null;

        let spawnDistance = 9999;



        for (const e of ctx.enemies) {


            const ex = e.x + 10;
            const ey = e.y + 10;



            const distance =
                ctx.distance(
                    cx,
                    cy,
                    ex,
                    ey
                );



            // 判断是否靠近刷新区域

            const spawnArea =
                (
                    ex < 100 ||
                    ey < 100
                );



            if (

                distance < 130 &&
                spawnArea &&
                e.hp >= e.maxHp

            ) {


                if (distance < spawnDistance) {

                    spawnDistance = distance;
                    spawnEnemy = e;

                }

            }

        }




        if (spawnEnemy) {



            let best = null;
            let score = -999;



            const ex =
                spawnEnemy.x + 10;

            const ey =
                spawnEnemy.y + 10;



            for (const d of dirList) {


                if (!canMove(d))
                    continue;



                const v = dirs[d];


                let nx =
                    cx + v.x * 60;

                let ny =
                    cy + v.y * 60;



                // 远离敌人

                let s =
                    ctx.distance(
                        nx,
                        ny,
                        ex,
                        ey
                    );



                // 靠中心

                s -=
                    ctx.distance(
                        nx,
                        ny,
                        200,
                        200
                    ) * 0.2;



                if (s > score) {

                    score = s;
                    best = d;

                }

            }



            if (best) {

                move(best);


                if (
                    spawnDistance < 60 &&
                    me.mines > 0
                ) {

                    action.mine = true;

                }


                return action;

            }

        }







        /*
        ==================================================
        2. 子弹预测躲避
    
        计算未来碰撞点
        ==================================================
        */


        const bullets =
            ctx.utils.getEnemyBullets(
                20,
                dt
            );



        let dangerBullet = null;

        let danger = 0;




        for (const b of bullets) {


            const vx =
                b.vx ??
                b.dir.x * b.speed;


            const vy =
                b.vy ??
                b.dir.y * b.speed;



            const speed =
                Math.sqrt(
                    vx * vx +
                    vy * vy
                );



            if (speed <= 0)
                continue;



            const rx =
                cx - b.x;

            const ry =
                cy - b.y;



            let t =
                (
                    rx * vx +
                    ry * vy
                ) / (speed * speed);



            if (t < 0)
                continue;



            t = Math.min(
                t,
                20
            );



            const px =
                b.x + vx * t;


            const py =
                b.y + vy * t;



            const d =
                ctx.distance(
                    cx,
                    cy,
                    px,
                    py
                );



            let level = 0;


            if (d < 25)
                level = 100;

            else if (d < 50)
                level = 70;

            else if (d < 80)
                level = 30;



            if (level > danger) {

                danger = level;

                dangerBullet = {
                    x: px,
                    y: py
                };

            }


        }







        /*
        ==================================================
        3. 躲避子弹
    
        四方向评分
        ==================================================
        */


        if (
            dangerBullet &&
            danger > 20
        ) {



            let best = null;
            let bestScore = -999;



            for (const d of dirList) {


                if (!canMove(d))
                    continue;



                const v = dirs[d];


                const nx =
                    cx + v.x * 50;

                const ny =
                    cy + v.y * 50;



                let s =
                    ctx.distance(
                        nx,
                        ny,
                        dangerBullet.x,
                        dangerBullet.y
                    );



                // 空旷区域奖励

                s +=
                    ctx.getFreeDistance(v) * 0.3;



                if (s > bestScore) {

                    bestScore = s;
                    best = d;

                }

            }



            if (best) {

                move(best);


                return action;

            }


        }







        /*
        ==================================================
        4. 低血量撤退
        ==================================================
        */


        let hp =
            me.hp /
            me.maxHp;



        if (hp < 0.35) {



            let enemy =
                ctx.enemies[0];



            if (enemy) {


                let ex =
                    enemy.x + 10;


                let ey =
                    enemy.y + 10;



                let best = null;
                let score = -999;



                for (const d of dirList) {



                    if (!canMove(d))
                        continue;



                    const v = dirs[d];



                    let s =
                        ctx.distance(
                            cx + v.x * 60,
                            cy + v.y * 60,
                            ex,
                            ey
                        );



                    if (s > score) {

                        score = s;
                        best = d;

                    }

                }



                if (best) {

                    move(best);

                    return action;

                }


            }

        }
        /*
    ==================================================
    5. 道具系统

    优先：
    护盾 > 血量 > 火力 > 散弹 > 速度 > 无人机 > 地雷

    但是：
    敌人在附近时不会冒险吃
    ==================================================
    */


        let nearestEnemy = 9999;


        for (const e of ctx.enemies) {

            const d =
                ctx.distance(
                    cx,
                    cy,
                    e.x + 10,
                    e.y + 10
                );

            if (d < nearestEnemy)
                nearestEnemy = d;

        }




        let bestItem = null;
        let itemScore = -999;



        for (const item of ctx.items) {


            let value = 0;


            switch (item.type) {


                case "shield":
                    value = 120;
                    break;


                case "heal":
                    value =
                        hp < 0.8
                            ? 110
                            : 20;
                    break;


                case "fire":
                    value = 90;
                    break;


                case "spread":
                    value = 85;
                    break;


                case "speed":
                    value = 70;
                    break;


                case "drone":
                    value = 60;
                    break;


                case "mine":
                    value = 40;
                    break;

            }



            let dis =
                ctx.distance(
                    cx,
                    cy,
                    item.x,
                    item.y
                );



            let score =
                value -
                dis * 0.25;



            // 敌人太近，不去冒险

            if (nearestEnemy < 100) {

                score -= 100;

            }



            if (score > itemScore) {

                itemScore = score;
                bestItem = item;

            }

        }





        if (
            bestItem &&
            itemScore > 20
        ) {


            let dx =
                bestItem.x - cx;

            let dy =
                bestItem.y - cy;



            /*
             简单绕障移动
      
             不直冲墙
            */


            if (
                Math.abs(dx) >
                Math.abs(dy)
            ) {


                if (dx > 0 &&
                    canMove("right")
                ) {

                    move("right");

                }
                else if (
                    canMove("left")
                ) {

                    move("left");

                }


            }
            else {


                if (
                    dy > 0 &&
                    canMove("down")
                ) {

                    move("down");

                }
                else if (
                    canMove("up")
                ) {

                    move("up");

                }

            }


            return action;

        }







        /*
        ==================================================
        6. 战斗系统
    
        核心：
        
        近距离：
           绕圈，不撞脸
    
        中距离：
           边走边射
    
        远距离：
           接近攻击
        ==================================================
        */



        let target = null;
        let targetDis = 9999;



        for (const e of ctx.enemies) {


            let d =
                ctx.distance(
                    cx,
                    cy,
                    e.x + 10,
                    e.y + 10
                );


            if (d < targetDis) {

                targetDis = d;
                target = e;

            }

        }







        if (target) {


            let ex =
                target.x + 10;


            let ey =
                target.y + 10;



            let dx =
                ex - cx;


            let dy =
                ey - cy;






            /*
            ==============================
            A. 敌人太近
      
            不冲过去
      
            绕圈射击
            ==============================
            */


            if (targetDis < 90) {



                let circle = [];



                if (Math.abs(dx) > Math.abs(dy)) {


                    if (dy > 0) {

                        circle = [
                            "left",
                            "right"
                        ];

                    }
                    else {

                        circle = [
                            "right",
                            "left"
                        ];

                    }


                }
                else {


                    if (dx > 0) {

                        circle = [
                            "up",
                            "down"
                        ];

                    }
                    else {

                        circle = [
                            "down",
                            "up"
                        ];

                    }


                }




                for (const d of circle) {

                    if (canMove(d)) {

                        move(d);
                        break;

                    }

                }



                action.fire = true;


                return action;


            }







            /*
            ==============================
            B. 中距离
      
            边移动边射击
            ==============================
            */



            if (targetDis < 220) {



                if (
                    Math.abs(dx) >
                    Math.abs(dy)
                ) {


                    if (dx > 0)
                        move("right");
                    else
                        move("left");


                }
                else {


                    if (dy > 0)
                        move("down");
                    else
                        move("up");


                }



                action.fire = true;


                return action;


            }








            /*
            ==============================
            C. 远距离
      
            靠近攻击
            ==============================
            */



            if (
                Math.abs(dx) >
                Math.abs(dy)
            ) {


                if (dx > 0)
                    move("right");
                else
                    move("left");


            }
            else {


                if (dy > 0)
                    move("down");
                else
                    move("up");


            }



            action.fire = true;


            return action;


        }








        /*
        ==================================================
        7. 无敌人
    
        巡逻寻找目标
        ==================================================
        */


        if (
            !canMove(this.lastMove)
        ) {


            let list = [
                "up",
                "down",
                "left",
                "right"
            ];



            for (const d of list) {

                if (canMove(d)) {

                    this.lastMove = d;
                    break;

                }

            }

        }



        move(this.lastMove);



        return action;


    },






    /*
    ==================================================
    BFS寻路备用
  
    用于以后接入复杂道具路线
    ==================================================
    */


    findPath(
        ctx,
        sc,
        sr,
        tc,
        tr
    ) {


        const queue = [];


        const visited = new Set();


        const parent = new Map();



        const key =
            (c, r) =>
                c + "," + r;



        queue.push({
            c: sc,
            r: sr
        });


        visited.add(
            key(sc, sr)
        );



        const dirs = [

            {
                c: 0,
                r: -1
            },

            {
                c: 0,
                r: 1
            },

            {
                c: -1,
                r: 0
            },

            {
                c: 1,
                r: 0
            }

        ];





        while (queue.length) {


            let cur =
                queue.shift();



            for (const d of dirs) {


                let nc =
                    cur.c + d.c;


                let nr =
                    cur.r + d.r;



                let k =
                    key(
                        nc,
                        nr
                    );



                if (
                    visited.has(k)
                )
                    continue;



                if (
                    nc < 0 ||
                    nr < 0 ||
                    nc >= 20 ||
                    nr >= 20
                )
                    continue;



                if (
                    ctx.isObstacle(
                        nc,
                        nr
                    )
                )
                    continue;



                parent.set(
                    k,
                    cur
                );



                if (
                    nc === tc &&
                    nr === tr
                ) {


                    let path = [];


                    let now = {
                        c: nc,
                        r: nr
                    };



                    while (
                        now.c !== sc ||
                        now.r !== sr
                    ) {


                        path.unshift(now);



                        now =
                            parent.get(
                                key(
                                    now.c,
                                    now.r
                                )
                            );


                    }



                    return path;

                }



                visited.add(k);



                queue.push({

                    c: nc,
                    r: nr

                });


            }

        }



        return [];

    },





    onDeath(ctx, reason) {

        this.itemTarget = null;
        this.itemPath = [];

    },



    onDisabled(ctx) {

        this.itemTarget = null;
        this.itemPath = [];

    }


};