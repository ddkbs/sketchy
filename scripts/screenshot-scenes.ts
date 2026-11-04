// Scenes for the README drawings, in the compact syntax of the `sketch` tool.

export const REQUEST = `title The life of a web request
subtitle From typing a URL to rendered data, through a typical cloud backend
dir right
group device Your device
group edge Edge
group cloud Cloud (VPC)
group services Services in cloud
group data Data in cloud
group async Async in cloud
browser Browser @globe in device
dns DNS @book-open in edge !muted
cdn CDN @simple-icons:cloudflare in edge
lb Load balancer @split in cloud
gw API gateway @shield-check in cloud !accent
auth Auth service @key-round in services
orders Orders service @simple-icons:nodedotjs in services
cache Cache @simple-icons:redis (cylinder) in data
db Database @simple-icons:postgresql (cylinder) in data
queue Queue @simple-icons:apachekafka in async
email Email worker @mail in async !muted
browser --> dns lookup
browser -> cdn HTTPS
cdn -> lb cache miss
lb -> gw
gw -> auth verify token
gw -> orders
orders -> cache read
orders -> db write
orders -> queue event
queue -> email
step Find the address: DNS turns the domain into an IP address. | browser dns browser->dns
step Nearest edge: a CDN close to you answers static files from its cache. | browser cdn browser->cdn
step Into the cloud: cache misses pass the load balancer and the API gateway. | cdn lb gw cdn->lb lb->gw
step Who is asking: the gateway checks the token with the auth service. | gw auth gw->auth
step Read and write: the orders service reads from the cache and writes to the database. | orders cache db orders->cache orders->db
step Defer slow work: emails wait in a queue, so the response does not. | orders queue email orders->queue queue->email`;

export const TRANSFORMER = `title How an LLM picks the next word
subtitle One forward pass of a decoder-only transformer
dir right
group block Transformer block × 32
prompt The cat sat on the … (note)
tok Tokenizer @scissors
emb Embeddings + positions @grid-3x3
attn Self-attention @eye in block !accent
mlp Feed-forward (MLP) @layers in block
scores Scores → probabilities @chart-column
out "mat" (62 %) (rounded) !accent
prompt -> tok
tok -> emb
emb -> attn
attn -> mlp
mlp -> scores
scores -> out sample`;

export const REPO = `title Sketchy architecture
subtitle Click a box to open the file
dir right
group src src/ (MCP server)
group partsg parts/ in src
group sceneg scene/ in src
group layoutg layout/ in src
group photosg photos/ in src
group viewer viewer/ (MCP App)
claude Claude (person)
index index.ts in src
server server.ts in src !accent
pidx Part index @database (cylinder) in partsg
builder builder.ts in sceneg
types types.ts (note) in sceneg
layout index.ts (ELK) in layoutg
callouts callouts.ts in layoutg
search search.ts @search in photosg
florence Florence-2 @scan-eye in photosg
main main.ts in viewer
render render.ts @pen-tool in viewer
steps steps.ts in viewer
annotate annotate.ts @pencil in viewer
excalidraw excalidraw.ts @download in viewer
claude -> server tool calls
index -> server
server -> builder
builder -> types
server -> layout render
server -> search
search -> florence
pidx --> layout pins
layout -> callouts
layout -> main laid-out scene
main -> render
main -> steps
main -> annotate
main -> excalidraw`;
