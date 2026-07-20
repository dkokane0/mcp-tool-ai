import express from "express";
import { gatewayRegistry, mcpConfig, mcpMountPath } from "./config/index.js";
import { createGatewayMcpServer } from "./gateway/gatewayServer.js";
import { mountMcpEndpoint } from "./http/mcpEndpoint.js";
import { createAiMcpServer } from "./servers/aiMcpServer.js";
import { createMathServerOne } from "./servers/mathServerOne.js";
import { createMathServerTwo } from "./servers/mathServerTwo.js";

export function createApp() {
  const app = express();
  const registry = gatewayRegistry("app");

  app.use(express.json({ limit: process.env.MCP_BODY_LIMIT ?? "2mb" }));

  app.get("/", (_req, res) => {
    res.json({
      name: "mcp-tool-ai",
      status: "ok",
      endpoints: {
        health: "/health",
        gateway: mcpConfig.path,
        servers: {
          "1": mcpMountPath("1"),
          "2": mcpMountPath("2"),
          ai: mcpMountPath("ai")
        }
      }
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      gateway: mcpConfig.path,
      registry: registry.map(({ id, url }) => ({ id, url }))
    });
  });

  mountMcpEndpoint(app, mcpMountPath("1"), "MCP Server 1", createMathServerOne);
  mountMcpEndpoint(app, mcpMountPath("2"), "MCP Server 2", createMathServerTwo);
  mountMcpEndpoint(app, mcpMountPath("ai"), "AI MCP Server", createAiMcpServer);
  mountMcpEndpoint(app, mcpConfig.path, "Gateway", () => createGatewayMcpServer(registry));

  return {
    app,
    registry
  };
}
