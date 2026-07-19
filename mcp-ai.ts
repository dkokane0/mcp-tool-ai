import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { getAiProviders, getDefaultAiProviderId, mcpConfig } from "./config.js";
import type { AiProviderConfig } from "./config.js";

const app = express();
app.use(express.json({ limit: process.env.MCP_AI_BODY_LIMIT ?? "2mb" }));

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]).describe("Message role"),
  content: z.string().describe("Message content")
});

function providers() {
  return getAiProviders();
}

function findProvider(id?: string) {
  const providerId = id ?? getDefaultAiProviderId();
  const provider = providers().find((entry) => entry.id === providerId);

  if (!provider) {
    throw new Error(`AI provider "${providerId}" is not configured`);
  }

  if (!provider.baseUrl) {
    throw new Error(`AI provider "${providerId}" is missing a base URL`);
  }

  return provider;
}

function headersFor(provider: AiProviderConfig) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (provider.apiKey) {
    headers[provider.authHeader] = provider.authPrefix
      ? `${provider.authPrefix} ${provider.apiKey}`
      : provider.apiKey;
  }

  return headers;
}

function urlFor(provider: AiProviderConfig, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${provider.baseUrl}${normalizedPath}`;
}

function extractText(response: unknown) {
  const data = response as {
    output_text?: string;
    choices?: Array<{
      text?: string;
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
        reasoning_content?: string;
      };
    }>;
  };

  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  const messageContent = data.choices?.[0]?.message?.content;
  if (typeof messageContent === "string") {
    return messageContent;
  }

  if (Array.isArray(messageContent)) {
    return messageContent
      .map((part) => part.text)
      .filter(Boolean)
      .join("\n");
  }

  if (typeof data.choices?.[0]?.text === "string") {
    return data.choices[0].text;
  }

  return JSON.stringify(response, null, 2);
}

async function requestProvider(
  provider: AiProviderConfig,
  method: string,
  path: string,
  body?: unknown
) {
  const response = await fetch(urlFor(provider, path), {
    method,
    headers: headersFor(provider),
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  let responseBody: unknown = null;

  if (text) {
    try {
      responseBody = JSON.parse(text);
    } catch {
      responseBody = text;
    }
  }

  if (!response.ok) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              status: response.status,
              statusText: response.statusText,
              body: responseBody
            },
            null,
            2
          )
        }
      ],
      isError: true
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(responseBody, null, 2)
      }
    ]
  };
}

function createServer() {
  const server = new McpServer({
    name: "AI API Server",
    version: "1.0.0"
  });

  server.tool(
    "list_ai_providers",
    "Lists configured OpenAI-compatible AI API providers",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            providers().map((provider) => ({
              id: provider.id,
              baseUrl: provider.baseUrl,
              defaultModel: provider.defaultModel,
              hasApiKey: Boolean(provider.apiKey)
            })),
            null,
            2
          )
        }
      ]
    })
  );

  server.tool(
    "list_ai_models",
    "Lists models from an OpenAI-compatible provider when the provider supports GET /models",
    {
      provider: z.string().optional().describe("Provider id from AI_PROVIDERS")
    },
    async ({ provider }) => {
      const targetProvider = findProvider(provider);
      return requestProvider(targetProvider, "GET", "/models");
    }
  );

  server.tool(
    "chat_with_model",
    "Sends messages to an OpenAI-compatible /chat/completions endpoint",
    {
      provider: z.string().optional().describe("Provider id from AI_PROVIDERS"),
      model: z.string().optional().describe("Model id. Defaults to provider model from env."),
      prompt: z.string().optional().describe("Simple user prompt when messages are not supplied"),
      messages: z.array(messageSchema).optional().describe("Chat messages"),
      temperature: z.number().min(0).max(2).optional(),
      top_p: z.number().min(0).max(1).optional(),
      max_tokens: z.number().int().positive().optional()
    },
    async ({ provider, model, prompt, messages, temperature, top_p, max_tokens }) => {
      const targetProvider = findProvider(provider);
      const targetModel = model ?? targetProvider.defaultModel;

      if (!targetModel) {
        throw new Error(`No model was supplied and provider "${targetProvider.id}" has no default model`);
      }

      const targetMessages = messages ?? [{ role: "user" as const, content: prompt ?? "" }];
      if (targetMessages.length === 0 || targetMessages.every((message) => !message.content.trim())) {
        throw new Error("Provide either prompt or messages");
      }

      const result = await requestProvider(targetProvider, "POST", "/chat/completions", {
        model: targetModel,
        messages: targetMessages,
        temperature,
        top_p,
        max_tokens,
        stream: false
      });

      if ("isError" in result && result.isError) {
        return result;
      }

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      return {
        content: [
          {
            type: "text",
            text: extractText(parsed)
          }
        ]
      };
    }
  );

  server.tool(
    "openai_compatible_request",
    "Calls any path on a configured OpenAI-compatible provider base URL",
    {
      provider: z.string().optional().describe("Provider id from AI_PROVIDERS"),
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
      path: z.string().describe("API path, for example /chat/completions or /responses"),
      body: z.record(z.unknown()).optional().describe("JSON request body")
    },
    async ({ provider, method, path, body }) => {
      if (!path.startsWith("/")) {
        throw new Error("Path must start with /");
      }

      const targetProvider = findProvider(provider);
      return requestProvider(targetProvider, method, path, body);
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
    console.error("AI MCP Server request failed:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "AI MCP Server request failed"
      });
    }
  }
});

app.listen(mcpConfig.aiPort, mcpConfig.listenHost, () => {
  console.log(
    `AI MCP Server is running on http://${mcpConfig.publicHost}:${mcpConfig.aiPort}${mcpConfig.path}`
  );
});
