import express from "express";
import { mcpConfig } from "../config/index.js";
import { mountMcpEndpoint, type ConnectableMcpServer } from "../http/mcpEndpoint.js";

export function startStandaloneServer(
  label: string,
  port: number,
  createServer: () => ConnectableMcpServer
) {
  const app = express();

  app.use(express.json({ limit: process.env.MCP_BODY_LIMIT ?? "2mb" }));
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: label });
  });
  mountMcpEndpoint(app, mcpConfig.path, label, createServer);

  app.listen(port, mcpConfig.listenHost, () => {
    console.log(`${label} is running on http://${mcpConfig.publicHost}:${port}${mcpConfig.path}`);
  });
}
