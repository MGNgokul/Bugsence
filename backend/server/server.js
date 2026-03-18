const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const bugRoutes = require("./routes/bugRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const activityRoutes = require("./routes/activityRoutes");
const userRoutes = require("./routes/userRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { requireDb } = require("./middleware/dbMiddleware");
const { getAiProviderStatus } = require("./utils/aiSuggestions");

dotenv.config();
connectDB();

const app = express();

// Always serve fresh API data to avoid stale 304/cached payloads in UI.
app.disable("etag");

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
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

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`BugSense backend running on port ${PORT}`);
});
