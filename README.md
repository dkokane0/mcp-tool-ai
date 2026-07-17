# MCP Tool AI

This repository contains a small Model Context Protocol (MCP) gateway tutorial.
It runs two separate Streamable HTTP MCP servers and exposes their tools through
one gateway endpoint.

## Project Structure

- `mcp1.ts` - MCP Server 1 on port `3000`
  - `add_number`
  - `subtract_number`
- `mcp2.ts` - MCP Server 2 on port `3001`
  - `multiply_number`
  - `divide_number`
- `mcp-gateway.ts` - Gateway server on port `8000`
  - Lists tools from both backend servers.
  - Prefixes tool names with the backend id, such as `1/add_number`.
  - Routes tool calls back to the correct MCP server.

## Requirements

- Node.js 20 or newer
- npm

## Install

```bash
npm install
```

## Run

Open three terminals from the project folder.

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
npm run gateway
```

Endpoints:

- Server 1: `http://localhost:3000/mcp`
- Server 2: `http://localhost:3001/mcp`
- Gateway: `http://localhost:8000/mcp`

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
