import "dotenv/config";

export interface RegistryEntry {
  id: string;
  url: string;
  headers: Record<string, string>;
}

export interface AiProviderConfig {
  id: string;
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
  authHeader: string;
  authPrefix: string;
}

function env(name: string, fallback?: string) {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? fallback : value;
}

function envInt(name: string, fallback: number) {
  const rawValue = env(name);
  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);
  return Number.isNaN(value) ? fallback : value;
}

function parseJsonObject(name: string): Record<string, string> {
  const rawValue = env(name);
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("value is not an object");
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, String(value)])
    );
  } catch (error) {
    throw new Error(`Invalid JSON object in ${name}: ${(error as Error).message}`);
  }
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function toEnvKey(id: string) {
  return id.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

export const mcpConfig = {
  listenHost: env("MCP_LISTEN_HOST", env("RENDER") ? "0.0.0.0" : "127.0.0.1")!,
  publicHost: env("MCP_PUBLIC_HOST", "localhost")!,
  path: normalizePath(env("MCP_PATH", "/mcp")!),
  server1Port: envInt("MCP1_PORT", 3000),
  server2Port: envInt("MCP2_PORT", 3001),
  aiPort: envInt("MCP_AI_PORT", 3002),
  gatewayPort: envInt("MCP_GATEWAY_PORT", envInt("PORT", 8000))
};

export function serverUrl(port: number) {
  return `http://${mcpConfig.publicHost}:${port}${mcpConfig.path}`;
}

function defaultRegistryEntry(id: string): RegistryEntry {
  if (id === "1") {
    return {
      id,
      url: env("MCP1_URL", serverUrl(mcpConfig.server1Port))!,
      headers: parseJsonObject("MCP1_HEADERS_JSON")
    };
  }

  if (id === "2") {
    return {
      id,
      url: env("MCP2_URL", serverUrl(mcpConfig.server2Port))!,
      headers: parseJsonObject("MCP2_HEADERS_JSON")
    };
  }

  if (id === "ai") {
    return {
      id,
      url: env("MCP_AI_URL", serverUrl(mcpConfig.aiPort))!,
      headers: parseJsonObject("MCP_AI_HEADERS_JSON")
    };
  }

  const envKey = toEnvKey(id);
  const url = env(`MCP_${envKey}_URL`);
  if (!url) {
    throw new Error(`Missing MCP_${envKey}_URL for gateway registry id "${id}"`);
  }

  return {
    id,
    url,
    headers: parseJsonObject(`MCP_${envKey}_HEADERS_JSON`)
  };
}

export function gatewayRegistry() {
  const registryJson = env("MCP_GATEWAY_REGISTRY_JSON");
  if (registryJson) {
    const parsed = JSON.parse(registryJson) as RegistryEntry[];
    return parsed.map((entry) => ({
      id: entry.id,
      url: entry.url,
      headers: entry.headers ?? {}
    }));
  }

  return env("MCP_GATEWAY_SERVERS", "1,2,ai")!
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map(defaultRegistryEntry);
}

function providerIds() {
  return env("AI_PROVIDERS", "nvidia")!
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function getAiProviders(): AiProviderConfig[] {
  return providerIds().map((id) => {
    const envKey = toEnvKey(id);
    const isNvidia = id.toLowerCase() === "nvidia";
    const baseUrl = env(
      `AI_${envKey}_BASE_URL`,
      isNvidia ? env("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1") : undefined
    );

    return {
      id,
      baseUrl: baseUrl ? normalizeBaseUrl(baseUrl) : "",
      apiKey: env(`AI_${envKey}_API_KEY`, isNvidia ? env("NVIDIA_API_KEY") : undefined),
      defaultModel: env(`AI_${envKey}_MODEL`, isNvidia ? env("NVIDIA_MODEL") : undefined),
      authHeader: env(`AI_${envKey}_AUTH_HEADER`, "Authorization")!,
      authPrefix: env(`AI_${envKey}_AUTH_PREFIX`, "Bearer")!
    };
  });
}

export function getDefaultAiProviderId() {
  return env("AI_DEFAULT_PROVIDER", getAiProviders()[0]?.id ?? "nvidia")!;
}
