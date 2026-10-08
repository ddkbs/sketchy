/**
 * A scene describes *what* to draw, never *where*.
 * Positions and sizes are computed later by the layout engine.
 */

export type Box = {
  id: string;
  label: string;
};

export type Arrow = {
  from: string;
  to: string;
  label?: string;
};

export type Scene = {
  boxes: Box[];
  arrows: Arrow[];
};
