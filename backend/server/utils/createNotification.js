const Notification = require("../models/Notification");

async function createNotification({ userId, type, message }) {
  try {
    if (!userId) return;
    await Notification.create({ userId, type, message });
  } catch (_err) {
    // Keep notification creation non-blocking.
  }
}

module.exports = { createNotification };
