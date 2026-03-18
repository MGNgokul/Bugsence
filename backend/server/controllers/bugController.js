const Bug = require("../models/Bug");
const Comment = require("../models/Comment");
const { categorizeBug } = require("../utils/categorizeBug");
const { suggestFix } = require("../utils/aiSuggestions");
const { validateBugPayload } = require("../utils/validateBugPayload");
const { logActivity } = require("../utils/logActivity");
const { createNotification } = require("../utils/createNotification");

const AI_RELEVANT_FIELDS = [
  "title",
  "description",
  "stepsToReproduce",
  "expectedResult",
  "actualResult",
  "priority",
  "severity",
  "category",
  "versionIntroduced",
  "versionFixed"
];

function buildSuggestionPayload(payload = {}) {
  return {
    title: payload.title,
    description: payload.description,
    stepsToReproduce: payload.stepsToReproduce,
    expectedResult: payload.expectedResult,
    actualResult: payload.actualResult,
    priority: payload.priority || "Medium",
    severity: payload.severity || "Medium",
    category: payload.category || categorizeBug(payload.description),
    versionIntroduced: payload.versionIntroduced,
    versionFixed: payload.versionFixed
  };
}

function shouldRefreshSuggestion(payload = {}) {
  return AI_RELEVANT_FIELDS.some((field) => payload[field] !== undefined);
}

async function createBug(req, res, next) {
  try {
    const payload = req.body;
    const validationErrors = validateBugPayload(payload);

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        message: "Complete the required bug fields before creating the bug report.",
        errors: validationErrors
      });
    }

    const suggestionPayload = buildSuggestionPayload(payload);
    const aiSuggestion = await suggestFix(suggestionPayload);

    const bug = await Bug.create({
      title: payload.title,
      description: payload.description,
      stepsToReproduce: payload.stepsToReproduce,
      expectedResult: payload.expectedResult,
      actualResult: payload.actualResult,
      priority: suggestionPayload.priority,
      severity: suggestionPayload.severity,
      category: suggestionPayload.category,
      tags: payload.tags || [],
      versionIntroduced: payload.versionIntroduced,
      versionFixed: payload.versionFixed,
      aiSuggestion,
      createdBy: req.user._id,
      statusTimeline: [{ status: "Open", changedBy: req.user._id }]
    });

    await logActivity({
      bugId: bug._id,
      userId: req.user._id,
      action: "Bug created",
      metadata: { title: bug.title }
    });

    res.status(201).json(bug);
  } catch (err) {
    next(err);
  }
}

async function previewBugSuggestion(req, res, next) {
  try {
    const validationErrors = validateBugPayload(req.body);

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        message: "Complete the required bug fields before generating AI bug fix suggestions.",
        errors: validationErrors
      });
    }

    res.json({ suggestion: await suggestFix(buildSuggestionPayload(req.body)) });
  } catch (err) {
    next(err);
  }
}

async function getBugs(req, res, next) {
  try {
    const { status, priority, assignedTo, versionIntroduced, q } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (versionIntroduced) filter.versionIntroduced = versionIntroduced;
    if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { description: { $regex: q, $options: "i" } }];

    const bugs = await Bug.find(filter)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    res.json(bugs);
  } catch (err) {
    next(err);
  }
}

async function getBugById(req, res, next) {
  try {
    const bug = await Bug.findById(req.params.id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    if (!bug) return res.status(404).json({ message: "Bug not found" });

    if (!bug.aiSuggestion?.summary) {
      bug.aiSuggestion = await suggestFix(buildSuggestionPayload(bug.toObject()));
      await bug.save();
    }

    const comments = await Comment.find({ bugId: bug._id }).populate("userId", "name role").sort({ createdAt: 1 });
    res.json({ ...bug.toObject(), comments, aiSuggestion: bug.aiSuggestion });
  } catch (err) {
    next(err);
  }
}

async function updateBug(req, res, next) {
  try {
    const bug = await Bug.findById(req.params.id);
    if (!bug) return res.status(404).json({ message: "Bug not found" });

    const prevStatus = bug.status;
    const refreshAiSuggestion = shouldRefreshSuggestion(req.body);

    const updatable = [
      "title",
      "description",
      "stepsToReproduce",
      "expectedResult",
      "actualResult",
      "priority",
      "severity",
      "category",
      "tags",
      "status",
      "versionIntroduced",
      "versionFixed"
    ];

    updatable.forEach((field) => {
      if (req.body[field] !== undefined) bug[field] = req.body[field];
    });

    if (req.body.description !== undefined && req.body.category === undefined) {
      bug.category = categorizeBug(req.body.description);
    }

    if (req.body.status && req.body.status !== prevStatus) {
      bug.statusTimeline.push({ status: req.body.status, changedBy: req.user._id });
      await logActivity({
        bugId: bug._id,
        userId: req.user._id,
        action: "Status updated",
        metadata: { from: prevStatus, to: req.body.status }
      });
      if (bug.assignedTo) {
        await createNotification({
          userId: bug.assignedTo,
          type: "STATUS_UPDATE",
          message: `Bug "${bug.title}" moved to ${req.body.status}`
        });
      }
    }

    if (refreshAiSuggestion || !bug.aiSuggestion?.summary) {
      bug.aiSuggestion = await suggestFix(buildSuggestionPayload(bug.toObject()));
    }

    await bug.save();
    res.json(bug);
  } catch (err) {
    next(err);
  }
}

async function deleteBug(req, res, next) {
  try {
    const bug = await Bug.findById(req.params.id);
    if (!bug) return res.status(404).json({ message: "Bug not found" });

    await Bug.deleteOne({ _id: bug._id });
    await Comment.deleteMany({ bugId: bug._id });

    await logActivity({
      bugId: bug._id,
      userId: req.user._id,
      action: "Bug deleted",
      metadata: { title: bug.title }
    });

    res.json({ message: "Bug deleted" });
  } catch (err) {
    next(err);
  }
}

async function assignBug(req, res, next) {
  try {
    const { assignedTo, deadline } = req.body;
    const bug = await Bug.findById(req.params.id);
    if (!bug) return res.status(404).json({ message: "Bug not found" });

    bug.assignedTo = assignedTo;
    bug.assignedBy = req.user._id;
    if (deadline) bug.deadline = deadline;
    await bug.save();

    await logActivity({
      bugId: bug._id,
      userId: req.user._id,
      action: "Bug assigned",
      metadata: { assignedTo, deadline }
    });

    await createNotification({
      userId: assignedTo,
      type: "ASSIGNMENT",
      message: `You have been assigned bug "${bug.title}"`
    });

    res.json(bug);
  } catch (err) {
    next(err);
  }
}

async function addComment(req, res, next) {
  try {
    const bug = await Bug.findById(req.params.id);
    if (!bug) return res.status(404).json({ message: "Bug not found" });

    const doc = await Comment.create({
      bugId: bug._id,
      userId: req.user._id,
      comment: req.body.comment
    });

    await logActivity({
      bugId: bug._id,
      userId: req.user._id,
      action: "Comment added"
    });

    if (bug.assignedTo) {
      await createNotification({
        userId: bug.assignedTo,
        type: "COMMENT_ADDED",
        message: `New comment on bug "${bug.title}"`
      });
    }

    const populated = await doc.populate("userId", "name role");
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBug,
  previewBugSuggestion,
  getBugs,
  getBugById,
  updateBug,
  deleteBug,
  assignBug,
  addComment
};
