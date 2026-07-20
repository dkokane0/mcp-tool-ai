import { mcpConfig } from "../config/index.js";
import { createMathServerTwo } from "../servers/mathServerTwo.js";
import { startStandaloneServer } from "./startStandaloneServer.js";

startStandaloneServer("MCP Server 2", mcpConfig.server2Port, createMathServerTwo);
