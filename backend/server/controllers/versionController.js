const Bug = require("../models/Bug");
const Version = require("../models/Version");
const { normalizeVersionPayload, validateVersionPayload } = require("../utils/versionValidation");

const OPEN_STATUSES = ["Open", "In Progress", "Testing"];

function toCountMap(rows = []) {
  return rows.reduce((acc, item) => {
    if (item?._id) {
      acc[item._id] = item.count || 0;
    }
    return acc;
  }, {});
}

function buildReleaseReadiness(versionDoc, counts = {}) {
  const blockingReasons = [];
  const unresolvedTargetedCount = counts.unresolvedTargetedCount || 0;
  const unresolvedCriticalIntroducedCount = counts.unresolvedCriticalIntroducedCount || 0;

  if (!versionDoc.releaseDate) {
    blockingReasons.push("Add a release date before marking this version ready.");
  }

  if (unresolvedTargetedCount > 0) {
    blockingReasons.push(`${unresolvedTargetedCount} unresolved bug(s) are still targeted for this version.`);
  }

  if (unresolvedCriticalIntroducedCount > 0) {
    blockingReasons.push(`${unresolvedCriticalIntroducedCount} critical bug(s) introduced in this version are still unresolved.`);
  }

  const markedReady = Boolean(versionDoc.releaseReady);
  const canMarkReady = blockingReasons.length === 0;
  const isCurrentlyReady = markedReady && canMarkReady;

  return {
    status: isCurrentlyReady ? "Ready" : canMarkReady ? "Eligible" : "Blocked",
    markedReady,
    canMarkReady,
    isCurrentlyReady,
    blockingCount: blockingReasons.length,
    blockingReasons,
    unresolvedTargetedCount,
    unresolvedCriticalIntroducedCount,
    readyAt: versionDoc.releaseReadyAt || null,
    readyBy: versionDoc.releaseReadyBy || null
  };
}

async function withVersionInsights(versions) {
  const versionNames = versions.map((item) => item.version).filter(Boolean);

  if (versionNames.length === 0) {
    return versions.map((item) => ({
      ...item.toObject(),
      introducedCount: 0,
      fixedCount: 0,
      totalUsage: 0,
      releaseReadiness: buildReleaseReadiness(item)
    }));
  }

  const [introducedRaw, fixedRaw, unresolvedTargetedRaw, unresolvedCriticalIntroducedRaw] = await Promise.all([
    Bug.aggregate([
      { $match: { versionIntroduced: { $in: versionNames } } },
      { $group: { _id: "$versionIntroduced", count: { $sum: 1 } } }
    ]),
    Bug.aggregate([
      { $match: { versionFixed: { $in: versionNames } } },
      { $group: { _id: "$versionFixed", count: { $sum: 1 } } }
    ]),
    Bug.aggregate([
      { $match: { versionFixed: { $in: versionNames }, status: { $in: OPEN_STATUSES } } },
      { $group: { _id: "$versionFixed", count: { $sum: 1 } } }
    ]),
    Bug.aggregate([
      {
        $match: {
          versionIntroduced: { $in: versionNames },
          priority: "Critical",
          status: { $in: OPEN_STATUSES }
        }
      },
      { $group: { _id: "$versionIntroduced", count: { $sum: 1 } } }
    ])
  ]);

  const introducedCounts = toCountMap(introducedRaw);
  const fixedCounts = toCountMap(fixedRaw);
  const unresolvedTargetedCounts = toCountMap(unresolvedTargetedRaw);
  const unresolvedCriticalIntroducedCounts = toCountMap(unresolvedCriticalIntroducedRaw);

  return versions.map((item) => {
    const introducedCount = introducedCounts[item.version] || 0;
    const fixedCount = fixedCounts[item.version] || 0;

    return {
      ...item.toObject(),
      introducedCount,
      fixedCount,
      totalUsage: introducedCount + fixedCount,
      releaseReadiness: buildReleaseReadiness(item, {
        unresolvedTargetedCount: unresolvedTargetedCounts[item.version] || 0,
        unresolvedCriticalIntroducedCount: unresolvedCriticalIntroducedCounts[item.version] || 0
      })
    };
  });
}

