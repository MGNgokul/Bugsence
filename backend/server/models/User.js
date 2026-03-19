const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    avatar: { type: String, default: "" },
    authProvider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local"
    },
    providerId: { type: String, trim: true },
    role: {
      type: String,
      enum: ["Admin", "Developer", "Tester"],
      default: "Tester"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
