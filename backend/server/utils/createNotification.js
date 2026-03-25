const Notification = require("../models/Notification");
const { emitToUser } = require("./socketServer");
const { getNotificationRealtimePayload } = require("./realtimePayloads");

async function createNotification({ userId, bugId = null, type, message }) {
  try {
    if (!userId) return;
    const notification = await Notification.create({ userId, bugId, type, message });
    const payload = await getNotificationRealtimePayload(notification._id);
    emitToUser(userId, "notification:new", payload || notification.toObject());
  } catch (_err) {
    // Keep notification creation non-blocking.
  }
}

module.exports = { createNotification };
