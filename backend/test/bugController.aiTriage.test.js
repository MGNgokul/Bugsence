const assert = require("node:assert/strict");
const path = require("node:path");
const { loadWithMocks } = require("./helpers/loadWithMocks");
const { createResponse } = require("./helpers/httpMocks");

const bugControllerPath = path.resolve(__dirname, "../server/controllers/bugController.js");
const bugModelPath = path.resolve(__dirname, "../server/models/Bug.js");
const commentModelPath = path.resolve(__dirname, "../server/models/Comment.js");
const userModelPath = path.resolve(__dirname, "../server/models/User.js");
const categorizeBugPath = path.resolve(__dirname, "../server/utils/categorizeBug.js");
const aiSuggestionsPath = path.resolve(__dirname, "../server/utils/aiSuggestions.js");
const validateBugPayloadPath = path.resolve(__dirname, "../server/utils/validateBugPayload.js");
const logActivityPath = path.resolve(__dirname, "../server/utils/logActivity.js");
const createNotificationPath = path.resolve(__dirname, "../server/utils/createNotification.js");
const commentMentionsPath = path.resolve(__dirname, "../server/utils/commentMentions.js");
const duplicateDetectionPath = path.resolve(__dirname, "../server/utils/duplicateBugDetection.js");
const versionValidationPath = path.resolve(__dirname, "../server/utils/versionValidation.js");

function buildController(overrides = {}) {
  let triageArgs = null;

  const loaded = loadWithMocks(bugControllerPath, {
    [bugModelPath]: {},
    [commentModelPath]: {},
    [userModelPath]: {},
    [categorizeBugPath]: { categorizeBug: () => "Other" },
    [aiSuggestionsPath]: {
      suggestFix: async () => ({ summary: "Suggestion" }),
      suggestBugTriage: async (...args) => {
        triageArgs = args;
        return (
          overrides.triage || {
            summary: "High priority backend issue with high severity.",
            rationale: "The issue blocks a core request path and should be escalated quickly.",
            category: "Backend Bug",
            priority: "High",
            severity: "High",
            confidence: "High",
            signals: ["Server error wording was detected.", "A core workflow is blocked."],
            source: "Rule-based fallback",
            model: null
          }
        );
      },
      answerBugQuestion: async () => ({
        reply: "Answer",
        confidence: "High",
        followUps: ["Next question"],
        source: "Rule-based fallback",
        model: null
      })
    },
    [validateBugPayloadPath]: { validateBugPayload: () => ({}) },
    [logActivityPath]: { logActivity: async () => {} },
    [createNotificationPath]: { createNotification: async () => {} },
    [commentMentionsPath]: { resolveMentionedUsers: () => [] },
    [duplicateDetectionPath]: {
      buildDuplicateSearchPattern: () => "",
      rankDuplicateCandidates: () => []
    },
    [versionValidationPath]: {
      normalizeBugVersionFields: (payload = {}) => ({
        versionIntroduced: typeof payload.versionIntroduced === "string" ? payload.versionIntroduced.trim() : "",
        versionFixed: typeof payload.versionFixed === "string" ? payload.versionFixed.trim() : ""
      }),
      validateTrackedVersionFields: async () => ({})
    }
  });

  return {
    controller: loaded.module,
    restore: loaded.restore,
    getTriageArgs: () => triageArgs
  };
}

module.exports = [
  {
    name: "previewBugTriage rejects empty bug context",
    async run() {
      const { controller, restore, getTriageArgs } = buildController();
      const req = { body: {} };
      const res = createResponse();

      try {
        await controller.previewBugTriage(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 400);
        assert.equal(
          res.jsonPayload.message,
          "Add a clearer title, description, or actual result before generating AI triage suggestions."
        );
        assert.equal(getTriageArgs(), null);
      } finally {
        restore();
      }
    }
  },
  {
    name: "previewBugTriage returns a triage recommendation for draft bug input",
    async run() {
      const { controller, restore, getTriageArgs } = buildController();
      const req = {
        body: {
          title: "Login fails for valid user",
          description: "Submitting the login form returns a 500 server error for valid credentials.",
          actualResult: "Login request fails.",
          versionIntroduced: " 2.4.0 "
        }
      };
      const res = createResponse();

      try {
        await controller.previewBugTriage(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonPayload.triage.category, "Backend Bug");
        assert.equal(res.jsonPayload.triage.priority, "High");
        assert.equal(res.jsonPayload.triage.severity, "High");

        const [payload] = getTriageArgs();
        assert.equal(payload.title, "Login fails for valid user");
        assert.equal(payload.versionIntroduced, "2.4.0");
        assert.equal(payload.category, undefined);
      } finally {
        restore();
      }
    }
  }
];
