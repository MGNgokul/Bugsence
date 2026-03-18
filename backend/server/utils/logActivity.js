const ActivityLog = require("../models/ActivityLog");

async function logActivity({ bugId, userId, action, metadata = {} }) {
  try {
    await ActivityLog.create({ bugId, userId, action, metadata });
  } catch (_err) {
    // Keep logging non-blocking for request lifecycle.
  }
}

module.exports = { logActivity };
