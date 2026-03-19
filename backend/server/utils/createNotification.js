const Notification = require("../models/Notification");

async function createNotification({ userId, bugId = null, type, message }) {
  try {
    if (!userId) return;
    await Notification.create({ userId, bugId, type, message });
  } catch (_err) {
    // Keep notification creation non-blocking.
  }
}

module.exports = { createNotification };
