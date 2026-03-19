const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  listVersions,
  createVersion,
  updateVersion,
  setReleaseReady,
  deleteVersion
} = require("../controllers/versionController");

const router = express.Router();

router.use(protect);

router.get("/", authorize("Admin", "Developer", "Tester"), listVersions);
router.post("/", authorize("Admin"), createVersion);
router.put("/:id/release-ready", authorize("Admin"), setReleaseReady);
router.put("/:id", authorize("Admin"), updateVersion);
router.delete("/:id", authorize("Admin"), deleteVersion);

module.exports = router;
