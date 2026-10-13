/** Contract unused placement intervals without scaling symbols or text.
 * Constraints reserve terminal escapes, reference ink and passive labels.
 * The monotone map keeps columns/rows ordered and preserves shared axes. */
const mos = (d) => "np".includes(d.kind);
export function placementRegions(d, position) {
  const [x, y, mode] = position, mirrored = mode === "horizontal";
  const width = Math.max(40, d.ref.length * 10.4 + 15);
  const boxes = [{ x1: x - 20, x2: x + 20, y1: y - 20, y2: y + 20 }];
  if (mos(d)) {
    const sign = mirrored ? -1 : 1, axis = x + sign * 10;
    boxes.push({ x1: axis - 10, x2: axis + 10, y1: y - 50, y2: y + 50 });
    boxes.push({ x1: mirrored ? x + 18 : x - 45,
      x2: mirrored ? x + 45 : x - 18, y1: y - 12, y2: y + 12 });
    boxes.push({ x1: mirrored ? x - 20 - width : x + 20,
      x2: mirrored ? x - 20 : x + 20 + width, y1: y - 16, y2: y + 12 });
  } else if ((mode ?? 0) % 180) {
    boxes.push({ x1: x - 50, x2: x + 50, y1: y - 10, y2: y + 10 });
    boxes.push({ x1: x - width / 2, x2: x + width / 2, y1: y - 50, y2: y - 8 });
  } else {
    boxes.push({ x1: x - 10, x2: x + 10, y1: y - 50, y2: y + 50 });
    boxes.push({ x1: x + 16, x2: x + 16 + width, y1: y - 20, y2: y + 32 });
  }
  if (!mos(d)) for (let i = 0; i < 2; i++) {
    if (!["vin", "vdd", "vss"].includes(d.pins[i])) continue;
    let dx = 0, dy = i ? 40 : -40;
    for (let turn = 0; turn < (mode ?? 0) / 90; turn++) [dx, dy] = [-dy, dx];
    const side = dx < 0 ? -1 : 1, ex = x + dx, ey = y + dy;
    // Each supply-connected passive has a local rail label. Reserve one
    // nearby preferred ink region, rather than a broad empty rectangle.
    boxes.push({ x1: ex + (side < 0 ? -55 : 4),
      x2: ex + (side < 0 ? -4 : 55), y1: ey - 28, y2: ey - 6 });
  }
  return boxes;
}
export function placementBounds(d, position) {
  const [x, y, mode] = position, mirrored = mode === "horizontal";
  const width = Math.max(40, d.ref.length * 10.4 + 15);
  if (mos(d)) return {
    x1: x - (mirrored ? 20 + width : 60),
    x2: x + (mirrored ? 60 : 20 + width), y1: y - 60, y2: y + 60,
  };
  if ((mode ?? 0) % 180) return {
    x1: x - Math.max(60, width / 2), x2: x + Math.max(60, width / 2),
    y1: y - 50, y2: y + 40,
  };
  return { x1: x - 30, x2: x + 20 + Math.max(width, 65),
    y1: y - 60, y2: y + 60 };
}
export function compactPlacement(ds, devices, { maxGapX = 120, maxGapY = 120 } = {}) {
  const axis = (d) => devices[d.ref][0] +
    (mos(d) ? devices[d.ref][2] === "horizontal" ? -10 : 10 : 0);
  const bounds = (d) => placementBounds(d, devices[d.ref]);
  for (const dimension of [0, 1]) {
    const position = (d) => dimension ? devices[d.ref][1] : axis(d);
    const values = [...new Set(ds.map(position))].sort((a, b) => a - b);
    const index = new Map(values.map((v, i) => [v, i]));
    const constraints = values.map(() => []);
    const boxes = new Map(ds.map((d) => [d.ref, bounds(d)]));
    for (const a of ds) for (const b of ds) {
      const pa = position(a), pb = position(b);
      if (pa >= pb) continue;
      const ba = boxes.get(a.ref), bb = boxes.get(b.ref);
      const competing = dimension
        ? ba.x1 < bb.x2 + 10 && ba.x2 + 10 > bb.x1
        : ba.y1 < bb.y2 + 10 && ba.y2 + 10 > bb.y1;
      if (!competing) continue;
      const extent = dimension ? ba.y2 - pa + pb - bb.y1
        : ba.x2 - pa + pb - bb.x1;
      // Do not enlarge an already accepted tight local interval merely due
      // to conservative fallback-font estimates. Never make it tighter.
      const gap = Math.min(pb - pa, Math.ceil((extent + 10) / 10) * 10);
      constraints[index.get(pb)].push([index.get(pa), gap]);
    }
    const mapped = [values[0]], cap = dimension ? maxGapY : maxGapX;
    for (let i = 1; i < values.length; i++) {
      mapped[i] = mapped[i - 1] + Math.min(cap, values[i] - values[i - 1]);
      for (const [j, gap] of constraints[i])
        mapped[i] = Math.max(mapped[i], mapped[j] + gap);
    }
    const map = new Map(values.map((v, i) => [v, mapped[i]]));
    for (const d of ds) devices[d.ref][dimension] += map.get(position(d)) - position(d);
  }
}
