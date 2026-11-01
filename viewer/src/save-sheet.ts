/**
 * Fallback for hosts that cannot download files: sandboxed iframes block
 * `<a download>`, so the export is shown as an image the user can save with
 * the context menu, drag out, or copy to the clipboard.
 */
export function showSaveSheet(
  container: HTMLElement,
  file: { name: string; mimeType: string; text?: string; base64?: string },
): void {
  container.querySelector(".save-sheet")?.remove();
  const href =
    file.text !== undefined
      ? `data:${file.mimeType};charset=utf-8,${encodeURIComponent(file.text)}`
      : `data:${file.mimeType};base64,${file.base64}`;

  const sheet = document.createElement("div");
  sheet.className = "save-sheet";
  const head = document.createElement("div");
  head.className = "save-head";
  const hint = document.createElement("span");
  hint.textContent = "Right-click the image to save it, or drag it out.";
  const copy = document.createElement("button");
  copy.textContent = "Copy";
  copy.onclick = () =>
    void copyToClipboard(file).then(
      () => (copy.textContent = "Copied"),
      () => (copy.textContent = "Copy failed"),
    );
  const close = document.createElement("button");
  close.textContent = "✕";
  close.setAttribute("aria-label", "Close");
  close.onclick = () => sheet.remove();
  head.append(hint, copy, close);

  const img = document.createElement("img");
  img.src = href;
  img.alt = file.name;
  img.title = file.name;
  sheet.append(head, img);
  container.appendChild(sheet);
}

async function copyToClipboard(file: { mimeType: string; text?: string; base64?: string }) {
  if (file.text !== undefined) return navigator.clipboard.writeText(file.text);
  const bytes = Uint8Array.from(atob(file.base64!), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: file.mimeType });
  return navigator.clipboard.write([new ClipboardItem({ [file.mimeType]: blob })]);
}
