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

/** Scenes in the compact syntax, figures and formulas included. */
export const COMPACT_SAMPLES: Record<string, string> = {
  draw_atom: `title What a helium atom looks like
draw atom 100x100: Helium
circle 50,50 40 --dashed
circle orbit 50,50 24 --dashed stage=2
circle core 50,50 9 fill=accent ~ Nucleus
circle e1 90,50 3 fill=blue stage=2 ~ Electron
circle e2 10,50 3 fill=blue stage=3 ~ Second electron
arc spin 50,50 40 20 70 arrow stage=3 ~ moves around
step The core: Nearly all the mass sits in the tiny nucleus. | atom[core] atom=1
step First electron: It is held at a distance by the charge of the nucleus. | atom[e1] atom=2
step Second electron: Helium has two, and they fill the first shell. | atom[e2] atom=3`,
  draw_forces: `title Why a box slides down a ramp
draw ramp 160x100: Forces on a ramp
shape 10,90 150,90 150,20 hatch=gray
rect box 78,35 24,20 fill=yellow ~ Box
arrow g 90,45 90,86 color=red width=2.5 ~ Gravity
arrow n 90,45 72,8 color=blue width=2.5 ~ Normal force
arrow s 90,45 128,27 color=green width=2.5 ~ Pull down the slope
arc 10,90 30 0 26 ~ angle
text 40,12 Steeper ramp, more pull size=18 !accent`,
  draw_mixed: `title The heart in the circulation
dir right
draw heart 100x90: The heart
blob 50,85 14,48 18,18 38,12 50,26 62,12 82,18 86,48 hatch=red
curve 30,8 34,30 42,48 color=blue width=2 arrow ~ from the body
curve 60,48 68,28 72,2 color=red width=2 arrow ~ to the lungs
lungs Lungs @wind
body Body @person-standing
body -> heart oxygen-poor
heart -> lungs pump
lungs --> heart oxygen-rich`,
  draw_objects: `title A trip to the data centre
draw trip 160x90
curve road 10,70 50,55 100,75 150,55 --dashed
object person 14,50 28 ~ You
object car 100,20 26 ~ Car
object house 145,28 34 ~ Office
object tree 60,22 30
object cloud 30,14 22
object sun 130,10 14
icon 80,80 wifi 10
repeat i=0..3: circle 40+{i}*12,84 1.5 fill=blue`,
  draw_motion: `title A packet travels through the network
draw net 160x80
slider p 0..1 = 0 hidden
slider h 0..80 = 30
curve wire 15,55 50,25 110,60 145,25
object laptop 15,62 22 ~ Client
object server 145,18 26 ~ Server
circle pkt 0,0 4 fill=accent along=wire@p ~ Packet
rect 60,70 40 3 fill=gray
circle ball 80,h*0.8 3 fill=red
step Leaves: The packet starts at the client. | net[pkt] p=0
step On the way: Routers forward it hop by hop. | net[pkt] p=0.5
step Arrives: The server receives the packet. | net[pkt] p=1`,
  t_timeline: `title The web in five moments
timeline t: Key dates
1989 | Web proposed ~ At CERN
1993 | Mosaic browser
1995 | JavaScript !accent ~ Written in ten days
2004 | Social web
2007 | iPhone ~ The web in your pocket

step Origins: It began at CERN. | t[1] t=1
step Scripting: Pages became programs. | t[3] t=3`,
  t_cycle: `title The water cycle
cycle c
Evaporation ~ Sun heats the sea
Condensation ~ Clouds form
Precipitation !accent ~ Rain and snow
Collection ~ Rivers run to the sea`,
  t_pyramid: `title Testing pyramid
pyramid p
End to end ~ Few, slow, expensive
Integration ~ Parts working together
Unit !accent ~ Many, fast, cheap`,
  t_funnel: `title Why signups drop
funnel f
Visitors ~ 10,000 a month
Signups ~ 800
Active users !accent ~ 300
Paying ~ 40`,
  t_venn: `title Cats and dogs
venn v
set a Cats
set b Dogs
a | Purr
a | Climb trees
b | Bark
b | Fetch
a,b | Pets
a,b | Four legs`,
  t_venn3: `title What makes a good startup
venn v
set a Desirable
set b Feasible
set c Viable
a | Users want it
b | We can build it
c | It makes money
a,b,c | Sweet spot !accent
a,b | Loved, but no money
b,c | Nobody asked`,
  t_matrix: `title Choosing a database
matrix m
cols Option | Speed | Scaling | Best for
Postgres | Fast | Vertical | Most apps !accent
Redis | Fastest | Cluster | Caches
Cassandra | Fast writes | Linear | Huge logs`,
  t_mindmap: `title Learning to code
mindmap m
Coding
- Basics
-- Variables
-- Loops
- Web !accent
-- HTML
-- CSS
-- JavaScript ~ Runs everywhere
- Tools
-- Git
-- Editor
- Projects`,
  plot: `title How a and k shape a sine wave
plot p: $y = a \\sin(kx)$
  x -2pi..2pi
  y -3..3
  slider a 0.5..3 = 1
  slider k 0.5..3 = 1
  fn a*sin(k x) !accent ~ $a\\sin(kx)$
  fn cos(x) --dashed ~ $\\cos x$
  point pi/(2k), a peak
  area a*sin(k x) 0..pi/k ~ area
step Amplitude: a stretches the wave up and down | p a=2.5
step Frequency: k squeezes it sideways | p k=2`,
  calculus: `title The derivative is the slope
plot f: Tangent at $x_0$
  x -1..4
  slider c -0.5..3.5 = 1
  fn x^2/2 - x + 1 ~ $f(x)$
  fn (c-1)(x-c) + c^2/2 - c + 1 !accent ~ tangent
  point c, c^2/2 - c + 1 $x_0$
formula Slope $f'(x_0) = \\lim_{h \\to 0} \\frac{f(x_0+h) - f(x_0)}{h}$ (note)
f -> formula
step Move the point: the tangent follows | f c=3`,
  charts: `title Quarterly results
dir down
chart rev bar: Revenue (k€)
  series 2025, 2026
  Q1 12 15
  Q2 18 24 !accent
  Q3 9 14
  Q4 21 26
chart share pie: Market share
  Us 38 !accent
  Rival A 27
  Rival B 21
  Others 14
chart trend line: Active users
  Jan 120
  Feb 180
  Mar 260
  Apr 410 !accent
  May 520`,
  sequence: `title Logging in with OAuth
seq s
  actor u You (person)
  actor app App
  actor auth Auth server
  u -> app click "Sign in"
  app -> auth redirect with client id
  auth -> u ask for consent
  u -> auth approve
  auth --> app code
  app -> auth code + secret !accent
  auth --> app access token
  note app keeps the token server-side
step Consent: you approve on the auth server, never in the app | s[3] s[4]
step Exchange: only the server sees the secret | s[6] s[7]`,
  sorting: `title Bubble sort, one pass
array a = 5, 2, 8, 1, 9
  ptr i 0
step Compare: 5 > 2, so swap | a[0] a[1]
step Swapped | a[0] a[1] a=2,5,8,1,9 i=1
step Compare: 5 < 8, keep | a[1] a[2] i=1
step Compare: 8 > 1, swap | a[2] a[3] a=2,5,1,8,9 i=2
step Done: 9 is in place | a[4] i=4`,
  structures: `title Data structures
tree t: Binary search tree = 8(3(1,6(4,7)),10(,14(13,)))
stack st: Call stack = main, parse, lex
list l: Linked list = 3, 7, 9
queue q: Queue = A, B, C
step Find 7: go left, then right | t[8] t[3] t[6] t[7]`,
};
