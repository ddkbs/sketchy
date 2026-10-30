import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SceneBuilder } from "../scene/builder.js";
import type { SceneImage } from "../scene/types.js";

/** Photo features plug into the server through this seam. */
export interface PhotoTools {
  register(server: McpServer, builder: SceneBuilder): void;
  sceneImage(imageId: string): Promise<SceneImage>;
}
