const suites = [
  ...require("./aiSuggestions.test"),
  ...require("./analyticsController.test"),
  ...require("./versionController.test"),
  ...require("./bugController.aiAssistant.test"),
  ...require("./bugController.assign.test"),
  ...require("./bugController.duplicates.test"),
  ...require("./bugController.commentMentions.test"),
  ...require("./bugController.versionValidation.test")
];

async function main() {
  let failed = 0;

  for (const item of suites) {
    try {
      await item.run();
      console.log(`PASS ${item.name}`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${item.name}`);
      console.error(err?.stack || err);
    }
  }

  const passed = suites.length - failed;
  console.log(`${passed}/${suites.length} tests passed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exitCode = 1;
});
