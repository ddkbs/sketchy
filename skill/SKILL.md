---
name: sketchy
description: Draws hand-sketched, interactive diagrams (architecture, flows with step-by-step walkthroughs, comparisons, metaphors, Arduino circuits) right in the chat. Use whenever a concept, system, process or comparison is easier to understand as a drawing, or when the user asks for a sketch, diagram or visual explanation. In the regular Claude chat, use this skill even if Sketchy MCP tools are connected, because the chat does not display their drawings.
---

# Sketchy

In the regular Claude chat, always use this skill instead of the Sketchy MCP tools: the chat runs those tools but does not show their drawings.

You describe **what** to draw in a few short lines; Sketchy computes every position and renders it in a hand-drawn style with hover details and step navigation. Never pass coordinates.

## Workflow

Draw inline with your visualization tool (the one that renders HTML widgets in the conversation). Pass this HTML as the widget code, with the scene between the backticks:

```html
<h2 class="sr-only">One-sentence summary of the drawing</h2>
<div id="sketchy" style="min-height: 320px"></div>
<script src="{{CDN}}/sketchy.js" {{SRI}}></script>
<script>
  Sketchy.draw(
    "#sketchy",
    `
title How a web request works
dir right
group net The internet
browser Browser @globe ~ Shown on hover
server Server @server in net !accent
db Database (cylinder) in net
browser -> server HTTPS
server --> db query
step Request: The browser asks the server | browser server browser->server
`,
  );
</script>
```

Keep the widget code exactly like this: no other markup, styles or text. Then explain the drawing in 2–4 sentences in your reply instead of describing it again. If the widget shows "Sketchy could not draw this", fix the line the message names and draw again.

To change an earlier drawing, draw the whole scene again with the same ids.

Without a visualization tool, write the scene to a file and render a standalone page with the script in this skill's folder (Node.js, no network needed), then share the file:

```bash
node <skill-folder>/scripts/render.mjs /tmp/scene.txt /mnt/user-data/outputs/<short-name>.html
```

## Scene syntax

One element per line:

```
title <text>            subtitle <text>            dir right|down
group <id> <label> [in <parent group>]
<id> <label> [@icon] [(shape)] [in <group>] [!accent|!muted] [~ hover text]
<a> -> <b> [label] [!accent|!muted]      (--> dashed, <-> arrowheads on both ends)
label <id>[.<pin>] <text>
step <title>: <text> | <ids to highlight; edges as a->b>
part <id> <type> [key=value] [caption]
wire <part.pin> -> <part.pin> [red|black|blue|green|yellow|orange|purple|gray|white]
draw <id> [WxH] [in <group>] [: title]    (free drawing, its shape lines follow)
```

A free drawing has its own canvas (default `100x100`, y pointing down) and sits in the scene like a node, so arrows can connect to it. Later lines paint on top:

```
circle [name] x,y r             ellipse [name] x,y rx ry        rect [name] x,y w h (x,y = top left)
line|arrow|curve [name] x,y x,y …                               curve is smooth
shape|blob [name] x,y x,y x,y …                                 closed; blob is smooth
arc [name] x,y r from to        degrees, 0 = right, counter-clockwise
text [name] x,y words [size=14]
object <type> [name] x,y [size] [rotate=45] [flip]              a ready-made thing
icon [name] x,y <lucide name> [size]
repeat i=0..7: <shape line>                                     i in coordinates, {i+1} in names and labels
slider a 0..1 [= 0] [hidden]                                    before the shapes using it
let w = 84-12*a                                                 names a sub-expression for the lines below
angle [name] x,y cx,cy x,y [r]                                  arc at the middle point; 90° gets the square
measure [name] x,y x,y [offset]                                 dimension line with arrows
brace [name] x,y x,y [depth]                                    curly brace, bulging to the right of the way
axes [name] x,y w h [ticks=10] [~ x name | y name]              x,y is the origin
grid [name] x,y w h [step]                                      x,y is the top left
```

