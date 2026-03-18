const mongoose = require("mongoose");

async function connectDB() {
  // Fail fast on disconnected DB instead of waiting for buffer timeout.
  mongoose.set("bufferCommands", false);

  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn("MONGO_URI is not set. Database connection skipped.");
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    // Keep API alive so routes can return controlled 503 responses.
  }
}

module.exports = connectDB;
