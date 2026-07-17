# MCP Tool AI

This repository contains a configurable Model Context Protocol (MCP) gateway.
It runs multiple Streamable HTTP MCP servers and exposes all of their tools
through one gateway endpoint that can be used from Cursor, Antigravity, or any
other MCP client that supports Streamable HTTP.

## Project Structure

- `mcp1.ts` - MCP Server 1 on port `3000`
  - `add_number`
  - `subtract_number`
- `mcp2.ts` - MCP Server 2 on port `3001`
  - `multiply_number`
  - `divide_number`
- `mcp-ai.ts` - AI API MCP server on port `3002`
  - `list_ai_providers`
  - `list_ai_models`
  - `chat_with_model`
  - `openai_compatible_request`
- `mcp-gateway.ts` - Gateway server on port `8000`
  - Lists tools from both backend servers.
  - Prefixes tool names with the backend id, such as `1/add_number` or
    `ai/chat_with_model`.
  - Routes tool calls back to the correct MCP server.
- `config.ts` - Shared environment configuration.
- `.env.example` - Example environment configuration.

## Requirements

- Node.js 20 or newer
- npm

## Install

```bash
npm install
```

Create a `.env` file from `.env.example` and add your provider keys:

PowerShell:

```powershell
Copy-Item .env.example .env
```

Bash:

```bash
cp .env.example .env
```

For NVIDIA hosted NIM, set:

```env
AI_PROVIDERS=nvidia
AI_DEFAULT_PROVIDER=nvidia
AI_NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
AI_NVIDIA_MODEL=openai/gpt-oss-120b
AI_NVIDIA_API_KEY=your-key-here
```

NVIDIA NIM exposes OpenAI-compatible endpoints such as
`POST /v1/chat/completions` and `GET /v1/models`.

## Run

Run everything in one terminal:

```bash
npm run all
```

Or open four terminals from the project folder.

Terminal 1:

```bash
npm run server1
```

Terminal 2:

```bash
npm run server2
```

Terminal 3:

```bash
npm run ai
```

Terminal 4:

```bash
npm run gateway
```

Endpoints:

- Server 1: `http://localhost:3000/mcp`
- Server 2: `http://localhost:3001/mcp`
- AI Server: `http://localhost:3002/mcp`
- Gateway: `http://localhost:8000/mcp`

Use the gateway URL in MCP clients:

```text
http://localhost:8000/mcp
```

## Type Check

```bash
npm run typecheck
```

## Notes

The gateway uses Streamable HTTP clients to connect to the backend MCP servers.
When a client lists tools from the gateway, the gateway fetches tools from each
registered backend and returns unique names in the format:

```text
<server-id>/<tool-name>
```

For example:

- `1/add_number`
- `1/subtract_number`
- `2/multiply_number`
- `2/divide_number`
- `ai/list_ai_providers`
- `ai/list_ai_models`
- `ai/chat_with_model`
- `ai/openai_compatible_request`

## Environment Configuration

All ports, paths, gateway entries, and AI providers are controlled by env vars.

Core MCP settings:

```env
MCP_LISTEN_HOST=127.0.0.1
MCP_PUBLIC_HOST=localhost
MCP_PATH=/mcp
MCP1_PORT=3000
MCP2_PORT=3001
MCP_AI_PORT=3002
MCP_GATEWAY_PORT=8000
MCP_GATEWAY_SERVERS=1,2,ai
```

AI provider settings:

```env
AI_PROVIDERS=nvidia,my-local-api
AI_DEFAULT_PROVIDER=nvidia

AI_NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
AI_NVIDIA_MODEL=openai/gpt-oss-120b
AI_NVIDIA_API_KEY=your-key-here

AI_MY_LOCAL_API_BASE_URL=http://localhost:11434/v1
AI_MY_LOCAL_API_MODEL=llama3.1
AI_MY_LOCAL_API_API_KEY=
```

Every provider is assumed to be OpenAI-compatible. The AI MCP server adds the
configured key as an `Authorization: Bearer ...` header by default.
