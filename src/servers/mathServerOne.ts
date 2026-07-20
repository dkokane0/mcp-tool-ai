import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function createMathServerOne() {
  const server = new McpServer({
    name: "Math Server 1",
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
