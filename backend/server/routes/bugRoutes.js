const express = require("express");
const {
  createBug,
  previewBugSuggestion,
  getBugs,
  getBugById,
  updateBug,
  deleteBug,
  assignBug,
  addComment
} = require("../controllers/bugController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/ai-suggestion/preview", previewBugSuggestion);
router.route("/").post(createBug).get(getBugs);
router.route("/:id").get(getBugById).put(updateBug).delete(authorize("Admin", "Tester"), deleteBug);
router.put("/:id/assign", authorize("Admin"), assignBug);
router.post("/:id/comments", addComment);

module.exports = router;
