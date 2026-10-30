import { randomUUID } from "node:crypto";
import { createServer as createHttpServer, type IncomingMessage } from "node:http";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const SESSION_IDLE_MS = 60 * 60 * 1000;

type Session = { transport: StreamableHTTPServerTransport; server: McpServer; lastSeen: number };

/**
 * Serves Sketchy over Streamable HTTP for remote clients (Claude on the web
 * and mobile). Each MCP session gets its own server, so scenes never mix.
 */
export function serveHttp(port: number, newServer: () => McpServer): void {
  const sessions = new Map<string, Session>();

  const http = createHttpServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/health") {
        res.writeHead(200, { "content-type": "text/plain" }).end("ok");
        return;
      }
      if (url.pathname !== "/mcp") {
        res.writeHead(404).end();
        return;
      }
      const sessionId = header(req, "mcp-session-id");
      const body = req.method === "POST" ? await readJson(req) : undefined;
      let session = sessionId ? sessions.get(sessionId) : undefined;

      if (!session && req.method === "POST" && isInitializeRequest(body)) {
        const server = newServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            sessions.set(id, { transport, server, lastSeen: Date.now() });
          },
        });
        transport.onclose = () => {
          if (transport.sessionId) sessions.delete(transport.sessionId);
        };
        await server.connect(transport);
        await transport.handleRequest(req, res, body);
        return;
      }
      if (!session) {
        res.writeHead(400, { "content-type": "application/json" }).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Unknown or missing MCP session." },
            id: null,
          }),
        );
        return;
      }
      session.lastSeen = Date.now();
      await session.transport.handleRequest(req, res, body);
    } catch (error) {
      console.error("sketchy:", error);
      if (!res.headersSent) res.writeHead(500).end();
    }
  });

  // Clients that vanish without closing their session would leak servers.
  setInterval(() => {
    const cutoff = Date.now() - SESSION_IDLE_MS;
    for (const [id, session] of sessions) {
      if (session.lastSeen < cutoff) {
        void session.transport.close();
        sessions.delete(id);
      }
    }
  }, 60_000).unref();

  http.listen(port, () => console.error(`sketchy: MCP server on http://localhost:${port}/mcp`));
}

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body too large.");
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : undefined;
}
