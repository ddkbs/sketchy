import type { LaidOutScene } from "../../src/scene/laid-out.js";
import { mountScene } from "./scene-view.js";
import "./styles.css";

// Development page: renders scenes laid out by `npm run preview:data`.
const samples = (await (await fetch("/samples.json")).json()) as Record<string, LaidOutScene>;
const select = document.getElementById("sample") as HTMLSelectElement;
const root = document.getElementById("app")!;
for (const name of Object.keys(samples)) select.add(new Option(name, name));
const show = () =>
  mountScene(root, samples[select.value]!, {
    openLink: (url) => console.log("open", url),
    download: async (file) => console.log("download", file.name),
  });
select.onchange = show;
select.value = new URLSearchParams(location.search).get("sample") ?? select.value;
show();