async function listVersions(_req, res, next) {
  try {
    const versions = await Version.find().sort({ releaseDate: -1, createdAt: -1, version: -1 });
    res.json(await withVersionInsights(versions));
  } catch (err) {
    next(err);
  }
}

async function createVersion(req, res, next) {
  try {
    const payload = normalizeVersionPayload(req.body);
    const validationErrors = validateVersionPayload(payload);

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        message: Object.values(validationErrors)[0],
        errors: validationErrors
      });
    }

    const existing = await Version.findOne({ version: payload.version });
    if (existing) {
      return res.status(400).json({
        message: "That version already exists.",
        errors: { version: "That version already exists." }
      });
    }

    const version = await Version.create({
      version: payload.version,
      releaseDate: payload.releaseDate,
      changes: payload.changes
    });

    const [result] = await withVersionInsights([version]);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function updateVersion(req, res, next) {
  try {
    const versionDoc = await Version.findById(req.params.id);
    if (!versionDoc) {
      return res.status(404).json({ message: "Version not found." });
    }

    const payload = normalizeVersionPayload(req.body);
    const validationErrors = validateVersionPayload(payload);

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        message: Object.values(validationErrors)[0],
        errors: validationErrors
      });
    }

    const duplicate = await Version.findOne({ version: payload.version, _id: { $ne: versionDoc._id } });
    if (duplicate) {
      return res.status(400).json({
        message: "That version already exists.",
        errors: { version: "That version already exists." }
      });
    }

    const previousVersionName = versionDoc.version;
    versionDoc.version = payload.version;
    versionDoc.releaseDate = payload.releaseDate;
    versionDoc.changes = payload.changes;
    await versionDoc.save();

    if (previousVersionName !== payload.version) {
      await Promise.all([
        Bug.updateMany({ versionIntroduced: previousVersionName }, { $set: { versionIntroduced: payload.version } }),
        Bug.updateMany({ versionFixed: previousVersionName }, { $set: { versionFixed: payload.version } })
      ]);
    }

    const [result] = await withVersionInsights([versionDoc]);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function setReleaseReady(req, res, next) {
  try {
    const versionDoc = await Version.findById(req.params.id);
    if (!versionDoc) {
      return res.status(404).json({ message: "Version not found." });
    }

    if (typeof req.body?.releaseReady !== "boolean") {
      return res.status(400).json({ message: "releaseReady must be true or false." });
    }

    const [currentView] = await withVersionInsights([versionDoc]);

    if (req.body.releaseReady) {
      if (!currentView.releaseReadiness.canMarkReady) {
        return res.status(400).json({
          message: currentView.releaseReadiness.blockingReasons[0],
          readiness: currentView.releaseReadiness
        });
      }

      versionDoc.releaseReady = true;
      versionDoc.releaseReadyAt = new Date();
      versionDoc.releaseReadyBy = req.user._id;
    } else {
      versionDoc.releaseReady = false;
      versionDoc.releaseReadyAt = null;
      versionDoc.releaseReadyBy = null;
    }

    await versionDoc.save();

    const [result] = await withVersionInsights([versionDoc]);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function deleteVersion(req, res, next) {
  try {
    const versionDoc = await Version.findById(req.params.id);
    if (!versionDoc) {
      return res.status(404).json({ message: "Version not found." });
    }

    const usageCount = await Bug.countDocuments({
      $or: [{ versionIntroduced: versionDoc.version }, { versionFixed: versionDoc.version }]
    });

    if (usageCount > 0) {
      return res.status(400).json({
        message: `Cannot delete ${versionDoc.version} because it is referenced by ${usageCount} bug(s).`
      });
    }

    await Version.deleteOne({ _id: versionDoc._id });
    res.json({ message: "Version deleted." });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listVersions,
  createVersion,
  updateVersion,
  setReleaseReady,
  deleteVersion
};
