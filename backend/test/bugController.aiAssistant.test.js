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
  let askedArgs = null;

  const loaded = loadWithMocks(bugControllerPath, {
    [bugModelPath]: {},
    [commentModelPath]: {},
    [userModelPath]: {},
    [categorizeBugPath]: { categorizeBug: () => "Other" },
    [aiSuggestionsPath]: {
      suggestFix: async () => ({ summary: "Suggestion" }),
      answerBugQuestion: async (...args) => {
        askedArgs = args;
        return (
          overrides.answer || {
            reply: "Most likely cause is request validation before the controller finishes.",
            confidence: "High",
            followUps: ["Which payload field fails first?", "What server log appears first?"],
            source: "Rule-based fallback",
            model: null
          }
        );
      }
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
    getAskedArgs: () => askedArgs
  };
}

module.exports = [
  {
    name: "askBugAssistant rejects empty questions",
    async run() {
      const { controller, restore, getAskedArgs } = buildController();
      const req = {
        body: {
          title: "Login page throws 500",
          question: "   "
        }
      };
      const res = createResponse();

      try {
        await controller.askBugAssistant(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 400);
        assert.equal(res.jsonPayload.message, "Question is required.");
        assert.equal(getAskedArgs(), null);
      } finally {
        restore();
      }
    }
  },
  {
    name: "askBugAssistant returns an answer and forwards normalized context",
    async run() {
      const { controller, restore, getAskedArgs } = buildController();
      const req = {
        body: {
          title: "Login page throws 500",
          description: "Submitting the login form returns a 500 server error.",
          versionIntroduced: " 2.3.0 ",
          question: " What is the likely root cause? ",
          history: [{ role: "user", text: "Which part fails first?" }]
        }
      };
      const res = createResponse();

      try {
        await controller.askBugAssistant(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 200);
        assert.equal(
          res.jsonPayload.answer.reply,
          "Most likely cause is request validation before the controller finishes."
        );

        const [payload, question, history] = getAskedArgs();
        assert.equal(payload.versionIntroduced, "2.3.0");
        assert.equal(payload.category, "Other");
        assert.equal(question, "What is the likely root cause?");
        assert.deepEqual(history, [{ role: "user", text: "Which part fails first?" }]);
      } finally {
        restore();
      }
    }
  }
];
