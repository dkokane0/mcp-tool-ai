import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { mcpConfig } from "./config.js";

const app = express();
app.use(express.json());

function createServer() {
  const server = new McpServer({
    name: "My Server 2",
    version: "1.0.0"
  });

  server.tool(
    "multiply_number",
    "Multiplies two numbers",
    {
      a: z.number().describe("First number"),
      b: z.number().describe("Second number")
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a * b) }]
    })
  );

  server.tool(
    "divide_number",
    "Divides the first number by the second number",
    {
      a: z.number().describe("First number"),
      b: z.number().describe("Second number")
    },
    async ({ a, b }) => {
      if (b === 0) {
        return {
          content: [{ type: "text", text: "Cannot divide by zero" }],
          isError: true
        };
      }

      return {
        content: [{ type: "text", text: String(a / b) }]
      };
    }
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
    console.error("MCP Server 2 request failed:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "MCP Server 2 request failed"
      });
    }
  }
});

app.listen(mcpConfig.server2Port, mcpConfig.listenHost, () => {
  console.log(
    `MCP Server 2 is running on http://${mcpConfig.publicHost}:${mcpConfig.server2Port}${mcpConfig.path}`
  );
});
