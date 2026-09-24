const { MAX_PLAYERS } = require("../shared/constants");

const MATCH_INTERVAL_MS = 2000;

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.matchQueue = [];
    this.onlineUsers = new Map();
    this._matchTimer = null;
  }

  registerUser(socketId, userInfo) {
    this.onlineUsers.set(socketId, {
      socketId,
      employeeId: userInfo.employeeId || "",
      username: userInfo.username || "匿名",
      registeredAt: Date.now(),
    });
  }

  unregisterUser(socketId) {
    this.onlineUsers.delete(socketId);
  }

  getOnlineUser(socketId) {
    return this.onlineUsers.get(socketId) || null;
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers.values()).map((u) => ({
      socketId: u.socketId,
      employeeId: u.employeeId,
      username: u.username,
      inRoom: !!this.getRoomBySocket(u.socketId),
    }));
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

    const matched = this.matchQueue.splice(
      0,
      Math.min(this.matchQueue.length, MAX_PLAYERS),
    );
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
        isHost: room.players.size === 0,
        alive: true,
        disconnected: false,
      });
      this.rooms.set(player.socketId, roomId);
    }

    this.rooms.set(`room:${roomId}`, room);

    for (const player of matched) {
      const sock = io.sockets.sockets.get(player.socketId);
      if (sock) sock.join(roomId);
      io.to(player.socketId).emit("matched", {
        roomId,
        players: this._getRoomPlayerList(room),
      });
    }

    console.log(
      `[RoomManager] Room ${roomId} created with ${matched.length} players`,
    );
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
    console.log(
      `[RoomManager] Player ${socketId} joined queue (${this.matchQueue.length} in queue)`,
    );
  }

  removeFromQueue(socketId) {
    const idx = this.matchQueue.findIndex((p) => p.socketId === socketId);
    if (idx >= 0) this.matchQueue.splice(idx, 1);
  }

  createPrivateRoom(socketId, userInfo, roomName) {
    const roomId = this._genRoomId();
    const room = {
      id: roomId,
      roomName: this._sanitizeRoomName(
        roomName,
        `${userInfo.username || "匿名"}的房间`,
      ),
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
      ready: false,
      isHost: true,
      alive: true,
      disconnected: false,
    });

    this.rooms.set(socketId, roomId);
    this.rooms.set(`room:${roomId}`, room);
    return roomId;
  }

  getMyRoom(socketId) {
    const room = this.getRoomBySocket(socketId);
    if (!room) return null;
    return {
      roomId: room.id,
      roomName: room.roomName || "",
      players: this._getRoomPlayerList(room),
      state: room.state,
    };
  }

  getRoomIdBySocket(socketId) {
    return this.rooms.get(socketId) || null;
  }

  markDisconnected(socketId, graceMs, onExpire) {
    const roomId = this.rooms.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(`room:${roomId}`);
    if (!room) {
      this.rooms.delete(socketId);
      return null;
    }

    const player = room.players.get(socketId);
    if (!player) {
      this.rooms.delete(socketId);
      return null;
    }

    player.disconnected = true;
    player.disconnectedAt = Date.now();
    this.rooms.delete(socketId);

    if (player._leaveTimer) clearTimeout(player._leaveTimer);
    player._leaveTimer = setTimeout(() => {
      player._leaveTimer = null;
      if (!player.disconnected || player.socketId !== socketId) return;
      const current = this.rooms.get(`room:${roomId}`);
      if (!current || current.players.get(socketId) !== player) return;
      const result = this._removePlayerFromRoom(roomId, socketId);
      if (onExpire) onExpire(result, socketId);
    }, graceMs);

    return { roomId, room, player, socketId };
  }

  joinRoom(socketId, roomId, userInfo) {
    const existingRoomId = this.rooms.get(socketId);
    if (existingRoomId && existingRoomId !== roomId) {
      return { error: "你已在其他房间中" };
    }
    if (existingRoomId === roomId) {
      return { error: "你已在该房间中" };
    }
    const room = this.rooms.get(`room:${roomId}`);
    if (!room) return { error: "房间不存在" };

    const empId = userInfo.employeeId || "";
    const userName = userInfo.username || "";
    if (empId || userName) {
      for (const [key, p] of room.players) {
        const sameUser = empId
          ? p.employeeId === empId
          : p.username === userName && userName !== "匿名";
        if (!sameUser) continue;
        if (p._leaveTimer) {
          clearTimeout(p._leaveTimer);
          p._leaveTimer = null;
        }
        const oldSocketId = key;
        if (key !== socketId) {
          room.players.delete(key);
          this.rooms.delete(key);
        }
        p.socketId = socketId;
        p.disconnected = false;
        p.disconnectedAt = 0;
        p.username = userInfo.username || p.username;
        p.tankName = userInfo.tankName || p.tankName;
        if (empId) p.employeeId = empId;
        this.rooms.set(socketId, roomId);
        return {
          success: true,
          reconnected: true,
          oldSocketId,
          roomId,
          roomName: room.roomName || "",
          players: this._getRoomPlayerList(room),
          player: p,
          inGame: room.state === "starting" || room.state === "playing",
        };
      }
    }

    if (room.players.size >= MAX_PLAYERS) return { error: "房间已满" };

    const player = {
      socketId,
      employeeId: empId,
      username: userInfo.username || "匿名",
      tankName: userInfo.tankName || "坦克",
      teamId: this._nextTeamId(room),
      ready: false,
      isHost: false,
      alive: true,
      disconnected: false,
    };
    room.players.set(socketId, player);

    this.rooms.set(socketId, roomId);
    return {
      success: true,
      roomId,
      roomName: room.roomName || "",
      players: this._getRoomPlayerList(room),
      player,
      inGame: room.state === "starting" || room.state === "playing",
    };
  }

  _nextTeamId(room) {
    const used = new Set(
      Array.from(room.players.values()).map((p) => p.teamId),
    );
    let id = 0;
    while (used.has(id)) id++;
    return id;
  }

  resetReadyStates(room) {
    if (!room) return;
    for (const p of room.players.values()) {
      p.ready = false;
    }
  }

  setPlayerReady(socketId, ready) {
    const roomId = this.rooms.get(socketId);
    if (!roomId) return null;
    const room = this.rooms.get(`room:${roomId}`);
    if (!room) return null;
    const player = room.players.get(socketId);
    if (!player) return null;
    player.ready = !!ready;
    return { roomId, players: this._getRoomPlayerList(room) };
  }

  kickPlayer(hostSocketId, targetSocketId) {
    const roomId = this.rooms.get(hostSocketId);
    if (!roomId) return { error: "你不在房间中" };
    const room = this.rooms.get(`room:${roomId}`);
    if (!room) return { error: "房间不存在" };
    const host = room.players.get(hostSocketId);
    if (!host || !host.isHost) return { error: "只有房主可以踢人" };
    if (targetSocketId === hostSocketId) return { error: "不能踢自己" };
    const target = room.players.get(targetSocketId);
    if (!target) return { error: "玩家不在房间中" };

    if (target._leaveTimer) {
      clearTimeout(target._leaveTimer);
      target._leaveTimer = null;
    }
    room.players.delete(targetSocketId);
    this.rooms.delete(targetSocketId);
    return {
      roomId,
      kickedSocketId: targetSocketId,
      players: this._getRoomPlayerList(room),
    };
  }

  allReady(room) {
    for (const p of room.players.values()) {
      if (p.isHost) continue;
      if (!p.ready) return false;
    }
    return true;
  }

  leaveRoom(socketId) {
    const roomId = this.rooms.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(`room:${roomId}`);
    if (!room) {
      this.rooms.delete(socketId);
      return null;
    }

    return this._removePlayerFromRoom(roomId, socketId);
  }

  _removePlayerFromRoom(roomId, socketId) {
    const room = this.rooms.get(`room:${roomId}`);
    if (!room) {
      this.rooms.delete(socketId);
      return null;
    }

    const leaving = room.players.get(socketId);
    if (!leaving) {
      this.rooms.delete(socketId);
      return null;
    }

    const wasHost = !!leaving.isHost;
    if (leaving._leaveTimer) {
      clearTimeout(leaving._leaveTimer);
      leaving._leaveTimer = null;
    }

    room.players.delete(socketId);
    this.rooms.delete(socketId);

    if (room.players.size === 0) {
      this.rooms.delete(`room:${roomId}`);
      console.log(`[RoomManager] Room ${roomId} destroyed (empty)`);
      return { roomId, roomEmpty: true };
    }

    if (wasHost) {
      const nextHost = room.players.values().next().value;
      if (nextHost) {
        nextHost.isHost = true;
        console.log(
          `[RoomManager] Room ${roomId} new host: ${nextHost.username}`,
        );
      }
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
      if (room.players.size === 0) continue;
      if (
        room.state !== "waiting" &&
        room.state !== "playing" &&
        room.state !== "starting"
      )
        continue;
      list.push({
        roomId: room.id,
        roomName: room.roomName || "",
        playerCount: room.players.size,
        maxPlayers: MAX_PLAYERS,
        host: Array.from(room.players.values())[0]?.username || "",
        state: room.state,
        createdAt: room.createdAt,
      });
    }
    list.sort((a, b) => {
      if (a.state === "waiting" && b.state !== "waiting") return -1;
      if (a.state !== "waiting" && b.state === "waiting") return 1;
      return b.createdAt - a.createdAt;
    });
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

  getRoomPlayerList(room) {
    if (!room) return [];
    return this._getRoomPlayerList(room);
  }

  _getRoomPlayerList(room) {
    return Array.from(room.players.values()).map((p) => ({
      socketId: p.socketId,
      employeeId: p.employeeId,
      username: p.username,
      tankName: p.tankName,
      teamId: p.teamId,
      ready: p.ready,
      isHost: p.isHost,
      alive: p.alive,
      disconnected: !!p.disconnected,
    }));
  }

  _genRoomId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  _sanitizeRoomName(name, fallback) {
    const s = String(name || "")
      .trim()
      .slice(0, 20);
    return s || fallback;
  }
}

module.exports = RoomManager;
