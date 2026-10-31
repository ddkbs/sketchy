import { useEffect, useState, type ReactNode } from "react";
import { RELEASES_URL, REPO_URL } from "./lib";

const SECTIONS = [
  ["introduction", "Introduction"],
  ["install", "Installation"],
  ["how-it-works", "How it works"],
  ["patterns", "Explanation patterns"],
  ["interaction", "Steps, hover and export"],
  ["code", "Your code"],
  ["circuits", "Circuits"],
  ["photos", "Labeled photos"],
  ["tools", "Tools"],
  ["configuration", "Configuration"],
  ["limitations", "Limitations"],
] as const;

/** The documentation page: a sticky table of contents and the long-form explanation. */
export function Docs({ header }: { header?: ReactNode }) {
  const [active, setActive] = useState<string>(SECTIONS[0][0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -70% 0px" },
    );
    for (const [id] of SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto grid max-w-[1180px] gap-10 px-5 pb-32 pt-28 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <nav className="sticky top-28 flex flex-col gap-0.5 text-[14px]">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            Documentation
          </div>
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className={`cursor-target relative rounded-md py-1.5 pl-3 transition-colors ${
                active === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`absolute left-0 top-1/2 h-4 w-px -translate-y-1/2 transition-colors ${
                  active === id ? "bg-accent" : "bg-border-strong"
                }`}
              />
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <article className="prose-docs min-w-0 max-w-[740px]">
        {header}
        <h1 id="introduction" className="scroll-mt-28 text-[40px] font-semibold tracking-[-0.04em]">
          Sketchy documentation
        </h1>
        <p>
          Sketchy is an open-source <a href="https://modelcontextprotocol.io">MCP</a> server that
          lets Claude draw while it explains. Answers come with interactive diagrams rendered right
          next to the text: systems and flows, your own code, Arduino and ESP32 circuits, labeled
          photos, comparisons and metaphors.
        </p>
        <p>
          The idea behind it is a split of responsibilities. Claude decides <strong>what</strong> to
          draw and label. Sketchy decides <strong>where</strong>: a part library with named anchor
          points and a real layout engine. Claude never computes a coordinate, so drawings come out
          precise and consistent every time.
        </p>
        <img src="/gallery/chat.png" alt="A Sketchy drawing inside a Claude Code session" />

        <h2 id="install">Installation</h2>
        <h3>Claude desktop app</h3>
        <ol>
          <li>
            Download the <code>.mcpb</code> bundle for your platform from the{" "}
            <a href={RELEASES_URL}>latest release</a> (macOS on Apple Silicon, Windows or Linux).
          </li>
          <li>
            Double-click it, or drag it into <strong>Settings → Extensions</strong>, and confirm.
          </li>
          <li>Optional: in the extension settings, choose your editor and the data folder.</li>
          <li>
            Open the <strong>Code</strong> tab and start a session. Drawings appear inline next to
            Claude's answer.
          </li>
        </ol>
        <p>
          In the regular <strong>Chat</strong> tab the tools run, but the drawing is not shown yet:
          the chat does not display views from locally installed extensions. Chat support is
          planned.
        </p>
        <h3>Photo-labeling model</h3>
        <p>
          The vision model is not part of the download. The first time Claude labels a photo,
          Sketchy asks you to pick a size:
        </p>
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Download</th>
              <th>Memory</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Small</td>
              <td>~280 MB</td>
              <td>~1 GB</td>
              <td>Recommended. Printed text, distinct parts</td>
            </tr>
            <tr>
              <td>Medium</td>
              <td>~830 MB</td>
              <td>~2.5 GB</td>
              <td>Better grounding of small parts</td>
            </tr>
            <tr>
              <td>Large</td>
              <td>~3.1 GB</td>
              <td>~4.5 GB</td>
              <td>Most precise</td>
            </tr>
          </tbody>
        </table>
        <h3>Other MCP clients</h3>
        <p>
          Sketchy is a standard MCP server and works in any client that supports{" "}
          <a href="https://github.com/modelcontextprotocol/ext-apps">MCP Apps</a>:
        </p>
        <pre>
          <code>{`{
  "mcpServers": {
    "sketchy": {
      "command": "node",
      "args": ["/path/to/sketchy/dist/index.js"],
      "env": { "SKETCHY_EDITOR": "cursor" }
    }
  }
}`}</code>
        </pre>

        <h2 id="how-it-works">How it works</h2>
        <pre>
          <code>{`Claude calls tools (sketch, add_node, place_part, connect, label, add_step, …)
          ↓
Scene: nodes, groups, parts, wires, labels, photos, steps — no coordinates
          ↓
Layout engine (elkjs): positions, orthogonal routing, collision-free callouts
          ↓
Viewer (MCP App): hand-drawn rendering with rough.js, hover, steps, export`}</code>
        </pre>
        <p>
          Every feature fills the same scene, and a single viewer renders it. The visual style lives
          in the renderer only, so every drawing looks consistent no matter what Claude asks for.
          Layout runs locally inside the server process; the drawing core has no other local
          dependencies and can run as a hosted server.
        </p>
        <p>
          The viewer is an <strong>MCP App</strong>: the host loads it into a sandboxed iframe and
          hands it the laid-out scene. It has no network access, which is why fonts and icons are
          embedded.
        </p>

        <h2 id="patterns">Explanation patterns</h2>
        <p>Claude picks one pattern per drawing. They are also available as prompts.</p>
        <ul>
          <li>
            <strong>Structure</strong> — “what is it made of?” Components as nodes or parts, groups
            for areas, labels for the important bits.
          </li>
          <li>
            <strong>Flow</strong> — “what happens when …?” A chain of nodes and arrows with one step
            per stage.
          </li>
          <li>
            <strong>Comparison</strong> — “X vs Y.” One group per option with parallel nodes; the
            key difference in accent.
          </li>
          <li>
            <strong>Metaphor</strong> — “explain it simply.” The unfamiliar thing mapped onto an
            everyday one with dashed links.
          </li>
        </ul>
        <p>
          Prompts: <code>explain-structure</code>, <code>explain-flow</code>, <code>compare</code>,{" "}
          <code>metaphor</code>, <code>explain-repo</code>, <code>explain-circuit</code>.
        </p>

        <h2 id="interaction">Steps, hover and export</h2>
        <ul>
          <li>
            <strong>Walkthroughs.</strong> Claude adds 3–7 steps. Each step circles what matters in
            red pen and fades the rest. Use the buttons or the arrow keys.
          </li>
          <li>
            <strong>Hover</strong> any element for its description.
          </li>
          <li>
            <strong>Export</strong> as SVG or PNG, with the handwriting embedded.
          </li>
          <li>
            <strong>Fullscreen</strong> for large scenes; wide drawings scroll instead of shrinking
            text.
          </li>
        </ul>
        <img src="/gallery/request-step.png" alt="A walkthrough step with circled elements" />

        <h2 id="code">Your code</h2>
        <p>
          Ask <em>“Explain my repo”</em>. Claude reads the code and draws modules as nodes, folders
          as groups and imports or data flow as edges. <strong>Click a box to open the file</strong>{" "}
          in VS Code, Cursor, Windsurf or Zed, at the right line.
        </p>
        <img src="/gallery/repo.png" alt="Architecture of a repository" />

        <h2 id="circuits">Circuits</h2>
        <p>
          Ask <em>“How is my sketch wired?”</em> and attach your <code>.ino</code>. Claude reads{" "}
          <code>pinMode</code>, <code>digitalWrite</code> and the libraries, places real parts and
          connects pins by name (<code>uno.D13 → led1.A</code>). Sketchy routes the wires and places
          the callouts. The part library has 50 boards, sensors, displays and modules from{" "}
          <a href="https://github.com/wokwi/wokwi-elements">wokwi-elements</a>, including Arduino
          Uno, Mega and Nano and the ESP32 DevKit.
        </p>
        <img src="/gallery/esp32.png" alt="ESP32 wiring" />

        <h2 id="photos">Labeled photos</h2>
        <p>
          Claude searches openly licensed photos, picks one and asks Sketchy to locate parts in it.
          Grounding runs on your machine with Florence-2 through ONNX Runtime; your images never
          leave it. The attribution is always shown.
        </p>
        <img src="/gallery/photo.jpg" alt="A labeled Arduino board" />

        <h2 id="tools">Tools</h2>
        <table>
          <thead>
            <tr>
              <th>Tool</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["sketch", "Draw a whole scene in one call"],
              ["new_scene, render", "Build a scene incrementally, then show it"],
              ["add_box, add_node, add_text, add_group", "Boxes, code nodes, notes and groups"],
              ["add_arrow, add_edge", "Arrows between elements"],
              ["place_part, connect, search_parts", "Electronic parts and wires"],
              ["label", "Callouts on pins, photo regions or nodes"],
              ["add_step", "Walkthrough steps"],
              ["search_icons", "Lucide icons and technology logos"],
              [
                "find_image, locate, add_image, choose_model",
                "Photos, local grounding, model setup",
              ],
            ].map(([tool, purpose]) => (
              <tr key={tool}>
                <td>
                  <code>{tool}</code>
                </td>
                <td>{purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 id="configuration">Configuration</h2>
        <table>
          <thead>
            <tr>
              <th>Variable</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>SKETCHY_EDITOR</code>
              </td>
              <td>
                <code>vscode</code>
              </td>
              <td>Editor for file links: vscode, cursor, windsurf, vscode-insiders, zed</td>
            </tr>
            <tr>
              <td>
                <code>SKETCHY_PHOTOS</code>
              </td>
              <td>
                <code>on</code>
              </td>
              <td>
                <code>off</code> disables photo search and labeling
              </td>
            </tr>
            <tr>
              <td>
                <code>SKETCHY_DATA_DIR</code>
              </td>
              <td>
                <code>~/.sketchy</code>
              </td>
              <td>Models, cached photos and the local SQLite database</td>
            </tr>
          </tbody>
        </table>

        <h2 id="limitations">Limitations</h2>
        <ul>
          <li>
            Drawings currently appear in Claude Code sessions; regular chat support is planned.
          </li>
          <li>Photo labeling is not available on Intel Macs.</li>
          <li>In very dense circuits, a callout can still land on a wire.</li>
        </ul>
        <p>
          Found something else? <a href={`${REPO_URL}/issues`}>Open an issue</a>.
        </p>
      </article>
    </div>
  );
}
