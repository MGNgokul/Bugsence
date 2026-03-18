const User = require("../models/User");
const Bug = require("../models/Bug");

async function listUsers(req, res, next) {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function productivity(req, res, next) {
  try {
    const users = await User.find().select("_id name role email");
    const rows = await Promise.all(
      users.map(async (user) => {
        const [resolved, openAssigned] = await Promise.all([
          Bug.countDocuments({ assignedTo: user._id, status: "Resolved" }),
          Bug.countDocuments({ assignedTo: user._id, status: { $in: ["Open", "In Progress", "Testing"] } })
        ]);

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          resolved,
          openAssigned
        };
      })
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, productivity };
