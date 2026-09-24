import { io } from "socket.io-client";
import { getUserInfo } from "./user";
import { inviteStore } from "./inviteStore";

let socket = null;

function _userInfoPayload() {
  const info = getUserInfo();
  return {
    employeeId: info.employeeId || "",
    username: info.username || "匿名",
    tankName: info.username || "坦克",
  };
}

export function getSocket() {
  if (socket) return socket;

  const wsUrl =
    import.meta.env.VITE_WS_URL ||
    (import.meta.env.DEV ? "http://localhost:3000" : window.location.origin);
  socket = io(wsUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket.id);
    socket.emit("register-user", { userInfo: _userInfoPayload() });
  });

  socket.on("invited", (data) => {
    inviteStore.pending = {
      roomId: data.roomId,
      roomName: data.roomName || "",
      fromSocketId: data.fromSocketId,
      fromUsername: data.fromUsername || "玩家",
      receivedAt: Date.now(),
    };
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
