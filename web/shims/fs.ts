// The browser build passes the part catalog in directly; nothing reads files.
export function readFileSync(): never {
  throw new Error("No file system in the browser.");
}
