import { createApp } from "./app.js";
import { mcpConfig } from "./config/index.js";

const { app, registry } = createApp();

app.listen(mcpConfig.appPort, mcpConfig.listenHost, () => {
  console.log(`Express app is running on http://${mcpConfig.publicHost}:${mcpConfig.appPort}`);
  console.log(`Gateway endpoint: http://${mcpConfig.publicHost}:${mcpConfig.appPort}${mcpConfig.path}`);
  console.log(`Gateway registry: ${registry.map((entry) => `${entry.id}=${entry.url}`).join(", ")}`);
});
