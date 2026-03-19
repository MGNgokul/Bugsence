import roleTests from "./roles.test.js";

const suites = [...roleTests];

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

if (failed > 0) {
  process.exitCode = 1;
}
