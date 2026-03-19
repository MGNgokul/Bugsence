const Bug = require("../models/Bug");
const Comment = require("../models/Comment");
const User = require("../models/User");
const { categorizeBug } = require("../utils/categorizeBug");
const { suggestFix, suggestBugTriage, answerBugQuestion } = require("../utils/aiSuggestions");
const { validateBugPayload } = require("../utils/validateBugPayload");
const { logActivity } = require("../utils/logActivity");
const { createNotification } = require("../utils/createNotification");
const { resolveMentionedUsers } = require("../utils/commentMentions");
const { buildDuplicateSearchPattern, rankDuplicateCandidates } = require("../utils/duplicateBugDetection");
const { normalizeBugVersionFields, validateTrackedVersionFields } = require("../utils/versionValidation");

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

function getPublicServerUrl(req) {
  const configuredUrl = String(process.env.SERVER_URL || "").trim().replace(/\/+$/, "");
  if (configuredUrl) return configuredUrl;

  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();

  return `${forwardedProtocol || req.protocol || "http"}://${forwardedHost || req.get("host")}`;
}

function buildUploadedAttachments(req) {
  return (req.files || []).map((file) => ({
    fileName: file.filename,
    originalName: file.originalname,
    fileSize: file.size,
    fileType: file.mimetype,
    url: `${getPublicServerUrl(req)}/uploads/${encodeURIComponent(file.filename)}`
  }));
}

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

function buildTriagePayload(payload = {}) {
  return {
    title: payload.title,
    description: payload.description,
    stepsToReproduce: payload.stepsToReproduce,
    expectedResult: payload.expectedResult,
    actualResult: payload.actualResult,
    versionIntroduced: payload.versionIntroduced,
    versionFixed: payload.versionFixed
  };
}

function shouldRefreshSuggestion(payload = {}) {
  return AI_RELEVANT_FIELDS.some((field) => payload[field] !== undefined);
}

async function previewDuplicateBugs(req, res, next) {
  try {
    const payload = {
      title: String(req.body?.title || "").trim(),
      description: String(req.body?.description || "").trim()
    };

    if (payload.title.length < 5 && payload.description.length < 15) {
      return res.json({ duplicates: [] });
    }

    const pattern = buildDuplicateSearchPattern(payload);
    const filter = pattern
      ? {
          $or: [
            { title: { $regex: pattern, $options: "i" } },
            { description: { $regex: pattern, $options: "i" } }
          ]
        }
      : {};

    const candidates = await Bug.find(filter)
      .select("_id title description status priority versionIntroduced createdAt")
      .sort({ createdAt: -1 })
      .limit(20);

    const duplicates = rankDuplicateCandidates(payload, candidates)
      .slice(0, 5)
      .map((item) => ({
        _id: item._id,
        title: item.title,
        status: item.status,
        priority: item.priority,
        versionIntroduced: item.versionIntroduced || "",
        duplicateScore: item.duplicateScore,
        createdAt: item.createdAt
      }));

    res.json({ duplicates });
  } catch (err) {
    next(err);
  }
}

async function createBug(req, res, next) {
  try {
    const payload = { ...req.body, ...normalizeBugVersionFields(req.body) };
    const validationErrors = {
      ...validateBugPayload(payload),
      ...(await validateTrackedVersionFields(payload))
    };

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
      attachments: buildUploadedAttachments(req),
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
    const payload = { ...req.body, ...normalizeBugVersionFields(req.body) };
    const validationErrors = {
      ...validateBugPayload(payload),
      ...(await validateTrackedVersionFields(payload))
    };

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        message: "Complete the required bug fields before generating AI bug fix suggestions.",
        errors: validationErrors
      });
    }

    res.json({ suggestion: await suggestFix(buildSuggestionPayload(payload)) });
  } catch (err) {
    next(err);
  }
}

async function previewBugTriage(req, res, next) {
  try {
    const payload = { ...req.body, ...normalizeBugVersionFields(req.body) };
    const title = String(payload.title || "").trim();
    const description = String(payload.description || "").trim();
    const actualResult = String(payload.actualResult || "").trim();

    if (title.length < 5 && description.length < 15 && actualResult.length < 3) {
      return res.status(400).json({
        message: "Add a clearer title, description, or actual result before generating AI triage suggestions."
      });
    }

    res.json({ triage: await suggestBugTriage(buildTriagePayload(payload)) });
  } catch (err) {
    next(err);
  }
}

