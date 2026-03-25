const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

let io;

function getJwtSecret() {
  return process.env.JWT_SECRET || "change_me";
}

function initializeSocketServer(server) {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "").trim();

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, getJwtSecret());
      const user = await User.findById(decoded.userId).select("_id name email role");

      if (!user) {
        return next(new Error("Unauthorized"));
      }

      socket.user = user;
      next();
    } catch (_err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(getUserRoom(socket.user._id));
    socket.emit("realtime:ready", {
      userId: String(socket.user._id)
    });

    socket.on("bug:watch", (bugId) => {
      if (bugId) {
        socket.join(getBugRoom(bugId));
      }
    });

    socket.on("bug:unwatch", (bugId) => {
      if (bugId) {
        socket.leave(getBugRoom(bugId));
      }
    });
  });

  return io;
}

function getSocketServer() {
  return io;
}

function getUserRoom(userId) {
  return `user:${String(userId)}`;
}

function getBugRoom(bugId) {
  return `bug:${String(bugId)}`;
}

function emitToUser(userId, eventName, payload) {
  if (!io || !userId) return;
  io.to(getUserRoom(userId)).emit(eventName, payload);
}

function emitToBug(bugId, eventName, payload) {
  if (!io || !bugId) return;
  io.to(getBugRoom(bugId)).emit(eventName, payload);
}

module.exports = {
  initializeSocketServer,
  getSocketServer,
  emitToUser,
  emitToBug,
  getUserRoom,
  getBugRoom
};
