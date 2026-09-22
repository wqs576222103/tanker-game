const { MAX_PLAYERS } = require("../shared/constants");

const MATCH_INTERVAL_MS = 2000;

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.matchQueue = [];
    this._matchTimer = null;
  }

  startMatchLoop(io) {
    if (this._matchTimer) return;
    this._matchTimer = setInterval(() => this._tryMatch(io), MATCH_INTERVAL_MS);
  }

  stopMatchLoop() {
    if (this._matchTimer) {
      clearInterval(this._matchTimer);
      this._matchTimer = null;
    }
  }

  _tryMatch(io) {
    if (this.matchQueue.length < 2) return;

    const matched = this.matchQueue.splice(0, Math.min(this.matchQueue.length, MAX_PLAYERS));
    if (matched.length < 2) {
      this.matchQueue.unshift(...matched);
      return;
    }

    const roomId = this._genRoomId();
    const room = {
      id: roomId,
      players: new Map(),
      state: "waiting",
      map: null,
      createdAt: Date.now(),
    };

    for (const player of matched) {
      room.players.set(player.socketId, {
        socketId: player.socketId,
        employeeId: player.employeeId,
        username: player.username,
        tankName: player.tankName,
        teamId: room.players.size,
        ready: true,
        alive: true,
      });
      this.rooms.set(player.socketId, roomId);
    }

    this.rooms.set(`room:${roomId}`, room);

    for (const player of matched) {
      io.to(player.socketId).emit("matched", {
        roomId,
        players: this._getRoomPlayerList(room),
      });
    }

    console.log(`[RoomManager] Room ${roomId} created with ${matched.length} players`);
  }

  addToQueue(socketId, userInfo) {
    const existing = this.matchQueue.findIndex((p) => p.socketId === socketId);
    if (existing >= 0) this.matchQueue.splice(existing, 1);

    this.matchQueue.push({
      socketId,
      employeeId: userInfo.employeeId || "",
      username: userInfo.username || "匿名",
      tankName: userInfo.tankName || "坦克",
      joinedAt: Date.now(),
    });
    console.log(`[RoomManager] Player ${socketId} joined queue (${this.matchQueue.length} in queue)`);
  }

  removeFromQueue(socketId) {
    const idx = this.matchQueue.findIndex((p) => p.socketId === socketId);
    if (idx >= 0) this.matchQueue.splice(idx, 1);
  }

  createPrivateRoom(socketId, userInfo) {
    const roomId = this._genRoomId();
    const room = {
      id: roomId,
      players: new Map(),
      state: "waiting",
      map: null,
      createdAt: Date.now(),
    };

    room.players.set(socketId, {
      socketId,
      employeeId: userInfo.employeeId || "",
      username: userInfo.username || "匿名",
      tankName: userInfo.tankName || "坦克",
      teamId: 0,
      ready: true,
      alive: true,
    });

    this.rooms.set(socketId, roomId);
    this.rooms.set(`room:${roomId}`, room);
    return roomId;
  }

  joinRoom(socketId, roomId, userInfo) {
    const room = this.rooms.get(`room:${roomId}`);
    if (!room) return { error: "房间不存在" };
    if (room.state !== "waiting") return { error: "游戏已开始" };
    if (room.players.size >= MAX_PLAYERS) return { error: "房间已满" };

    room.players.set(socketId, {
      socketId,
      employeeId: userInfo.employeeId || "",
      username: userInfo.username || "匿名",
      tankName: userInfo.tankName || "坦克",
      teamId: room.players.size,
      ready: true,
      alive: true,
    });

    this.rooms.set(socketId, roomId);
    return { success: true, players: this._getRoomPlayerList(room) };
  }

  leaveRoom(socketId) {
    const roomId = this.rooms.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(`room:${roomId}`);
    if (!room) {
      this.rooms.delete(socketId);
      return null;
    }

    room.players.delete(socketId);
    this.rooms.delete(socketId);

    if (room.players.size === 0) {
      this.rooms.delete(`room:${roomId}`);
      console.log(`[RoomManager] Room ${roomId} destroyed (empty)`);
      return { roomId, roomEmpty: true };
    }

    return { roomId, players: this._getRoomPlayerList(room), room };
  }

  getRoomBySocket(socketId) {
    const roomId = this.rooms.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(`room:${roomId}`) || null;
  }

  getRoom(roomId) {
    return this.rooms.get(`room:${roomId}`) || null;
  }

  getWaitingRooms() {
    const list = [];
    for (const [key, room] of this.rooms) {
      if (typeof key !== "string" || !key.startsWith("room:")) continue;
      if (room.state !== "waiting") continue;
      list.push({
        roomId: room.id,
        playerCount: room.players.size,
        maxPlayers: MAX_PLAYERS,
        host: Array.from(room.players.values())[0]?.username || "",
        createdAt: room.createdAt,
      });
    }
    list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }

  setRoomState(roomId, state) {
    const room = this.rooms.get(`room:${roomId}`);
    if (room) room.state = state;
  }

  setPlayerAlive(socketId, alive) {
    const roomId = this.rooms.get(socketId);
    if (!roomId) return;
    const room = this.rooms.get(`room:${roomId}`);
    if (!room) return;
    const player = room.players.get(socketId);
    if (player) player.alive = alive;
  }

  _getRoomPlayerList(room) {
    return Array.from(room.players.values()).map((p) => ({
      socketId: p.socketId,
      employeeId: p.employeeId,
      username: p.username,
      tankName: p.tankName,
      teamId: p.teamId,
      alive: p.alive,
    }));
  }

  _genRoomId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
}

module.exports = RoomManager;
