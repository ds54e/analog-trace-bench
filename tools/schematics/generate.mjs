/** Native source-bound OTA drawings and the reviewed LDO pilot; no simulation. */
import { buildOtaLayout } from "./ota-layouts.mjs";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const canvas = resolve(process.argv[2] ?? join(root, ".cache/analog-canvas"));
const commit = "37bccd4012764dce53b34927fa606c6f430296a2";
if (
  execFileSync("git", ["-C", canvas, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim() !== commit
)
  throw new Error("Use the pinned Analog Canvas revision: " + commit);
const bridgeDir = join(canvas, "output/atb");
await mkdir(bridgeDir, { recursive: true });
await copyFile(
  join(root, "tools/schematics/native-bridge.ts"),
  join(bridgeDir, "bridge.ts"),
);
const { build } = await import(
  pathToFileURL(join(canvas, "node_modules/vite/dist/node/index.js"))
);
await build({
  root: canvas,
  configFile: false,
  logLevel: "warn",
  resolve: { conditions: ["development"] },
  ssr: {
    noExternal: true,
    resolve: {
      conditions: ["development"],
      externalConditions: ["development"],
    },
  },
  build: {
    ssr: join(bridgeDir, "bridge.ts"),
    outDir: join(root, "out/schematic-runtime"),
    emptyOutDir: true,
    target: "node24",
    minify: false,
    rollupOptions: {
      output: { entryFileNames: "bridge.mjs", codeSplitting: false },
    },
  },
});
const a = await import(
  pathToFileURL(join(root, "out/schematic-runtime/bridge.mjs"))
);
const manifest = {
  schema: 1,
  generator: { name: "Analog Canvas", version: "0.9.2", commit },
  drawings: [],
};
const layouts = [
  {
    id: "ota-fixed-sky130-opus-5-5-r1",
    title: "Two-stage Miller-compensated OTA",
    description:
      "The NMOS differential pair drives a PMOS mirror load and PMOS second stage. Cc–Rz connects n1 to vout; ibias sets the tail and output sink currents.",
    body_note:
      "NFET bodies → vss; PFET bodies → vdd. Body wires are omitted using the saved cell defaults. Dimensions are in µm; R values in Ω and C values in F.",
    devices: {
      XM3: [220, 110, "horizontal"],
      XM4: [320, 110],
      XM1: [200, 220],
      XM2: [340, 220, "horizontal"],
      XMtl: [260, 320],
      XMbn: [120, 320, "horizontal"],
      XM7: [510, 170],
      XM8: [510, 350],
      Cc: [420, 260, 270],
      Rz: [480, 260, 270],
    },
    ports: {
      vin_n: [140, 220],
      vin_p: [370, 220, 180],
      vout: [570, 220, 180],
      vdd: [110, 60],
      vss: [80, 370],
      ibias: [80, 280],
    },
    draw(c) {
      c.j("vd1", "vdd", 210, 60);
      c.j("vd2", "vdd", 330, 60);
      c.j("vd3", "vdd", 520, 60);
      c.w("vdd", "@vdd", "vd1");
      c.w("vdd", "vd1", "vd2");
      c.w("vdd", "vd2", "vd3");
      c.w("vdd", "vd1", "XM3.S");
      c.w("vdd", "vd2", "XM4.S");
      c.w("vdd", "vd3", "XM7.S");
      c.j("na-drain", "na", 210, 150);
      c.j("na-gates", "na", 260, 110);
      c.w("na", "XM3.D", "na-drain");
      c.w("na", "na-drain", "XM1.D");
      c.w("na", "XM3.G", "na-gates");
      c.w("na", "na-gates", "XM4.G");
      c.w("na", "na-gates", "na-drain", [[260, 150]]);
      c.j("n1-out", "n1", 330, 170);
      c.j("n1-comp", "n1", 400, 170);
      c.w("n1", "XM4.D", "n1-out");
      c.w("n1", "n1-out", "XM2.D");
      c.w("n1", "n1-out", "n1-comp");
      c.w("n1", "n1-comp", "XM7.G");
      c.w("n1", "n1-comp", "Cc.1", [[400, 260]]);
      c.w("nzc", "Cc.2", "Rz.1");
      c.j("out", "vout", 520, 220);
      c.j("out-comp", "vout", 520, 260);
      c.w("vout", "XM7.D", "out");
      c.w("vout", "out", "@vout");
      c.w("vout", "out", "out-comp");
      c.w("vout", "out-comp", "XM8.D");
      c.w("vout", "Rz.2", "out-comp");
      c.w("vin_n", "@vin_n", "XM1.G");
      c.w("vin_p", "@vin_p", "XM2.G");
      c.j("tail", "ntl", 270, 270);
      c.w("ntl", "XM1.S", "tail", [[210, 270]]);
      c.w("ntl", "XM2.S", "tail", [[330, 270]]);
      c.w("ntl", "tail", "XMtl.D");
      c.j("bias-drain", "ibias", 110, 280);
      c.j("bias-tap", "ibias", 110, 290);
      c.j("bias-dg", "ibias", 150, 290);
      c.j("bias-gate", "ibias", 150, 320);
      c.j("bias-bus", "ibias", 230, 320);
      c.w("ibias", "@ibias", "bias-drain");
      c.w("ibias", "bias-drain", "bias-tap");
      c.w("ibias", "bias-tap", "XMbn.D");
      c.w("ibias", "bias-tap", "bias-dg");
      c.w("ibias", "bias-dg", "bias-gate");
      c.w("ibias", "bias-gate", "XMbn.G");
      c.w("ibias", "bias-gate", "bias-bus");
      c.w("ibias", "bias-bus", "XMtl.G");
      c.w("ibias", "bias-bus", "XM8.G", [
        [230, 350],
        [490, 350],
      ]);
      c.j("vs1", "vss", 110, 370);
      c.j("vs2", "vss", 270, 370);
      c.w("vss", "@vss", "vs1");
      c.w("vss", "vs1", "vs2");
      c.w("vss", "vs2", "XM8.S");
      c.w("vss", "XMbn.S", "vs1");
      c.w("vss", "XMtl.S", "vs2");
      c.label("na", 218, 170);
      c.label("n1", 338, 155);
      c.label("ntl", 282, 268);
    },
  },
  {
    id: "ldo-core-sky130-sonnet-5-5-r1",
    title: "NMOS-input LDO with output-dependent bias",
    description:
      "The error amplifier drives the PMOS pass gate G. VOUT returns through R1–R2 to FB. RB feeds the NB bias node from VOUT; C1–RZ connects G to VIN, exactly as submitted.",
    body_note:
      "NFET bodies → VSS; PFET bodies → VIN. Body wires are omitted using the saved cell defaults. Dimensions are in µm; R values in Ω and C values in F.",
    devices: {
      XM3: [220, 110, "horizontal"],
      XM4: [320, 110],
      XM1: [200, 230],
      XM2: [340, 230, "horizontal"],
      XMT: [260, 340],
      XMB: [120, 340, "horizontal"],
      XMP: [500, 180],
      RS: [110, 120],
      RB: [160, 200, 90],
      R1: [510, 250],
      R2: [510, 340],
      CFF: [450, 250],
      C1: [410, 120, 270],
      RZ: [470, 120, 270],
    },
    ports: {
      VIN: [110, 60, 90],
      VSS: [80, 380],
      VREF: [390, 230, 180],
      VOUT: [600, 210, 180],
    },
    draw(c) {
      c.j("vi1", "VIN", 210, 60);
      c.j("vi2", "VIN", 330, 60);
      c.j("vi3", "VIN", 510, 60);
      c.j("vi-comp", "VIN", 510, 120);
      c.w("VIN", "@VIN", "RS.1");
      c.w("VIN", "@VIN", "vi1");
      c.w("VIN", "vi1", "vi2");
      c.w("VIN", "vi2", "vi3");
      c.w("VIN", "vi1", "XM3.S");
      c.w("VIN", "vi2", "XM4.S");
      c.w("VIN", "vi3", "vi-comp");
      c.w("VIN", "vi-comp", "XMP.S");
      c.w("VIN", "RZ.2", "vi-comp");
      c.j("d1-drain", "D1", 210, 150);
      c.j("d1-gates", "D1", 260, 110);
      c.w("D1", "XM3.D", "d1-drain");
      c.w("D1", "d1-drain", "XM1.D");
      c.w("D1", "XM3.G", "d1-gates");
      c.w("D1", "d1-gates", "XM4.G");
      c.w("D1", "d1-gates", "d1-drain", [[260, 150]]);
      c.j("g-out", "G", 330, 180);
      c.j("g-comp", "G", 390, 180);
      c.w("G", "XM4.D", "g-out");
      c.w("G", "g-out", "XM2.D");
      c.w("G", "g-out", "g-comp");
      c.w("G", "g-comp", "XMP.G");
      c.w("G", "g-comp", "C1.1");
      c.w("NZ", "C1.2", "RZ.1");
      c.j("out-pass", "VOUT", 510, 210);
      c.j("out-c", "VOUT", 450, 200);
      c.w("VOUT", "XMP.D", "out-pass");
      c.w("VOUT", "out-pass", "@VOUT");
      c.w("VOUT", "out-pass", "R1.1");
      c.w("VOUT", "out-c", "CFF.1");
      c.w("VOUT", "RB.1", "out-c");
      c.w("VOUT", "out-c", "XMP.D");
      // RB retains source pin order VOUT,NB; its rotation places pin 1 on the right.
      c.j("fb-c", "FB", 450, 290);
      c.j("fb", "FB", 510, 290);
      c.w("FB", "R1.2", "fb");
      c.w("FB", "fb", "fb-c");
      c.w("FB", "fb", "R2.1");
      c.w("FB", "CFF.2", "fb-c");
      c.w(
        "FB",
        "fb-c",
        "XM1.G",
        [
          [160, 290],
          [160, 230],
        ],
        "#23745d",
      );
      c.w("VREF", "@VREF", "XM2.G");
      c.j("tail", "TAIL", 270, 280);
      c.w("TAIL", "XM1.S", "tail", [[210, 280]]);
      c.w("TAIL", "XM2.S", "tail", [[330, 280]]);
      c.w("TAIL", "tail", "XMT.D");
      c.j("nb-return", "NB", 110, 200);
      c.j("nb-drain", "NB", 110, 310);
      c.j("nb-gates", "NB", 150, 340);
      c.w("NB", "RS.2", "nb-return");
      c.w("NB", "nb-return", "RB.2");
      c.w("NB", "nb-return", "nb-drain");
      c.w("NB", "nb-drain", "XMB.D");
      c.w("NB", "nb-drain", "nb-gates", [[150, 310]]);
      c.w("NB", "XMB.G", "nb-gates");
      c.w("NB", "nb-gates", "XMT.G");
      c.j("vs-tail", "VSS", 270, 380);
      c.j("vs-r", "VSS", 510, 380);
      c.j("vs-bias", "VSS", 110, 380);
      c.w("VSS", "XMB.S", "vs-bias");
      c.w("VSS", "@VSS", "vs-bias");
      c.w("VSS", "vs-bias", "vs-tail");
      c.w("VSS", "vs-tail", "vs-r");
      c.w("VSS", "XMT.S", "vs-tail");
      c.w("VSS", "R2.2", "vs-r");
      c.label("D1", 218, 170);
      c.label("G", 338, 165);
      c.label("NB", 122, 284);
      c.label("FB", 522, 280);
      c.label("TAIL", 282, 278);
    },
  },
];

async function submittedSource(runId) {
  const trace = await readFile(
    join(root, "content/traces", runId, "trace.html"),
    "utf8",
  );
  const matches = [
    ...trace.matchAll(
      /<pre data-field="submitted-spice"[^>]*><code>([\s\S]*?)<\/code><\/pre>/g,
    ),
  ];
  if (matches.length !== 1)
    throw new Error("Expected one final submission: " + runId);
  return execFileSync(
    "python3",
    [
      "-c",
      "import html,sys; sys.stdout.write(html.unescape(sys.stdin.read()))",
    ],
    { input: matches[0][1], encoding: "utf8" },
  );
}
const catalog = JSON.parse(
  await readFile(join(root, "site/data/runs.json"), "utf8"),
);
for (const task of catalog.tasks.filter((t) => t.id.startsWith("OTA-")))
  for (const run of task.runs) {
    if (layouts.some((l) => l.id === run.id)) continue;
    layouts.push(
      buildOtaLayout(run.id, await submittedSource(run.id), layouts[0]),
    );
  }
const selected = process.env.ATB_SCHEMATIC_RUN;

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
import { createHash } from "node:crypto";
function display(raw) {
  const match = raw.match(
    /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(meg|[tgkmunpf])?$/i,
  );
  if (!match) throw new Error("Unsupported value " + raw);
  const scales = {
    t: 1e12,
    g: 1e9,
    meg: 1e6,
    k: 1e3,
    m: 1e-3,
    u: 1e-6,
    n: 1e-9,
    p: 1e-12,
    f: 1e-15,
  };
  // Round only native display annotations; source parameters and SPICE stay exact.
  // Round before choosing the prefix so a carry does not produce e.g. 1000k.
  const n = Number(
    (Number(match[1]) * (scales[match[2]?.toLowerCase()] ?? 1)).toPrecision(2),
  );
  for (const [factor, suffix] of [
    [1e6, "M"],
    [1e3, "k"],
    [1, ""],
    [1e-3, "m"],
    [1e-6, "u"],
    [1e-9, "n"],
    [1e-12, "p"],
    [1e-15, "f"],
  ])
    if (Math.abs(n) >= factor) return +(n / factor).toPrecision(14) + suffix;
  throw new Error("Unsupported zero value");
}
function verifySavedWiring(project) {
  const d = project.documents.find((d) => d.id === project.topDocumentId);
  const resolver = a.createProjectSymbolResolver(project, a.builtInSymbols);
  const point = (e) => a.resolveEndpointPoint(d, resolver, e);
  // Verify every visible terminal is connected through authored route endpoints,
  // not solely through the imported logical membership. Hidden bodies are checked separately.
  const nodekey = (e) =>
    e.kind === "junction"
      ? "j:" + e.junctionId
      : e.instanceId + ":" + e.pinName;
  const graph = new Map();
  function edge(u, v) {
    if (!graph.has(u)) graph.set(u, new Set());
    graph.get(u).add(v);
  }
  const netByEndpoint = new Map(
    d.nets.flatMap((n) =>
      n.terminals.map((t) => [t.instanceId + ":" + t.pinName, n.id]),
    ),
  );
  for (const r of d.routes) {
    const endpoints = [r.start, r.legs.at(-1).to.endpoint];
    for (const e of endpoints) {
      const net =
        e.kind === "junction"
          ? d.junctions.find((j) => j.id === e.junctionId).netId
          : netByEndpoint.get(nodekey(e));
      if (net !== r.netId) throw new Error("Route on wrong net " + r.id);
    }
    const u = nodekey(endpoints[0]),
      v = nodekey(endpoints[1]);
    edge(u, v);
    edge(v, u);
    const pts = [
      point(r.start),
      ...r.legs.map((l) =>
        l.to.kind === "bend" ? l.to.position : point(l.to.endpoint),
      ),
    ];
    for (let k = 1; k < pts.length; k++)
      if (pts[k].x !== pts[k - 1].x && pts[k].y !== pts[k - 1].y)
        throw new Error(
          "Nonorthogonal route " + r.id + " " + JSON.stringify(pts),
        );
  }
  const nativeIndex = a.buildProjectConnectivityIndex(project, resolver);
  const virtualEdges = [...nativeIndex.documents.values()].flatMap((v) =>
    [...v.logicalNets.values()].flatMap((n) => n.virtualEdges),
  );
  for (const e of virtualEdges) {
    if (e.kind !== "net-label" && e.kind !== "power-label")
      throw new Error("Unsupported visible connection");
    const u = nodekey(e.from),
      v = nodekey(e.to);
    edge(u, v);
    edge(v, u);
  }
  let checkedPins = 0;
  for (const n of d.nets) {
    const visible = n.terminals
      .filter((t) => t.pinName !== "B")
      .map((t) => t.instanceId + ":" + t.pinName);
    if (!visible.length) continue;
    const seen = new Set(),
      queue = [visible[0]];
    while (queue.length) {
      const k = queue.pop();
      if (seen.has(k)) continue;
      seen.add(k);
      for (const v of graph.get(k) ?? []) queue.push(v);
    }
    if (visible.some((k) => !seen.has(k)))
      throw new Error(
        "Visible wiring disconnected " +
          n.id +
          ": " +
          visible.filter((k) => !seen.has(k)),
      );
    checkedPins += visible.length;
  }
  for (const i of d.instances)
    if (["nmos", "pmos"].includes(i.symbolId)) {
      const bulkNet = netByEndpoint.get(i.id + ":B"),
        expected = d.mosBulkDefaults[i.symbolId + "NetId"];
      if (bulkNet !== expected)
        throw new Error("Unsupported body connection " + i.reference);
    }
  return checkedPins;
}

for (const layout of layouts) {
  if (selected && layout.id !== selected) continue;
  const source = await submittedSource(layout.id);
  const imported = await a.importSpiceSources(
    [{ path: "submitted.spice", bytes: new TextEncoder().encode(source) }],
    "submitted.spice",
  );
  if (!imported.successful || imported.diagnostics.length)
    throw new Error(JSON.stringify(imported.diagnostics));
  const p = imported.project,
    d = p.documents.find((d) => d.id === p.topDocumentId);
  p.name = layout.title;
  d.sourceStatus = "geometry-only-changed";
  const resolver = a.createProjectSymbolResolver(p, a.builtInSymbols);
  const devices = new Map(
    d.instances.filter((i) => i.reference).map((i) => [i.reference, i]),
  );
  const ports = new Map(
    d.netlist.terminals.map((t) => [
      t.name,
      d.instances.find((i) => i.id === t.interfaceInstanceIds[0]),
    ]),
  );
  const nets = new Map(
    d.connectivityEvidence
      .filter((e) => e.kind === "net-name-hint")
      .flatMap((e) => [
        [e.sourceName, e.netId],
        [e.sourceName.toLowerCase(), e.netId],
      ]),
  );
  function place(i, arr) {
    const [x, y, mode] = arr;
    i.placement = {
      position: { x, y },
      rotation: typeof mode === "number" ? mode : 0,
      mirror: typeof mode === "string" ? mode : "none",
    };
  }
  for (const [name, pos] of Object.entries(layout.devices)) {
    if (!devices.has(name))
      throw new Error("Missing device " + name + " " + layout.id);
    place(devices.get(name), pos);
  }
  for (const [name, pos] of Object.entries(layout.ports)) {
    if (!ports.has(name))
      throw new Error("Missing port " + name + " " + layout.id);
    place(ports.get(name), pos);
  }
  d.routes = [];
  d.junctions = [];
  d.annotations = [];
  let serial = 0;
  const id = (kind) => `atb-${kind}-${++serial}`;
  const junctions = new Map();
  const endpoint = (key) => {
    if (junctions.has(key))
      return { kind: "junction", junctionId: junctions.get(key).id };
    if (key.startsWith("@"))
      return {
        kind: "terminal",
        instanceId: ports.get(key.slice(1)).id,
        pinName: "P",
      };
    const [ref, pinName] = key.split(".");
    return { kind: "terminal", instanceId: devices.get(ref).id, pinName };
  };
  const point = (e) => a.resolveEndpointPoint(d, resolver, e);
  function j(key, net, x, y) {
    const item = {
      id: id("junction"),
      netId: nets.get(net),
      position: { x, y },
    };
    d.junctions.push(item);
    junctions.set(key, item);
  }
  function w(net, from, to, bends = [], color) {
    const start = endpoint(from),
      end = endpoint(to);
    const endPoint = point(end);
    if (
      bends.length &&
      bends.at(-1)[0] === endPoint.x &&
      bends.at(-1)[1] === endPoint.y
    )
      bends = bends.slice(0, -1);
    const route = {
      id: id("route"),
      netId: nets.get(net),
      start,
      legs: [
        ...bends.map(([x, y]) => ({
          id: id("leg"),
          to: { kind: "bend", bendId: id("bend"), position: { x, y } },
          mode: "manual",
        })),
        {
          id: id("leg"),
          to: { kind: "endpoint", endpoint: end },
          mode: "manual",
        },
      ],
    };
    if (color) route.styleOverride = { color };
    d.routes.push(route);
  }
  function annotation(kind, anchor, text, binding, alignment = "start") {
    const item = {
      id: id("annotation"),
      kind,
      anchor,
      alignment,
      rotation: 0,
      locked: false,
    };
    if (binding) item.binding = binding;
    else item.content = { runs: [{ kind: "text", value: text }] };
    d.annotations.push(item);
    return item;
  }
  function label(net, x, y) {
    const netId = nets.get(net);
    const sourceName = d.connectivityEvidence.find(
      (e) => e.kind === "net-name-hint" && e.netId === netId,
    ).sourceName;
    const n = annotation(
      "net-label",
      { kind: "free", position: { x, y } },
      null,
      { kind: "net-name", netId },
    );
    n.netId = netId;
    d.connectivityEvidence.push({
      id: id("claim"),
      kind: "name-claim",
      netId,
      name: sourceName,
      owner: { kind: "net-label", annotationId: n.id },
      scope: "local",
    });
  }
  function boundLabel(net, key, x, y, alignment) {
    const target = junctions.get(key),
      netId = nets.get(net);
    const sourceName = d.connectivityEvidence.find(
      (e) => e.kind === "net-name-hint" && e.netId === netId,
    ).sourceName;
    const item = annotation(
      "net-label",
      {
        kind: "object",
        objectId: target.id,
        localOffset: { x, y },
        fallbackPosition: {
          x: target.position.x + x,
          y: target.position.y + y,
        },
      },
      null,
      { kind: "net-name", netId },
      alignment,
    );
    item.netId = netId;
    d.connectivityEvidence.push({
      id: id("claim"),
      kind: "name-claim",
      netId,
      name: sourceName,
      owner: { kind: "net-label", annotationId: item.id },
      scope: "local",
    });
  }
  layout.draw({
    j,
    w,
    label,
    boundLabel,
    point: (key) => {
      const value = point(endpoint(key));
      if (!value)
        throw new Error(
          "Unresolved " +
            key +
            " " +
            JSON.stringify(devices.get(key.split(".")[0])),
        );
      return value;
    },
  });
  for (const [ref, i] of devices) {
    const pos = i.placement.position,
      mir = i.placement.mirror === "horizontal";
    let x = mir ? -20 : 20,
      y = 5,
      align = mir ? "end" : "start";
    if (layout.strategy === "reviewed-free" && mir && ref.includes("_")) {
      x = -40;
      y = -2;
    }
    if (["resistor", "capacitor"].includes(i.symbolId)) {
      const horizontal = i.placement.rotation % 180 !== 0;
      x = horizontal ? 0 : 16;
      y = horizontal ? -32 : -4;
      align = horizontal ? "middle" : "start";
      annotation(
        "instance-label",
        {
          kind: "object",
          objectId: i.id,
          localOffset: { x, y },
          fallbackPosition: { x: pos.x + x, y: pos.y + y },
        },
        null,
        { kind: "instance-reference", instanceId: i.id },
        align,
      );
      annotation(
        "instance-value",
        {
          kind: "object",
          objectId: i.id,
          localOffset: { x, y: y + 18 },
          fallbackPosition: { x: pos.x + x, y: pos.y + y + 18 },
        },
        display(i.netlist.parameters.value),
        null,
        align,
      );
    } else
      annotation(
        "instance-label",
        {
          kind: "object",
          objectId: i.id,
          localOffset: { x, y },
          fallbackPosition: { x: pos.x + x, y: pos.y + y },
        },
        null,
        { kind: "instance-reference", instanceId: i.id },
        align,
      );
  }
  for (const t of d.netlist.terminals) {
    if (layout.strategy === "current-path-groups") continue;
    const i = ports.get(t.name),
      pos = i.placement.position;
    const output = t.name.toLowerCase() === "vout";
    const dx = output ? 16 : 0,
      dy = output ? 5 : -12;
    annotation(
      "instance-label",
      {
        kind: "object",
        objectId: i.id,
        localOffset: { x: dx, y: dy },
        fallbackPosition: { x: pos.x + dx, y: pos.y + dy },
      },
      null,
      { kind: "cell-terminal-name", terminalId: t.id },
      dx < 0 ? "end" : dx ? "start" : "middle",
    );
  }
  const out = join(root, "site/schematics", layout.id);
  await mkdir(out, { recursive: true });
  await writeFile(join(out, "submitted.spice"), source);
  const serialized = a.serializeProject(p);
  await writeFile(
    join(out, "project.icproj.json"),
    layout.strategy
      ? JSON.stringify(JSON.parse(serialized)) + "\n"
      : serialized,
  );
  let reopened = a.parseProject(
    await readFile(join(out, "project.icproj.json"), "utf8"),
  );
  if (layout.strategy) {
    // Use the native measured overlap report to move text, never shrink it.
    // Object-bound net labels keep their electrical anchors while text moves.
    for (let attempt = 0; attempt < 40; attempt++) {
      const diag = a.diagnoseProject(
        reopened,
        a.createProjectSymbolResolver(reopened, a.builtInSymbols),
      );
      const collision = diag.find((v) => v.code === "VISUAL_LABEL_OVERLAP");
      if (!collision) break;
      const ids = [
        collision.primary.objectId,
        ...collision.related.map((v) => v.objectId),
      ];
      const doc = reopened.documents[0];
      const labels = doc.annotations.filter(
        (n) => ids.includes(n.id) && n.anchor.kind === "object",
      );
      const item = labels.find((n) => n.kind === "net-label") ?? labels[0];
      if (!item) throw new Error("Uneditable label overlap " + layout.id);
      item.anchor.localOffset.y -= 24;
      item.anchor.fallbackPosition.y -= 24;
    }
    await writeFile(
      join(out, "project.icproj.json"),
      JSON.stringify(JSON.parse(a.serializeProject(reopened))) + "\n",
    );
    reopened = a.parseProject(
      await readFile(join(out, "project.icproj.json"), "utf8"),
    );
  }
  const checkedPins = verifySavedWiring(reopened);
  for (const i of reopened.documents[0].instances.filter((i) =>
    ["resistor", "capacitor"].includes(i.symbolId),
  )) {
    const values = reopened.documents[0].annotations.filter(
      (n) =>
        n.kind === "instance-value" &&
        n.anchor.kind === "object" &&
        n.anchor.objectId === i.id,
    );
    if (
      values.length !== 1 ||
      a
        .resolveAnnotationText(reopened.documents[0], values[0])
        .runs.map((r) => r.value ?? "")
        .join("") !== display(i.netlist.parameters.value)
    )
      throw new Error("Saved display value differs: " + i.reference);
  }
  const exported = a.createDesignNetlistExport(reopened, {
    format: "spice",
    groundPin: "global",
  });
  if (exported.status !== "ready" || exported.diagnostics.length)
    throw new Error(JSON.stringify(exported.diagnostics));
  const comparison = await a.compareNetlists(exported.file.text, source);
  let resolvedComparison;
  const independent = execFileSync(
    "python3",
    [
      "-c",
      "import sys,json;sys.path.insert(0,'tools');import schematics;a,b=json.load(sys.stdin);assert schematics.contract(a)==schematics.contract(b);print(json.dumps([schematics.resolved_spice(a),schematics.resolved_spice(b)]))",
    ],
    {
      cwd: root,
      input: JSON.stringify([source, exported.file.text]),
      encoding: "utf8",
    },
  );
  if (comparison.status !== "match") {
    if (comparison.status !== "inconclusive" || !source.includes(".param"))
      throw new Error(JSON.stringify(comparison));
    const [left, right] = JSON.parse(independent);
    resolvedComparison = await a.compareNetlists(left, right);
    if (resolvedComparison.status !== "match")
      throw new Error(JSON.stringify(resolvedComparison));
  }
  const ordinaryExport = a.createDesignNetlistExport(reopened, {
    format: "spice",
  });
  if (ordinaryExport.status !== "ready")
    throw new Error("Default export blocked");
  const ordinaryComparison = await a.compareNetlists(
    ordinaryExport.file.text,
    source,
  );
  if (
    ordinaryComparison.topology !== "equal" ||
    ordinaryComparison.differences.some((d) => d.kind !== "port-order")
  )
    throw new Error(
      "Unexpected default-export difference: " +
        JSON.stringify(ordinaryComparison),
    );
  const nativeIndex = a.buildProjectConnectivityIndex(
    reopened,
    a.createProjectSymbolResolver(reopened, a.builtInSymbols),
  );
  const unrouted = [...nativeIndex.documents.values()].flatMap(
    (d) => d.routingGuidance,
  );
  if (unrouted.length)
    throw new Error("Native unrouted connections: " + unrouted.length);
  const diagnostics = a.diagnoseProject(
    reopened,
    a.createProjectSymbolResolver(reopened, a.builtInSymbols),
  );
  if (diagnostics.length && selected)
    await writeFile(
      join(out, "preview.svg"),
      a.renderDocumentSvg(
        reopened.documents[0],
        a.createProjectSymbolResolver(reopened, a.builtInSymbols),
        { margin: 20 },
      ),
    );
  if (diagnostics.length)
    throw new Error(
      "Native diagnostics " + layout.id + ": " + JSON.stringify(diagnostics),
    );
  const svgOptions = { margin: 20 };
  const svg = a.renderDocumentSvg(
    reopened.documents[0],
    a.createProjectSymbolResolver(reopened, a.builtInSymbols),
    svgOptions,
  );
  await writeFile(join(out, "schematic.svg"), svg);
  await writeFile(join(out, "exported.spice"), exported.file.text);
  const verification = {
    source_sha256: hash(source),
    generator: manifest.generator,
    native_reopen: true,
    svg_export_options: svgOptions,
    native_comparison: comparison,
    export_options: { format: "spice", groundPin: "global" },
    ordinary_export_comparison: ordinaryComparison,
    visible_wiring: {
      status: "connected",
      checked_non_body_pins: checkedPins,
      checked_from: "saved-and-reopened-project",
    },
    body_defaults_checked: true,
    saved_display_values_checked: true,
    passive_display_significant_digits: 2,
    native_unrouted_connections: unrouted.length,
    native_diagnostics: diagnostics,
    simulation_run: false,
  };
  if (resolvedComparison) {
    verification.resolved_native_comparison = resolvedComparison;
    verification.numeric_constants_checked = true;
  }
  if (["current-path-groups", "reviewed-free"].includes(layout.strategy))
    verification.visible_wiring.named_connections_checked = true;
  await writeFile(
    join(out, "verification.json"),
    JSON.stringify(verification, null, 2) + "\n",
  );
  const files = [
    "schematic.svg",
    "project.icproj.json",
    "submitted.spice",
    "exported.spice",
    "verification.json",
  ];
  const hashes = Object.fromEntries(
    await Promise.all(
      files.map(async (name) => [name, hash(await readFile(join(out, name)))]),
    ),
  );
  manifest.drawings.push({
    run_id: layout.id,
    title: layout.title,
    description: layout.description,
    body_note: layout.body_note,
    source_sha256: hash(source),
    files: hashes,
    ...(layout.strategy ? { layout_strategy: layout.strategy } : {}),
    ...(layout.strategy === "current-path-groups"
      ? {
          reading_min_width: Math.ceil(
            +svg.match(/viewBox="[^ ]+ [^ ]+ ([^ ]+)/)[1] * 0.8,
          ),
        }
      : {}),
  });
  console.log(layout.id, comparison.status, checkedPins, "visible pins wired");
}
if (selected) {
  console.log("Selected-run preview; drawing index was not replaced.");
} else {
  await writeFile(
    join(root, "site/schematics/index.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
}
