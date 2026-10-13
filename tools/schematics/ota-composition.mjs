import { compactPlacement } from "./layout-spacing.mjs";
import { attachSignalPassives } from "./ota-stage-placement.mjs";
/** Geometry-only composition for connected OTA drawings.
 * Keep existing branch symmetry and stage membership, contract unused strips,
 * then place complete auxiliary current paths beside their actual consumers.
 * Source devices, terminal order and routing nets are never changed here. */
export function composeConnectedOta(ds, devices, mods, auxiliaryNets) {
  const byRef = new Map(ds.map((d) => [d.ref, d]));
  const bias = mods.filter((m) => m.kind === "bias");
  const biasRefs = new Set(bias.flatMap((m) => m.refs));
  const main = ds.filter((d) => !biasRefs.has(d.ref));
  if (!main.length || !bias.length) return;

  // A monotone coordinate map preserves alignments and the order of every
  // branch. Only a genuinely empty strip is contracted; symbol scale stays put.
  for (const [axis, keep] of [
    [0, 170],
    [1, 150],
  ]) {
    const coords = [...new Set(main.map((d) => devices[d.ref][axis]))].sort(
      (a, b) => a - b,
    );
    const moved = new Map([[coords[0], coords[0]]]);
    for (let i = 1; i < coords.length; i++)
      moved.set(
        coords[i],
        moved.get(coords[i - 1]) + Math.min(keep, coords[i] - coords[i - 1]),
      );
    for (const d of main)
      devices[d.ref][axis] = moved.get(devices[d.ref][axis]);
  }

  // A bias RC filter is a side branch of the reference node, not another
  // device in its VDD-to-VSS current stack. Keep the resistor horizontal and
  // the capacitor beside it, so its wire never skirts the sink's symbol.
  for (const m of bias) {
    const local = m.refs.map((r) => byRef.get(r));
    for (const resistor of local.filter((d) => d.kind === "r")) {
      const diode = local.find(
        (d) =>
          "np".includes(d.kind) &&
          d.pins[0] === d.pins[1] &&
          resistor.pins.includes(d.pins[0]),
      );
      if (!diode) continue;
      const origin = diode.pins[0],
        filtered = resistor.pins.find((n) => n !== origin);
      if (
        !filtered ||
        local.some(
          (d) =>
            "np".includes(d.kind) && [d.pins[0], d.pins[2]].includes(filtered),
        )
      )
        continue;
      const cap = local.find(
        (d) =>
          d.kind === "c" &&
          d.pins.includes(filtered) &&
          d.pins.some((n) => ["vdd", "vss"].includes(n)),
      );
      if (!cap) continue;
      const [x, y] = devices[diode.ref],
        rail = cap.pins.find((n) => n !== filtered);
      devices[resistor.ref] = [
        x + 140,
        y + 60,
        resistor.pins[0] === origin ? 270 : 90,
      ];
      devices[cap.ref] = [
        x + 260,
        y + (rail === "vdd" ? 0 : 120),
        cap.pins[0] === (rail === "vdd" ? rail : filtered) ? 0 : 180,
      ];
    }
  }

  const bounds = (refs, margin = 0) => {
    const boxes = refs.map((r) => {
      const d = byRef.get(r),
        [x, y, mode] = devices[r],
        mos = "np".includes(d.kind);
      const label = Math.max(60, r.length * 9 + 25);
      return {
        x1:
          x -
          (mos && d.pins[0] === "ibias" && d.pins[1] === "ibias"
            ? 135
            : mos && mode === "horizontal"
              ? label
              : 55) -
          margin,
        x2: x + (mos && mode === "horizontal" ? 55 : label) + margin,
        y1: y - 55 - margin,
        y2: y + 55 + margin,
      };
    });
    return {
      x1: Math.min(...boxes.map((b) => b.x1)),
      x2: Math.max(...boxes.map((b) => b.x2)),
      y1: Math.min(...boxes.map((b) => b.y1)),
      y2: Math.max(...boxes.map((b) => b.y2)),
    };
  };
  const overlaps = (a, b) =>
    a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
  const originalMainBounds = bounds(main.map((d) => d.ref));
  compactPlacement(main, devices);
  attachSignalPassives(ds, devices, main, bounds, overlaps);
  const mainBounds = bounds(main.map((d) => d.ref));
  const occupied = main.map((d) => bounds([d.ref], 25));

  // External signal ports need their own clearance beyond the device body.
  for (const d of main) {
    const [x, y, mode] = devices[d.ref];
    if ("np".includes(d.kind) && d.pins[0] === "vout") {
      const inputX = main
        .filter((q) => "np".includes(q.kind) && /^vin_?[pn]$/.test(q.pins[1]))
        .map((q) => devices[q.ref][0]);
      const left = inputX.length && x < Math.min(...inputX) - 60;
      occupied.push({
        x1: x + (left ? -190 : 55),
        x2: x + (left ? -55 : 190),
        y1: y + (d.kind === "p" ? 10 : -70),
        y2: y + (d.kind === "p" ? 80 : 0),
      });
    }
    if ("np".includes(d.kind) && /^vin_?[pn]$/.test(d.pins[1])) {
      const side = mode === "horizontal" ? 1 : -1;
      occupied.push({
        x1: x + (side > 0 ? 20 : -120),
        x2: x + (side > 0 ? 120 : -20),
        y1: y - 40,
        y2: y + 30,
      });
    }
  }

  // Reserve the principal signal corridors as well as symbols. Auxiliary
  // branches must not occupy the spaces that make pairs, mirrors or RC paths
  // readable. Local net corridors deliberately favor placement at their flank.
  const signal = new Map();
  for (const d of main)
    d.pins.slice(0, "np".includes(d.kind) ? 3 : 2).forEach((n) => {
      if (auxiliaryNets.has(n)) return;
      if (!signal.has(n)) signal.set(n, []);
      signal.get(n).push(d.ref);
    });
  for (const refs of signal.values()) {
    const pending = new Set(refs),
      tree = [pending.values().next().value];
    pending.delete(tree[0]);
    // Nearby branch-to-branch corridors expose the actual shared tree. A
    // single bounding rectangle would also reserve its empty interior, which
    // is exactly where a local auxiliary circuit often belongs.
    while (pending.size) {
      let edge;
      for (const a of tree)
        for (const b of pending) {
          const p = devices[a],
            q = devices[b];
          const distance = Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]);
          if (!edge || distance < edge.distance) edge = { a, b, distance };
        }
      const p = devices[edge.a], q = devices[edge.b];
      if (Math.abs(p[0] - q[0]) <= 120 || Math.abs(p[1] - q[1]) <= 120) {
        occupied.push(bounds([edge.a, edge.b], 20));
      } else {
        // A long diagonal endpoint pair needs two wire corridors, not an
        // exclusion rectangle covering all the unused space between them.
        // Keep the clear L orientation; actual native routing still verifies
        // every terminal and may choose another clear shared tree.
        const horizontal = (y) => ({ x1: Math.min(p[0], q[0]) - 30,
          x2: Math.max(p[0], q[0]) + 30, y1: y - 40, y2: y + 40 });
        const vertical = (x) => ({ x1: x - 40, x2: x + 40,
          y1: Math.min(p[1], q[1]) - 30, y2: Math.max(p[1], q[1]) + 30 });
        const alternatives = [[horizontal(p[1]), vertical(q[0])],
          [vertical(p[0]), horizontal(q[1])]];
        const penalty = (corridors) => corridors.reduce((sum, c) =>
          sum + occupied.filter((b) => overlaps(c, b)).length, 0);
        alternatives.sort((a, b) => penalty(a) - penalty(b));
        occupied.push(...alternatives[0]);
      }
      tree.push(edge.b);
      pending.delete(edge.b);
    }
  }

  // Larger auxiliary chains get first choice. Their internal geometry follows
  // actual current paths, including attached capacitors, and moves as a unit.
  const blocks = bias
    .map((m) => ({ m, box: bounds(m.refs) }))
    .sort(
      (a, b) =>
        (b.box.x2 - b.box.x1) * (b.box.y2 - b.box.y1) -
        (a.box.x2 - a.box.x1) * (a.box.y2 - a.box.y1),
    );
  let envelope = { ...mainBounds };
  const placedAux = new Set();
  for (const { m, box } of blocks) {
    const nets = new Set(
      m.refs
        .flatMap((r) => byRef.get(r).pins.slice(0, 3))
        .filter((n) => !["vdd", "vss"].includes(n)),
    );
    const consumers = ds.filter(
      (d) =>
        (!biasRefs.has(d.ref) || placedAux.has(d.ref)) &&
        "np".includes(d.kind) &&
        nets.has(d.pins[1]),
    );
    const cx = consumers.length
      ? consumers.reduce((s, d) => s + devices[d.ref][0], 0) / consumers.length
      : (mainBounds.x1 + mainBounds.x2) / 2;
    const cy = consumers.length
      ? consumers.reduce((s, d) => s + devices[d.ref][1], 0) / consumers.length
      : mainBounds.y2;
    let best;
    const height = box.y2 - box.y1;
    // A width-only cap can force a short bias path into a much taller sheet.
    // Reuse the pre-contraction width allowance when it avoids that trade-off.
    const rightLimit = Math.max(mainBounds.x2, originalMainBounds.x2) + 60;
    // Candidate edges follow a 10-unit routing grid. Search the nearby sheet,
    // including beneath a short output stage and beside taller folded branches.
    const maxX = Math.ceil((mainBounds.x2 + 320) / 20) * 20;
    const maxY = Math.ceil((mainBounds.y2 + height + 180) / 20) * 20;
    for (let x = 40; x <= maxX; x += 20)
      for (let y = 80; y <= maxY; y += 20) {
        const dx = Math.round((x - box.x1) / 10) * 10,
          dy = Math.round((y - box.y1) / 10) * 10;
        const candidate = {
          x1: box.x1 + dx,
          x2: box.x2 + dx,
          y1: box.y1 + dy,
          y2: box.y2 + dy,
        };
        if (
          candidate.x2 > rightLimit ||
          occupied.some((b) => overlaps(candidate, b))
        )
          continue;
        const e = {
          x1: Math.min(envelope.x1, candidate.x1),
          x2: Math.max(envelope.x2, candidate.x2),
          y1: Math.min(envelope.y1, candidate.y1),
          y2: Math.max(envelope.y2, candidate.y2),
        };
        const w = e.x2 - e.x1,
          h = e.y2 - e.y1;
        const distance =
          Math.abs((candidate.x1 + candidate.x2) / 2 - cx) +
          Math.abs((candidate.y1 + candidate.y2) / 2 - cy);
        const score = w * h + 160 * distance + 0.18 * (w - 1.25 * h) ** 2;
        if (!best || score < best.score)
          best = { candidate, dx, dy, envelope: e, score };
      }
    if (!best)
      throw Error("No nearby auxiliary placement for " + m.refs.join(","));
    for (const ref of m.refs) {
      devices[ref][0] += best.dx;
      devices[ref][1] += best.dy;
      placedAux.add(ref);
    }
    occupied.push({
      x1: best.candidate.x1 - 30,
      x2: best.candidate.x2 + 30,
      y1: best.candidate.y1 - 30,
      y2: best.candidate.y2 + 30,
    });
    envelope = best.envelope;
  }
}
