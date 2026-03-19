import { cp, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const distDirectory = resolve(repositoryRoot, "frontend", "dist");

const generatedTargets = [
  "index.html",
  "404.html",
  "assets",
  "favicon.svg",
  "auth-ops-scene.svg",
  "overview-dashboard.svg",
  "overview-roles.svg",
  "overview-workflow.svg",
  ".nojekyll"
];

for (const target of generatedTargets) {
  await rm(resolve(repositoryRoot, target), { force: true, recursive: true });
}

await cp(distDirectory, repositoryRoot, { recursive: true, force: true });
await writeFile(resolve(repositoryRoot, ".nojekyll"), "");

console.log("Copied frontend/dist to repository root for branch-based GitHub Pages.");
