const express = require("express");
const {
  register,
  login,
  providers,
  startGoogle,
  googleCallback,
  startGitHub,
  githubCallback,
  profile
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/providers", providers);
router.post("/register", register);
router.post("/login", login);
router.get("/google/start", startGoogle);
router.get("/google/callback", googleCallback);
router.get("/github/start", startGitHub);
router.get("/github/callback", githubCallback);
router.get("/profile", protect, profile);

module.exports = router;
