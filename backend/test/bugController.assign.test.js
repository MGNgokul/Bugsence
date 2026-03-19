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
const versionValidationPath = path.resolve(__dirname, "../server/utils/versionValidation.js");

function buildController(overrides = {}) {
  const logCalls = [];
  const notificationCalls = [];
  const savedBugs = [];

  const bugDoc = {
    _id: "bug-1",
    title: "Cannot save settings",
    assignedTo: null,
    assignedBy: null,
    deadline: null,
    async save() {
      savedBugs.push({
        assignedTo: this.assignedTo,
        assignedBy: this.assignedBy,
        deadline: this.deadline
      });
      return this;
    }
  };

  const bugMock = {
    async findById() {
      return overrides.bugDoc === null ? null : bugDoc;
    }
  };

  const userMock = {
    findById(id) {
      return {
        select: async () => (overrides.assigneeMissing ? null : { _id: id, role: "Developer" })
      };
    }
  };

  const mocks = {
    [bugModelPath]: bugMock,
    [commentModelPath]: {},
    [userModelPath]: userMock,
    [categorizeBugPath]: { categorizeBug: () => "Other" },
    [aiSuggestionsPath]: { suggestFix: async () => ({ summary: "Suggestion" }) },
    [validateBugPayloadPath]: { validateBugPayload: () => ({}) },
    [versionValidationPath]: {
      normalizeBugVersionFields: (payload = {}) => ({
        versionIntroduced: typeof payload.versionIntroduced === "string" ? payload.versionIntroduced.trim() : "",
        versionFixed: typeof payload.versionFixed === "string" ? payload.versionFixed.trim() : ""
      }),
      validateTrackedVersionFields: async () => ({})
    },
    [logActivityPath]: {
      logActivity: async (payload) => {
        logCalls.push(payload);
      }
    },
    [createNotificationPath]: {
      createNotification: async (payload) => {
        notificationCalls.push(payload);
      }
    }
  };

  const loaded = loadWithMocks(bugControllerPath, mocks);

  return {
    controller: loaded.module,
    restore: loaded.restore,
    logCalls,
    notificationCalls,
    savedBugs
  };
}

module.exports = [
  {
    name: "assignBug persists assignee, assigner, deadline, and side effects",
    async run() {
      const { controller, restore, logCalls, notificationCalls, savedBugs } = buildController();
      const req = {
        params: { id: "bug-1" },
        body: { assignedTo: "user-5", deadline: "2026-03-25" },
        user: { _id: "admin-1" }
      };
      const res = createResponse();

      try {
        await controller.assignBug(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 200);
        assert.equal(savedBugs.length, 1);
        assert.equal(savedBugs[0].assignedTo, "user-5");
        assert.equal(savedBugs[0].assignedBy, "admin-1");
        assert.ok(savedBugs[0].deadline instanceof Date);
        assert.equal(savedBugs[0].deadline.toISOString().slice(0, 10), "2026-03-25");
        assert.equal(logCalls.length, 1);
        assert.equal(notificationCalls.length, 1);
        assert.equal(notificationCalls[0].userId, "user-5");
      } finally {
        restore();
      }
    }
  },
  {
    name: "assignBug rejects unknown assignees",
    async run() {
      const { controller, restore, logCalls, notificationCalls, savedBugs } = buildController({ assigneeMissing: true });
      const req = {
        params: { id: "bug-1" },
        body: { assignedTo: "missing-user", deadline: "2026-03-25" },
        user: { _id: "admin-1" }
      };
      const res = createResponse();

      try {
        await controller.assignBug(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 400);
        assert.equal(res.jsonPayload.message, "Selected assignee was not found.");
        assert.equal(savedBugs.length, 0);
        assert.equal(logCalls.length, 0);
        assert.equal(notificationCalls.length, 0);
      } finally {
        restore();
      }
    }
  },
  {
    name: "assignBug rejects invalid deadlines",
    async run() {
      const { controller, restore, logCalls, notificationCalls, savedBugs } = buildController();
      const req = {
        params: { id: "bug-1" },
        body: { assignedTo: "user-5", deadline: "not-a-date" },
        user: { _id: "admin-1" }
      };
      const res = createResponse();

      try {
        await controller.assignBug(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 400);
        assert.equal(res.jsonPayload.message, "Deadline must be a valid date.");
        assert.equal(savedBugs.length, 0);
        assert.equal(logCalls.length, 0);
        assert.equal(notificationCalls.length, 0);
      } finally {
        restore();
      }
    }
  }
];
