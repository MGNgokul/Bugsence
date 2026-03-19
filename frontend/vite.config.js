import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "Bugsence";
const githubPagesBase = `/${repositoryName}/`;

export default defineConfig(({ command }) => ({
  base: command === "build" ? githubPagesBase : "/",
  plugins: [react()],
  server: {
    port: 5173
  }
}));
