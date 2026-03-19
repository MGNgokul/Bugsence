import { copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const distDirectory = resolve(currentDirectory, "..", "dist");
const indexFile = resolve(distDirectory, "index.html");
const fallbackFile = resolve(distDirectory, "404.html");

await copyFile(indexFile, fallbackFile);
console.log("Copied dist/index.html to dist/404.html for GitHub Pages routing.");
