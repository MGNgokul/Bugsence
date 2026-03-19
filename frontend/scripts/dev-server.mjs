import { createServer } from "vite";
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
      mode: process.env.NODE_ENV || "development",
      isSsrBuild: false,
      isPreview: false
    });
  }

  return rawConfig;
}

const config = await resolveConfig();
const host = readArg("host") || process.env.HOST || "localhost";
const port = Number(readArg("port") || process.env.PORT || config.server?.port || 5173);

const server = await createServer({
  ...config,
  configFile: false,
  server: {
    ...config.server,
    host,
    port,
    strictPort: true
  }
});

await server.listen();
server.printUrls();
server.bindCLIShortcuts({ print: true });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await server.close();
    process.exit(0);
  });
}