async function askBugAssistant(req, res, next) {
  try {
    const payload = { ...req.body, ...normalizeBugVersionFields(req.body) };
    const question = String(req.body?.question || "").trim();

    if (!question) {
      return res.status(400).json({ message: "Question is required." });
    }

    res.json({
      answer: await answerBugQuestion(buildSuggestionPayload(payload), question, req.body?.history)
    });
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

async function addAttachments(req, res, next) {
  try {
    const bug = await Bug.findById(req.params.id);
    if (!bug) return res.status(404).json({ message: "Bug not found" });

    const nextAttachments = buildUploadedAttachments(req);
    if (nextAttachments.length === 0) {
      return res.status(400).json({ message: "Select at least one file to upload." });
    }

    bug.attachments = [...(bug.attachments || []), ...nextAttachments];
    await bug.save();

    await logActivity({
      bugId: bug._id,
      userId: req.user._id,
      action: "Attachments added",
      metadata: { count: nextAttachments.length }
    });

    res.status(201).json({ attachments: bug.attachments });
  } catch (err) {
    next(err);
  }
}

async function updateBug(req, res, next) {
  try {
    const bug = await Bug.findById(req.params.id);
    if (!bug) return res.status(404).json({ message: "Bug not found" });

    const payload = { ...req.body };
    const normalizedVersions = normalizeBugVersionFields(req.body);

    if (req.body.versionIntroduced !== undefined) {
      payload.versionIntroduced = normalizedVersions.versionIntroduced;
    }

    if (req.body.versionFixed !== undefined) {
      payload.versionFixed = normalizedVersions.versionFixed;
    }

    const versionErrors = await validateTrackedVersionFields(payload);
    if (Object.keys(versionErrors).length > 0) {
      return res.status(400).json({
        message: Object.values(versionErrors)[0],
        errors: versionErrors
      });
    }

    const prevStatus = bug.status;
    const refreshAiSuggestion = shouldRefreshSuggestion(payload);

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
      if (payload[field] !== undefined) bug[field] = payload[field];
    });

    if (payload.description !== undefined && payload.category === undefined) {
      bug.category = categorizeBug(payload.description);
    }

    if (payload.status && payload.status !== prevStatus) {
      bug.statusTimeline.push({ status: payload.status, changedBy: req.user._id });
      await logActivity({
        bugId: bug._id,
        userId: req.user._id,
        action: "Status updated",
        metadata: { from: prevStatus, to: payload.status }
      });
      if (bug.assignedTo) {
        await createNotification({
          userId: bug.assignedTo,
          bugId: bug._id,
          type: "STATUS_UPDATE",
          message: `Bug "${bug.title}" moved to ${payload.status}`
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
    if (!assignedTo) return res.status(400).json({ message: "Select a user to assign this bug." });
    const assignee = await User.findById(assignedTo).select("_id role");
    if (!assignee) {
      return res.status(400).json({ message: "Selected assignee was not found." });
    }

    const parsedDeadline = deadline ? new Date(deadline) : null;
    if (deadline && Number.isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({ message: "Deadline must be a valid date." });
    }

    bug.assignedTo = assignedTo;
    bug.assignedBy = req.user._id;
    bug.deadline = parsedDeadline;
    await bug.save();

    await logActivity({
      bugId: bug._id,
      userId: req.user._id,
      action: "Bug assigned",
      metadata: { assignedTo, deadline }
    });

    await createNotification({
      userId: assignedTo,
      bugId: bug._id,
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

    const commentText = String(req.body.comment || "").trim();
    if (!commentText) {
      return res.status(400).json({ message: "Comment cannot be empty." });
    }

    const doc = await Comment.create({
      bugId: bug._id,
      userId: req.user._id,
      comment: commentText
    });

    await logActivity({
      bugId: bug._id,
      userId: req.user._id,
      action: "Comment added"
    });

    const users = await User.find().select("_id name email");
    const mentionedUsers = resolveMentionedUsers(commentText, users, { excludeUserId: req.user._id });
    const mentionedUserIds = new Set(mentionedUsers.map((item) => String(item._id)));

    await Promise.all(
      mentionedUsers.map((item) =>
        createNotification({
          userId: item._id,
          bugId: bug._id,
          type: "MENTION",
          message: `${req.user.name || "A teammate"} mentioned you on bug "${bug.title}"`
        })
      )
    );

    if (
      bug.assignedTo &&
      String(bug.assignedTo) !== String(req.user._id) &&
      !mentionedUserIds.has(String(bug.assignedTo))
    ) {
      await createNotification({
        userId: bug.assignedTo,
        bugId: bug._id,
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
};
