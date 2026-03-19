const Bug = require("../models/Bug");

function toCountMap(rows = []) {
  return rows.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
}

function toSortedList(rows = [], preferredOrder = []) {
  const preferredIndex = new Map(preferredOrder.map((item, index) => [item, index]));

  return rows
    .map((item) => ({ label: item._id || "Unspecified", count: item.count }))
    .sort((a, b) => {
      const aIndex = preferredIndex.has(a.label) ? preferredIndex.get(a.label) : Number.MAX_SAFE_INTEGER;
      const bIndex = preferredIndex.has(b.label) ? preferredIndex.get(b.label) : Number.MAX_SAFE_INTEGER;

      if (aIndex !== bIndex) return aIndex - bIndex;
      return b.count - a.count;
    });
}

function toCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

async function buildAnalyticsReport() {
  const [total, resolved, pending, critical, byPriorityRaw, byStatusRaw, byVersionRaw] = await Promise.all([
    Bug.countDocuments(),
    Bug.countDocuments({ status: "Resolved" }),
    Bug.countDocuments({ status: { $in: ["Open", "In Progress", "Testing"] } }),
    Bug.countDocuments({ priority: "Critical" }),
    Bug.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
    Bug.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Bug.aggregate([
      { $match: { versionIntroduced: { $exists: true, $ne: "" } } },
      { $group: { _id: "$versionIntroduced", count: { $sum: 1 } } }
    ])
  ]);

  const byPriority = toCountMap(byPriorityRaw);
  const byStatus = toCountMap(byStatusRaw);
  const resolvedRate = total ? Math.round((resolved / total) * 100) : 0;
  const pendingRate = total ? Math.round((pending / total) * 100) : 0;
  const criticalRate = total ? Math.round((critical / total) * 100) : 0;

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      total,
      resolved,
      pending,
      critical,
      resolvedRate,
      pendingRate,
      criticalRate
    },
    byPriority,
    byStatus,
    sections: {
      priority: toSortedList(byPriorityRaw, ["Critical", "High", "Medium", "Low"]),
      status: toSortedList(byStatusRaw, ["Open", "In Progress", "Testing", "Resolved", "Closed"]),
      versions: toSortedList(byVersionRaw).slice(0, 10)
    }
  };
}

async function getSummary(_req, res, next) {
  try {
    const report = await buildAnalyticsReport();
    res.json({
      total: report.summary.total,
      resolved: report.summary.resolved,
      pending: report.summary.pending,
      critical: report.summary.critical,
      byPriority: report.byPriority,
      byStatus: report.byStatus
    });
  } catch (err) {
    next(err);
  }
}

async function getReport(_req, res, next) {
  try {
    res.json(await buildAnalyticsReport());
  } catch (err) {
    next(err);
  }
}

async function downloadReportCsv(_req, res, next) {
  try {
    const report = await buildAnalyticsReport();
    const lines = [
      ["Generated At", report.generatedAt],
      ["Total Bugs", report.summary.total],
      ["Resolved Bugs", report.summary.resolved],
      ["Pending Bugs", report.summary.pending],
      ["Critical Bugs", report.summary.critical],
      ["Resolved Rate (%)", report.summary.resolvedRate],
      ["Pending Rate (%)", report.summary.pendingRate],
      ["Critical Rate (%)", report.summary.criticalRate],
      [],
      ["Priority Breakdown"],
      ["Priority", "Count"],
      ...report.sections.priority.map((item) => [item.label, item.count]),
      [],
      ["Status Breakdown"],
      ["Status", "Count"],
      ...report.sections.status.map((item) => [item.label, item.count]),
      [],
      ["Top Versions"],
      ["Version Introduced", "Count"],
      ...report.sections.versions.map((item) => [item.label, item.count])
    ];

    const csv = lines
      .map((row) => row.map((value) => toCsvValue(value)).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="bugsense-analytics-report-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary, getReport, downloadReportCsv };
