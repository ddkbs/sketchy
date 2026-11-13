import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";
import { useEffect, useRef, useState } from "react";

type Mode = "inline" | "fullscreen";
type SceneFile = { input: string; scene: unknown };

const files = new Map<string, Promise<SceneFile>>();
/** Fetches a laid-out demo scene once; several turns may ask for it early. */
export const loadScene = (name: string) => {
  if (!files.has(name))
    files.set(
      name,
      fetch(`/scenes/${name}.json`).then((r) => r.json() as Promise<SceneFile>),
    );
  return files.get(name)!;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The real Sketchy viewer in an iframe, with this page as its host: it speaks the MCP Apps
 * protocol exactly like the chat app does (tool input, then the tool result with the scene),
 * so the drawing looks and behaves the same as it will there.
 *
 * `load` starts loading the viewer; each change of `scene` (while `run` is set) is one tool
 * call. `onCall` reports when a call starts and when its result is shown.
 */
export function SketchFrame({
  load,
  run,
  scene,
  onCall,
  className = "",
}: {
  load: boolean;
  run: boolean;
  scene: string;
  onCall?: (state: "calling" | "done") => void;
  className?: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const host = useRef<{ bridge: AppBridge; ready: Promise<void> } | null>(null);
  const [height, setHeight] = useState(0);
  const [mode, setMode] = useState<Mode>("inline");
  const report = useRef(onCall);
  report.current = onCall;

  useEffect(() => {
    if (load) void loadScene(scene);
  }, [load, scene]);

  // Connects the host side, then loads the viewer.
  useEffect(() => {
    const iframe = frame.current;
    if (!load || !iframe?.contentWindow) return;
    const bridge = new AppBridge(
      null,
      { name: "sketchy-website", version: "1.0.0" },
      { openLinks: {}, downloadFile: {} },
      { hostContext: context("inline") },
    );
    let initialized!: () => void;
    const ready = new Promise<void>((r) => (initialized = r));
    bridge.oninitialized = () => initialized();
    bridge.onsizechange = ({ height }) => {
      if (height) setHeight(height);
    };
    bridge.onopenlink = async ({ url }) => {
      window.open(url, "_blank", "noopener");
      return {};
    };
    bridge.ondownloadfile = async ({ contents }) => {
      for (const item of contents) if (item.type === "resource") save(item.resource);
      return {};
    };
    bridge.onrequestdisplaymode = async ({ mode }) => {
      const next: Mode = mode === "fullscreen" ? "fullscreen" : "inline";
      setMode(next);
      return { mode: next };
    };
    void bridge.connect(new PostMessageTransport(iframe.contentWindow, iframe.contentWindow));
    iframe.src = "/viewer/";
    host.current = { bridge, ready };
    return () => {
      host.current = null;
      void bridge.close();
    };
  }, [load]);

  // One tool call per scene: the input first, the laid-out result a moment later.
  useEffect(() => {
    if (!run) return;
    let alive = true;
    void (async () => {
      const h = host.current;
      if (!h) return;
      const [file] = await Promise.all([loadScene(scene), h.ready]);
      if (!alive) return;
      report.current?.("calling");
      await h.bridge.sendToolInput({ arguments: { scene: file.input } });
      await wait(650);
      if (!alive) return;
      await h.bridge.sendToolResult({
        content: [{ type: "text", text: "Drew the scene." }],
        _meta: { "sketchy/scene": file.scene },
      });
      report.current?.("done");
    })();
    return () => {
      alive = false;
    };
  }, [run, scene]);

  // The display mode changed: tell the viewer, like the chat app does.
  const shown = useRef<Mode>("inline");
  useEffect(() => {
    if (shown.current !== mode) host.current?.bridge.setHostContext(context(mode));
    shown.current = mode;
    if (mode !== "fullscreen") return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setMode("inline");
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mode]);

  const fullscreen = mode === "fullscreen";
  return (
    <div className={className} style={fullscreen ? { height: height || 420 } : undefined}>
      <div
        className={
          fullscreen ? "fixed inset-0 z-50 flex flex-col bg-paper p-3 pt-14 sm:p-8 sm:pt-16" : ""
        }
        onClick={(event) => event.target === event.currentTarget && setMode("inline")}
      >
        {fullscreen && (
          <button
            type="button"
            onClick={() => setMode("inline")}
            className="cursor-target absolute right-3 top-3 rounded-full border border-black/15 bg-white px-3 py-1 text-[13px] text-black/60 hover:text-black sm:right-8 sm:top-8"
          >
            Close · Esc
          </button>
        )}
        <iframe
          ref={frame}
          title="Sketchy drawing"
          sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
          className="block w-full rounded-[14px] border-0 bg-transparent transition-[height] duration-500 ease-out"
          style={fullscreen ? { flex: 1 } : { height: height || 360 }}
        />
      </div>
    </div>
  );
}

function context(mode: Mode) {
  return {
    theme: "dark" as const,
    displayMode: mode,
    availableDisplayModes: ["inline", "fullscreen"] as Mode[],
  };
}

/** Hands a file the viewer exports (SVG, PNG, Excalidraw) to the browser as a download. */
function save(resource: { uri: string; mimeType?: string; text?: string; blob?: string }): void {
  const name = resource.uri.split("/").pop() || "sketch";
  const type = resource.mimeType ?? "application/octet-stream";
  const body =
    resource.text !== undefined
      ? resource.text
      : Uint8Array.from(atob(resource.blob ?? ""), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
