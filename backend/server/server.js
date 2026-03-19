const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const path = require("path");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const bugRoutes = require("./routes/bugRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const activityRoutes = require("./routes/activityRoutes");
const userRoutes = require("./routes/userRoutes");
const versionRoutes = require("./routes/versionRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { requireDb } = require("./middleware/dbMiddleware");
const { getAiProviderStatus } = require("./utils/aiSuggestions");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
connectDB();

const app = express();
app.set("trust proxy", 1);

// Always serve fresh API data to avoid stale 304/cached payloads in UI.
app.disable("etag");

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "bugsense-api", ai: getAiProviderStatus() });
});

app.use("/api/auth", requireDb, authRoutes);
app.use("/api/bugs", requireDb, bugRoutes);
app.use("/api/analytics", requireDb, analyticsRoutes);
app.use("/api/notifications", requireDb, notificationRoutes);
app.use("/api/activity", requireDb, activityRoutes);
app.use("/api/users", requireDb, userRoutes);
app.use("/api/versions", requireDb, versionRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5008;
app.listen(PORT, () => {
  console.log(`BugSense backend running on port ${PORT}`);
});
