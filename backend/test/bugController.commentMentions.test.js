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
  const createdComments = [];
  const users = overrides.users || [
    { _id: "user-1", name: "Morgan Lee", email: "morgan.lee@company.com", role: "Admin" },
    { _id: "user-2", name: "Alex Doe", email: "alex.doe@company.com", role: "Developer" },
    { _id: "user-3", name: "Sam QA", email: "sam.qa@company.com", role: "Tester" }
  ];

  const bugDoc = overrides.bugDoc === null
    ? null
    : {
        _id: "bug-1",
        title: "Cannot save settings",
        assignedTo: "user-2"
      };

  const bugMock = {
    async findById() {
      return bugDoc;
    }
  };

  const commentMock = {
    async create(payload) {
      createdComments.push(payload);
      return {
        _id: "comment-1",
        ...payload,
        async populate() {
          return {
            _id: "comment-1",
            ...payload,
            userId: { _id: payload.userId, name: "Morgan Lee", role: "Admin" }
          };
        }
      };
    }
  };

  const userMock = {
    findById(id) {
      return {
        select: async () => users.find((item) => item._id === id) || null
      };
    },
    find() {
      return {
        select: async () => users
      };
    }
  };

  const mocks = {
    [bugModelPath]: bugMock,
    [commentModelPath]: commentMock,
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
    createdComments
  };
}

module.exports = [
  {
    name: "addComment creates mention notifications and avoids duplicate assignee comment alerts",
    async run() {
      const { controller, restore, logCalls, notificationCalls, createdComments } = buildController();
      const req = {
        params: { id: "bug-1" },
        body: { comment: "Please review @alex.doe and @sam.qa before release." },
        user: { _id: "user-1", name: "Morgan Lee" }
      };
      const res = createResponse();

      try {
        await controller.addComment(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 201);
        assert.equal(createdComments.length, 1);
        assert.equal(createdComments[0].comment, "Please review @alex.doe and @sam.qa before release.");
        assert.equal(logCalls.length, 1);
        assert.equal(notificationCalls.length, 2);
        assert.deepEqual(
          notificationCalls.map((item) => ({ userId: item.userId, type: item.type, bugId: item.bugId })),
          [
            { userId: "user-2", type: "MENTION", bugId: "bug-1" },
            { userId: "user-3", type: "MENTION", bugId: "bug-1" }
          ]
        );
      } finally {
        restore();
      }
    }
  },
  {
    name: "addComment notifies the assignee when there are no direct mentions",
    async run() {
      const { controller, restore, notificationCalls, createdComments } = buildController();
      const req = {
        params: { id: "bug-1" },
        body: { comment: "Investigating the save flow now." },
        user: { _id: "user-1", name: "Morgan Lee" }
      };
      const res = createResponse();

      try {
        await controller.addComment(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 201);
        assert.equal(createdComments.length, 1);
        assert.equal(notificationCalls.length, 1);
        assert.deepEqual(notificationCalls[0], {
          userId: "user-2",
          bugId: "bug-1",
          type: "COMMENT_ADDED",
          message: 'New comment on bug "Cannot save settings"'
        });
      } finally {
        restore();
      }
    }
  },
  {
    name: "addComment rejects empty comments before saving or notifying",
    async run() {
      const { controller, restore, logCalls, notificationCalls, createdComments } = buildController();
      const req = {
        params: { id: "bug-1" },
        body: { comment: "   " },
        user: { _id: "user-1", name: "Morgan Lee" }
      };
      const res = createResponse();

      try {
        await controller.addComment(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 400);
        assert.equal(res.jsonPayload.message, "Comment cannot be empty.");
        assert.equal(createdComments.length, 0);
        assert.equal(logCalls.length, 0);
        assert.equal(notificationCalls.length, 0);
      } finally {
        restore();
      }
    }
  }
];
