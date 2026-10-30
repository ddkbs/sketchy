import type { App } from "@modelcontextprotocol/ext-apps";

export type ModelPickerData = { kind: "model-picker" };

export function mountModelPicker(root: HTMLElement, _data: ModelPickerData, _app: App): void {
  root.replaceChildren();
}
