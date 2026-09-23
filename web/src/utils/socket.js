import { io } from "socket.io-client";

let socket = null;

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
