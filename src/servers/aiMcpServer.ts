import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  extractProviderText,
  findAiProvider,
  listAiProviders,
  messageSchema,
  requestAiProvider
} from "../services/aiProvider.js";

export function createAiMcpServer() {
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
            listAiProviders().map((provider) => ({
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
      const targetProvider = findAiProvider(provider);
      return requestAiProvider(targetProvider, "GET", "/models");
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
      const targetProvider = findAiProvider(provider);
      const targetModel = model ?? targetProvider.defaultModel;

      if (!targetModel) {
        throw new Error(`No model was supplied and provider "${targetProvider.id}" has no default model`);
      }

      const targetMessages = messages ?? [{ role: "user" as const, content: prompt ?? "" }];
      if (targetMessages.length === 0 || targetMessages.every((message) => !message.content.trim())) {
        throw new Error("Provide either prompt or messages");
      }

      const result = await requestAiProvider(targetProvider, "POST", "/chat/completions", {
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
            text: extractProviderText(parsed)
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

      const targetProvider = findAiProvider(provider);
      return requestAiProvider(targetProvider, method, path, body);
    }
  );

  return server;
}
