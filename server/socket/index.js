const { Server } = require("socket.io");
const RoomManager = require("./RoomManager");
const GameEngine = require("./GameEngine");
const { saveOnlineBattleRecord } = require("../api/onlineBattle");

const roomManager = new RoomManager();
const engines = new Map();

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  roomManager.startMatchLoop(io);

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on("join-queue", (data) => {
      const userInfo = data.userInfo || {};
      roomManager.addToQueue(socket.id, userInfo);
      socket.emit("queue-joined", { position: roomManager.matchQueue.length });
    });

    socket.on("leave-queue", () => {
      roomManager.removeFromQueue(socket.id);
      socket.emit("queue-left");
    });

    socket.on("quick-match", (data) => {
      const userInfo = data.userInfo || {};
      roomManager.addToQueue(socket.id, userInfo);
      socket.emit("matching");
    });

    socket.on("create-room", (data) => {
      const userInfo = data.userInfo || {};
      const roomId = roomManager.createPrivateRoom(
        socket.id,
        userInfo,
        data.roomName,
      );
      socket.join(roomId);
      const room = roomManager.getRoom(roomId);
      socket.emit("room-created", {
        roomId,
        roomName: room?.roomName || "",
        players: roomManager.getRoomPlayerList(room),
      });
      io.emit("rooms-updated", { rooms: roomManager.getWaitingRooms() });
    });

    socket.on("get-rooms", () => {
      socket.emit("rooms-list", { rooms: roomManager.getWaitingRooms() });
    });

    socket.on("get-my-room", () => {
      const myRoom = roomManager.getMyRoom(socket.id);
      socket.emit(
        "my-room",
        myRoom ? { inRoom: true, ...myRoom } : { inRoom: false },
      );
    });

    socket.on("join-room", (data) => {
      const roomId = data.roomId;
      const userInfo = data.userInfo || {};
      const result = roomManager.joinRoom(socket.id, roomId, userInfo);
      if (result.error) {
        socket.emit("join-error", { message: result.error });
        return;
      }
      socket.join(roomId);
      io.to(roomId).emit("player-joined", {
        players: result.players,
      });
      socket.emit("room-joined", {
        roomId,
        roomName: result.roomName || "",
        players: result.players,
      });
      io.emit("rooms-updated", { rooms: roomManager.getWaitingRooms() });

      if (result.inGame) {
        const engine = engines.get(roomId);
        if (engine && engine.state !== "over") {
          engine.addPlayer({ ...userInfo, socketId: socket.id });
          socket.emit("game-start", engine.getJoinState());
        }
      }
    });

    socket.on("player-ready", (data) => {
      const ready = !!data?.ready;
      const result = roomManager.setPlayerReady(socket.id, ready);
      if (!result) return;
      io.to(result.roomId).emit("room-updated", { players: result.players });
    });

    socket.on("kick-player", (data) => {
      const targetSocketId = data?.targetSocketId;
      if (!targetSocketId) return;
      const result = roomManager.kickPlayer(socket.id, targetSocketId);
      if (result.error) {
        socket.emit("start-error", { message: result.error });
        return;
      }
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.leave(result.roomId);
        targetSocket.emit("kicked", { message: "你已被房主移出房间" });
      }
      io.to(result.roomId).emit("player-left", {
        socketId: targetSocketId,
        players: result.players,
      });
      io.emit("rooms-updated", { rooms: roomManager.getWaitingRooms() });
      _checkGameTermination(result.roomId, targetSocketId);
    });

    socket.on("remind-ready", (data) => {
      const targetSocketId = data?.targetSocketId;
      if (!targetSocketId) return;
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      const sender = room.players.get(socket.id);
      if (!sender || !sender.isHost) return;
      const target = room.players.get(targetSocketId);
      if (!target || target.isHost) return;
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit("reminded", { message: "房主提醒您准备！" });
      }
    });

    socket.on("remind-start", () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      const sender = room.players.get(socket.id);
      if (!sender || sender.isHost) return;
      const host = Array.from(room.players.values()).find((p) => p.isHost);
      if (!host) return;
      const hostSocket = io.sockets.sockets.get(host.socketId);
      if (hostSocket) {
        hostSocket.emit("reminded", {
          message: `${sender.username || "玩家"} 提醒您开始游戏！`,
        });
      }
    });

    socket.on("start-battle", () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      if (room.state !== "waiting") return;
      const host = room.players.get(socket.id);
      if (!host || !host.isHost) {
        socket.emit("start-error", { message: "只有房主可以开始对战" });
        return;
      }
      if (room.players.size < 2) {
        socket.emit("start-error", { message: "需要至少2名玩家才能开始" });
        return;
      }
      if (!roomManager.allReady(room)) {
        socket.emit("start-error", { message: "还有玩家未准备" });
        return;
      }

      room.state = "starting";
      const players = Array.from(room.players.values());
      io.to(room.id).emit("battle-starting", { message: "正在进入游戏..." });
      io.emit("rooms-updated", { rooms: roomManager.getWaitingRooms() });

      const engine = new GameEngine(room.id, players);
      engines.set(room.id, engine);

      engine.start(
        (event, data) => io.to(room.id).emit(event, data),
        async (result) => {
          roomManager.setRoomState(room.id, "waiting");
          roomManager.resetReadyStates(room);
          engines.delete(room.id);
          await _saveRecord(room.id, result);
          io.to(room.id).emit("room-updated", {
            players: roomManager.getRoomPlayerList(room),
            state: "waiting",
          });
          io.emit("rooms-updated", { rooms: roomManager.getWaitingRooms() });
        },
      );
    });

    socket.on("player-input", (data) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      const engine = engines.get(room.id);
      if (!engine) return;
      engine.handleInput(socket.id, data);
    });

    socket.on("leave-battle", () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      const engine = engines.get(room.id);
      if (!engine) return;
      const snapshot = _snapshotTank(engine, socket.id);
      engine.removePlayer(socket.id);
      const gameActive =
        engine.state === "countdown" || engine.state === "playing";
      if (gameActive && engine.tanks.length < 2) {
        engine.forceEnd({
          creditRemaining: true,
          quitters: snapshot ? [snapshot] : [],
        });
      }
    });

    socket.on("leave-room", () => {
      _handleLeave(socket, io);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      roomManager.removeFromQueue(socket.id);
      _handleLeave(socket, io);
    });
  });

  return io;
}

