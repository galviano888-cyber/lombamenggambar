import { io, Socket } from "socket.io-client";

// In production, use VITE_SERVER_URL env var pointing to deployed backend
// In development, auto-detect from current hostname (works for LAN)
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 
  (window.location.hostname === "localhost" || window.location.hostname.startsWith("192.168")
    ? `http://${window.location.hostname}:3001`
    : `https://${window.location.hostname.replace('.vercel.app', '-server.up.railway.app')}`);

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}
