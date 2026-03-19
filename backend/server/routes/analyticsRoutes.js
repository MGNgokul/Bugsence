const express = require("express");
const { getSummary, getReport, downloadReportCsv } = require("../controllers/analyticsController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.use(authorize("Admin", "Developer", "Tester"));

router.get("/summary", getSummary);
router.get("/report", getReport);
router.get("/report.csv", downloadReportCsv);

module.exports = router;