Object types: person, tree, cloud, house, car, bike, gear, sun, bulb, battery, laptop, phone, server, book, heart, drop, flame, mountain, flask, rocket, lock, key.

- Options: `fill=<color>`, `hatch=<color>`, `color=<color>`, `width=2`, `--dashed`, `arrow`, `both`, `!accent`, `!muted`, `stage=2`, `along=<shape name>@<0..1>`, `move=<dx>,<dy>`, `~ label`.
- Colors: black, gray, white, accent, yellow, blue, red, green, purple, orange.
- Prefer `~ label` over `text`: Sketchy places labels clear of the drawing. Coordinates may be math, such as `50+30*cos(1),50`.
- In steps, `| pic[name]` circles a named shape and `pic=2` shows only shapes up to stage 2, so a picture can build up. Start with `pic=1`. `a=0.5` glides a slider there, which is how things move. Draw a moving shape at its start and shift it with `move=40*a,0`; a shape with `along=wire@a` rides on the shape named `wire`. Every step should end in a clear picture: move things all the way, one idea per step, never stop a motion halfway.

Ready-made explanation shapes take only their contents, one entry per line, ended by a blank line. End an entry with `!accent`, `!muted` or `~ small print`:

```
timeline t: History          <when> | <what>
cycle c: Water cycle         <entry>
pyramid p: Needs             <entry>, top first
funnel f: Sales              <entry>, top first
mindmap m: Topic             <centre>, then - <branch>, -- <sub-branch>
venn v: Pets                 set a Cats, set b Dogs, then a | purrs, a,b | pets (2 or 3 sets)
matrix x: Plans              cols Option | Price, then Cheap | 1 €
```

In steps, `| t[2]` circles the 2nd entry and `t=2` shows only the first two.

Molecules and maps:

```
molecule m CC(=O)O [full] : Acetic acid      SMILES; full writes out every C and H; steps circle atoms as m[3]
map m europe : Title                         world, europe, africa, asia, middle-east, north-america,
Germany !accent ~ Start                      south-america, americas, oceania, a country, or w,s,e,n
France fill=blue                             countries by English name: fill=, hatch=, !accent, ~ label
place berlin 52.52,13.40 Berlin              a dot with a label, at latitude,longitude
route r: berlin -> 48.86,2.35 --dashed ~ 8 h
```

In steps, `| m[Germany]` (spaces as dashes: `m[United-Kingdom]`) circles a country, `m[berlin]` a place or route.

- Labels are 1–4 words; put details after `~`.
- Icons: `@globe`, `@server`, `@database` (Lucide) or `@simple-icons:react`.
- Shapes: `(cylinder)` storage, `(person)` actor, `(note)`, `(circle)`, `(rounded)`, `(text)`.
- Ids are letters, digits, `_` or `-`, unique across the scene; arrows, labels and steps may only use ids defined in it.

## Explanation patterns

Pick one per drawing:

- **structure** ("what is it made of?"): components as nodes, groups for areas, labels for the important bits; `dir down` for hierarchies.
- **flow** ("how does it work?"): a left-to-right chain of nodes and arrows plus one step per stage.
- **comparison** ("X vs Y"): one group per option with parallel nodes in the same order; `!muted` for what is equal, `!accent` for the key difference.
- **metaphor** ("explain it simply"): one group for the real thing, one for an everyday counterpart, dashed arrows between matching elements.
- **picture** ("what does it look like?"): a `draw` block of the thing itself when boxes and arrows would hide the idea, such as atoms, forces, cells, orbits, geometry or machines.

Quality rules: 3–12 nodes; `!accent` on at most one or two elements; icons sparingly; 3–7 steps of one or two sentences each.

## Circuits

Find part types and pin names first (needs code execution):

```bash
node <skill-folder>/scripts/render.mjs --parts "distance sensor"
node <skill-folder>/scripts/render.mjs --parts arduino-uno
```

Then add `part uno arduino-uno`, `part r1 resistor value=220` and `wire uno.13 -> r1.1 green`. Red wires for power, black for GND, other colors for signals; a resistor in series with every LED.
