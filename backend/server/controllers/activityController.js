const ActivityLog = require("../models/ActivityLog");

async function getActivityFeed(req, res, next) {
  try {
    const limit = Number(req.query.limit || 100);
    const filter = {};
    if (req.query.bugId) filter.bugId = req.query.bugId;

    const docs = await ActivityLog.find(filter)
      .populate("userId", "name role")
      .populate("bugId", "title status priority")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(docs);
  } catch (err) {
    next(err);
  }
}

module.exports = { getActivityFeed };
