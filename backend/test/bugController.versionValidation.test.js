const assert = require("node:assert/strict");
const path = require("node:path");
const { loadWithMocks } = require("./helpers/loadWithMocks");
const { createResponse } = require("./helpers/httpMocks");

const bugControllerPath = path.resolve(__dirname, "../server/controllers/bugController.js");
const bugModelPath = path.resolve(__dirname, "../server/models/Bug.js");
const commentModelPath = path.resolve(__dirname, "../server/models/Comment.js");
const userModelPath = path.resolve(__dirname, "../server/models/User.js");
const versionModelPath = path.resolve(__dirname, "../server/models/Version.js");
const categorizeBugPath = path.resolve(__dirname, "../server/utils/categorizeBug.js");
const aiSuggestionsPath = path.resolve(__dirname, "../server/utils/aiSuggestions.js");
const validateBugPayloadPath = path.resolve(__dirname, "../server/utils/validateBugPayload.js");
const logActivityPath = path.resolve(__dirname, "../server/utils/logActivity.js");
const createNotificationPath = path.resolve(__dirname, "../server/utils/createNotification.js");

module.exports = [
  {
    name: "createBug rejects untracked introduced versions",
    async run() {
      let createCalled = false;

      const { module: controller, restore } = loadWithMocks(bugControllerPath, {
        [bugModelPath]: {
          async create() {
            createCalled = true;
            throw new Error("Bug.create should not be called for invalid versions.");
          }
        },
        [commentModelPath]: {},
        [userModelPath]: {},
        [versionModelPath]: {
          find() {
            return {
              select: async () => []
            };
          }
        },
        [categorizeBugPath]: { categorizeBug: () => "Other" },
        [aiSuggestionsPath]: { suggestFix: async () => ({ summary: "Suggestion" }) },
        [validateBugPayloadPath]: { validateBugPayload: () => ({}) },
        [logActivityPath]: { logActivity: async () => {} },
        [createNotificationPath]: { createNotification: async () => {} }
      });

      const req = {
        body: {
          title: "Login fails after submit",
          description: "Submitting the login form causes the request to hang indefinitely.",
          stepsToReproduce: "Open login, enter credentials, submit form.",
          expectedResult: "Dashboard loads.",
          actualResult: "Spinner never ends.",
          versionIntroduced: "9.9.9"
        },
        user: { _id: "user-1", role: "Tester" }
      };
      const res = createResponse();

      try {
        await controller.createBug(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 400);
        assert.equal(createCalled, false);
        assert.equal(res.jsonPayload.errors.versionIntroduced, "Version introduced must match a tracked version.");
      } finally {
        restore();
      }
    }
  },
  {
    name: "updateBug rejects untracked fixed versions",
    async run() {
      let saveCalled = false;

      const bugDoc = {
        _id: "bug-1",
        title: "Cannot close release ticket",
        status: "Testing",
        statusTimeline: [],
        aiSuggestion: { summary: "Suggestion" },
        async save() {
          saveCalled = true;
          return this;
        },
        toObject() {
          return this;
        }
      };

      const { module: controller, restore } = loadWithMocks(bugControllerPath, {
        [bugModelPath]: {
          async findById() {
            return bugDoc;
          }
        },
        [commentModelPath]: {},
        [userModelPath]: {},
        [versionModelPath]: {
          find() {
            return {
              select: async () => []
            };
          }
        },
        [categorizeBugPath]: { categorizeBug: () => "Other" },
        [aiSuggestionsPath]: { suggestFix: async () => ({ summary: "Suggestion" }) },
        [validateBugPayloadPath]: { validateBugPayload: () => ({}) },
        [logActivityPath]: { logActivity: async () => {} },
        [createNotificationPath]: { createNotification: async () => {} }
      });

      const req = {
        params: { id: "bug-1" },
        body: { versionFixed: "10.0.0" },
        user: { _id: "user-1", role: "Developer" }
      };
      const res = createResponse();

      try {
        await controller.updateBug(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 400);
        assert.equal(saveCalled, false);
        assert.equal(res.jsonPayload.errors.versionFixed, "Version fixed must match a tracked version.");
      } finally {
        restore();
      }
    }
  }
];
