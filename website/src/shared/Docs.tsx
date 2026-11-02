import { useEffect, useState, type ReactNode } from "react";
import { RELEASES_URL, REPO_URL } from "./lib";
import { TokenChart } from "./TokenChart";

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
  ["tokens", "Token usage"],
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
          Sketchy is open source and lets Claude draw while it explains. Answers come with
          interactive diagrams rendered right next to the text: systems and flows, your own code,
          Arduino and ESP32 circuits, labeled photos, comparisons and metaphors.
        </p>
        <p>
          The idea behind it is a split of responsibilities. Claude decides <strong>what</strong> to
          draw and label. Sketchy decides <strong>where</strong>: a part library with named anchor
          points and a real layout engine. Claude never computes a coordinate, so drawings come out
          precise and consistent every time.
        </p>
        <img src="/gallery/chat.png" alt="A Sketchy drawing inside a Claude Code session" />

        <h2 id="install">Installation</h2>
        <p>
          Sketchy comes two ways. Use the <strong>skill</strong> to draw in the Claude chat, and the{" "}
          <strong>extension</strong> when you work in Claude Code. Both can be installed side by
          side.
        </p>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Skill (chat)</th>
              <th>Extension (coding)</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "Where",
                "Claude chat on web, desktop and mobile",
                "Code tab, terminal, MCP clients",
              ],
              ["Diagrams, steps, circuits", "Yes", "Yes"],
              ["Labeled photos", "No", "Yes, on your computer"],
              ["SVG and PNG export", "No", "Yes, with a save dialog"],
              ["Click a box to open the file", "No", "Yes"],
              ["Needs", "Internet (jsDelivr)", "Nothing else; runs on your computer"],
            ].map(([what, skill, ext]) => (
              <tr key={what}>
                <td>{what}</td>
                <td>{skill}</td>
                <td>{ext}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>Claude chat (web, desktop and mobile)</h3>
        <ol>
          <li>
            Download <code>sketchy-skill-&lt;version&gt;.zip</code> from the{" "}
            <a href={RELEASES_URL}>latest release</a>.
          </li>
          <li>
            In Claude, open <strong>Settings → Capabilities → Skills</strong> and upload the zip.
          </li>
          <li>Ask for a drawing in any chat. It appears inline, right in the conversation.</li>
        </ol>
        <p>
          Claude writes the scene, and the chat's inline visualization loads Sketchy's browser
          bundle from <a href="https://www.jsdelivr.com">jsDelivr</a>, which serves it from this
          repository. There is no Sketchy server, and the skill picks up fixes on its own. Photo
          labeling and opening files from a drawing need your computer, so they come with the
          extension.
        </p>
        <h3>Claude desktop app (Code tab)</h3>
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
          The regular <strong>Chat</strong> tab does not display views from locally installed
          extensions; use the skill there.
        </p>
        <h3>Claude Code in the terminal</h3>
        <pre>
          <code>{`git clone https://github.com/ddkbs/sketchy.git
cd sketchy && npm install && npm run build
claude mcp add sketchy --scope user -- node "$PWD/dist/index.js"`}</code>
        </pre>
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
          <code>{`Claude describes the scene (extension: tools like sketch, place_part, label;
                            skill: the same scene as JSON in an inline widget)
          ↓
Scene: nodes, groups, parts, wires, labels, photos, steps — no coordinates
          ↓
Layout engine (elkjs): positions, orthogonal routing, collision-free callouts
          ↓
Viewer: hand-drawn rendering with rough.js, hover, steps, export`}</code>
        </pre>
        <p>
          Every feature fills the same scene, and a single viewer renders it. The visual style lives
          in the renderer only, so every drawing looks consistent no matter what Claude asks for.
          Layout runs locally inside the server process. The drawing core has no other local
          dependencies, so the same code also runs in the browser for the chat skill.
        </p>
        <p>
          With the extension, the viewer is an <strong>MCP App</strong>: the host loads it into a
          sandboxed iframe and hands it the laid-out scene. It has no network access, which is why
          fonts and icons are embedded. With the skill, the chat's inline widget loads the browser
          bundle from jsDelivr and lays out and draws the scene on your device.
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
            <strong>Export</strong> as SVG or PNG, with the handwriting embedded. Your system's save
            dialog asks where to put the file (extension only).
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
          Ask <em>“Show me an Arduino Uno and label the pins.”</em> Claude searches openly licensed
          photos (Wikimedia Commons, Openverse), picks one and asks Sketchy to locate the parts and
          printed text in it. Grounding runs on your machine with Florence-2 through ONNX Runtime;
          your images never leave it. Sketchy then draws the callouts, and the attribution is always
          shown. Photo labeling comes with the extension.
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
              ["sketch", "Draw a whole scene in one call, in the compact line syntax"],
              ["search_parts", "Electronic part types and their pins"],
              ["find_image, locate, choose_model", "Photos, local grounding, model setup"],
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
        <p>
          A scene is a few short lines: <code>browser Browser @globe</code>,{" "}
          <code>browser -&gt; server HTTPS</code>,{" "}
          <code>step Request: The browser asks | browser browser-&gt;server</code>. Setting{" "}
          <code>SKETCHY_FORMAT=json</code> restores the JSON <code>sketch</code> tool and the
          incremental tools of earlier versions (<code>add_node</code>, <code>add_edge</code>,{" "}
          <code>place_part</code>, <code>label</code>, <code>render</code>, …).
        </p>
        <h3>Follow-ups</h3>
        <p>
          Ask Claude to change a drawing and it sends the scene again with the same ids. Sketchy
          keeps the order and places of everything the earlier drawing already showed and fits the
          new parts in around them, so before and after stay comparable, also when a back-edge
          closes a cycle.
        </p>

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
            <tr>
              <td>
                <code>SKETCHY_EXPORT_DIR</code>
              </td>
              <td>
                <code>~/Downloads</code>
              </td>
              <td>Folder the save dialog opens in for SVG and PNG exports</td>
            </tr>
            <tr>
              <td>
                <code>SKETCHY_FORMAT</code>
              </td>
              <td>
                <code>compact</code>
              </td>
              <td>
                <code>json</code> restores the JSON scene tools of earlier versions
              </td>
            </tr>
          </tbody>
        </table>

        <h2 id="tokens">Token usage</h2>
        <p>
          Does a drawing cost more than a text answer? We asked Claude Sonnet to explain five topics
          (DNS, git branches, transformers, the TLS handshake, an Arduino button circuit), in plain
          text and with Sketchy, and read the exact usage Claude Code reports. Version 0.1.6
          introduced the compact scene format; the JSON column is the format before it.
        </p>
        <table>
          <thead>
            <tr>
              <th>Average per answer, fresh conversation</th>
              <th>Plain text</th>
              <th>Sketchy, JSON (≤ 0.1.5)</th>
              <th>Sketchy, compact (0.1.6)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Output tokens (what Claude writes)", "962", "1,168", "686 (−29% vs. text)"],
              ["Tool definitions", "–", "~4,100", "~500"],
              ["Cost on Sonnet list prices", "~$0.034", "~$0.059", "~$0.043"],
            ].map(([what, text, json, compact]) => (
              <tr key={what}>
                <td>{what}</td>
                <td>{text}</td>
                <td>{json}</td>
                <td>{compact}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul>
          <li>
            <strong>Claude writes less for a drawing than for text.</strong> Layout and drawing
            happen in Sketchy and cost no tokens.
          </li>
          <li>
            <strong>A tool call adds a turn</strong> that re-sends the context, mostly from the
            cache at a tenth of the price; this is why the very first answer still costs a little
            more than text.
          </li>
        </ul>

        <h3>Over a whole session</h3>
        <p>
          A single answer is not the whole story: in a conversation every answer stays in the
          history and is sent again with the next question. We asked six questions in a row, each in
          its own session per variant. An experimental compact scene format, where Claude writes{" "}
          <code>browser -&gt; dns lookup</code> instead of JSON and sees only one short tool,
          roughly halves what Claude writes per drawing.
        </p>
        <TokenChart />
        <p>
          With compact scenes, every answer from the second one on costs less than its text
          counterpart, and the session as a whole is cheaper from the third answer: $0.58 against
          $0.61 after six. Shorter answers keep the history small, and the extra tool turn is mostly
          read from the cache. JSON scenes stay about 20% above text throughout. Measured on
          November 2, 2026 in Claude Code with an empty project; the script is{" "}
          <code>scripts/token-benchmark.mjs</code>.
        </p>

        <h2 id="limitations">Limitations</h2>
        <ul>
          <li>
            The regular chat tab of the desktop app does not display drawings from the extension;
            use the skill there.
          </li>
          <li>The skill has no photo labeling, export or file links.</li>
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
