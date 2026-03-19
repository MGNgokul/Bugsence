const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "after",
  "before",
  "but",
  "for",
  "from",
  "into",
  "not",
  "page",
  "screen",
  "that",
  "the",
  "then",
  "this",
  "with",
  "when"
]);

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((item) => item.length >= 3 && !STOP_WORDS.has(item));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildDuplicateSearchPattern(payload = {}) {
  const keywords = [...new Set([...tokenize(payload.title), ...tokenize(payload.description)])]
    .sort((left, right) => right.length - left.length)
    .slice(0, 8);

  return keywords.length > 0 ? keywords.map(escapeRegex).join("|") : "";
}

function createTokenSet(...parts) {
  return new Set(parts.flatMap((item) => tokenize(item)));
}

function getOverlapRatio(leftSet, rightSet) {
  if (leftSet.size === 0 || rightSet.size === 0) return 0;

  let overlap = 0;
  leftSet.forEach((item) => {
    if (rightSet.has(item)) overlap += 1;
  });

  return overlap / Math.max(leftSet.size, rightSet.size);
}

function calculateDuplicateScore(input = {}, candidate = {}) {
  const inputTitle = normalizeText(input.title);
  const inputDescription = normalizeText(input.description);
  const candidateTitle = normalizeText(candidate.title);
  const candidateDescription = normalizeText(candidate.description);

  const inputTitleTokens = createTokenSet(input.title);
  const inputBodyTokens = createTokenSet(input.title, input.description);
  const candidateTitleTokens = createTokenSet(candidate.title);
  const candidateBodyTokens = createTokenSet(candidate.title, candidate.description);

  let score = 0;

  if (inputTitle && candidateTitle && inputTitle === candidateTitle) {
    score += 0.55;
  } else if (
    inputTitle
    && candidateTitle
    && Math.min(inputTitle.length, candidateTitle.length) >= 10
    && (candidateTitle.includes(inputTitle) || inputTitle.includes(candidateTitle))
  ) {
    score += 0.22;
  }

  if (
    inputDescription
    && candidateDescription
    && Math.min(inputDescription.length, candidateDescription.length) >= 24
    && (candidateDescription.includes(inputDescription) || inputDescription.includes(candidateDescription))
  ) {
    score += 0.12;
  }

  score += getOverlapRatio(inputTitleTokens, candidateTitleTokens) * 0.43;
  score += getOverlapRatio(inputBodyTokens, candidateBodyTokens) * 0.35;

  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

function rankDuplicateCandidates(payload = {}, candidates = []) {
  return candidates
    .map((item) => {
      const candidate = item?.toObject ? item.toObject() : item;
      return {
        ...candidate,
        duplicateScore: calculateDuplicateScore(payload, candidate)
      };
    })
    .filter((item) => item.duplicateScore >= 35)
    .sort((left, right) => right.duplicateScore - left.duplicateScore || new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
}

module.exports = {
  normalizeText,
  buildDuplicateSearchPattern,
  calculateDuplicateScore,
  rankDuplicateCandidates
};
