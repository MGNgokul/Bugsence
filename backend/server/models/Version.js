const mongoose = require("mongoose");

const versionSchema = new mongoose.Schema(
  {
    version: { type: String, required: true, unique: true, trim: true, maxlength: 50 },
    releaseDate: Date,
    changes: { type: String, trim: true, maxlength: 2000, default: "" },
    releaseReady: { type: Boolean, default: false },
    releaseReadyAt: { type: Date, default: null },
    releaseReadyBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Version", versionSchema);
