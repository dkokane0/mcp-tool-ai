import { mcpConfig } from "../config/index.js";
import { createAiMcpServer } from "../servers/aiMcpServer.js";
import { startStandaloneServer } from "./startStandaloneServer.js";

startStandaloneServer("AI MCP Server", mcpConfig.aiPort, createAiMcpServer);
