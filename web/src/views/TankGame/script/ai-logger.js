// ====================== 死亡日志系统（AI + 玩家，localStorage 持久化） ======================

import { AIPlayer } from "./ai-player.js";

export const AILogger = {
  maxRecords: 50,
  currentSession: null,
  deathRecords: [],
  storageKey: "tank-death-log",

  init() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      this.deathRecords = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this.deathRecords = [];
    }
    if (!Array.isArray(this.deathRecords)) this.deathRecords = [];
  },

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.deathRecords));
    } catch (e) {}
  },

  startSession() {
    this.currentSession = {
      startTime: performance.now(),
      decisions: [],
      lastAction: null,
      lastMoveDir: null,
      wasDodging: false,
    };
  },

  logDecision(data) {
    if (!this.currentSession) return;

    this.currentSession.decisions.push({
      time: (performance.now() - this.currentSession.startTime) / 1000,
      ...data,
    });

    if (this.currentSession.decisions.length > 100) {
      this.currentSession.decisions.shift();
    }
  },

  logDeath(reason, context) {
    if (!player) return;
    if (!this.currentSession) this.startSession();

    const px = player.x + 15;
    const py = player.y + 15;

    const enemyTanks = tanks.filter((t) => t.alive && !t.isPlayer);
    const nearbyEnemies = enemyTanks
      .filter((e) => Math.hypot(e.x + 10 - px, e.y + 10 - py) < 100)
      .map((e) => ({
        x: e.x,
        y: e.y,
        hp: e.hp,
        dist: Math.hypot(e.x + 15 - px, e.y + 15 - py),
      }));

    const liveBullets = bullets.filter((b) => !b.dead);
    const threatBullets = liveBullets
      .filter((b) => !b.isPlayerBullet)
      .filter((b) => Math.hypot(b.x + 2 - px, b.y + 2 - py) < 100)
      .map((b) => ({
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
        dist: Math.hypot(b.x + 3 - px, b.y + 3 - py),
      }));

    const record = {
      timestamp: Date.now(),
      type: AIPlayer.enabled ? "ai" : "player",
      aiName: AIPlayer.enabled ? AIPlayer.aiName : null,
      kills: window.kills,
      deathReason: reason,
      playerState: {
        x: player.x,
        y: player.y,
        dir: { ...player.dir },
      },
      aiState: {
        wasDodging: this.currentSession.wasDodging,
      },
      surroundings: {
        enemyCount: enemyTanks.length,
        nearbyEnemies,
        bulletCount: liveBullets.length,
        threatBullets,
      },
      decisionLog: this.currentSession.decisions.slice(-20),
      context: context || {},
    };

    this.deathRecords.unshift(record);
    if (this.deathRecords.length > this.maxRecords) {
      this.deathRecords.pop();
    }
    this.save();

    this.startSession();
    return record;
  },

  updateAction(action) {
    if (!this.currentSession) return;
    this.currentSession.lastAction = action;
  },

  updateMoveDir(dir) {
    if (!this.currentSession) return;
    this.currentSession.lastMoveDir = dir;
  },

  updateDodging(dodging, dodgeDir) {
    if (!this.currentSession) return;
    this.currentSession.wasDodging = dodging;
    if (dodgeDir) {
      this.currentSession.lastMoveDir = dodgeDir;
    }
  },

  getRecords() {
    return this.deathRecords;
  },

  getRecordCount() {
    return this.deathRecords.length;
  },

  exportJSON() {
    return JSON.stringify(this.deathRecords, null, 2);
  },

  clear() {
    this.deathRecords = [];
    this.currentSession = null;
    this.save();
  },
};

AILogger.init();
