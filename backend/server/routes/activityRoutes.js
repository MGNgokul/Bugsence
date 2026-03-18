const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getActivityFeed } = require("../controllers/activityController");

const router = express.Router();

router.use(protect);
router.get("/", getActivityFeed);

module.exports = router;
