
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
