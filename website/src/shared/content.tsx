import type { ReactNode } from "react";

const icon = (d: string) => (
  <svg
    viewBox="0 0 24 24"
    className="size-[18px]"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d={d} />
  </svg>
);

/** The four things Sketchy draws, shown as a compact row on the landing pages. */
export const CAPABILITIES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "Systems",
    body: "Flows with step-by-step walkthroughs.",
    icon: icon("M4 6h5v5H4zM15 13h5v5h-5zM9 8.5h3a2 2 0 0 1 2 2v2.5a2 2 0 0 0 2 2"),
  },
  {
    title: "Your code",
    body: "Modules and data flow. Click to open files.",
    icon: icon("M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"),
  },
  {
    title: "Circuits",
    body: "50 real parts, wired pin by pin.",
    icon: icon("M7 4v4M12 4v4M17 4v4M7 16v4M12 16v4M17 16v4M5 8h14v8H5z"),
  },
  {
    title: "Photos",
    body: "Labeled on your machine with Florence-2.",
    icon: icon("M4 7h3l2-2h6l2 2h3v12H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"),
  },
];

export const TAGLINE =
  "An open-source MCP server that turns Claude's answers into interactive diagrams, right inside the chat. Claude decides what to draw. Sketchy decides where.";
