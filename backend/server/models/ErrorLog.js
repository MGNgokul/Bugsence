const mongoose = require("mongoose");

const errorLogSchema = new mongoose.Schema(
  {
    route: String,
    method: String,
    message: String,
    stack: String,
    statusCode: Number
  },
  { timestamps: true }
);

module.exports = mongoose.model("ErrorLog", errorLogSchema);
