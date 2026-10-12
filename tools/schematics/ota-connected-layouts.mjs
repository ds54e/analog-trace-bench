import { refineOtaCase } from "./ota-case-refinements.mjs";
import { routeDrawing } from "./orthogonal-router.mjs";
const supply = (n) => ["vdd", "vss", "ibias"].includes(n);
/** Connectivity-derived placements for the DRIVE, PRECISION and WIDE families.
 * Differential branches and their tails form the input blocks; remaining
 * signal stacks precede the output. Bias-only branches occupy the lower row. */
export function connectedOtaLayout(id, ds, portNames, base) {
  if (!/^ota-(drive|precision|wide)-sky130-/.test(id)) return null;
  const byRef = new Map(ds.map((d) => [d.ref, d])),
    mos = ds.filter((d) => "np".includes(d.kind));
  const devices = {},
    sections = {},
    used = new Set(),
    mods = [];
  const conduction = (d) =>
    d.pins
      .slice(0, "np".includes(d.kind) ? 3 : 2)
      .filter((n, i) => i !== 1 || !"np".includes(d.kind));
  // Main current paths start at input devices. Supply/bias nodes never cause
  // unrelated branches to be absorbed; forward gate connections expose stages.
  const main = new Set(
      base.modules.filter((m) => m.pair).flatMap((m) => m.refs),
    ),
    signal = new Set([
      ...portNames
        .map((n) => n.toLowerCase())
        .filter((n) => !supply(n) && n !== "vout"),
      ...base.modules
        .filter((m) => m.pair)
        .flatMap((m) => m.pair.map((r) => byRef.get(r).pins[1])),
    ]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of ds) {
      if (main.has(d.ref)) {
        for (const n of conduction(d))
          if (!supply(n) && !signal.has(n)) {
            signal.add(n);
            changed = true;
          }
      } else if (
        conduction(d).some((n) => signal.has(n)) ||
        ("np".includes(d.kind) && signal.has(d.pins[1]))
      ) {
        main.add(d.ref);
        changed = true;
      }
    }
  }
  // A resistor from a signal node to an independently generated bias does
  // not turn the reference generator into another signal stage.
  for (const diode of mos.filter(
    (d) => d.kind === "p" && d.pins[0] === d.pins[1] && d.pins[2] === "vdd",
  )) {
    const sink = mos.find(
      (d) =>
        d.kind === "n" &&
        d.pins[0] === diode.pins[0] &&
        d.pins[1] === "ibias" &&
        d.pins[2] === "vss",
    );
    if (
      sink &&
      !base.modules.some(
        (m) =>
          m.pair && (m.refs.includes(diode.ref) || m.refs.includes(sink.ref)),
      )
    ) {
      main.delete(diode.ref);
      main.delete(sink.ref);
      signal.delete(diode.pins[0]);
    }
  }
  const top = (d) => d.pins[d.kind === "p" ? 2 : 0];
  // Reuse the source-derived branch membership, then arrange actual stages.
  const pairMods = base.modules.filter((m) => m.pair);
  let cursor = 180;
  for (const mod of pairMods) {
    const refs = mod.refs.filter((r) => !used.has(r));
    if (!refs.length) continue;
    const xs = refs.map((r) => base.devices[r][0]),
      ys = refs.map((r) => base.devices[r][1]);
    const xmin = Math.min(...xs),
      ymin = Math.min(...ys),
      xmax = Math.max(...xs);
    for (const r of refs) {
      const p = base.devices[r];
      devices[r] = [p[0] - xmin + cursor, p[1] - ymin + 160, p[2]];
      used.add(r);
    }
    mods.push({ refs, kind: "input" });
    cursor += xmax - xmin + 230;
  }
  // A shared summing node can break a maximal series chain. Keep each
  // mirror load over/under its own input even when another pair joins it.
  const mirrorPairs = [];
  for (const mod of pairMods) {
    const pair = mod.pair.map((r) => byRef.get(r));
    const candidates = pair.map((d) =>
      mos.filter(
        (q) =>
          q.kind !== d.kind &&
          q.pins[0] === d.pins[0] &&
          q.pins[2] === (d.kind === "n" ? "vdd" : "vss"),
      ),
    );
    const a = candidates[0].find((q) =>
      candidates[1].some(
        (t) =>
          t.pins[1] === q.pins[1] && [q.pins[0], t.pins[0]].includes(q.pins[1]),
      ),
    );
    const b = a && candidates[1].find((q) => q.pins[1] === a.pins[1]);
    if (!a || !b) continue;
    mirrorPairs.push(mod);
    [a, b].forEach((d, i) => {
      const p = devices[pair[i].ref],
        mir = i === 0,
        axis = p[0] + (p[2] === "horizontal" ? -10 : 10);
      devices[d.ref] = [
        axis + (mir ? 10 : -10),
        p[1] + (pair[i].kind === "n" ? -110 : 110),
        mir ? "horizontal" : undefined,
      ];
      used.add(d.ref);
      const target = mods.find((m) => m.refs.includes(pair[i].ref));
      if (!target.refs.includes(d.ref)) target.refs.push(d.ref);
    });
  }
  if (
    mirrorPairs.length === 2 &&
    new Set(mirrorPairs.map((m) => byRef.get(m.pair[0]).kind)).size === 2
  ) {
    const n = mirrorPairs.find((m) => byRef.get(m.pair[0]).kind === "n"),
      p = mirrorPairs.find((m) => byRef.get(m.pair[0]).kind === "p");
    const np = devices[n.pair[0]],
      pp = devices[p.pair[0]],
      dx = np[0] - pp[0],
      dy = np[1] + 400 - pp[1];
    const m = mods.find((m) => m.refs.includes(p.pair[0]));
    for (const r of m.refs) {
      devices[r][0] += dx;
      devices[r][1] += dy;
    }
    cursor = Math.max(...Object.values(devices).map((p) => p[0])) + 230;
  }
  // Main non-input stacks first; put the output stage last.
  const rest = base.modules
    .filter((m) => !m.pair)
    .map((m) => ({ ...m, refs: m.refs.filter((r) => !used.has(r)) }))
    .filter((m) => m.refs.length);
  const signalMods = rest.filter(
    (m) =>
      m.refs.some((r) => main.has(r)) &&
      m.refs.some((r) => "np".includes(byRef.get(r).kind)),
  );
  const output = (m) =>
    m.refs.some(
      (r) =>
        "np".includes(byRef.get(r).kind) && byRef.get(r).pins[0] === "vout",
    );
  signalMods.sort((a, b) => Number(output(a)) - Number(output(b)));
  for (const mod of signalMods) {
    const refs = mod.refs.filter((r) => !used.has(r));
    const ymin = Math.min(...refs.map((r) => base.devices[r][1]));
    for (const r of refs) {
      const p = base.devices[r];
      devices[r] = [cursor, p[1] - ymin + 160, p[2]];
      used.add(r);
    }
    mods.push({ refs, kind: output(mod) ? "output" : "signal" });
    cursor += Math.max(180, ...refs.map((r) => r.length * 9 + 100));
  }
  if (!pairMods.length) throw Error("Missing differential input " + id);
  // Folded and symmetrical mirror OTAs need their receiving branches beside
  // the pair, not appended as unrelated columns after it.
  const arranged = new Set();
  for (const mod of pairMods) {
    const pair = mod.pair.map((r) => byRef.get(r));
    if (pair[0].kind !== "n") continue;
    const folds = pair.map((d) =>
      mos.find((q) => q.kind === "p" && q.pins[2] === d.pins[0]),
    );
    const tops = pair.map((d) =>
      mos.find(
        (q) => q.kind === "p" && q.pins[0] === d.pins[0] && q.pins[2] === "vdd",
      ),
    );
    const symmetric =
      tops.every(Boolean) && tops.every((d) => d.pins[0] === d.pins[1]);
    const receivers = folds.every(Boolean)
      ? folds
      : symmetric
        ? tops.map((d) =>
            mos.find(
              (q) =>
                q !== d &&
                q.kind === "p" &&
                q.pins[1] === d.pins[1] &&
                q.pins[2] === "vdd",
            ),
          )
        : [];
    if (!receivers.length || !receivers.every(Boolean) || !tops.every(Boolean))
      continue;
    const branch = receivers.map((d) =>
      mods.find((m) => m.refs.includes(d.ref)),
    );
    if (branch.some((m) => !m) || branch[0] === branch[1]) continue;
    const offset = arranged.size ? 1000 : 0;
    pair.forEach((d, i) => {
      const x = offset + 380 + i * 220,
        bx = offset + (i ? 820 : 160);
      devices[d.ref] = [x, 300, i ? "horizontal" : undefined];
      arranged.add(d.ref);
      if (folds.every(Boolean)) {
        devices[tops[i].ref] = [bx, 160, i ? "horizontal" : undefined];
        arranged.add(tops[i].ref);
        const refs = branch[i].refs.filter((r) =>
          "np".includes(byRef.get(r).kind),
        );
        refs.forEach((r, j) => {
          devices[r] = [bx, 300 + j * 110, i ? "horizontal" : undefined];
          arranged.add(r);
        });
      } else {
        devices[tops[i].ref] = [x, 160, i ? undefined : "horizontal"];
        arranged.add(tops[i].ref);
        branch[i].refs.forEach((r, j) => {
          devices[r] = [bx, 160 + j * 110, i ? "horizontal" : undefined];
          arranged.add(r);
        });
      }
    });
    for (const r of mod.refs.filter((r) => !arranged.has(r))) {
      const d = byRef.get(r);
      if (d.pins[0] === pair[0].pins[2]) {
        devices[r] = [offset + 490, folds.every(Boolean) ? 440 : 610];
        arranged.add(r);
      }
    }
  }
  // A complementary P pair can feed the lower folded nodes. Align it
  // below the N pair, with the two tails between them and mirror gates below.
  if (arranged.size) {
    for (const pm of pairMods.filter(
      (m) => byRef.get(m.pair[0]).kind === "p",
    )) {
      const pp = pm.pair.map((r) => byRef.get(r));
      const receivers = pp.map((d) =>
        mos.find(
          (q) =>
            arranged.has(q.ref) &&
            ((q.kind === "n" && q.pins[2] === d.pins[0]) ||
              (q.kind === "p" && q.pins[0] === d.pins[0])),
        ),
      );
      if (!receivers.every(Boolean) || receivers[0] === receivers[1]) continue;
      pp.forEach((d, i) => {
        const bx = devices[receivers[i].ref][0],
          right = bx > 490;
        devices[d.ref] = [
          right ? 600 : 380,
          650,
          right ? "horizontal" : undefined,
        ];
        arranged.add(d.ref);
        if (receivers[i].kind === "n") devices[receivers[i].ref][1] = 650;
        const mirror = mos.find(
          (q) =>
            q.kind === "n" && q.pins[0] === d.pins[0] && q.pins[2] === "vss",
        );
        if (mirror) {
          devices[mirror.ref] = [bx, 760, right ? "horizontal" : undefined];
          arranged.add(mirror.ref);
        }
      });
      const tail = mos.find(
        (d) => d.kind === "p" && d.pins[0] === pp[0].pins[2],
      );
      if (tail) {
        devices[tail.ref] = [490, 540];
        arranged.add(tail.ref);
      }
    }
  }
  if (arranged.size) {
    let x = Math.max(...[...arranged].map((r) => devices[r][0])) + 230;
    for (const m of mods) {
      const refs = m.refs.filter((r) => !arranged.has(r));
      if (!refs.length) continue;
      const xmin = Math.min(...refs.map((r) => devices[r][0]));
      const span = Math.max(...refs.map((r) => devices[r][0])) - xmin;
      for (const r of refs) devices[r][0] = x + devices[r][0] - xmin;
      x += span + 220;
    }
    cursor = x;
  }
  // Turn mirror gates toward their mate without shifting the current axis.
  for (const a of mos) {
    if (!devices[a.ref]) continue;
    const b = mos.find(
      (d) =>
        d !== a &&
        devices[d.ref] &&
        d.kind === a.kind &&
        d.pins[1] === a.pins[1] &&
        devices[d.ref][1] === devices[a.ref][1] &&
        devices[d.ref][0] > devices[a.ref][0],
    );
    if (!b || supply(a.pins[1])) continue;
    for (const [d, mirror] of [
      [a, true],
      [b, false],
    ]) {
      const p = devices[d.ref],
        old = p[2] === "horizontal";
      p[0] += (old ? -10 : 10) - (mirror ? -10 : 10);
      p[2] = mirror ? "horizontal" : undefined;
    }
  }
  // Bring series compensation beside the driven output gate, retaining pin order.
  const outputMods = mods.filter((m) => m.kind === "output");
  for (const m of outputMods) {
    const amp = m.refs
      .map((r) => byRef.get(r))
      .find(
        (d) =>
          "np".includes(d.kind) && signal.has(d.pins[1]) && !supply(d.pins[1]),
      );
    if (!amp) continue;
    const gn = amp.pins[1],
      pass = ds.filter((d) => "rc".includes(d.kind) && !used.has(d.ref));
    let comp = [];
    for (const first of pass.filter((d) => d.pins.includes(gn))) {
      const mid = first.pins.find((n) => n !== gn),
        second = pass.find(
          (d) => d !== first && d.pins.includes(mid) && d.pins.includes("vout"),
        );
      if (second) {
        comp = [first, second];
        break;
      }
      if (first.pins.includes("vout")) {
        comp = [first];
        break;
      }
    }
    if (!comp.length) continue;
    const p = devices[amp.ref],
      source = mos.find(
        (d) => devices[d.ref] && d.pins[0] === gn && d.ref !== amp.ref,
      );
    const sy = source
      ? devices[source.ref][1] + (source.kind === "p" ? 40 : -40)
      : p[1];
    // Reserve a local RC corridor before the output, instead of a detached row.
    const ox = p[0] - 60,
      shift = comp.length * 110 - 40;
    for (const [r, pos] of Object.entries(devices))
      if (!m.refs.includes(r) && pos[0] > p[0]) pos[0] += shift;
    for (const r of m.refs) devices[r][0] += shift;
    devices[amp.ref][1] = Math.max(160, sy);
    const stack = m.refs.filter((r) => "np".includes(byRef.get(r).kind)),
      ai = stack.indexOf(amp.ref);
    stack.forEach((r, i) => {
      if (i !== ai)
        devices[r][1] =
          devices[amp.ref][1] +
          (i < ai ? (i - ai) * 110 : 180 + (i - ai - 1) * 110);
    });
    const cy = devices[amp.ref][1] + (amp.kind === "p" ? 80 : -60);
    let net = gn;
    comp.forEach((d, i) => {
      devices[d.ref] = [ox + i * 110, cy, d.pins[0] === net ? 270 : 90];
      net = d.pins.find((n) => n !== net);
      used.add(d.ref);
      m.refs.push(d.ref);
    });
    cursor = Math.max(cursor, devices[amp.ref][0] + 180);
  }
  let floor = Math.max(...Object.values(devices).map((p) => p[1])) + 140;
  // Place remaining main passives below their actual signal branch.
  let px = 180,
    py = floor;
  for (const d of ds.filter((d) => main.has(d.ref) && !used.has(d.ref))) {
    devices[d.ref] = [px, py, 0];
    used.add(d.ref);
    mods.push({ refs: [d.ref], kind: "signal" });
    px += 150;
    if (px > cursor - 100) {
      px = 180;
      py += 140;
    }
  }
  // Output shunts belong beside their output branch, not at the start of a
  // detached passive row with a return spanning the whole amplifier.
  let outputShunt = 0;
  for (const d of ds.filter(
    (d) =>
      "rc".includes(d.kind) &&
      main.has(d.ref) &&
      d.pins.includes("vout") &&
      d.pins.some((n) => ["vdd", "vss"].includes(n)),
  )) {
    const owner = mos
      .filter((q) => devices[q.ref] && q.pins[0] === "vout")
      .sort((a, b) => devices[b.ref][0] - devices[a.ref][0])[0];
    const p = devices[owner.ref],
      rail = d.pins.find((n) => n !== "vout");
    devices[d.ref] = [
      p[0] + 160 + 150 * outputShunt++,
      p[1] + 120,
      d.pins[0] === (rail === "vdd" ? "vdd" : "vout") ? 0 : 180,
    ];
  }
  refineOtaCase(id, ds, devices);
  // Apply the same pin-preserving mirror rule after exceptional placements.
  const gateRows = new Map();
  for (const d of mos.filter(
    (d) =>
      devices[d.ref] &&
      signal.has(d.pins[1]) &&
      mos.some((q) => q.pins[0] === d.pins[1]),
  )) {
    const key = d.kind + ":" + d.pins[1] + ":" + devices[d.ref][1];
    if (!gateRows.has(key)) gateRows.set(key, []);
    gateRows.get(key).push(d);
  }
  for (const row of gateRows.values())
    if (row.length === 2) {
      row.sort((a, b) => devices[a.ref][0] - devices[b.ref][0]);
      row.forEach((d, i) => {
        const p = devices[d.ref],
          mir = i === 0,
          old = p[2] === "horizontal";
        p[0] += (old ? -10 : 10) - (mir ? -10 : 10);
        p[2] = mir ? "horizontal" : undefined;
      });
    }

  cursor = Math.max(...Object.values(devices).map((p) => p[0])) + 180;
  floor = Math.max(...Object.values(devices).map((p) => p[1])) + 160;
  let bx = 180,
    by = floor,
    row = 0;
  const remaining = ds.filter((d) => !used.has(d.ref));
  const pending = new Set(remaining.map((d) => d.ref));
  while (pending.size) {
    const seed = [...pending][0],
      refs = [],
      todo = [seed];
    while (todo.length) {
      const r = todo.pop();
      if (!pending.has(r)) continue;
      pending.delete(r);
      refs.push(r);
      for (const n of conduction(byRef.get(r)))
        if (!supply(n)) {
          for (const d of remaining)
            if (pending.has(d.ref) && conduction(d).includes(n))
              todo.push(d.ref);
        }
    }
    // Follow real series pins from VDD toward VSS. Branches keep nearby columns.
    const caps = refs.filter((r) => byRef.get(r).kind === "c");
    const local = new Set(refs.filter((r) => byRef.get(r).kind !== "c")),
      order = [];
    let net = "vdd";
    while (local.size) {
      const ref =
        [...local].find((r) => conduction(byRef.get(r)).includes(net)) ??
        [...local].find((r) => byRef.get(r).kind === "p") ??
        [...local][0];
      const d = byRef.get(ref),
        ends = conduction(d),
        incoming = ends.includes(net)
          ? net
          : "np".includes(d.kind)
            ? top(d)
            : ends[0];
      order.push({ d, incoming });
      net = ends.find((n) => n !== incoming) ?? ends[0];
      local.delete(ref);
    }
    if (bx > Math.max(cursor, 850) - 140) {
      bx = 180;
      by += row + 170;
      row = 0;
    }
    order.forEach(({ d, incoming }, i) => {
      devices[d.ref] = [
        bx + ("np".includes(d.kind) ? 0 : 10),
        by + i * 110,
        "np".includes(d.kind) ? undefined : d.pins[0] === incoming ? 0 : 180,
      ];
      sections[d.ref] = "bias-" + mods.length;
      used.add(d.ref);
    });
    caps.forEach((r, i) => {
      const d = byRef.get(r),
        upper = d.pins.includes("vdd")
          ? "vdd"
          : d.pins.find((n) => n !== "vss");
      devices[r] = [bx + 150, by + 70 + i * 130, d.pins[0] === upper ? 0 : 180];
      sections[r] = "bias-" + mods.length;
      used.add(r);
    });
    bx += caps.length ? 350 : 200;
    row = Math.max(row, (order.length - 1) * 110);
    mods.push({ refs, kind: "bias" });
  }
  if (used.size !== ds.length) throw Error("Incomplete connected layout " + id);
  // Use a common section for signal/bias supplies, but remote bias control
  // labels avoid wrapping a supply rail around the entire sheet.
  const auxiliaryNets = new Set(["vdd", "vss", "ibias"]);
  for (const d of ds.filter((d) => sections[d.ref]?.startsWith("bias")))
    for (const n of conduction(d)) if (!signal.has(n)) auxiliaryNets.add(n);
  for (const m of mods)
    if (m.kind === "bias")
      for (const r of m.refs) sections[r] = "bias-" + mods.indexOf(m);
  // Keep named rails local to each recognizable functional block.
  for (const m of mods)
    if (m.kind !== "bias")
      for (const r of m.refs) sections[r] = "main-" + mods.indexOf(m);
  const ports = {};
  for (const name of portNames) {
    const net = name.toLowerCase();
    if (["vdd", "vss", "ibias"].includes(net)) {
      const candidates = ds.filter((d) => conduction(d).includes(net));
      const d =
        net === "ibias"
          ? (candidates.find((d) => d.pins[0] === net && d.pins[1] === net) ??
            candidates[0])
          : (candidates
              .filter((d) => main.has(d.ref))
              .sort((a, b) =>
                net === "vdd"
                  ? devices[a.ref][1] - devices[b.ref][1]
                  : devices[b.ref][1] - devices[a.ref][1],
              )[0] ?? candidates[0]);
      const p = devices[d.ref],
        sec = sections[d.ref];
      const ys = ds
        .filter((d) => sections[d.ref] === sec)
        .map((d) => devices[d.ref][1]);
      ports[name] = [
        Math.max(20, p[0] - 100),
        net === "vdd"
          ? Math.min(...ys) - 60
          : net === "vss"
            ? Math.max(...ys) + 60
            : p[1] - 40,
      ];
      sections["@" + name] = sec;
    } else {
      const d =
        ds.find(
          (d) =>
            "np".includes(d.kind) && d.pins[net === "vout" ? 0 : 1] === net,
        ) ?? ds.find((d) => d.pins.includes(net));
      const p = devices[d.ref],
        mir = p[2] === "horizontal" || ("rc".includes(d.kind) && p[2] === 90);
      ports[name] =
        net === "vout"
          ? [p[0] + 110, p[1] + (d.kind === "p" ? 40 : -40), 180]
          : [p[0] + (mir ? 70 : -70), p[1], mir ? 180 : 0];
    }
  }
  return {
    id,
    strategy: "connected-stages",
    continuousNets: [
      ...new Set(
        ds.flatMap((d) => d.pins).filter((n) => !auxiliaryNets.has(n)),
      ),
    ].sort(),
    devices,
    ports,
    title: "Transistor-level OTA",
    description:
      "Continuous differential, mirror, interstage and compensation wiring; auxiliary bias controls use native bound labels.",
    body_note: base.body_note,
    draw(c) {
      routeDrawing(c, ds, devices, ports, sections, auxiliaryNets);
    },
  };
}
