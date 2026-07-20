import { z } from "zod";
import {
  getAiProviders,
  getDefaultAiProviderId,
  type AiProviderConfig
} from "../config/index.js";

export const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]).describe("Message role"),
  content: z.string().describe("Message content")
});

export function listAiProviders() {
  return getAiProviders();
}

export function findAiProvider(id?: string) {
  const providerId = id ?? getDefaultAiProviderId();
  const provider = listAiProviders().find((entry) => entry.id === providerId);

  if (!provider) {
    throw new Error(`AI provider "${providerId}" is not configured`);
  }

  if (!provider.baseUrl) {
    throw new Error(`AI provider "${providerId}" is missing a base URL`);
  }

  return provider;
}

export function providerHeaders(provider: AiProviderConfig) {
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

export function providerUrl(provider: AiProviderConfig, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${provider.baseUrl}${normalizedPath}`;
}

export function extractProviderText(response: unknown) {
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

export async function requestAiProvider(
  provider: AiProviderConfig,
  method: string,
  path: string,
  body?: unknown
) {
  const response = await fetch(providerUrl(provider, path), {
    method,
    headers: providerHeaders(provider),
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
