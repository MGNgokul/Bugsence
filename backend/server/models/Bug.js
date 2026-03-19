const mongoose = require("mongoose");

const statusTimelineSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    fileName: String,
    originalName: String,
    url: String,
    fileSize: Number,
    fileType: String,
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const aiSuggestionSchema = new mongoose.Schema(
  {
    summary: String,
    likelyCause: String,
    confidence: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low"
    },
    fixes: [{ type: String }],
    validationChecks: [{ type: String }],
    signals: [{ type: String }],
    source: { type: String, default: "Rule-based fallback" },
    model: { type: String, default: null },
    generatedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const bugSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    stepsToReproduce: String,
    expectedResult: String,
    actualResult: String,
    status: {
      type: String,
      enum: ["Open", "In Progress", "Testing", "Resolved", "Closed"],
      default: "Open"
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium"
    },
    severity: { type: String, default: "Medium" },
    category: {
      type: String,
      enum: ["UI Bug", "Backend Bug", "Performance Issue", "Security Bug", "Database Bug", "Other"],
      default: "Other"
    },
    tags: [{ type: String }],
    versionIntroduced: String,
    versionFixed: String,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deadline: Date,
    attachments: [attachmentSchema],
    aiSuggestion: aiSuggestionSchema,
    statusTimeline: [statusTimelineSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bug", bugSchema);
