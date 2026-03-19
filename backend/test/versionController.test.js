const assert = require("node:assert/strict");
const path = require("node:path");
const { loadWithMocks } = require("./helpers/loadWithMocks");
const { createResponse } = require("./helpers/httpMocks");

const versionControllerPath = path.resolve(__dirname, "../server/controllers/versionController.js");
const bugModelPath = path.resolve(__dirname, "../server/models/Bug.js");
const versionModelPath = path.resolve(__dirname, "../server/models/Version.js");

function createVersionDoc(overrides = {}) {
  return {
    _id: overrides._id || "version-1",
    version: overrides.version || "2.0.0",
    releaseDate: overrides.releaseDate || null,
    changes: overrides.changes || "",
    releaseReady: overrides.releaseReady || false,
    releaseReadyAt: overrides.releaseReadyAt || null,
    releaseReadyBy: overrides.releaseReadyBy || null,
    async save() {
      return this;
    },
    toObject() {
      return {
        _id: this._id,
        version: this.version,
        releaseDate: this.releaseDate,
        changes: this.changes,
        releaseReady: this.releaseReady,
        releaseReadyAt: this.releaseReadyAt,
        releaseReadyBy: this.releaseReadyBy
      };
    }
  };
}

function createBugAggregateMock(responses = {}) {
  return {
    async aggregate(pipeline = []) {
      const groupField = pipeline.find((item) => item.$group)?.$group?._id || "";
      const match = pipeline.find((item) => item.$match)?.$match || {};

      if (groupField === "$versionIntroduced" && match.priority === "Critical") {
        return responses.unresolvedCriticalIntroduced || [];
      }

      if (groupField === "$versionFixed" && match.status) {
        return responses.unresolvedTargeted || [];
      }

      if (groupField === "$versionIntroduced") {
        return responses.introduced || [];
      }

      if (groupField === "$versionFixed") {
        return responses.fixed || [];
      }

      throw new Error(`Unexpected aggregate pipeline: ${JSON.stringify(pipeline)}`);
    }
  };
}

