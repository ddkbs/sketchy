import { randomUUID } from "node:crypto";

/** Result `_meta` key carrying data for the viewer only, not the model. */
export const SCENE_META_KEY = "sketchy/scene";

const MAX_VIEWS = 20;

/**
 * Keeps recent viewer payloads so the viewer can fetch them with the app-only
 * `get_view` tool. Some hosts drop custom `_meta` from tool results before
 * handing them to the view; the small view id in `structuredContent` survives.
 */
export class ViewStore {
  private readonly views = new Map<string, unknown>();

  /** The parts of a tool result that deliver `payload` to the viewer. */
  attach(payload: unknown): {
    structuredContent: { view: string };
    _meta: Record<string, unknown>;
  } {
    const id = randomUUID();
    this.views.set(id, payload);
    for (const old of this.views.keys()) {
      if (this.views.size <= MAX_VIEWS) break;
      this.views.delete(old);
    }
    return { structuredContent: { view: id }, _meta: { [SCENE_META_KEY]: payload } };
  }

  get(id: string): unknown {
    return this.views.get(id);
  }
}
