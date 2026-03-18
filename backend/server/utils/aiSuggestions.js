const OpenAI = require("openai");
const { categorizeBug } = require("./categorizeBug");

const CONFIDENCE_LEVELS = new Set(["Low", "Medium", "High"]);
let cachedClient = null;
let cachedClientKey = "";

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getOpenAiConfig() {
  return {
    apiKey: normalize(process.env.OPENAI_API_KEY),
    baseURL: normalize(process.env.OPENAI_BASE_URL) || normalize(process.env.OPENAI_API_URL) || undefined,
    model: normalize(process.env.OPENAI_MODEL) || "gpt-5-mini"
  };
}

function getAiProviderStatus() {
  const { apiKey, model, baseURL } = getOpenAiConfig();

  return {
    provider: "openai",
    configured: Boolean(apiKey),
    model,
    baseURL: baseURL || "https://api.openai.com/v1"
  };
}

function getOpenAiClient() {
  const { apiKey, baseURL } = getOpenAiConfig();

  if (!apiKey) {
    return null;
  }

  const cacheKey = `${apiKey}:${baseURL || ""}`;

  if (!cachedClient || cachedClientKey !== cacheKey) {
    cachedClient = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
      timeout: 30000,
      maxRetries: 1
    });
    cachedClientKey = cacheKey;
  }

  return cachedClient;
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function pushUnique(list, ...items) {
  items.forEach((item) => {
    if (item && !list.includes(item)) {
      list.push(item);
    }
  });
}

function buildContext(input = {}) {
  const title = normalize(input.title);
  const description = normalize(input.description);
  const stepsToReproduce = normalize(input.stepsToReproduce);
  const expectedResult = normalize(input.expectedResult);
  const actualResult = normalize(input.actualResult);
  const priority = normalize(input.priority) || "Medium";
  const severity = normalize(input.severity) || "Medium";
  const category = normalize(input.category) || categorizeBug(description);
  const versionIntroduced = normalize(input.versionIntroduced);
  const versionFixed = normalize(input.versionFixed);

  return {
    title,
    description,
    stepsToReproduce,
    expectedResult,
    actualResult,
    priority,
    severity,
    category,
    versionIntroduced,
    versionFixed
  };
}

function withMetadata(suggestion, meta = {}) {
  return {
    summary: normalize(suggestion.summary),
    likelyCause: normalize(suggestion.likelyCause),
    confidence: CONFIDENCE_LEVELS.has(suggestion.confidence) ? suggestion.confidence : "Low",
    fixes: Array.isArray(suggestion.fixes) ? suggestion.fixes.filter(Boolean).map((item) => normalize(item)) : [],
    validationChecks: Array.isArray(suggestion.validationChecks)
      ? suggestion.validationChecks.filter(Boolean).map((item) => normalize(item))
      : [],
    signals: Array.isArray(suggestion.signals) ? suggestion.signals.filter(Boolean).map((item) => normalize(item)) : [],
    source: meta.source || suggestion.source || "Rule-based fallback",
    model: meta.model === undefined ? suggestion.model || null : meta.model,
    generatedAt: new Date()
  };
}

function createDefaultSuggestion(context) {
  const signals = [];

  if (context.category) signals.push(`Category noted: ${context.category}.`);
  if (context.priority) signals.push(`Priority marked as ${context.priority}.`);
  if (context.severity) signals.push(`Severity marked as ${context.severity}.`);

  return withMetadata(
    {
      summary: "The report needs a tighter reproduction trail before a confident fix path can be suggested.",
      likelyCause:
        "The issue pattern is still too broad, so the safest next step is to isolate the failing layer with logs and a repeatable test.",
      confidence: "Low",
      fixes: [
        "Reproduce the issue with the smallest possible flow and note the exact failing screen, API call, or background action.",
        "Add temporary logging around the request, state update, or database step that changes immediately before the failure.",
        "Compare the expected and actual results side by side so the team can isolate the first incorrect state transition."
      ],
      validationChecks: [
        "Confirm the issue reproduces with the same steps every time.",
        "Capture the failing request or console error before making code changes.",
        "Retest after the fix using the exact same expected and actual scenario."
      ],
      signals: signals.slice(0, 4)
    },
    { source: "Rule-based fallback", model: null }
  );
}

