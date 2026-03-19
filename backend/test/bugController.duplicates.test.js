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
  let findCalled = false;

  const bugMock = {
    find(filter) {
      findCalled = true;
      if (typeof overrides.onFind === "function") {
        overrides.onFind(filter);
      }

      return {
        select: () => ({
          sort: () => ({
            limit: async () => overrides.candidates || []
          })
        })
      };
    }
  };

  const mocks = {
    [bugModelPath]: bugMock,
    [commentModelPath]: {},
    [userModelPath]: {},
    [categorizeBugPath]: { categorizeBug: () => "Other" },
    [aiSuggestionsPath]: { suggestFix: async () => ({ summary: "Suggestion" }) },
    [validateBugPayloadPath]: { validateBugPayload: () => ({}) },
    [logActivityPath]: { logActivity: async () => {} },
    [createNotificationPath]: { createNotification: async () => {} },
    [commentMentionsPath]: { resolveMentionedUsers: () => [] },
    [duplicateDetectionPath]: require(duplicateDetectionPath),
    [versionValidationPath]: {
      normalizeBugVersionFields: (payload = {}) => ({
        versionIntroduced: typeof payload.versionIntroduced === "string" ? payload.versionIntroduced.trim() : "",
        versionFixed: typeof payload.versionFixed === "string" ? payload.versionFixed.trim() : ""
      }),
      validateTrackedVersionFields: async () => ({})
    }
  };

  const loaded = loadWithMocks(bugControllerPath, mocks);

  return {
    controller: loaded.module,
    restore: loaded.restore,
    getFindCalled: () => findCalled
  };
}

module.exports = [
  {
    name: "previewDuplicateBugs returns ranked duplicate matches",
    async run() {
      const candidates = [
        {
          _id: "bug-1",
          title: "Login form freezes after submit",
          description: "Submitting valid credentials leaves the spinner running forever.",
          status: "Open",
          priority: "High",
          versionIntroduced: "2.0.0",
          createdAt: new Date("2026-03-20T10:00:00.000Z")
        },
        {
          _id: "bug-2",
          title: "Dashboard chart misalignment",
          description: "Chart cards shift on small screens.",
          status: "Testing",
          priority: "Medium",
          versionIntroduced: "2.1.0",
          createdAt: new Date("2026-03-19T10:00:00.000Z")
        }
      ];

      const { controller, restore } = buildController({
        candidates,
        onFind(filter) {
          assert.ok(filter.$or);
          assert.equal(filter.$or.length, 2);
        }
      });

      const req = {
        body: {
          title: "Login form freezes after submit",
          description: "Submitting credentials leaves the spinner running and never reaches dashboard."
        }
      };
      const res = createResponse();

      try {
        await controller.previewDuplicateBugs(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonPayload.duplicates.length, 1);
        assert.equal(res.jsonPayload.duplicates[0]._id, "bug-1");
        assert.ok(res.jsonPayload.duplicates[0].duplicateScore >= 70);
      } finally {
        restore();
      }
    }
  },
  {
    name: "previewDuplicateBugs skips lookup for very short input",
    async run() {
      const { controller, restore, getFindCalled } = buildController();
      const req = {
        body: {
          title: "Bug",
          description: "short text"
        }
      };
      const res = createResponse();

      try {
        await controller.previewDuplicateBugs(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.jsonPayload, { duplicates: [] });
        assert.equal(getFindCalled(), false);
      } finally {
        restore();
      }
    }
  }
];
