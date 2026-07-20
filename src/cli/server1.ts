import { mcpConfig } from "../config/index.js";
import { createMathServerOne } from "../servers/mathServerOne.js";
import { startStandaloneServer } from "./startStandaloneServer.js";

startStandaloneServer("MCP Server 1", mcpConfig.server1Port, createMathServerOne);
