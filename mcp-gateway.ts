import express from "express";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { gatewayRegistry, mcpConfig } from "./config.js";
import type { RegistryEntry } from "./config.js";

const app = express();
app.use(express.json());

const registry = gatewayRegistry();

async function withClient<T>(
  registryEntry: RegistryEntry,
  callback: (client: Client) => Promise<T>
) {
  const client = new Client({
    name: `proxy-for-${registryEntry.id}`,
    version: "1.0.0"
  });
  const transport = new StreamableHTTPClientTransport(
    new URL(registryEntry.url),
    {
      requestInit: {
        headers: registryEntry.headers
      }
    }
  );

  try {
    await client.connect(transport);
    return await callback(client);
  } finally {
    await client.close();
  }
}

function findRegistryEntry(toolName: string, toolMap: Map<string, RegistryEntry>) {
  const mappedEntry = toolMap.get(toolName);
  if (mappedEntry) {
    return mappedEntry;
  }

  const [registryId] = toolName.split("/", 1);
  return registry.find((entry) => entry.id === registryId);
}

function createGatewayServer() {
  const gatewayServer = new Server(
    {
      name: "gateway",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );
  const toolMap = new Map<string, RegistryEntry>();

  gatewayServer.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = [];

    for (const registryEntry of registry) {
      const response = await withClient(registryEntry, (client) => client.listTools());

      for (const tool of response.tools) {
        const uniqueName = `${registryEntry.id}/${tool.name}`;
        toolMap.set(uniqueName, registryEntry);
        tools.push({
          ...tool,
          name: uniqueName
        });
      }
    }

    return { tools };
  });

  gatewayServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const uniqueToolName = request.params.name;
    const targetRegistry = findRegistryEntry(uniqueToolName, toolMap);

    if (!targetRegistry) {
      throw new Error(`Tool registry routing mapping not found for ${uniqueToolName}`);
    }

    const [, ...rawNameParts] = uniqueToolName.split("/");
    const rawToolName = rawNameParts.join("/");

    if (!rawToolName) {
      throw new Error(`Gateway tool name must use the format "<registry-id>/<tool-name>"`);
    }

    return withClient(targetRegistry, (client) =>
      client.callTool({
        name: rawToolName,
        arguments: request.params.arguments ?? {}
      })
    );
  });

  return gatewayServer;
}

app.all(mcpConfig.path, async (req, res) => {
  const gatewayServer = createGatewayServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  res.on("close", () => {
    void gatewayServer.close();
  });

  try {
    await gatewayServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Gateway request failed:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Gateway request failed"
      });
    }
  }
});

app.listen(mcpConfig.gatewayPort, mcpConfig.listenHost, () => {
  console.log(
    `Gateway is running on http://${mcpConfig.publicHost}:${mcpConfig.gatewayPort}${mcpConfig.path}`
  );
  console.log(`Gateway registry: ${registry.map((entry) => `${entry.id}=${entry.url}`).join(", ")}`);
});
