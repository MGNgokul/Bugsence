const Bug = require("../models/Bug");

async function getSummary(_req, res, next) {
  try {
    const [total, resolved, pending, critical] = await Promise.all([
      Bug.countDocuments(),
      Bug.countDocuments({ status: "Resolved" }),
      Bug.countDocuments({ status: { $in: ["Open", "In Progress", "Testing"] } }),
      Bug.countDocuments({ priority: "Critical" })
    ]);

    const byPriorityRaw = await Bug.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]);
    const byStatusRaw = await Bug.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);

    const byPriority = byPriorityRaw.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
    const byStatus = byStatusRaw.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});

    res.json({ total, resolved, pending, critical, byPriority, byStatus });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary };
