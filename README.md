# MCP Tool AI

Deployable Express app for MCP tools and an OpenAI-compatible AI provider.

The app exposes one public MCP gateway endpoint and mounts the backend MCP
servers inside the same Express process, which makes it simple to deploy on
Render, Railway, Fly, Docker, or any host that gives the app a single `PORT`.

## Project Structure

```text
src/
  app.ts                         Express app factory
  server.ts                      Production entrypoint
  cli/                           Standalone development launchers
  config/                        Environment parsing and service URLs
  gateway/                       MCP gateway/proxy server
  http/                          Shared Express MCP endpoint mounting
  servers/                       MCP server definitions
  services/                      AI provider request helpers
```

Root files such as `mcp1.ts`, `mcp2.ts`, `mcp-ai.ts`, and `mcp-gateway.ts`
are compatibility launchers that point to the new `src/cli` entrypoints.

## Requirements

- Node.js 20 or newer
- npm

## Install

```bash
npm install
```

Create a `.env` file from `.env.example` and add provider keys:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

For NVIDIA hosted NIM:

```env
AI_PROVIDERS=nvidia
AI_DEFAULT_PROVIDER=nvidia
AI_NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
AI_NVIDIA_MODEL=openai/gpt-oss-120b
AI_NVIDIA_API_KEY=your-key-here
```

## Run Locally

Run the deployable Express app:

```bash
npm run dev
```

Default endpoints:

- Health: `http://localhost:8000/health`
- Gateway MCP endpoint: `http://localhost:8000/mcp`
- Server 1 MCP endpoint: `http://localhost:8000/servers/1/mcp`
- Server 2 MCP endpoint: `http://localhost:8000/servers/2/mcp`
- AI MCP endpoint: `http://localhost:8000/servers/ai/mcp`

Use the gateway URL in MCP clients:

```text
http://localhost:8000/mcp
```

## Build And Start

```bash
npm run build
npm start
```

`npm start` runs:

```bash
node --max-old-space-size=384 dist/src/server.js
```

For deployment, set at least:

```env
PORT=8000
MCP_LISTEN_HOST=0.0.0.0
APP_BASE_URL=https://your-public-host
```

If the hosting platform sets `PORT`, the app uses it automatically.

## Standalone Development

You can still run each MCP service on its own port:

```bash
npm run all
```

Or run individual services:

```bash
npm run server1
npm run server2
npm run ai
npm run gateway
```

Standalone defaults:

- Server 1: `http://localhost:3000/mcp`
- Server 2: `http://localhost:3001/mcp`
- AI Server: `http://localhost:3002/mcp`
- Gateway: `http://localhost:8000/mcp`

## Gateway Tool Names

The gateway prefixes tool names with the backend id:

```text
<server-id>/<tool-name>
```

Examples:

- `1/add_number`
- `1/subtract_number`
- `2/multiply_number`
- `2/divide_number`
- `ai/list_ai_providers`
- `ai/list_ai_models`
- `ai/chat_with_model`
- `ai/openai_compatible_request`

## Environment Configuration

Core MCP settings:

```env
MCP_LISTEN_HOST=127.0.0.1
MCP_PUBLIC_HOST=localhost
MCP_PATH=/mcp
PORT=8000
APP_BASE_URL=http://localhost:8000
MCP1_PORT=3000
MCP2_PORT=3001
MCP_AI_PORT=3002
MCP_GATEWAY_PORT=8000
MCP_GATEWAY_SERVERS=1,2,ai
```

In the default one-port Express app, gateway registry URLs for `1`, `2`, and
`ai` point at the mounted routes under `/servers/*`. Set
`MCP_GATEWAY_USE_EXTERNAL_URLS=true` only when the gateway should call separate
service URLs from `MCP1_URL`, `MCP2_URL`, and `MCP_AI_URL`.

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
