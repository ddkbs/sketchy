import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";

// Development host: drives the real viewer entry point over the MCP Apps
// protocol, the way Claude does, with fixtures from `npm run preview`.
const samples = (await (await fetch("/samples.json")).json()) as Record<string, unknown>;
const select = document.getElementById("sample") as HTMLSelectElement;
const frame = document.getElementById("view") as HTMLIFrameElement;
const log = (line: string) => (document.getElementById("log")!.textContent += `${line}\n`);
for (const name of Object.keys(samples)) select.add(new Option(name, name));
select.value = new URLSearchParams(location.search).get("sample") ?? select.value;

const bridge = new AppBridge(
  null,
  { name: "sketchy-dev-host", version: "0.0.0" },
  { openLinks: {}, downloadFile: {} },
);
bridge.onsizechange = ({ height }) => {
  if (height) frame.style.height = `${height}px`;
};
bridge.onopenlink = async ({ url }) => {
  log(`openLink ${url}`);
  return {};
};
bridge.ondownloadfile = async ({ contents }) => {
  const item = contents[0] as { resource?: { uri: string; text?: string; blob?: string } };
  log(
    `downloadFile ${item.resource?.uri} (${(item.resource?.text ?? item.resource?.blob ?? "").length} chars)`,
  );
  if (item.resource?.blob) {
    const img = document.createElement("img");
    img.src = `data:image/png;base64,${item.resource.blob}`;
    img.style.width = "100%";
    document.body.appendChild(img);
  }
  return {};
};
const send = () =>
  bridge.sendToolResult({ content: [], _meta: { "sketchy/scene": samples[select.value] } });
bridge.oninitialized = () => {
  log("initialized");
  void send();
};
select.onchange = () => void send();
bridge.setHostContext({ theme: "light", displayMode: "inline", availableDisplayModes: ["inline"] });
// Listen before the view loads so its initialize request is not missed.
await bridge.connect(new PostMessageTransport(frame.contentWindow!, frame.contentWindow!));
frame.src = "./viewer.html";