module.exports = [
  {
    name: "listVersions returns usage counts for tracked versions",
    async run() {
      const docs = [
        createVersionDoc({
          _id: "v1",
          version: "2.0.0",
          releaseDate: new Date("2026-03-20"),
          releaseReady: true,
          releaseReadyAt: new Date("2026-03-19T10:00:00.000Z"),
          releaseReadyBy: "admin-1"
        }),
        createVersionDoc({ _id: "v2", version: "1.9.0" })
      ];

      const bugMock = createBugAggregateMock({
        introduced: [
          { _id: "2.0.0", count: 3 },
          { _id: "1.9.0", count: 1 }
        ],
        fixed: [
          { _id: "2.0.0", count: 2 }
        ],
        unresolvedTargeted: [
          { _id: "1.9.0", count: 1 }
        ],
        unresolvedCriticalIntroduced: [
          { _id: "1.9.0", count: 1 }
        ]
      });

      const versionMock = {
        find() {
          return {
            sort: async () => docs
          };
        }
      };

      const { module: controller, restore } = loadWithMocks(versionControllerPath, {
        [bugModelPath]: bugMock,
        [versionModelPath]: versionMock
      });

      const res = createResponse();

      try {
        await controller.listVersions({}, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonPayload[0].introducedCount, 3);
        assert.equal(res.jsonPayload[0].fixedCount, 2);
        assert.equal(res.jsonPayload[0].totalUsage, 5);
        assert.equal(res.jsonPayload[0].releaseReadiness.status, "Ready");
        assert.equal(res.jsonPayload[0].releaseReadiness.isCurrentlyReady, true);
        assert.equal(res.jsonPayload[1].introducedCount, 1);
        assert.equal(res.jsonPayload[1].fixedCount, 0);
        assert.equal(res.jsonPayload[1].releaseReadiness.status, "Blocked");
        assert.equal(res.jsonPayload[1].releaseReadiness.blockingCount, 3);
      } finally {
        restore();
      }
    }
  },
  {
    name: "updateVersion renames referenced bug versions",
    async run() {
      const doc = createVersionDoc({ _id: "version-1", version: "2.0.0" });
      const bugUpdateCalls = [];

      const versionMock = {
        async findById(id) {
          assert.equal(id, "version-1");
          return doc;
        },
        async findOne() {
          return null;
        }
      };

      const bugMock = {
        ...createBugAggregateMock({
          introduced: [{ _id: "2.1.0", count: 4 }],
          fixed: [{ _id: "2.1.0", count: 1 }],
          unresolvedTargeted: [],
          unresolvedCriticalIntroduced: []
        }),
        async updateMany(filter, update) {
          bugUpdateCalls.push({ filter, update });
          return { acknowledged: true };
        }
      };

      const { module: controller, restore } = loadWithMocks(versionControllerPath, {
        [bugModelPath]: bugMock,
        [versionModelPath]: versionMock
      });

      const req = {
        params: { id: "version-1" },
        body: { version: "2.1.0", releaseDate: "2026-03-15", changes: "Release rename" }
      };
      const res = createResponse();

      try {
        await controller.updateVersion(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonPayload.version, "2.1.0");
        assert.equal(bugUpdateCalls.length, 2);
        assert.deepEqual(bugUpdateCalls[0], {
          filter: { versionIntroduced: "2.0.0" },
          update: { $set: { versionIntroduced: "2.1.0" } }
        });
        assert.deepEqual(bugUpdateCalls[1], {
          filter: { versionFixed: "2.0.0" },
          update: { $set: { versionFixed: "2.1.0" } }
        });
      } finally {
        restore();
      }
    }
  },
  {
    name: "setReleaseReady blocks approval when release checks are failing",
    async run() {
      const doc = createVersionDoc({ _id: "version-1", version: "2.0.0", releaseDate: null, releaseReady: false });

      const versionMock = {
        async findById() {
          return doc;
        }
      };

      const bugMock = createBugAggregateMock({
        introduced: [],
        fixed: [],
        unresolvedTargeted: [{ _id: "2.0.0", count: 1 }],
        unresolvedCriticalIntroduced: []
      });

      const { module: controller, restore } = loadWithMocks(versionControllerPath, {
        [bugModelPath]: bugMock,
        [versionModelPath]: versionMock
      });

      const req = {
        params: { id: "version-1" },
        body: { releaseReady: true },
        user: { _id: "admin-1" }
      };
      const res = createResponse();

      try {
        await controller.setReleaseReady(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 400);
        assert.match(res.jsonPayload.message, /release date/i);
        assert.equal(doc.releaseReady, false);
      } finally {
        restore();
      }
    }
  },
  {
    name: "setReleaseReady persists approval when the release gate is clear",
    async run() {
      const doc = createVersionDoc({
        _id: "version-1",
        version: "2.0.0",
        releaseDate: new Date("2026-03-20"),
        releaseReady: false
      });

      const versionMock = {
        async findById() {
          return doc;
        }
      };

      const bugMock = createBugAggregateMock({
        introduced: [],
        fixed: [],
        unresolvedTargeted: [],
        unresolvedCriticalIntroduced: []
      });

      const { module: controller, restore } = loadWithMocks(versionControllerPath, {
        [bugModelPath]: bugMock,
        [versionModelPath]: versionMock
      });

      const req = {
        params: { id: "version-1" },
        body: { releaseReady: true },
        user: { _id: "admin-1" }
      };
      const res = createResponse();

      try {
        await controller.setReleaseReady(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 200);
        assert.equal(doc.releaseReady, true);
        assert.equal(doc.releaseReadyBy, "admin-1");
        assert.ok(doc.releaseReadyAt instanceof Date);
        assert.equal(res.jsonPayload.releaseReadiness.status, "Ready");
        assert.equal(res.jsonPayload.releaseReadiness.isCurrentlyReady, true);
      } finally {
        restore();
      }
    }
  },
  {
    name: "deleteVersion blocks removal when the version is still referenced",
    async run() {
      const versionMock = {
        async findById() {
          return createVersionDoc({ _id: "version-1", version: "2.0.0" });
        }
      };

      const bugMock = {
        async countDocuments(filter) {
          assert.deepEqual(filter, {
            $or: [{ versionIntroduced: "2.0.0" }, { versionFixed: "2.0.0" }]
          });
          return 2;
        }
      };

      const { module: controller, restore } = loadWithMocks(versionControllerPath, {
        [bugModelPath]: bugMock,
        [versionModelPath]: versionMock
      });

      const res = createResponse();

      try {
        await controller.deleteVersion({ params: { id: "version-1" } }, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 400);
        assert.match(res.jsonPayload.message, /referenced by 2 bug/);
      } finally {
        restore();
      }
    }
  },
  {
    name: "createVersion rejects invalid release dates",
    async run() {
      let findOneCalled = false;
      let createCalled = false;

      const versionMock = {
        async findOne() {
          findOneCalled = true;
          return null;
        },
        async create() {
          createCalled = true;
          throw new Error("Version.create should not be called for invalid release dates.");
        }
      };

      const { module: controller, restore } = loadWithMocks(versionControllerPath, {
        [bugModelPath]: {},
        [versionModelPath]: versionMock
      });

      const req = {
        body: { version: "2.0.0", releaseDate: "not-a-date", changes: "Broken release date" }
      };
      const res = createResponse();

      try {
        await controller.createVersion(req, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 400);
        assert.equal(findOneCalled, false);
        assert.equal(createCalled, false);
        assert.equal(res.jsonPayload.errors.releaseDate, "Release date must be a valid date.");
      } finally {
        restore();
      }
    }
  }
];
