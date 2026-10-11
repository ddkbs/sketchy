import type { Box, PlacedBox } from "./scene.js";

const BOX_WIDTH = 160;
const BOX_HEIGHT = 60;
const GAP = 60;

function placeBox(box: Box, i: number): PlacedBox {
  return {
    id: box.id,
    label: box.label,
    x: i * (BOX_WIDTH + GAP),
    y: 0,
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
  };
}

export function layoutBoxes(boxes: Box[]): PlacedBox[] {
  return boxes.map((box, i) => placeBox(box, i));
}
