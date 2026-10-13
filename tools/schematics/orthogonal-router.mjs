/** Manhattan trees for source-bound drawings. Routes reserve symbols, text,
 * terminal escapes and existing foreign wires; only plain crossings are legal. */
export function routeDrawing(
  c,
  ds,
  devices,
  ports,
  sections,
  auxiliaryNets,
  options = {},
) {
  const step = 10,
    coord = (x, y) => `${x},${y}`;
  const points = new Map(),
    pins = new Map(),
    groups = new Map(),
    obstacles = [];
  const add = (key, net, dx, dy, section) => {
    const p = c.point(key),
      x = Math.round(p.x / step),
      y = Math.round(p.y / step);
    if (p.x !== x * step || p.y !== y * step)
      throw Error("Off-grid terminal " + key);
    const t = { key, net, x, y, dx, dy, section };
    points.set(key, t);
    pins.set(coord(x, y), t);
    const group = auxiliaryNets.has(net) ? `${net}:${section}` : net;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(t);
  };
  for (const d of ds) {
    const [px, py, rot] = devices[d.ref],
      x = px / step,
      y = py / step,
      mir = rot === "horizontal",
      mos = "np".includes(d.kind);
    obstacles.push({ x1: x - 1.8, x2: x + 1.8, y1: y - 1.8, y2: y + 1.8 });
    const width = d.labelWidth ?? Math.max(3, d.ref.length) * 0.9 + 0.5;
    if (mos)
      obstacles.push({
        x1: mir ? x - 2 - width : x + 2 - (d.labelClearance ?? 0),
        x2: mir ? x - 2 + (d.labelClearance ?? 0) : x + 2 + width,
        y1: y - 1.1,
        y2: y + 0.8,
      });
    else if ((rot ?? 0) % 180)
      obstacles.push({
        x1: x - Math.max(width, 5) / 2,
        x2: x + Math.max(width, 5) / 2,
        y1: y - 4.5,
        y2: y - 1,
      });
    else
      obstacles.push({
        x1: x + 1.6,
        x2: x + 1.6 + Math.max(width, 5),
        y1: y - 1.8,
        y2: y + 1.8,
      });
    const section = sections[d.ref] ?? "main";
    if (mos) {
      add(d.ref + ".D", d.pins[0], 0, d.kind === "n" ? -1 : 1, section);
      add(d.ref + ".G", d.pins[1], mir ? 1 : -1, 0, section);
      add(d.ref + ".S", d.pins[2], 0, d.kind === "n" ? 1 : -1, section);
    } else {
      for (let i = 0; i < 2; i++) {
        const p = c.point(d.ref + "." + (i + 1));
        add(
          d.ref + "." + (i + 1),
          d.pins[i],
          Math.sign(p.x - px),
          Math.sign(p.y - py),
          section,
        );
      }
    }
  }
  for (const [name, pos] of Object.entries(ports)) {
    const k = "@" + name,
      p = c.point(k),
      direction = pos[2] === 180 ? -1 : 1;
    add(k, name.toLowerCase(), direction, 0, sections[k] ?? "main");
    obstacles.push({
      x1: p.x / step + (direction > 0 ? -1.5 : 0.1),
      x2: p.x / step + (direction > 0 ? -0.1 : 1.5),
      y1: p.y / step - 0.6,
      y2: p.y / step + 0.6,
    });
    obstacles.push({
      x1: p.x / step - 3,
      x2: p.x / step + 3,
      y1: p.y / step - 2.8,
      y2: p.y / step - 0.8,
    });
  }
  const all = [...points.values()],
    maxX = Math.max(...all.map((p) => p.x)) + 20,
    maxY = Math.max(...all.map((p) => p.y)) + 20;
  const occupied = new Map(),
    netTrees = new Map(),
    labels = [];
  const reserved = new Map();
  for (const [group, ps] of groups)
    for (const p of ps)
      for (let i = 0; i <= 2; i++) {
        const k = coord(p.x + i * p.dx, p.y + i * p.dy);
        if (reserved.has(k) && reserved.get(k) !== group)
          throw Error("Terminal escapes overlap " + p.key);
        reserved.set(k, group);
      }
  const at = (x, y) => occupied.get(coord(x, y));
  const blocks = new Set();
  for (const b of obstacles)
    for (let x = Math.floor(b.x1) + 1; x < b.x2; x++)
      for (let y = Math.floor(b.y1) + 1; y < b.y2; y++) blocks.add(coord(x, y));
  const blocked = (x, y) => blocks.has(coord(x, y));
  const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ],
    opposite = (d) => d ^ 1;
  function put(net, x, y, d) {
    const k = coord(x, y);
    if (!occupied.has(k)) occupied.set(k, new Map());
    const nets = occupied.get(k);
    if (!nets.has(net)) nets.set(net, new Set());
    nets.get(net).add(d);
  }
  function edge(net, a, b) {
    const d = b[0] > a[0] ? 0 : b[0] < a[0] ? 1 : b[1] > a[1] ? 2 : 3;
    put(net, ...a, d);
    put(net, ...b, opposite(d));
  }
  function connect(net, ps) {
    // Source-specific visual corridors can keep one control net away from a
    // nearby rail or unrelated gate without imposing a global routing style.
    const zones = (options.netClearanceZones?.[net] ?? []).map((b) => ({
      x1: b[0] / step,
      y1: b[1] / step,
      x2: b[2] / step,
      y2: b[3] / step,
    }));
    const tree = new Set();
    // Each pin has a two-grid escape, keeping crossings away from symbols.
    const escaped = ps.map((p) => ({
      ...p,
      ex: p.x + 2 * p.dx,
      ey: p.y + 2 * p.dy,
    }));
    const todo = [...escaped];
    if (options.preferDeviceRoots && ps.length >= (options.deviceRootMinTerminals ?? 6) && !auxiliaryNets.has(ps[0].net) && ps[0].net !== "vout") {
      // Build a local shared-drain tree before reaching remote ports or
      // passive taps. Source declaration order is not a geometric root.
      const drains = todo.filter((p) => p.key.endsWith(".D"));
      const diodes = drains.filter((p) => todo.some((q) =>
        q.key === p.key.slice(0, -1) + "G"));
      const candidates = diodes.length ? diodes : drains;
      if (candidates.length) {
        const score = (p) => todo.reduce((sum, q) =>
          sum + Math.abs(p.ex - q.ex) + Math.abs(p.ey - q.ey), 0);
        candidates.sort((a, b) => score(a) - score(b));
        const at = todo.indexOf(candidates[0]);
        todo.unshift(...todo.splice(at, 1));
      }
    }
    const seed = todo.shift();
    function escape(p) {
      for (let i = 0; i < 2; i++)
        edge(
          net,
          [p.x + i * p.dx, p.y + i * p.dy],
          [p.x + (i + 1) * p.dx, p.y + (i + 1) * p.dy],
        );
      for (let i = 0; i <= 2; i++)
        tree.add(coord(p.x + i * p.dx, p.y + i * p.dy));
    }
    escape(seed);
    while (todo.length) {
      let best = 0,
        dist = Infinity;
      const rank = (p) => (/\.[12]$/.test(p.key) ? 1 : 0);
      const minRank = Math.min(...todo.map(rank));
      for (let i = 0; i < todo.length; i++)
        if (rank(todo[i]) === minRank)
          for (const k of tree) {
            const [x, y] = k.split(",").map(Number),
              p = todo[i],
              dd = Math.abs(x - p.ex) + Math.abs(y - p.ey);
            if (dd < dist) {
              dist = dd;
              best = i;
            }
          }
      const p = todo.splice(best, 1)[0],
        start = [p.ex, p.ey];
      const hit = [0, 1, 2].find((i) =>
        tree.has(coord(p.x + i * p.dx, p.y + i * p.dy)),
      );
      if (hit !== undefined) {
        for (let i = 0; i < hit; i++) {
          const a = [p.x + i * p.dx, p.y + i * p.dy],
            b = [p.x + (i + 1) * p.dx, p.y + (i + 1) * p.dy];
          edge(net, a, b);
          tree.add(coord(...a));
        }
        p.ex = p.x + hit * p.dx;
        p.ey = p.y + hit * p.dy;
        continue;
      }
      const target = [...tree].map((k) => k.split(",").map(Number));
      const width = maxX + 1,
        height = maxY + 1,
        field = new Int32Array(width * height).fill(1000000);
      for (const [x, y] of target) field[y * width + x] = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const i = y * width + x;
          field[i] = Math.min(
            field[i],
            x ? field[i - 1] + 1 : 1000000,
            y ? field[i - width] + 1 : 1000000,
          );
        }
      for (let y = height - 1; y >= 0; y--)
        for (let x = width - 1; x >= 0; x--) {
          const i = y * width + x;
          field[i] = Math.min(
            field[i],
            x + 1 < width ? field[i + 1] + 1 : 1000000,
            y + 1 < height ? field[i + width] + 1 : 1000000,
          );
        }
      const heuristic = (x, y) => field[y * width + x];
      const heap = [],
        costs = new Map(),
        parents = new Map();
      const push = (v) => {
        heap.push(v);
        let i = heap.length - 1;
        while (i) {
          const j = (i - 1) >> 1;
          if (heap[j].f <= v.f) break;
          heap[i] = heap[j];
          i = j;
        }
        heap[i] = v;
      };
      const pop = () => {
        const v = heap[0],
          last = heap.pop();
        if (heap.length) {
          let i = 0;
          while (i * 2 + 1 < heap.length) {
            let j = i * 2 + 1;
            if (j + 1 < heap.length && heap[j + 1].f < heap[j].f) j++;
            if (heap[j].f >= last.f) break;
            heap[i] = heap[j];
            i = j;
          }
          heap[i] = last;
        }
        return v;
      };
      const sd = p.dx ? (p.dx > 0 ? 0 : 1) : p.dy > 0 ? 2 : 3,
        sk = coord(...start) + "," + sd;
      costs.set(sk, 0);
      push({
        x: start[0],
        y: start[1],
        d: sd,
        g: 0,
        f: heuristic(...start),
        key: sk,
      });
      let found;
      while (heap.length) {
        const u = pop();
        if (u.g !== costs.get(u.key)) continue;
        if (
          tree.has(coord(u.x, u.y)) &&
          !pins.has(coord(u.x, u.y)) &&
          (at(u.x, u.y)?.get(net)?.size ?? 0) < 3
        ) {
          found = u;
          break;
        }
        for (let d = 0; d < 4; d++) {
          if (d === opposite(u.d)) continue;
          const [dx, dy] = dirs[d],
            x = u.x + dx,
            y = u.y + dy,
            k = coord(x, y);
          if (
            x < 0 ||
            y < 0 ||
            x > maxX ||
            y > maxY ||
            blocked(x, y) ||
            zones.some(
              (b) => x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2,
            ) ||
            (reserved.has(k) && reserved.get(k) !== net)
          )
            continue;
          const pin = pins.get(k);
          if (pin && !tree.has(k)) continue;
          const here = at(u.x, u.y),
            there = at(x, y);
          let crossing = 0,
            valid = true;
          for (const [other, used] of here ?? []) {
            if (other === net) continue;
            if (
              d !== u.d ||
              used.has(d) ||
              used.has(opposite(d)) ||
              used.size !== 2
            ) {
              valid = false;
              break;
            }
          }
          if (!valid) continue;
          if (options.separateInputNets && /^vin_?[pn]$/.test(net)) {
            // Shared input ports of complementary pairs need distinct trunks.
            // A perpendicular crossing stays legal; close parallel ladders do not.
            for (let distance = 1; distance <= 3 && valid; distance++) {
              const offsets = d < 2 ? [[0, distance], [0, -distance]]
                : [[distance, 0], [-distance, 0]];
              for (const [ax, ay] of offsets)
                for (const [other, used] of at(x + ax, y + ay) ?? [])
                  if (other !== net && /^vin_?[pn]$/.test(other) &&
                    (used.has(d) || used.has(opposite(d)))) valid = false;
            }
          }
          if (!valid) continue;
          for (const [other, used] of there ?? []) {
            if (other === net) {
              if (used.size >= 3 || (!tree.has(k) && used.size)) valid = false;
              continue;
            }
            if (
              used.has(d) ||
              used.has(opposite(d)) ||
              used.size !== 2 ||
              pins.has(k)
            ) {
              valid = false;
              break;
            }
            crossing = 10;
          }
          if (!valid) continue;
          // Avoid running along a foreign line just one grid away.
          const near = dirs.some(([ax, ay]) =>
            [...(at(x + ax, y + ay)?.keys() ?? [])].some((n) => n !== net),
          )
            ? 0.3
            : 0;
          const g = u.g + 1 + (d !== u.d ? 7 : 0) + crossing + near,
            key = k + "," + d;
          if (g >= (costs.get(key) ?? Infinity)) continue;
          costs.set(key, g);
          parents.set(key, u.key);
          push({ x, y, d, g, key, f: g + heuristic(x, y) });
        }
      }
      if (!found) {
        if (process.env.ATB_ROUTE_DEBUG) console.log("route-start-obstacles", net,
          p.key, start, dirs.map(([dx, dy]) => ({
            point: [start[0] + dx, start[1] + dy],
            blocked: blocked(start[0] + dx, start[1] + dy),
            reserved: reserved.get(coord(start[0] + dx, start[1] + dy)),
            occupied: [...(at(start[0] + dx, start[1] + dy)?.keys() ?? [])],
          })));
        throw Error("No route " + net + " " + p.key);
      }
      const path = [];
      let k = found.key;
      while (k) {
        const [x, y] = k.split(",").map(Number);
        path.push([x, y]);
        k = parents.get(k);
      }
      escape(p);
      for (let i = 1; i < path.length; i++) edge(net, path[i - 1], path[i]);
      for (const [x, y] of path) tree.add(coord(x, y));
    }
    netTrees.set(net, tree);
    if (auxiliaryNets.has(seed.net)) {
      // Label a clear escape of this connected local branch.
      labels.push({
        net: seed.net,
        group: net,
        p: escaped.find((p) => p.key.startsWith("@")) ?? seed,
      });
    }
  }
  const sorted = [...groups].sort((a, b) => {
    const aux = (x) => (auxiliaryNets.has(x[1][0].net) ? 1 : 0);
    // Short local nets first, then shared stage nodes; auxiliary routes last.
    const span = (ps) =>
      Math.max(...ps.map((p) => p.x)) -
      Math.min(...ps.map((p) => p.x)) +
      Math.max(...ps.map((p) => p.y)) -
      Math.min(...ps.map((p) => p.y));
    return aux(a) - aux(b) || span(a[1]) - span(b[1]);
  });
  for (const [group, ps] of sorted) {
    if (process.env.ATB_ROUTE_DEBUG)
      console.log("route", group, ps.map((p) => p.key).join(" "));
    connect(group, ps);
  }
  // An early escape can become a redundant spur once a closer T is used.
  // Remove only leaf geometry, never a terminal or a named anchor.
  for (const [group, tree] of netTrees) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const k of [...tree]) {
        const [x, y] = k.split(",").map(Number),
          dd = at(x, y).get(group);
        if (
          dd.size !== 1 ||
          pins.has(k) ||
          labels.some((l) => l.group === group && l.p.ex === x && l.p.ey === y)
        )
          continue;
        const d = [...dd][0],
          [dx, dy] = dirs[d];
        at(x + dx, y + dy)
          .get(group)
          .delete(opposite(d));
        at(x, y).delete(group);
        tree.delete(k);
        changed = true;
      }
    }
  }
  for (const [group, tree] of netTrees)
    for (const key of tree) {
      const [x, y] = key.split(",").map(Number);
      if (at(x, y).get(group).size > 3)
        throw Error("Four-way join needs a separate T: " + group + " " + key);
    }
  // Compress each tree into branches and turns, with one native junction per
  // coordinate. Plain foreign crossings keep distinct native endpoints.
  const nodeKeys = new Map();
  let serial = 0;
  const endpoint = (group, x, y) => {
    const k = group + ":" + coord(x, y);
    if (nodeKeys.has(k)) return nodeKeys.get(k);
    const pin = pins.get(coord(x, y)),
      net = groups.get(group)[0].net;
    const key =
      pin && groups.get(group).includes(pin)
        ? pin.key
        : "connected-" + serial++;
    if (!key.startsWith("@") && !points.has(key))
      c.j(key, net, x * step, y * step);
    nodeKeys.set(k, key);
    return key;
  };
  const visited = new Set();
  for (const [group, tree] of netTrees) {
    const net = groups.get(group)[0].net;
    const special = (x, y) => {
      const dd = at(x, y).get(group);
      return (
        labels.some((l) => l.group === group && l.p.ex === x && l.p.ey === y) ||
        pins.has(coord(x, y)) ||
        dd.size !== 2 ||
        !((dd.has(0) && dd.has(1)) || (dd.has(2) && dd.has(3)))
      );
    };
    for (const k of tree) {
      const [x, y] = k.split(",").map(Number);
      if (!special(x, y)) continue;
      for (const d of at(x, y).get(group)) {
        const [dx, dy] = dirs[d];
        let nx = x + dx,
          ny = y + dy;
        while (!special(nx, ny)) {
          nx += dx;
          ny += dy;
        }
        const e = [coord(x, y), coord(nx, ny)].sort().join(":");
        if (visited.has(group + e)) continue;
        visited.add(group + e);
        c.w(net, endpoint(group, x, y), endpoint(group, nx, ny));
      }
    }
  }
  for (const { net, group, p } of labels) {
    // Add a midpoint native anchor even when the escape is straight.
    const x = p.ex,
      y = p.ey,
      key = endpoint(group, x, y);
    const width = net.length * 9 + 4 + (options.supplyLabelWidthAllowance ?? 0);
    const clearance = (options.supplyLabelClearance ?? 0) / step;
    const candidates = [];
    for (const dy of [-10, 18, -24, 32, -38, 46])
      for (const side of [p.dx < 0 ? -1 : 1, p.dx < 0 ? 1 : -1])
        for (const gap of [8, 18, 28])
          candidates.push({
            dx: side * gap,
            dy,
            align: side < 0 ? "end" : "start",
          });
    const clear = (l) => {
      const x1 =
          x + (l.dx + (l.align === "end" ? -width : 0)) / step - clearance,
        x2 = x1 + width / step + 2 * clearance,
        y1 = y + (l.dy - 14) / step - clearance,
        y2 = y + (l.dy + 2) / step + clearance;
      if (
        obstacles.some((b) => b.x1 < x2 && b.x2 > x1 && b.y1 < y2 && b.y2 > y1)
      )
        return false;
      for (let xx = Math.floor(x1); xx <= Math.ceil(x2); xx++)
        for (let yy = Math.floor(y1); yy <= Math.ceil(y2); yy++) {
          for (const dd of at(xx, yy)?.values() ?? []) {
            for (const d of dd) {
              const [dx, dy] = dirs[d];
              if (
                Math.max(xx, xx + dx) > x1 &&
                Math.min(xx, xx + dx) < x2 &&
                Math.max(yy, yy + dy) >= y1 &&
                Math.min(yy, yy + dy) <= y2
              )
                return false;
            }
          }
        }
      return true;
    };
    const clearCandidate = candidates.find(clear);
    if (!clearCandidate && options.requireClearSupplyLabels)
      throw Error("No clear supply label: " + group + " at " + p.key);
    const l = clearCandidate ?? candidates[0];
    c.boundLabel(net, key, l.dx, l.dy, l.align);
    const x1 = x + (l.dx + (l.align === "end" ? -width : 0)) / step;
    obstacles.push({
      x1,
      x2: x1 + width / step,
      y1: y + (l.dy - 14) / step,
      y2: y + (l.dy + 2) / step,
    });
  }
}
