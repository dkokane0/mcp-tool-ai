import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { mcpConfig } from "./config.js";

const app = express();
app.use(express.json());

function createServer() {
  const server = new McpServer({
    name: "My Server 1",
    version: "1.0.0"
  });

  server.tool(
    "add_number",
    "Adds two numbers together",
    {
      a: z.number().describe("First number"),
      b: z.number().describe("Second number")
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a + b) }]
    })
  );

  server.tool(
    "subtract_number",
    "Subtracts the first number from the second number",
    {
      a: z.number().describe("First number"),
      b: z.number().describe("Second number")
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(b - a) }]
    })
  );

  return server;
}

app.all(mcpConfig.path, async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  res.on("close", () => {
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP Server 1 request failed:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "MCP Server 1 request failed"
      });
    }
  }
});

app.listen(mcpConfig.server1Port, mcpConfig.listenHost, () => {
  console.log(
    `MCP Server 1 is running on http://${mcpConfig.publicHost}:${mcpConfig.server1Port}${mcpConfig.path}`
  );
});
