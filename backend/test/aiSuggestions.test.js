const assert = require("node:assert/strict");
const path = require("node:path");
const { loadWithMocks } = require("./helpers/loadWithMocks");

const aiSuggestionsPath = path.resolve(__dirname, "../server/utils/aiSuggestions.js");
const categorizeBugPath = path.resolve(__dirname, "../server/utils/categorizeBug.js");
const openAiModulePath = require.resolve("openai");

function buildModule(overrides = {}) {
  const openAiCalls = [];

  class MockOpenAI {
    constructor() {
      this.responses = {
        create: async (payload) => {
          openAiCalls.push(payload);
          if (overrides.throwOnCreate) {
            throw new Error("OpenAI unavailable");
          }

          return {
            model: "gpt-5-mini",
            output_text: JSON.stringify(
              overrides.output || {
                summary: "API route likely fails during payload validation.",
                likelyCause: "The request reaches the backend with missing or invalid fields.",
                confidence: "High",
                fixes: [
                  "Log the payload before validation.",
                  "Align frontend and backend request schemas.",
                  "Return the first failing validation clearly."
                ],
                validationChecks: [
                  "Retest with the failing payload.",
                  "Retest with a valid payload.",
                  "Confirm validation messages are stable."
                ],
                signals: [
                  "Server error wording was detected.",
                  "Validation wording was detected."
                ]
              }
            )
          };
        }
      };
    }
  }

  const mocks = {
    [categorizeBugPath]: {
      categorizeBug: (description = "") => (String(description).toLowerCase().includes("login") ? "Security Bug" : "Other")
    },
    [openAiModulePath]: MockOpenAI
  };

  const loaded = loadWithMocks(aiSuggestionsPath, mocks);

  return {
    module: loaded.module,
    restore: loaded.restore,
    openAiCalls
  };
}

function withEnv(nextEnv, run) {
  const previous = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_API_URL: process.env.OPENAI_API_URL
  };

  Object.entries(nextEnv).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });

  return Promise.resolve()
    .then(run)
    .finally(() => {
      Object.entries(previous).forEach(([key, value]) => {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      });
    });
}

