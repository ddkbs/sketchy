import type { SceneBuilder } from "../src/scene/builder.js";

/** Representative scenes used by tests and the viewer preview. */
export const SAMPLES: Record<string, (b: SceneBuilder) => void> = {
  architecture(b) {
    b.reset({
      title: "How a request flows through Sketchy",
      subtitle: "From tool call to drawing",
    });
    b.addNode({
      id: "claude",
      label: "Claude",
      shape: "person",
      description: "Decides what to draw.",
    });
    b.addGroup({ id: "server", label: "MCP server" });
    b.addNode({
      id: "tools",
      label: "Tools",
      group: "server",
      icon: "lucide:wrench",
      file: "/repo/src/server.ts",
      description: "Validate input and fill the scene.",
    });
    b.addNode({
      id: "scene",
      label: "Scene",
      group: "server",
      icon: "lucide:braces",
      file: "/repo/src/scene/builder.ts",
    });
    b.addNode({
      id: "layout",
      label: "Layout engine",
      group: "server",
      icon: "lucide:layout-grid",
      tone: "accent",
      file: "/repo/src/layout/index.ts",
    });
    b.addNode({
      id: "parts",
      label: "Part index",
      group: "server",
      shape: "cylinder",
      icon: "lucide:database",
    });
    b.addNode({
      id: "viewer",
      label: "Viewer",
      icon: "lucide:monitor",
      description: "Renders the scene with rough.js.",
    });
    b.addEdge({ from: "claude", to: "tools", label: "tool call" });
    b.addEdge({ from: "tools", to: "scene" });
    b.addEdge({ from: "scene", to: "layout" });
    b.addEdge({ from: "parts", to: "layout", style: "dashed", label: "pins" });
    b.addEdge({ from: "layout", to: "viewer", label: "geometry" });
    b.addStep({
      title: "Claude calls a tool",
      text: "Claude describes what to draw, never where.",
      highlight: ["claude", "tools", "claude->tools"],
    });
    b.addStep({
      title: "The scene grows",
      text: "Every call is validated and added to the scene.",
      highlight: ["tools", "scene", "tools->scene"],
    });
    b.addStep({
      title: "Layout",
      text: "ELK computes positions and routes the arrows.",
      highlight: ["layout", "scene->layout", "parts->layout"],
    });
    b.addStep({
      title: "Render",
      text: "The viewer draws everything in the sketch style.",
      highlight: ["viewer", "layout->viewer"],
    });
  },
  circuit(b) {
    b.reset({ title: "Blink with an external LED" });
    b.addPart({ id: "uno", type: "arduino-uno" });
    b.addPart({ id: "r1", type: "resistor", label: "R1 220Ω", props: { value: "220" } });
    b.addPart({ id: "led1", type: "led", label: "LED red", props: { color: "red" } });
    b.connect({ from: "uno.D13", to: "r1.1", color: "green" });
    b.connect({ from: "r1.2", to: "led1.A", color: "green" });
    b.connect({ from: "led1.C", to: "uno.GND", color: "black" });
    b.addLabel({ target: "uno", anchor: "D13", text: "pin 13 drives the LED" });
    b.addLabel({ target: "uno", anchor: "GND.1", text: "common ground" });
    b.addLabel({ target: "led1", anchor: "A", text: "anode (long leg)" });
  },
  comparison(b) {
    b.reset({ title: "SQL vs. NoSQL", direction: "down" });
    b.addGroup({ id: "sql", label: "SQL" });
    b.addGroup({ id: "nosql", label: "NoSQL" });
    b.addNode({ id: "sql-schema", label: "Fixed schema", group: "sql", tone: "accent" });
    b.addNode({ id: "sql-query", label: "Joins across tables", group: "sql" });
    b.addNode({ id: "sql-scale", label: "Scales up", group: "sql", tone: "muted" });
    b.addNode({ id: "nosql-schema", label: "Flexible documents", group: "nosql", tone: "accent" });
    b.addNode({ id: "nosql-query", label: "Data stored together", group: "nosql" });
    b.addNode({ id: "nosql-scale", label: "Scales out", group: "nosql", tone: "muted" });
    b.addEdge({ from: "sql-schema", to: "sql-query" });
    b.addEdge({ from: "sql-query", to: "sql-scale" });
    b.addEdge({ from: "nosql-schema", to: "nosql-query" });
    b.addEdge({ from: "nosql-query", to: "nosql-scale" });
  },
};
