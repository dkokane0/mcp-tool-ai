import type { Express } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export interface ConnectableMcpServer {
  connect(transport: StreamableHTTPServerTransport): Promise<void>;
  close(): Promise<void>;
}

export function mountMcpEndpoint(
  app: Express,
  path: string,
  label: string,
  createServer: () => ConnectableMcpServer
) {
  app.all(path, async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    res.on("close", () => {
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(
        req as IncomingMessage,
        res as ServerResponse,
        req.body
      );
    } catch (error) {
      console.error(`${label} request failed:`, error);

      if (!res.headersSent) {
        res.status(500).json({
          error: `${label} request failed`
        });
      }
    }
  });
}
