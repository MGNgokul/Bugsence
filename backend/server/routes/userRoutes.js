const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const { listUsers, productivity } = require("../controllers/userController");

const router = express.Router();

router.use(protect);
router.get("/", authorize("Admin", "Developer", "Tester"), listUsers);
router.get("/productivity", authorize("Admin", "Developer"), productivity);

module.exports = router;
