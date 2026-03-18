const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    bugId: { type: mongoose.Schema.Types.ObjectId, ref: "Bug", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    comment: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
