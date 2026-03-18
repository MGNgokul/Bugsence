const mongoose = require("mongoose");

function requireDb(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database not connected. Set MONGO_URI and start MongoDB."
    });
  }
  next();
}

module.exports = { requireDb };
