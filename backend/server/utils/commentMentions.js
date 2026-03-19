function extractMentionHandles(comment = "") {
  const matches = String(comment).matchAll(/(^|[\s([{])@([a-z0-9][a-z0-9._-]{1,49})/gi);
  const handles = new Set();

  for (const match of matches) {
    handles.add(String(match[2] || "").trim().toLowerCase());
  }

  return handles;
}

function buildMentionHandles(user = {}) {
  const handles = new Set();
  const emailLocalPart = String(user.email || "").trim().toLowerCase().split("@")[0];
  const nameParts = String(user.name || "")
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  if (emailLocalPart) {
    handles.add(emailLocalPart);
  }

  if (nameParts.length > 0) {
    handles.add(nameParts.join(""));
    handles.add(nameParts.join("."));
    handles.add(nameParts.join("_"));
    handles.add(nameParts.join("-"));

    if (nameParts.length === 1) {
      handles.add(nameParts[0]);
    }
  }

  return handles;
}

function resolveMentionedUsers(comment, users = [], options = {}) {
  const mentionHandles = Array.from(extractMentionHandles(comment));
  const excludedUserId = options.excludeUserId ? String(options.excludeUserId) : "";

  if (mentionHandles.length === 0) {
    return [];
  }

  const handleToUsers = new Map();

  for (const user of users) {
    if (!user?._id) continue;

    const userId = String(user._id);
    if (excludedUserId && userId === excludedUserId) continue;

    for (const handle of buildMentionHandles(user)) {
      if (!handleToUsers.has(handle)) {
        handleToUsers.set(handle, []);
      }

      handleToUsers.get(handle).push(user);
    }
  }

  const resolvedUsers = new Map();

  for (const handle of mentionHandles) {
    const matches = handleToUsers.get(handle) || [];

    // Skip ambiguous handles so one shorthand cannot notify the wrong user.
    if (matches.length === 1) {
      resolvedUsers.set(String(matches[0]._id), matches[0]);
    }
  }

  return Array.from(resolvedUsers.values());
}

module.exports = {
  extractMentionHandles,
  buildMentionHandles,
  resolveMentionedUsers
};
