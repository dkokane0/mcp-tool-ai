import { gatewayRegistry, mcpConfig } from "../config/index.js";
import { createGatewayMcpServer } from "../gateway/gatewayServer.js";
import { startStandaloneServer } from "./startStandaloneServer.js";

const registry = gatewayRegistry("standalone");

startStandaloneServer("Gateway", mcpConfig.gatewayPort, () => createGatewayMcpServer(registry));

console.log(`Gateway registry: ${registry.map((entry) => `${entry.id}=${entry.url}`).join(", ")}`);
