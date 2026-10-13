/** Source-derived orientation for complete complementary input blocks. */
export function alignComplementaryInputs(ds, devices, mods, pairMods) {
  if (pairMods.length < 2) return;
  const byRef = new Map(ds.map((d) => [d.ref, d]));
  const outputControls = ds.filter((d) => "np".includes(d.kind) &&
    d.pins[0] === "vout").map((d) => d.pins[1]);
  const anchor = pairMods.find((m) => m.pair.some((r) =>
    outputControls.includes(byRef.get(r).pins[0]))) ?? pairMods[0];
  const reflect = (m) => {
    const block = mods.find((b) => b.refs.includes(m.pair[0]));
    const axes = m.pair.map((r) => devices[r][0] +
      (devices[r][2] === "horizontal" ? -10 : 10));
    const sum = axes[0] + axes[1];
    for (const ref of block.refs) {
      const d = byRef.get(ref), p = devices[ref];
      p[0] = sum - p[0];
      if ("np".includes(d.kind)) p[2] = p[2] === "horizontal" ? undefined : "horizontal";
      else if ((p[2] ?? 0) % 180) p[2] = p[2] === 90 ? 270 : 90;
    }
  };
  const driven = anchor.pair.find((r) => outputControls.includes(byRef.get(r).pins[0]));
  if (driven && devices[driven][0] < devices[anchor.pair.find((r) => r !== driven)][0])
    reflect(anchor);
  const ordered = (m) => [...m.pair].sort((a, b) => devices[a][0] - devices[b][0])
    .map((r) => byRef.get(r).pins[1]);
  const expected = ordered(anchor);
  for (const m of pairMods.filter((m) => m !== anchor)) {
    const actual = ordered(m);
    if (actual[0] === expected[1] && actual[1] === expected[0]) reflect(m);
  }
}

/** Recover a source-matched current-source-loaded mirror transfer stage. */
export function alignLoadedMirrorStage(ds, devices, mods) {
  const protectedRefs = new Set(mods.filter((m) => ["input", "output"].includes(m.kind))
    .flatMap((m) => m.refs));
  const candidates = ds.filter((d) => d.kind === "n" && d.pins[2] === "vss" &&
    !protectedRefs.has(d.ref));
  const gates = [...new Set(candidates.map((d) => d.pins[1]))];
  for (const gate of gates) {
    const lowers = candidates.filter((d) => d.pins[1] === gate);
    if (lowers.length !== 2 || !lowers.some((d) => d.pins[0] === gate)) continue;
    const uppers = lowers.map((d) => ds.find((p) => p.kind === "p" &&
      p.pins[0] === d.pins[0] && p.pins[2] === "vdd" && !protectedRefs.has(p.ref)));
    if (!uppers.every(Boolean) || uppers[0] === uppers[1] || uppers[0].pins[1] !== uppers[1].pins[1]) continue;
    const nodes = new Set(lowers.map((d) => d.pins[0]));
    const inputs = ds.filter((d) => protectedRefs.has(d.ref) && "np".includes(d.kind) &&
      nodes.has(d.pins[0]) && /^vin_?[pn]$/.test(d.pins[1]));
    if (inputs.length < 2) continue;
    const tap = Math.round(inputs.reduce((sum, d) => sum + devices[d.ref][1] +
      (d.kind === "n" ? -40 : 40), 0) / inputs.length / 10) * 10;
    lowers.forEach((d, i) => {
      const axis = devices[d.ref][0] + (devices[d.ref][2] === "horizontal" ? -10 : 10);
      devices[d.ref][1] = tap + 70;
      const p = uppers[i], mirrored = devices[p.ref][2] === "horizontal";
      devices[p.ref][0] = axis + (mirrored ? 10 : -10);
      devices[p.ref][1] = tap - 70;
    });
    for (const block of mods.filter((m) => m.kind === "output")) {
      const amp = block.refs.map((r) => ds.find((d) => d.ref === r))
        .find((d) => "np".includes(d.kind) && nodes.has(d.pins[1]));
      if (!amp) continue;
      const dy = tap - devices[amp.ref][1];
      block.refs.forEach((ref) => { devices[ref][1] += dy; });
    }
  }
}

/** Attach formerly detached signal shunts and direct port feed-forward parts.
 * Existing nearby placements remain unchanged. Supply labels stay local. */
export function attachSignalPassives(ds, devices, main, bounds, overlaps) {
  const mos = main.filter((d) => "np".includes(d.kind));
  for (const d of main.filter((d) => "rc".includes(d.kind))) {
    const rail = d.pins.find((n) => ["vdd", "vss"].includes(n));
    const node = rail && d.pins.find((n) => n !== rail);
    const feed = d.kind === "r" && d.pins.includes("vout") &&
      d.pins.find((n) => /^vin_?[pn]$/.test(n));
    if ((!rail || node === "vout") && !feed) continue;
    const peers = mos.filter((q) => rail ? q.pins[0] === node : q.pins[1] === feed);
    if (!peers.length) continue;
    const owner = [...peers].sort((a, b) => devices[b.ref][0] - devices[a.ref][0])[0];
    const anchor = devices[owner.ref], original = [...devices[d.ref]];
    if (Math.abs(original[0] - anchor[0]) + Math.abs(original[1] - anchor[1]) < 250) continue;
    const output = feed && mos.find((q) => q.pins[0] === "vout");
    const cx = feed ? Math.round((anchor[0] + devices[output.ref][0]) / 20) * 10 : anchor[0];
    const candidates = [];
    const xs = feed ? [cx, cx - 100, cx + 100] : [anchor[0] + 160, anchor[0] - 160, anchor[0] + 280, anchor[0] - 280];
    const ys = feed ? [anchor[1] - 120, anchor[1] + 80, anchor[1] + 160]
      : [anchor[1], anchor[1] - 120, anchor[1] + 120, anchor[1] + 240];
    for (const x of xs) for (const y of ys) {
      if (x < 70 || y < 80) continue;
      const upper = rail === "vdd" ? rail : node;
      const mode = feed ? d.pins[0] === feed ? 270 : 90 : d.pins[0] === upper ? 0 : 180;
      devices[d.ref] = [x, y, mode];
      const box = bounds([d.ref], 10);
      if (main.some((q) => q !== d && overlaps(box, bounds([q.ref], 10)))) continue;
      const score = Math.abs(x - anchor[0]) + Math.abs(y - anchor[1]) +
        (feed ? Math.abs(x - devices[output.ref][0]) + Math.abs(y - devices[output.ref][1]) : 0);
      candidates.push({ position: [x, y, mode], score });
    }
    devices[d.ref] = candidates.sort((a, b) => a.score - b.score)[0]?.position ?? original;
  }
}