function _snapshotTank(engine, socketId) {
  const t = engine.tanks.find((x) => x.id === socketId);
  if (!t) return null;
  return {
    id: t.id,
    employeeId: t.employeeId,
    username: t.username,
    tankName: t.tankName,
    score: t.score,
    kills: t.kills,
    deaths: t.deaths,
    lastDeathReason: t.lastDeathReason,
  };
}

function _handleLeave(socket, io) {
  const result = roomManager.leaveRoom(socket.id);
  if (!result) return;

  socket.leave(result.roomId);

  if (result.roomEmpty) {
    const engine = engines.get(result.roomId);
    if (engine) {
      const gameActive =
        engine.state === "countdown" || engine.state === "playing";
      if (gameActive) {
        const snapshot = _snapshotTank(engine, socket.id);
        engine.forceEnd({
          creditRemaining: true,
          quitters: snapshot ? [snapshot] : [],
        });
      } else {
        engine.stop();
      }
      engines.delete(result.roomId);
    }
    console.log(`[Socket] Room ${result.roomId} cancelled (empty)`);
    io.emit("rooms-updated", { rooms: roomManager.getWaitingRooms() });
    return;
  }

  io.emit("rooms-updated", { rooms: roomManager.getWaitingRooms() });

  io.to(result.roomId).emit("player-left", {
    socketId: socket.id,
    players: result.players,
  });

  _checkGameTermination(result.roomId, socket.id);
}

function _checkGameTermination(roomId, removedSocketId) {
  const engine = engines.get(roomId);
  if (!engine) return;
  const snapshot = _snapshotTank(engine, removedSocketId);
  engine.removePlayer(removedSocketId);
  const room = roomManager.getRoom(roomId);
  const gameActive = engine.state === "countdown" || engine.state === "playing";
  if (!gameActive) return;
  const shouldEnd = engine.tanks.length < 2 || (room && room.players.size < 2);
  if (shouldEnd) {
    engine.forceEnd({
      creditRemaining: true,
      quitters: snapshot ? [snapshot] : [],
    });
  }
}

async function _saveRecord(roomId, result) {
  try {
    await saveOnlineBattleRecord({
      roomId,
      winnerEmployeeId: result.winner ? result.winner.employeeId : "",
      winnerName: result.winner ? result.winner.username : "",
      playerCount: result.players.length,
      gameDurationMs: result.gameDurationMs,
      isDraw: result.isDraw,
      players: result.players.map((t) => ({
        employeeId: t.employeeId,
        username: t.username,
        tankName: t.tankName,
        score: t.score,
        kills: t.kills,
        deaths: t.deaths,
        deathReason: t.lastDeathReason,
        isWinner: result.winner && result.winner.id === t.id,
      })),
    });
  } catch (err) {
    console.error(`[Socket] 保存在线对战记录失败: ${err.message}`);
  }
}

module.exports = { setupSocket };
