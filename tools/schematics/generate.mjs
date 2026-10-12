/** Circuit-specific layouts authored for the two pilot submissions; no simulation. */
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
      XM3: [220, 140, "horizontal"],
      XM4: [360, 140],
      XM1: [200, 280],
      XM2: [380, 280, "horizontal"],
      XMtl: [280, 400],
      XMbn: [80, 400],
      XM7: [630, 220],
      XM8: [630, 400],
      Cc: [510, 330, 270],
      Rz: [580, 330, 270],
    },
    ports: {
      vin_n: [140, 280],
      vin_p: [450, 280, 180],
      vout: [700, 280, 180],
      vdd: [90, 80],
      vss: [90, 480, 270],
      ibias: [30, 350],
    },
    draw(c) {
      c.j("vd1", "vdd", 210, 80);
      c.j("vd2", "vdd", 370, 80);
      c.j("vd3", "vdd", 640, 80);
      c.w("vdd", "@vdd", "vd1");
      c.w("vdd", "vd1", "vd2");
      c.w("vdd", "vd2", "vd3");
      c.w("vdd", "vd1", "XM3.S");
      c.w("vdd", "vd2", "XM4.S");
      c.w("vdd", "vd3", "XM7.S");
      c.j("na-drain", "na", 210, 180);
      c.j("na-gates", "na", 260, 140);
      c.w("na", "XM3.D", "na-drain");
      c.w("na", "na-drain", "XM1.D");
      c.w("na", "XM3.G", "na-gates");
      c.w("na", "na-gates", "XM4.G");
      c.w("na", "na-gates", "na-drain", [[260, 180]]);
      c.j("n1-out", "n1", 370, 220);
      c.j("n1-comp", "n1", 490, 220);
      c.w("n1", "XM4.D", "n1-out");
      c.w("n1", "n1-out", "XM2.D");
      c.w("n1", "n1-out", "n1-comp");
      c.w("n1", "n1-comp", "XM7.G");
      c.w("n1", "n1-comp", "Cc.1", [[490, 330]]);
      c.w("nzc", "Cc.2", "Rz.1");
      c.j("out", "vout", 640, 280);
      c.j("out-comp", "vout", 640, 330);
      c.w("vout", "XM7.D", "out");
      c.w("vout", "out", "@vout");
      c.w("vout", "out", "out-comp");
      c.w("vout", "out-comp", "XM8.D");
      c.w("vout", "Rz.2", "out-comp");
      c.w("vin_n", "@vin_n", "XM1.G");
      c.w("vin_p", "@vin_p", "XM2.G");
      c.j("tail", "ntl", 290, 340);
      c.w("ntl", "XM1.S", "tail", [[210, 340]]);
      c.w("ntl", "XM2.S", "tail", [[370, 340]]);
      c.w("ntl", "tail", "XMtl.D");
      c.j("bias-drain", "ibias", 90, 350);
      c.j("bias-tap", "ibias", 90, 370);
      c.j("bias-dg", "ibias", 50, 370);
      c.j("bias-gate", "ibias", 50, 400);
      c.j("bias-bus", "ibias", 260, 450);
      c.w("ibias", "@ibias", "bias-drain");
      c.w("ibias", "bias-drain", "bias-tap");
      c.w("ibias", "bias-tap", "XMbn.D");
      c.w("ibias", "bias-tap", "bias-dg");
      c.w("ibias", "bias-dg", "bias-gate");
      c.w("ibias", "bias-gate", "XMbn.G");
      c.w("ibias", "bias-gate", "bias-bus", [[50, 450]]);
      c.w("ibias", "bias-bus", "XMtl.G");
      c.w("ibias", "bias-bus", "XM8.G", [[610, 450]]);
      c.j("vs1", "vss", 90, 480);
      c.j("vs2", "vss", 290, 480);
      c.j("vs3", "vss", 640, 480);
      c.w("vss", "@vss", "vs2");
      c.w("vss", "vs2", "vs3");
      c.w("vss", "XMbn.S", "@vss");
      c.w("vss", "XMtl.S", "vs2");
      c.w("vss", "XM8.S", "vs3");
      c.label("na", 218, 210);
      c.label("n1", 378, 205);
      c.label("ntl", 302, 338);
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
      XM3: [280, 140, "horizontal"],
      XM4: [420, 140],
      XM1: [260, 280],
      XM2: [440, 280, "horizontal"],
      XMT: [350, 420],
      XMB: [70, 420, "horizontal"],
      XMP: [620, 220],
      RS: [60, 160],
      RB: [450, 370, 90],
      R1: [630, 310],
      R2: [630, 420],
      CFF: [720, 310],
      C1: [520, 160, 270],
      RZ: [580, 160, 270],
    },
    ports: {
      VIN: [60, 80, 90],
      VSS: [60, 460, 270],
      VREF: [500, 280, 180],
      VOUT: [790, 260, 180],
    },
    draw(c) {
      c.j("vi1", "VIN", 270, 80);
      c.j("vi2", "VIN", 430, 80);
      c.j("vi3", "VIN", 630, 80);
      c.j("vi-comp", "VIN", 630, 160);
      c.w("VIN", "@VIN", "RS.1");
      c.w("VIN", "@VIN", "vi1");
      c.w("VIN", "vi1", "vi2");
      c.w("VIN", "vi2", "vi3");
      c.w("VIN", "vi1", "XM3.S");
      c.w("VIN", "vi2", "XM4.S");
      c.w("VIN", "vi3", "vi-comp");
      c.w("VIN", "vi-comp", "XMP.S");
      c.w("VIN", "RZ.2", "vi-comp");
      c.j("d1-drain", "D1", 270, 180);
      c.j("d1-gates", "D1", 320, 140);
      c.w("D1", "XM3.D", "d1-drain");
      c.w("D1", "d1-drain", "XM1.D");
      c.w("D1", "XM3.G", "d1-gates");
      c.w("D1", "d1-gates", "XM4.G");
      c.w("D1", "d1-gates", "d1-drain", [[320, 180]]);
      c.j("g-out", "G", 430, 220);
      c.j("g-comp", "G", 500, 220);
      c.w("G", "XM4.D", "g-out");
      c.w("G", "g-out", "XM2.D");
      c.w("G", "g-out", "g-comp");
      c.w("G", "g-comp", "XMP.G");
      c.w("G", "g-comp", "C1.1");
      c.w("NZ", "C1.2", "RZ.1");
      c.j("out-pass", "VOUT", 630, 260);
      c.j("out-c", "VOUT", 720, 260);
      c.j("out-divider", "VOUT", 630, 270);
      c.j("out-bias", "VOUT", 580, 370);
      c.w("VOUT", "XMP.D", "out-pass");
      c.w("VOUT", "out-pass", "out-c");
      c.w("VOUT", "out-c", "@VOUT");
      c.w("VOUT", "out-pass", "out-divider");
      c.w("VOUT", "out-divider", "R1.1");
      c.w("VOUT", "out-c", "CFF.1");
      c.w("VOUT", "out-divider", "out-bias", [[580, 270]]);
      c.w("VOUT", "RB.1", "out-bias");
      // RB retains source pin order VOUT,NB; its rotation places pin 1 on the right.
      c.j("fb-c", "FB", 630, 350);
      c.j("fb", "FB", 630, 360);
      c.w("FB", "R1.2", "fb-c");
      c.w("FB", "fb-c", "fb");
      c.w("FB", "fb", "R2.1");
      c.w("FB", "CFF.2", "fb-c", [[720, 350]]);
      c.w(
        "FB",
        "fb",
        "XM1.G",
        [
          [200, 360],
          [200, 280],
        ],
        "#23745d",
      );
      c.w("VREF", "@VREF", "XM2.G");
      c.j("tail", "TAIL", 360, 330);
      c.w("TAIL", "XM1.S", "tail", [[270, 330]]);
      c.w("TAIL", "XM2.S", "tail", [[430, 330]]);
      c.w("TAIL", "tail", "XMT.D");
      c.j("nb-return", "NB", 60, 370);
      c.j("nb-drain", "NB", 60, 390);
      c.j("nb-gates", "NB", 100, 420);
      c.w("NB", "RS.2", "nb-return");
      c.w("NB", "nb-return", "RB.2");
      c.w("NB", "nb-return", "nb-drain");
      c.w("NB", "nb-drain", "XMB.D");
      c.w("NB", "nb-drain", "nb-gates", [[100, 390]]);
      c.w("NB", "XMB.G", "nb-gates");
      c.w("NB", "nb-gates", "XMT.G");
      c.j("vs-tail", "VSS", 360, 460);
      c.j("vs-r", "VSS", 630, 460);
      c.w("VSS", "XMB.S", "@VSS");
      c.w("VSS", "@VSS", "vs-tail");
      c.w("VSS", "vs-tail", "vs-r");
      c.w("VSS", "XMT.S", "vs-tail");
      c.w("VSS", "R2.2", "vs-r");
      c.label("D1", 278, 210);
      c.label("G", 438, 205);
      c.label("NB", 72, 354);
      c.label("FB", 642, 350);
      c.label("TAIL", 372, 328);
    },
  },
];

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
  const n = Number(match[1]) * (scales[match[2]?.toLowerCase()] ?? 1);
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
for (const layout of layouts) {
  const trace = await readFile(
    join(root, "content/traces", layout.id, "trace.html"),
    "utf8",
  );
  const encoded = trace.match(
    /<pre data-field="submitted-spice"[^>]*><code>([\s\S]*?)<\/code><\/pre>/,
  )[1];
  // Decode with Python's standard HTML entity parser, preserving the final newline.
  const source = execFileSync(
    "python3",
    [
      "-c",
      "import html,sys; sys.stdout.write(html.unescape(sys.stdin.read()))",
    ],
    { input: encoded, encoding: "utf8" },
  );
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
      .map((e) => [e.sourceName, e.netId]),
  );
  function place(i, arr) {
    const [x, y, mode] = arr;
    i.placement = {
      position: { x, y },
      rotation: typeof mode === "number" ? mode : 0,
      mirror: typeof mode === "string" ? mode : "none",
    };
  }
  for (const [name, pos] of Object.entries(layout.devices))
    place(devices.get(name), pos);
  for (const [name, pos] of Object.entries(layout.ports))
    place(ports.get(name), pos);
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
      name: net,
      owner: { kind: "net-label", annotationId: n.id },
      scope: "local",
    });
  }
  layout.draw({ j, w, label });
  for (const [ref, i] of devices) {
    const pos = i.placement.position,
      mir = i.placement.mirror === "horizontal";
    let x = mir ? -20 : 20,
      y = 5,
      align = mir ? "end" : "start";
    if (["resistor", "capacitor"].includes(i.symbolId)) {
      const horizontal = i.placement.rotation % 180 !== 0;
      x = horizontal ? 0 : 16;
      y = horizontal ? -32 : -4;
      align = horizontal ? "middle" : "start";
      if (ref === "Rz" || ref === "RB") {
        y = 20;
      }
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
    const i = ports.get(t.name),
      pos = i.placement.position;
    const output = t.name.toLowerCase() === "vout",
      ground = t.name.toLowerCase() === "vss";
    const dx = output ? 16 : ground ? -16 : 0,
      dy = output || ground ? 5 : -12;
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
  for (const i of devices.values())
    if (["nmos", "pmos"].includes(i.symbolId)) {
      const bulkNet = netByEndpoint.get(i.id + ":B"),
        expected = d.mosBulkDefaults[i.symbolId + "NetId"];
      if (bulkNet !== expected)
        throw new Error("Unsupported body connection " + i.reference);
    }
  const out = join(root, "site/schematics", layout.id);
  await mkdir(out, { recursive: true });
  await writeFile(join(out, "submitted.spice"), source);
  await writeFile(join(out, "project.icproj.json"), a.serializeProject(p));
  const reopened = a.parseProject(
    await readFile(join(out, "project.icproj.json"), "utf8"),
  );
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
  if (comparison.status !== "match")
    throw new Error(JSON.stringify(comparison));
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
  if (diagnostics.length)
    throw new Error("Native diagnostics: " + JSON.stringify(diagnostics));
  const svg = await a.workspaceSvg(reopened);
  await writeFile(join(out, "schematic.svg"), svg);
  await writeFile(join(out, "exported.spice"), exported.file.text);
  const verification = {
    source_sha256: hash(source),
    generator: manifest.generator,
    native_reopen: true,
    native_comparison: comparison,
    export_options: { format: "spice", groundPin: "global" },
    ordinary_export_comparison: ordinaryComparison,
    visible_wiring: { status: "connected", checked_non_body_pins: checkedPins },
    body_defaults_checked: true,
    saved_display_values_checked: true,
    native_unrouted_connections: unrouted.length,
    native_diagnostics: diagnostics,
    simulation_run: false,
  };
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
  });
  console.log(layout.id, comparison.status, checkedPins, "visible pins wired");
}
await writeFile(
  join(root, "site/schematics/index.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