function buildRuleBasedSuggestion(input = {}) {
  const context = buildContext(input);
  const text = [
    context.title,
    context.description,
    context.stepsToReproduce,
    context.expectedResult,
    context.actualResult,
    context.category,
    context.priority,
    context.severity
  ]
    .join(" ")
    .toLowerCase();

  const likelyCauses = [];
  const fixes = [];
  const validationChecks = [];
  const signals = [];

  if (context.title) pushUnique(signals, `Title signal: ${context.title}.`);
  if (context.stepsToReproduce) pushUnique(signals, "Reproduction steps were provided.");
  if (context.expectedResult && context.actualResult) {
    pushUnique(signals, "Expected and actual behavior were both captured.");
  }
  if (context.category) pushUnique(signals, `Category noted: ${context.category}.`);

  if (hasAny(text, ["cannot read properties", "undefined", "null", "map is not a function", "map of undefined"])) {
    pushUnique(
      likelyCauses,
      "A null, undefined, or incorrectly shaped value is reaching the render or handler path before the component guards it."
    );
    pushUnique(
      fixes,
      "Add null and shape guards before reading nested properties or iterating over arrays.",
      "Validate the API response or local state before rendering so missing values fall back safely.",
      "Trace the first assignment where the expected object or array becomes undefined."
    );
    pushUnique(
      validationChecks,
      "Retest the failing screen with empty, partial, and delayed API responses.",
      "Verify the component still renders when the dataset is missing or an array is empty."
    );
    pushUnique(signals, "The report references undefined or property-access failures.");
  }

  if (hasAny(text, ["500", "internal server error", "api fails", "request failed", "timeout", "timed out"])) {
    pushUnique(
      likelyCauses,
      "A backend request is failing under invalid payload, missing guards, or an unhandled async or database error."
    );
    pushUnique(
      fixes,
      "Inspect the failing API route and log the incoming payload before the database or business-logic step runs.",
      "Wrap the async branch in explicit validation and error handling so bad input fails clearly.",
      "Check whether the timeout or 500 happens before or after a database write or third-party call."
    );
    pushUnique(
      validationChecks,
      "Retest the same request with a known-good payload and compare the response.",
      "Verify server logs no longer show uncaught async or database exceptions."
    );
    pushUnique(signals, "The report includes server-error or timeout wording.");
  }

  if (
    context.category === "UI Bug" ||
    hasAny(text, ["layout", "button", "modal", "alignment", "responsive", "css", "ui", "screen"])
  ) {
    pushUnique(
      likelyCauses,
      "The issue is likely in component state flow, conditional rendering, or layout styling rather than database logic."
    );
    pushUnique(
      fixes,
      "Inspect the affected component props and state transitions before adjusting styles so the wrong state is not being painted.",
      "Check responsive breakpoints and conditional classes around the failing UI element.",
      "Reduce the issue to one component and verify whether the incorrect behavior is data-driven or purely visual."
    );
    pushUnique(
      validationChecks,
      "Retest on the screen size and browser path that originally reproduced the bug.",
      "Confirm the UI still behaves correctly in both populated and empty states."
    );
    pushUnique(signals, "UI-focused language was detected in the bug report.");
  }

  if (
    context.category === "Performance Issue" ||
    hasAny(text, ["slow", "lag", "freeze", "performance", "memory", "cpu", "stuck", "spinner"])
  ) {
    pushUnique(
      likelyCauses,
      "The flow may be doing repeated rendering, an expensive client calculation, or a slow request that leaves the UI waiting."
    );
    pushUnique(
      fixes,
      "Profile the slow path to see whether the delay is in rendering, data fetching, or a repeated state update loop.",
      "Check for duplicate API calls, repeated effect execution, or unbounded list rendering on the affected page.",
      "Move expensive work off the hot render path and ensure loading state exits on both success and failure."
    );
    pushUnique(
      validationChecks,
      "Measure the interaction again after the change to confirm the stall or freeze is gone.",
      "Verify loading indicators clear when the request fails as well as when it succeeds."
    );
    pushUnique(signals, "Performance or freeze-related language was detected.");
  }

  if (
    context.category === "Database Bug" ||
    hasAny(text, ["database", "mongo", "query", "schema", "record", "save", "persist"])
  ) {
    pushUnique(
      likelyCauses,
      "The failure may be caused by schema mismatch, missing persistence guards, or a query that does not match the expected record shape."
    );
    pushUnique(
      fixes,
      "Compare the payload being saved or queried with the schema fields the backend expects.",
      "Check whether optional fields are being treated like required fields during create or update.",
      "Verify the query filters and populated relations return the record shape the frontend expects."
    );
    pushUnique(
      validationChecks,
      "Retest the create or update flow and confirm the database record persists with the right fields.",
      "Load the affected record again after saving to verify the returned shape is correct."
    );
    pushUnique(signals, "Database or persistence-related wording was detected.");
  }

  if (
    context.category === "Security Bug" ||
    hasAny(text, ["login", "auth", "token", "session", "unauthorized", "forbidden", "401", "403"])
  ) {
    pushUnique(
      likelyCauses,
      "The bug likely involves authentication state, token handling, or permission checks across frontend and backend routes."
    );
    pushUnique(
      fixes,
      "Verify the auth token is present, current, and attached to the failing request.",
      "Check the route guard or backend authorization rule that decides access for the reported role.",
      "Compare the failing user role with a working role to see whether the permission mapping is incorrect."
    );
    pushUnique(
      validationChecks,
      "Retest with the same role after the change and confirm the protected route behaves as expected.",
      "Verify expired, missing, and valid-token cases all return the intended result."
    );
    pushUnique(signals, "Authentication or permission wording was detected.");
  }

  if (hasAny(text, ["validation", "required", "invalid", "submit", "form"])) {
    pushUnique(
      likelyCauses,
      "A client or server validation rule may be missing, inconsistent, or firing in the wrong order."
    );
    pushUnique(
      fixes,
      "Compare frontend form validation with backend request validation so both enforce the same rules.",
      "Make the first failing validation branch explicit and return a single clear error message.",
      "Ensure the submit handler stops duplicate requests while validation or submission is still in progress."
    );
    pushUnique(
      validationChecks,
      "Retest empty, invalid, and valid submissions to verify each branch returns the correct message.",
      "Confirm the form cannot be double-submitted while a request is pending."
    );
    pushUnique(signals, "Validation-related wording was detected.");
  }

  if (
    context.expectedResult &&
    context.actualResult &&
    context.expectedResult.toLowerCase() !== context.actualResult.toLowerCase()
  ) {
    pushUnique(
      fixes,
      "Trace the first point where the live behavior diverges from the expected result recorded in the report."
    );
    pushUnique(validationChecks, "Compare the final user-visible result against the expected result after the fix.");
  }

  if (likelyCauses.length === 0) {
    return createDefaultSuggestion(context);
  }

  let confidenceScore = 0;
  if (context.description) confidenceScore += 1;
  if (context.stepsToReproduce) confidenceScore += 1;
  if (context.expectedResult) confidenceScore += 1;
  if (context.actualResult) confidenceScore += 1;
  confidenceScore += Math.min(3, likelyCauses.length);

  const confidence = confidenceScore >= 6 ? "High" : confidenceScore >= 4 ? "Medium" : "Low";
  const contextLead = context.category || "General";
  const urgencyLead = context.priority ? `${context.priority} priority` : "Reported";

  return withMetadata(
    {
      summary: `${urgencyLead} ${contextLead.toLowerCase()} issue. ${likelyCauses[0]}`,
      likelyCause: likelyCauses[0],
      confidence,
      fixes: fixes.slice(0, 5),
      validationChecks: validationChecks.slice(0, 5),
      signals: signals.slice(0, 5)
    },
    { source: "Rule-based fallback", model: null }
  );
}

function createResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "likelyCause", "confidence", "fixes", "validationChecks", "signals"],
    properties: {
      summary: { type: "string" },
      likelyCause: { type: "string" },
      confidence: { type: "string", enum: ["Low", "Medium", "High"] },
      fixes: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: { type: "string" }
      },
      validationChecks: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: { type: "string" }
      },
      signals: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: { type: "string" }
      }
    }
  };
}

function buildPrompt(context) {
  return [
    "Analyze this software bug report and return concise, implementation-focused fix guidance.",
    "",
    `Title: ${context.title}`,
    `Description: ${context.description}`,
    `Steps to reproduce: ${context.stepsToReproduce}`,
    `Expected result: ${context.expectedResult}`,
    `Actual result: ${context.actualResult}`,
    `Priority: ${context.priority}`,
    `Severity: ${context.severity}`,
    `Category: ${context.category}`,
    `Version introduced: ${context.versionIntroduced || "Unknown"}`,
    `Version fixed: ${context.versionFixed || "Not fixed"}`,
    "",
    "Write for a software team. Keep suggestions practical, specific, and testable.",
    "Do not mention being an AI model. Do not include markdown."
  ].join("\n");
}

function extractOutputText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = Array.isArray(data?.output)
    ? data.output.flatMap((item) =>
        Array.isArray(item?.content)
          ? item.content
              .filter((contentItem) => contentItem?.type === "output_text" && typeof contentItem.text === "string")
              .map((contentItem) => contentItem.text)
          : []
      )
    : [];

  return parts.join("\n").trim();
}

