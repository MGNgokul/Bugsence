const assert = require("node:assert/strict");
const path = require("node:path");
const { loadWithMocks } = require("./helpers/loadWithMocks");
const { createResponse } = require("./helpers/httpMocks");

const analyticsControllerPath = path.resolve(__dirname, "../server/controllers/analyticsController.js");
const bugModelPath = path.resolve(__dirname, "../server/models/Bug.js");

function createBugModelMock() {
  return {
    async countDocuments(filter = {}) {
      if (!filter || Object.keys(filter).length === 0) return 10;
      if (filter.status === "Resolved") return 4;
      if (filter.status?.$in) return 5;
      if (filter.priority === "Critical") return 2;
      throw new Error(`Unexpected countDocuments filter: ${JSON.stringify(filter)}`);
    },
    async aggregate(pipeline = []) {
      const groupField = pipeline.find((item) => item.$group)?.$group?._id || "";

      if (groupField === "$priority") {
        return [
          { _id: "Critical", count: 2 },
          { _id: "High", count: 3 },
          { _id: "Medium", count: 4 },
          { _id: "Low", count: 1 }
        ];
      }

      if (groupField === "$status") {
        return [
          { _id: "Open", count: 2 },
          { _id: "In Progress", count: 2 },
          { _id: "Testing", count: 1 },
          { _id: "Resolved", count: 4 },
          { _id: "Closed", count: 1 }
        ];
      }

      if (groupField === "$versionIntroduced") {
        return [
          { _id: "2.1.0", count: 5 },
          { _id: "2.0.0", count: 3 },
          { _id: "1.9.4", count: 2 }
        ];
      }

      throw new Error(`Unexpected aggregate pipeline: ${JSON.stringify(pipeline)}`);
    }
  };
}

module.exports = [
  {
    name: "analytics report exposes structured summary data",
    async run() {
      const { module: controller, restore } = loadWithMocks(analyticsControllerPath, {
        [bugModelPath]: createBugModelMock()
      });

      const res = createResponse();

      try {
        await controller.getReport({}, res, (err) => {
          throw err;
        });

        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonPayload.summary.total, 10);
        assert.equal(res.jsonPayload.summary.resolvedRate, 40);
        assert.equal(res.jsonPayload.summary.pendingRate, 50);
        assert.equal(res.jsonPayload.summary.criticalRate, 20);
        assert.deepEqual(res.jsonPayload.sections.priority.map((item) => item.label), ["Critical", "High", "Medium", "Low"]);
        assert.deepEqual(res.jsonPayload.sections.status.map((item) => item.label), ["Open", "In Progress", "Testing", "Resolved", "Closed"]);
        assert.equal(res.jsonPayload.sections.versions[0].label, "2.1.0");
      } finally {
        restore();
      }
    }
  },
  {
    name: "analytics CSV export includes summary and version sections",
    async run() {
      const { module: controller, restore } = loadWithMocks(analyticsControllerPath, {
        [bugModelPath]: createBugModelMock()
      });

      const res = createResponse();

      try {
        await controller.downloadReportCsv({}, res, (err) => {
          throw err;
        });

        assert.match(res.headers["content-type"], /text\/csv/);
        assert.match(res.headers["content-disposition"], /bugsense-analytics-report-/);
        assert.match(res.sentPayload, /Priority Breakdown/);
        assert.match(res.sentPayload, /Status Breakdown/);
        assert.match(res.sentPayload, /Top Versions/);
        assert.match(res.sentPayload, /2\.1\.0,5/);
      } finally {
        restore();
      }
    }
  }
];
