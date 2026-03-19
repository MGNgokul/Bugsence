import { preview } from "vite";
import rawConfig from "../vite.config.js";

function readArg(name) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function resolveConfig() {
  if (typeof rawConfig === "function") {
    return rawConfig({
      command: "serve",
      mode: process.env.NODE_ENV || "production",
      isSsrBuild: false,
      isPreview: true
    });
  }

  return rawConfig;
}

const config = await resolveConfig();
const host = readArg("host") || process.env.HOST || "localhost";
const port = Number(readArg("port") || process.env.PORT || config.preview?.port || 4173);

const server = await preview({
  ...config,
  configFile: false,
  preview: {
    ...config.preview,
    host,
    port,
    strictPort: true
  }
});

server.printUrls();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await server.close();
    process.exit(0);
  });
}
