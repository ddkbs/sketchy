import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ name: "sketchy", version: "0.0.0" });

const transport = new StdioServerTransport();
await server.connect(transport);

// stdout is reserved for MCP messages, so diagnostics go to stderr.
console.error("sketchy: MCP server running on stdio");
