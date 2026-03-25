const Notification = require("../models/Notification");
const Bug = require("../models/Bug");
const Comment = require("../models/Comment");

async function getNotificationRealtimePayload(notificationId) {
  if (!notificationId || typeof Notification.findById !== "function") return null;

  return Notification.findById(notificationId)
    .populate("bugId", "title status")
    .lean();
}

async function getBugRealtimePayload(bugId) {
  if (
    !bugId ||
    typeof Bug.findById !== "function" ||
    typeof Comment.find !== "function"
  ) {
    return null;
  }

  const bug = await Bug.findById(bugId)
    .populate("assignedTo", "name email role")
    .populate("createdBy", "name email role")
    .lean();

  if (!bug) return null;

  const comments = await Comment.find({ bugId })
    .populate("userId", "name role")
    .sort({ createdAt: 1 })
    .lean();

  return {
    ...bug,
    comments
  };
}

module.exports = {
  getNotificationRealtimePayload,
  getBugRealtimePayload
};
