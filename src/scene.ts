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

/**
 * A scene after layout: every element now carries concrete geometry.
 * Produced by the server, consumed by the viewer.
 */

export type Point = { x: number; y: number };

export type PlacedBox = Box & {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PlacedArrow = Arrow & {
  points: Point[];
};

export type LaidOutScene = {
  width: number;
  height: number;
  boxes: PlacedBox[];
  arrows: PlacedArrow[];
};
