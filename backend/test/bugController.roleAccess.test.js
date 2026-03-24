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
const duplicateBugDetectionPath = path.resolve(__dirname, "../server/utils/duplicateBugDetection.js");
const commentMentionsPath = path.resolve(__dirname, "../server/utils/commentMentions.js");
const versionValidationPath = path.resolve(__dirname, "../server/utils/versionValidation.js");

function buildController() {
  const savedBugs = [];
  const createdBugs = [];

  const bugDoc = {
    _id: "bug-1",
    title: "Existing bug",
    status: "Open",
    versionFixed: "",
    statusTimeline: [],
    toObject() {
      return {
        title: this.title,
        description: "Desc",
        status: this.status,
        versionFixed: this.versionFixed
      };
    },
    async save() {
      savedBugs.push({
        status: this.status,
        versionFixed: this.versionFixed,
        title: this.title
      });
      return this;
    }
  };

  const mocks = {
    [bugModelPath]: {
      async create(payload) {
        createdBugs.push(payload);
        return payload;
      },
      async findById() {
        return bugDoc;
      }
    },
    [commentModelPath]: {},
    [userModelPath]: {},
    [categorizeBugPath]: { categorizeBug: () => "Other" },
    [aiSuggestionsPath]: {
      suggestFix: async () => ({ summary: "Suggestion" }),
      suggestBugTriage: async () => ({}),
      answerBugQuestion: async () => "Answer"
    },
    [validateBugPayloadPath]: { validateBugPayload: () => ({}) },
    [logActivityPath]: { logActivity: async () => {} },
    [createNotificationPath]: { createNotification: async () => {} },
    [duplicateBugDetectionPath]: {
      buildDuplicateSearchPattern: () => "",
      rankDuplicateCandidates: () => []
    },
    [commentMentionsPath]: { resolveMentionedUsers: () => [] },
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
    savedBugs,
    createdBugs
  };
}

module.exports = [
  {
    name: "createBug blocks developers from creating bugs",
    async run() {
      const { controller, restore, createdBugs } = buildController();
      const req = {
        body: { title: "Bug", description: "Description long enough" },
        user: { _id: "developer-1", role: "Developer" },
        files: [],
        headers: {},
        protocol: "http",
        get() {
          return "localhost:5000";
        }
      };
      const res = createResponse();

      try {
        await controller.createBug(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 403);
        assert.equal(res.jsonPayload.message, "Only Admin and Tester users can create bugs.");
        assert.equal(createdBugs.length, 0);
      } finally {
        restore();
      }
    }
  },
  {
    name: "updateBug blocks testers from updating bugs",
    async run() {
      const { controller, restore, savedBugs } = buildController();
      const req = {
        params: { id: "bug-1" },
        body: { status: "Resolved" },
        user: { _id: "tester-1", role: "Tester" }
      };
      const res = createResponse();

      try {
        await controller.updateBug(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 403);
        assert.equal(res.jsonPayload.message, "Only Admin and Developer users can update bugs.");
        assert.equal(savedBugs.length, 0);
      } finally {
        restore();
      }
    }
  },
  {
    name: "updateBug limits developers to status and fixed version",
    async run() {
      const { controller, restore, savedBugs } = buildController();
      const req = {
        params: { id: "bug-1" },
        body: { status: "In Progress", title: "Edited title" },
        user: { _id: "developer-1", role: "Developer" }
      };
      const res = createResponse();

      try {
        await controller.updateBug(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 403);
        assert.equal(res.jsonPayload.message, "Developers can only update bug status and fixed version.");
        assert.equal(savedBugs.length, 0);
      } finally {
        restore();
      }
    }
  }
];
