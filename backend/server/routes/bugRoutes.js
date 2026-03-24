const express = require("express");
const {
  createBug,
  previewDuplicateBugs,
  previewBugSuggestion,
  previewBugTriage,
  askBugAssistant,
  getBugs,
  getBugById,
  addAttachments,
  updateBug,
  deleteBug,
  assignBug,
  addComment
} = require("../controllers/bugController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(protect);

router.post("/duplicates/preview", previewDuplicateBugs);
router.post("/ai-suggestion/preview", previewBugSuggestion);
router.post("/ai-triage/preview", previewBugTriage);
router.post("/ai-assistant/ask", askBugAssistant);
router.route("/").post(authorize("Admin", "Tester"), upload.array("attachments", 5), createBug).get(getBugs);
router.route("/:id").get(getBugById).put(authorize("Admin", "Developer"), updateBug).delete(authorize("Admin", "Tester"), deleteBug);
router.post("/:id/attachments", upload.array("attachments", 5), addAttachments);
router.put("/:id/assign", authorize("Admin"), assignBug);
router.post("/:id/comments", addComment);

module.exports = router;
