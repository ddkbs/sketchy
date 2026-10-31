import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import type { SceneBuilder } from "../scene/builder.js";
import type { SceneImage } from "../scene/types.js";
import { VIEWER_URI, failFrom, tool } from "../server.js";
import type { ViewStore } from "../views.js";
import { MODELS, type ModelTier } from "./models.js";
import { USER_AGENT } from "./search.js";
import type { PhotoService } from "./service.js";

/** Photo features plug into the server through this seam. */
export interface PhotoTools {
  register(server: McpServer, builder: SceneBuilder, views: ViewStore): void;
  sceneImage(imageId: string): Promise<SceneImage>;
}

export function createPhotoTools(service: PhotoService): PhotoTools {
  return {
    sceneImage: (id) => service.sceneImage(id),
    register(server, builder, views) {
      server.registerTool(
        "find_image",
        {
          title: "Find a photo",
          description:
            "Search freely licensed photos (Wikimedia Commons, Openverse; CC0, public domain, CC BY, CC BY-SA). Returns candidates with ids and thumbnails. Prefer clear, frontal photos of a single object.",
          inputSchema: {
            query: z.string().describe("What the photo should show, e.g. 'Arduino Uno board'"),
            min_width: z
              .number()
              .int()
              .positive()
              .optional()
              .describe("Minimum width in pixels (default 800)"),
          },
        },
        async ({ query, min_width }): Promise<CallToolResult> => {
          try {
            const candidates = await service.find(query, min_width);
            if (candidates.length === 0) {
              return {
                content: [
                  {
                    type: "text",
                    text: `No freely licensed photos found for "${query}". Try other words.`,
                  },
                ],
              };
            }
            const content: CallToolResult["content"] = [
              {
                type: "text",
                text: candidates
                  .map(
                    (c, i) =>
                      `${i + 1}. ${c.id}: "${c.title}" by ${c.author} (${c.license}, ${c.width}×${c.height}, ${c.provider})` +
                      (c.description ? `\n   ${c.description}` : ""),
                  )
                  .join("\n"),
              },
            ];
            const thumbs = await Promise.allSettled(
              candidates.slice(0, 4).map((c) => thumbnail(c.thumbUrl)),
            );
            thumbs.forEach((t, i) => {
              if (t.status === "fulfilled") {
                content.push({ type: "text", text: `Thumbnail ${i + 1}:` });
                content.push({ type: "image", data: t.value, mimeType: "image/jpeg" });
              }
            });
            return { content };
          } catch (error) {
            return failFrom(error);
          }
        },
      );

      server.registerTool(
        "locate",
        {
          title: "Locate parts in a photo",
          description:
            "Find named regions in a photo with the local vision model, e.g. ['USB port', 'reset button', 'A0']. Printed text is matched exactly; describe other parts visually ('silver USB connector'). Returns a preview with the boxes drawn so you can check them: rephrase queries that missed, skip wrong boxes, and if a box marks a different part than asked, you may still use its region name with corrected label text.",
          inputSchema: {
            image: z.string().describe("Image id from find_image"),
            queries: z.array(z.string()).min(1).max(12).describe("Names of the regions to find"),
          },
        },
        async ({ image, queries }): Promise<CallToolResult> => {
          try {
            const result = await service.locate(image, queries);
            builder.updateImageRegions(image, service.regions(image));
            const lines = result.found.map((f) => `- ${f.name}: found (${f.method})`);
            for (const name of result.missing) lines.push(`- ${name}: not found`);
            const content: CallToolResult["content"] = [
              {
                type: "text",
                text: `${lines.join("\n")}\nCheck the preview. Use the region names as label anchors, e.g. label(target: "${image}", anchor: "${result.found[0]?.name ?? queries[0]}", text: …).`,
              },
            ];
            if (result.found.length) {
              content.push({
                type: "image",
                data: await service.annotate(image, result.found),
                mimeType: "image/jpeg",
              });
            }
            return { content };
          } catch (error) {
            return failFrom(error);
          }
        },
      );

      tool(
        server,
        "add_image",
        "Add a photo from find_image to the scene. Its id is the image id; label its regions with label(target: imageId, anchor: regionName). The attribution is always shown.",
        {
          image: z.string().describe("Image id from find_image"),
          caption: z.string().optional(),
        },
        async ({ image, caption }) => {
          builder.addImage(await service.sceneImage(image, caption));
          const regions = Object.keys(service.regions(image));
          return (
            `Added image "${image}".` +
            (regions.length
              ? ` Known regions: ${regions.join(", ")}.`
              : " Run locate to find regions to label.")
          );
        },
      );

      registerAppTool(
        server,
        "choose_model",
        {
          title: "Choose photo-labeling model",
          description:
            "Show the user a picker to choose and download the local vision model used by locate (one-time setup, can be changed later).",
          inputSchema: {},
          _meta: { ui: { resourceUri: VIEWER_URI } },
        },
        async (): Promise<CallToolResult> => ({
          content: [
            {
              type: "text",
              text: "The model picker is shown to the user. Once they have downloaded a model, call locate again.",
            },
          ],
          ...views.attach(pickerData(service)),
        }),
      );

      registerAppTool(
        server,
        "download_model",
        {
          title: "Download model",
          description: "Start downloading a photo-labeling model. Used by the model picker.",
          inputSchema: { tier: z.enum(["small", "medium", "large"]) },
          _meta: { ui: { visibility: ["app"] } },
        },
        async ({ tier }): Promise<CallToolResult> => {
          const state = service.startDownload(tier as ModelTier);
          return {
            content: [{ type: "text", text: JSON.stringify(state) }],
            structuredContent: state,
          };
        },
      );

      registerAppTool(
        server,
        "model_status",
        {
          title: "Model status",
          description: "Report the state of the photo-labeling model. Used by the model picker.",
          inputSchema: {},
          _meta: { ui: { visibility: ["app"] } },
        },
        async (): Promise<CallToolResult> => {
          const state = service.modelState();
          return {
            content: [{ type: "text", text: JSON.stringify(state) }],
            structuredContent: state,
          };
        },
      );
    },
  };
}

function pickerData(service: PhotoService) {
  return {
    kind: "model-picker" as const,
    models: Object.values(MODELS).map(({ tier, title, downloadMb, ramGb, speed, quality }) => ({
      tier,
      title,
      downloadMb,
      ramGb,
      speed,
      quality,
    })),
    state: service.modelState(),
  };
}

async function thumbnail(url: string): Promise<string> {
  const sharp = (await import("sharp")).default;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(String(response.status));
  const buffer = Buffer.from(await response.arrayBuffer());
  return (
    await sharp(buffer)
      .resize({ width: 320, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer()
  ).toString("base64");
}