function mergeSuggestion(rawSuggestion, fallbackSuggestion, meta = {}) {
  const normalized = rawSuggestion && typeof rawSuggestion === "object" ? rawSuggestion : {};

  const pickArray = (value, fallback) => {
    if (!Array.isArray(value)) return fallback;
    const next = value.map((item) => normalize(item)).filter(Boolean);
    return next.length > 0 ? next.slice(0, 5) : fallback;
  };

  return withMetadata(
    {
      summary: normalize(normalized.summary) || fallbackSuggestion.summary,
      likelyCause: normalize(normalized.likelyCause) || fallbackSuggestion.likelyCause,
      confidence: CONFIDENCE_LEVELS.has(normalized.confidence) ? normalized.confidence : fallbackSuggestion.confidence,
      fixes: pickArray(normalized.fixes, fallbackSuggestion.fixes),
      validationChecks: pickArray(normalized.validationChecks, fallbackSuggestion.validationChecks),
      signals: pickArray(normalized.signals, fallbackSuggestion.signals)
    },
    meta
  );
}

async function requestOpenAiSuggestion(context, fallbackSuggestion) {
  const { model } = getOpenAiConfig();
  const client = getOpenAiClient();

  if (!client) {
    return null;
  }

  const response = await client.responses.create({
      model,
      store: false,
      instructions:
        "You are a senior software engineer helping BugSense users triage and fix reported bugs. Return only the requested JSON schema.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildPrompt(context)
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "bug_fix_suggestion",
          strict: true,
          schema: createResponseSchema()
        }
      },
      max_output_tokens: 700
  });
  const outputText = extractOutputText(response);

  if (!outputText) {
    throw new Error("OpenAI returned an empty suggestion payload.");
  }

  const parsed = JSON.parse(outputText);
  return mergeSuggestion(parsed, fallbackSuggestion, {
    source: "OpenAI",
    model: response.model || model
  });
}

async function suggestFix(input = {}) {
  const context = buildContext(input);
  const fallbackSuggestion = buildRuleBasedSuggestion(context);
  const { apiKey } = getOpenAiConfig();

  if (!apiKey) {
    return fallbackSuggestion;
  }

  try {
    const aiSuggestion = await requestOpenAiSuggestion(context, fallbackSuggestion);
    return aiSuggestion || fallbackSuggestion;
  } catch (error) {
    console.warn("AI suggestion fallback triggered:", error.message);
    return fallbackSuggestion;
  }
}

module.exports = { suggestFix, getAiProviderStatus };