module.exports = [
  {
    name: "suggestFix returns a structured fallback when OpenAI is not configured",
    async run() {
      await withEnv(
        {
          OPENAI_API_KEY: "",
          OPENAI_MODEL: undefined,
          OPENAI_BASE_URL: undefined,
          OPENAI_API_URL: undefined
        },
        async () => {
          const { module, restore } = buildModule();

          try {
            const suggestion = await module.suggestFix({
              title: "Login page throws 500",
              description: "Submitting the login form returns a 500 server error.",
              stepsToReproduce: "Open login, submit valid credentials, observe API failure.",
              expectedResult: "User signs in successfully.",
              actualResult: "Server returns 500.",
              priority: "High"
            });

            assert.equal(suggestion.source, "Rule-based fallback");
            assert.equal(suggestion.model, null);
            assert.ok(["Low", "Medium", "High"].includes(suggestion.confidence));
            assert.ok(Array.isArray(suggestion.fixes) && suggestion.fixes.length >= 3);
            assert.ok(Array.isArray(suggestion.validationChecks) && suggestion.validationChecks.length >= 3);
            assert.ok(Array.isArray(suggestion.signals) && suggestion.signals.length >= 2);
          } finally {
            restore();
          }
        }
      );
    }
  },
  {
    name: "suggestFix uses the OpenAI response path when configuration is present",
    async run() {
      await withEnv(
        {
          OPENAI_API_KEY: "test-key",
          OPENAI_MODEL: "gpt-5-mini",
          OPENAI_BASE_URL: undefined,
          OPENAI_API_URL: undefined
        },
        async () => {
          const { module, restore, openAiCalls } = buildModule();

          try {
            const suggestion = await module.suggestFix({
              title: "Login token fails",
              description: "Valid users receive unauthorized after login.",
              stepsToReproduce: "Login as tester and open dashboard.",
              expectedResult: "Dashboard loads.",
              actualResult: "401 unauthorized response."
            });

            assert.equal(openAiCalls.length, 1);
            assert.equal(suggestion.source, "OpenAI");
            assert.equal(suggestion.model, "gpt-5-mini");
            assert.equal(suggestion.confidence, "High");
            assert.equal(suggestion.summary, "API route likely fails during payload validation.");
          } finally {
            restore();
          }
        }
      );
    }
  },
  {
    name: "suggestBugTriage returns a structured fallback when OpenAI is not configured",
    async run() {
      await withEnv(
        {
          OPENAI_API_KEY: "",
          OPENAI_MODEL: undefined,
          OPENAI_BASE_URL: undefined,
          OPENAI_API_URL: undefined
        },
        async () => {
          const { module, restore } = buildModule();

          try {
            const triage = await module.suggestBugTriage({
              title: "Login page throws 500",
              description: "Submitting the login form returns a 500 server error.",
              stepsToReproduce: "Open login, submit valid credentials, observe API failure.",
              expectedResult: "User signs in successfully.",
              actualResult: "Server returns 500."
            });

            assert.equal(triage.source, "Rule-based fallback");
            assert.equal(triage.model, null);
            assert.ok(["Low", "Medium", "High"].includes(triage.confidence));
            assert.ok(["UI Bug", "Backend Bug", "Performance Issue", "Security Bug", "Database Bug", "Other"].includes(triage.category));
            assert.ok(["Low", "Medium", "High", "Critical"].includes(triage.priority));
            assert.ok(["Low", "Medium", "High", "Critical"].includes(triage.severity));
            assert.ok(Array.isArray(triage.signals) && triage.signals.length >= 1);
          } finally {
            restore();
          }
        }
      );
    }
  },
  {
    name: "suggestBugTriage uses the OpenAI response path when configuration is present",
    async run() {
      await withEnv(
        {
          OPENAI_API_KEY: "test-key",
          OPENAI_MODEL: "gpt-5-mini",
          OPENAI_BASE_URL: undefined,
          OPENAI_API_URL: undefined
        },
        async () => {
          const { module, restore, openAiCalls } = buildModule({
            output: {
              summary: "High priority backend issue with high severity.",
              rationale: "The login flow is blocked by a server-side failure in a core workflow.",
              category: "Backend Bug",
              priority: "High",
              severity: "High",
              confidence: "High",
              signals: ["Server error wording was detected.", "Login flow is affected."]
            }
          });

          try {
            const triage = await module.suggestBugTriage({
              title: "Login token fails",
              description: "Valid users receive unauthorized after login.",
              stepsToReproduce: "Login as tester and open dashboard.",
              expectedResult: "Dashboard loads.",
              actualResult: "401 unauthorized response."
            });

            assert.equal(openAiCalls.length, 1);
            assert.equal(triage.source, "OpenAI");
            assert.equal(triage.model, "gpt-5-mini");
            assert.equal(triage.category, "Backend Bug");
            assert.equal(triage.priority, "High");
            assert.equal(triage.severity, "High");
            assert.equal(triage.summary, "High priority backend issue with high severity.");
          } finally {
            restore();
          }
        }
      );
    }
  },
  {
    name: "answerBugQuestion returns a structured fallback when OpenAI is not configured",
    async run() {
      await withEnv(
        {
          OPENAI_API_KEY: "",
          OPENAI_MODEL: undefined,
          OPENAI_BASE_URL: undefined,
          OPENAI_API_URL: undefined
        },
        async () => {
          const { module, restore } = buildModule();

          try {
            const answer = await module.answerBugQuestion(
              {
                title: "Login page throws 500",
                description: "Submitting the login form returns a 500 server error.",
                stepsToReproduce: "Open login, submit valid credentials, observe API failure.",
                expectedResult: "User signs in successfully.",
                actualResult: "Server returns 500.",
                priority: "High"
              },
              "What is the likely root cause?"
            );

            assert.equal(answer.source, "Rule-based fallback");
            assert.equal(answer.model, null);
            assert.ok(["Low", "Medium", "High"].includes(answer.confidence));
            assert.match(answer.reply, /Most likely cause:/);
            assert.ok(Array.isArray(answer.followUps) && answer.followUps.length >= 2);
          } finally {
            restore();
          }
        }
      );
    }
  },
  {
    name: "answerBugQuestion uses the OpenAI response path and includes recent conversation history",
    async run() {
      await withEnv(
        {
          OPENAI_API_KEY: "test-key",
          OPENAI_MODEL: "gpt-5-mini",
          OPENAI_BASE_URL: undefined,
          OPENAI_API_URL: undefined
        },
        async () => {
          const { module, restore, openAiCalls } = buildModule({
            output: {
              reply: "The bug most likely starts in request validation before the controller completes login.",
              confidence: "High",
              followUps: [
                "Which payload field is failing validation?",
                "What server log appears first?"
              ]
            }
          });

          try {
            const answer = await module.answerBugQuestion(
              {
                title: "Login token fails",
                description: "Valid users receive unauthorized after login.",
                stepsToReproduce: "Login as tester and open dashboard.",
                expectedResult: "Dashboard loads.",
                actualResult: "401 unauthorized response."
              },
              "Explain more about the failure path",
              [
                { role: "user", text: "What is the likely root cause?" },
                { role: "assistant", text: "The request is likely failing before the login route completes." }
              ]
            );

            assert.equal(openAiCalls.length, 1);
            assert.equal(answer.source, "OpenAI");
            assert.equal(answer.model, "gpt-5-mini");
            assert.equal(answer.confidence, "High");
            assert.equal(
              answer.reply,
              "The bug most likely starts in request validation before the controller completes login."
            );
            assert.match(
              openAiCalls[0].input[0].content[0].text,
              /Assistant 2: The request is likely failing before the login route completes\./
            );
          } finally {
            restore();
          }
        }
      );
    }
  }
];
