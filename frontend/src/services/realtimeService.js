import { io } from "socket.io-client";
import { getConfiguredApiBaseUrl } from "./http";

let socket;
let activeToken = "";

function getRealtimeBaseUrl() {
  return getConfiguredApiBaseUrl() || window.location.origin;
}

function ensureSocket(token) {
  if (!token) return null;

  if (socket && activeToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  activeToken = token;
  socket = io(getRealtimeBaseUrl(), {
    transports: ["websocket", "polling"],
    auth: { token }
  });

  return socket;
}

export function connectRealtime(token) {
  return ensureSocket(token);
}

export function disconnectRealtime() {
  activeToken = "";
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
}

export function subscribeRealtime(eventName, handler, token) {
  const currentSocket = ensureSocket(token);
  if (!currentSocket) return () => {};

  currentSocket.on(eventName, handler);
  return () => {
    currentSocket.off(eventName, handler);
  };
}

export function watchBug(bugId, token) {
  const currentSocket = ensureSocket(token);
  if (!currentSocket || !bugId) return;
  currentSocket.emit("bug:watch", bugId);
}

export function unwatchBug(bugId) {
  if (!socket || !bugId) return;
  socket.emit("bug:unwatch", bugId);
}
