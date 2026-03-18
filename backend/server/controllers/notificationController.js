const Notification = require("../models/Notification");

async function getMyNotifications(req, res, next) {
  try {
    const docs = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const doc = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ message: "Notification not found" });
    doc.read = true;
    await doc.save();
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyNotifications, markNotificationRead };
