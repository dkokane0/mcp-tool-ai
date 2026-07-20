import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function createMathServerTwo() {
  const server = new McpServer({
    name: "Math Server 2",
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
