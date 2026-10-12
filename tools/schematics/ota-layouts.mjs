/** Source-derived OTA layouts. Reuse the reviewed two-stage motif only after
 * matching its ordered-pin connectivity; larger circuits use current-path groups. */
const canon = (s) => s.toLowerCase().replace(/^vin_([pn])$/, "vin$1");

export function otaDevices(source) {
  return source
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^[xrc]/i.test(s))
    .map((s) => {
      const w = s.split(/\s+/),
        mos = w[0][0].toLowerCase() === "x";
      return {
        ref: w[0],
        pins: w.slice(1, mos ? 5 : 3).map((s) => s.toLowerCase()),
        kind: mos ? (w[5].includes("nfet") ? "n" : "p") : w[0][0].toLowerCase(),
      };
    });
}

function twoStage(id, source, template, ds, ports) {
  const mos = ds.filter((d) => "np".includes(d.kind)),
    pass = ds.filter((d) => "rc".includes(d.kind));
  if (mos.length !== 8 || pass.length !== 2) return null;
  const supply = (d, s) => canon(d.pins[2]) === s;
  const bias = mos.find(
    (d) =>
      d.kind === "n" &&
      canon(d.pins[0]) === "ibias" &&
      d.pins[0] === d.pins[1] &&
      supply(d, "vss"),
  );
  const pair = mos.filter(
    (d) => d.kind === "n" && ["vinp", "vinn"].includes(canon(d.pins[1])),
  );
  if (!bias || pair.length !== 2 || pair[0].pins[2] !== pair[1].pins[2])
    return null;
  const tail = mos.find(
    (d) =>
      d.kind === "n" &&
      d.pins[0] === pair[0].pins[2] &&
      d.pins[1] === bias.pins[0] &&
      supply(d, "vss"),
  );
  const diode = mos.find(
    (d) =>
      d.kind === "p" &&
      d.pins[0] === d.pins[1] &&
      pair.some((p) => p.pins[0] === d.pins[0]) &&
      supply(d, "vdd"),
  );
  if (!tail || !diode) return null;
  const left = pair.find((d) => d.pins[0] === diode.pins[0]),
    right = pair.find((d) => d !== left);
  const load = mos.find(
    (d) =>
      d.kind === "p" &&
      d.pins[0] === right.pins[0] &&
      d.pins[1] === diode.pins[0] &&
      supply(d, "vdd"),
  );
  const amp = mos.find(
    (d) =>
      d.kind === "p" &&
      canon(d.pins[0]) === "vout" &&
      d.pins[1] === right.pins[0] &&
      supply(d, "vdd"),
  );
  const sink = mos.find(
    (d) =>
      d.kind === "n" &&
      canon(d.pins[0]) === "vout" &&
      d.pins[1] === bias.pins[0] &&
      supply(d, "vss"),
  );
  const first = pass.find((d) => d.pins.includes(right.pins[0])),
    second = pass.find((d) => d !== first);
  const mid = first?.pins.find((n) => n !== right.pins[0]);
  if (
    !load ||
    !amp ||
    !sink ||
    !first ||
    !second ||
    !second.pins.includes(mid) ||
    !second.pins.some((n) => canon(n) === "vout")
  )
    return null;
  if (new Set([bias, tail, left, right, diode, load, amp, sink]).size !== 8)
    return null;
  const refs = {
    XMbn: bias.ref,
    XMtl: tail.ref,
    XM1: left.ref,
    XM2: right.ref,
    XM3: diode.ref,
    XM4: load.ref,
    XM7: amp.ref,
    XM8: sink.ref,
    Cc: first.ref,
    Rz: second.ref,
  };
  const port = Object.fromEntries(ports.map((n) => [canon(n), n]));
  const nets = {
    ibias: port.ibias,
    ntl: tail.pins[0],
    na: diode.pins[0],
    n1: right.pins[0],
    nzc: mid,
    vdd: port.vdd,
    vss: port.vss,
    vout: port.vout,
    vin_n: port[canon(left.pins[1])],
    vin_p: port[canon(right.pins[1])],
  };
  const spread =
    Math.max(0, Math.max(left.ref.length, right.ref.length) - 3) * 20;
  const passiveSpread =
    Math.max(0, Math.max(first.ref.length, second.ref.length) - 2) * 20;
  const shift = (x) =>
    (x >= 300
      ? x + spread
      : x === 260 || x === 270 || x === 282
        ? x + spread / 2
        : x) + (x >= 480 ? passiveSpread : 0);
  const devices = Object.fromEntries(
    Object.entries(template.devices).map(([r, v]) => [
      refs[r],
      [shift(v[0]), v[1], v[2]],
    ]),
  );
  devices[first.ref][2] = first.pins[0] === right.pins[0] ? 270 : 90;
  devices[second.ref][2] = second.pins[0] === mid ? 270 : 90;
  const endpoint = (s) => {
    if (s.startsWith("@")) return "@" + nets[s.slice(1)];
    if (!s.includes(".")) return s;
    const [r, p] = s.split(".");
    let pin = p;
    if (r === "Cc")
      pin =
        p === "1"
          ? first.pins[0] === right.pins[0]
            ? "1"
            : "2"
          : first.pins[0] === mid
            ? "1"
            : "2";
    if (r === "Rz")
      pin =
        p === "1"
          ? second.pins[0] === mid
            ? "1"
            : "2"
          : canon(second.pins[0]) === "vout"
            ? "1"
            : "2";
    return refs[r] + "." + pin;
  };
  return {
    ...template,
    id,
    strategy: "two-stage",
    devices,
    ports: Object.fromEntries(
      Object.entries(template.ports).map(([n, v]) => [
        nets[n],
        [shift(v[0]), v[1], v[2]],
      ]),
    ),
    description:
      "Source-matched two-stage OTA with differential input, current-mirror load, mirrored bias and the submitted series compensation branch.",
    draw(c) {
      template.draw({
        j: (k, n, x, y) => c.j(k, nets[n], shift(x), y),
        w: (n, f, t, b = [], color) =>
          c.w(
            nets[n],
            endpoint(f),
            endpoint(t),
            b.map(([x, y]) => [shift(x), y]),
            color,
          ),
        label: (n, x, y) => c.label(nets[n], shift(x), y),
      });
    },
  };
}

function currentPaths(id, source, ds, ports) {
  const mos = ds.filter((d) => "np".includes(d.kind)),
    pass = ds.filter((d) => "rc".includes(d.kind));
  const top = (d) => d.pins[d.kind === "p" ? 2 : 0],
    bottom = (d) => d.pins[d.kind === "p" ? 0 : 2];
  const roots = new Map(
    ports
      .filter((p) => ["vinp", "vinn"].includes(canon(p)))
      .map((p) => [p.toLowerCase(), canon(p)]),
  );
  for (let k = 0; k < ds.length; k++) {
    for (const d of pass)
      for (let i = 0; i < 2; i++)
        if (
          roots.has(d.pins[i]) &&
          !["vdd", "vss", "vout", "ibias"].includes(canon(d.pins[1 - i]))
        )
          roots.set(d.pins[1 - i], roots.get(d.pins[i]));
    for (const d of mos)
      if (roots.has(d.pins[1]) && ["vdd", "vss"].includes(canon(d.pins[0])))
        roots.set(d.pins[2], roots.get(d.pins[1]));
  }
  const pairs = [],
    paired = new Set();
  const sourceLink = (a, b) => {
    if (a.pins[2] === b.pins[2])
      return ["vdd", "vss"].includes(canon(a.pins[2]))
        ? null
        : { net: a.pins[2], res: [] };
    for (const ra of pass.filter(
      (r) => r.kind === "r" && r.pins.includes(a.pins[2]),
    ))
      for (const rb of pass.filter(
        (r) => r.kind === "r" && r !== ra && r.pins.includes(b.pins[2]),
      )) {
        const na = ra.pins.find((n) => n !== a.pins[2]),
          nb = rb.pins.find((n) => n !== b.pins[2]);
        if (na === nb && !["vdd", "vss"].includes(canon(na)))
          return { net: na, res: [ra, rb] };
      }
    return null;
  };
  for (const a of mos)
    for (const b of mos)
      if (
        a.ref < b.ref &&
        a.kind === b.kind &&
        roots.has(a.pins[1]) &&
        roots.has(b.pins[1]) &&
        roots.get(a.pins[1]) !== roots.get(b.pins[1]) &&
        !paired.has(a.ref) &&
        !paired.has(b.ref)
      ) {
        const link = sourceLink(a, b);
        if (!link) continue;
        const pair = [a, b];
        pair.sourceLink = link;
        pairs.push(pair);
        paired.add(a.ref);
        paired.add(b.ref);
      }
  const next = new Map(),
    prev = new Map();
  const internal = new Set(
    mos
      .flatMap((d) => [top(d), bottom(d)])
      .filter((n) => !["vdd", "vss"].includes(canon(n))),
  );
  for (const n of internal) {
    const up = mos.filter((d) => bottom(d) === n),
      down = mos.filter((d) => top(d) === n);
    if (up.length === 1 && down.length === 1 && up[0] !== down[0]) {
      next.set(up[0].ref, down[0]);
      prev.set(down[0].ref, up[0]);
    }
  }
  const chains = [],
    seen = new Set();
  for (const start of [...mos.filter((d) => !prev.has(d.ref)), ...mos])
    if (!seen.has(start.ref)) {
      const chain = [];
      let d = start;
      while (d && !seen.has(d.ref)) {
        chain.push(d);
        seen.add(d.ref);
        d = next.get(d.ref);
      }
      chains.push(chain);
    }
  const used = new Set(),
    modules = [],
    devices = {};
  let x = 210,
    height = 80;
  function placeChain(chain, cx, firstY, mirror = false) {
    chain.forEach((d, i) => {
      devices[d.ref] = [
        cx,
        firstY + i * 110,
        mirror ? "horizontal" : undefined,
      ];
      height = Math.max(height, firstY + i * 110 + 90);
    });
    used.add(chain);
  }
  for (const pair of pairs) {
    const arms = pair.map((d) => chains.find((ch) => ch.includes(d)));
    if (arms[0] === arms[1] || arms.some((ch) => used.has(ch))) continue;
    const depth = Math.max(...pair.map((d, i) => arms[i].indexOf(d)));
    const inputY = 160 + depth * 110;
    const refs = [];
    arms.forEach((ch, i) => {
      placeChain(ch, x + i * 240, inputY - ch.indexOf(pair[i]) * 110);
      refs.push(...ch.map((d) => d.ref));
      ch.forEach((d) => {
        devices[d.ref][2] = i === 1 ? "horizontal" : undefined;
      });
    });
    const link = pair.sourceLink;
    link.res.forEach((r, i) => {
      const sign = pair[0].kind === "n" ? 1 : -1;
      const upper = sign === 1 ? pair[i].pins[2] : link.net;
      devices[r.ref] = [
        x + i * 240 + (i === 1 ? -10 : 10),
        inputY + sign * 80,
        r.pins[0] === upper ? 0 : 180,
      ];
      refs.push(r.ref);
      height = Math.max(height, inputY + sign * 80 + 90);
    });
    const tail = chains.find(
      (ch) =>
        !used.has(ch) &&
        ch.some(
          (d) =>
            d.kind === pair[0].kind &&
            (pair[0].kind === "n" ? top(d) : bottom(d)) === link.net,
        ),
    );
    if (tail) {
      const t = tail.find(
        (d) => (pair[0].kind === "n" ? top(d) : bottom(d)) === link.net,
      );
      const gap = link.res.length ? 210 : 110;
      const ty = pair[0].kind === "n" ? inputY + gap : inputY - gap;
      placeChain(tail, x + 120, ty - tail.indexOf(t) * 110);
      refs.push(...tail.map((d) => d.ref));
    }
    modules.push({
      refs,
      pair: pair.map((d) => d.ref),
      pairBus: {
        net: link.net,
        keys: link.res.length
          ? link.res.map(
              (r) => r.ref + "." + (r.pins[0] === link.net ? "1" : "2"),
            )
          : pair.map((d) => d.ref + ".S"),
      },
    });
    x += 510;
  }
  const output = chains.filter(
    (ch) => !used.has(ch) && ch.some((d) => canon(d.pins[0]) === "vout"),
  );
  for (const ch of output) {
    placeChain(ch, x, 160);
    modules.push({ refs: ch.map((d) => d.ref) });
    x += 220;
  }
  const signal = chains.filter(
    (ch) =>
      !used.has(ch) && (ch.length > 1 || ch.some((d) => roots.has(d.pins[1]))),
  );
  for (const ch of signal) {
    placeChain(ch, x, 160);
    modules.push({ refs: ch.map((d) => d.ref) });
    x += 220;
  }
  const width = Math.max(x, 730),
    lower = height + 30;
  const rest = chains.filter((ch) => !used.has(ch));
  let bx = 210,
    by = lower,
    rowHeight = 0;
  for (const ch of rest) {
    if (bx + 180 > width) {
      bx = 210;
      by += rowHeight + 60;
      rowHeight = 0;
    }
    placeChain(ch, bx, by, ch[0].pins[0] === ch[0].pins[1]);
    modules.push({ refs: ch.map((d) => d.ref) });
    rowHeight = Math.max(rowHeight, ch.length * 110);
    bx += 220;
  }
  let py = height + 80,
    px = 210,
    passiveRowHeight = 140;
  const pseen = new Set(
    modules.flatMap((m) => m.refs).filter((r) => pass.some((d) => d.ref === r)),
  );
  for (const d of pass)
    if (!pseen.has(d.ref)) {
      const linked = pass.find(
        (e) =>
          e !== d &&
          !pseen.has(e.ref) &&
          d.pins.some(
            (n) =>
              e.pins.includes(n) &&
              ds.filter((q) => q.pins.includes(n)).length === 2,
          ),
      );
      const ch = linked ? [d, linked] : [d];
      const span = ch.length === 2 ? 280 : 220;
      if (px + span > width) {
        px = 210;
        py += passiveRowHeight;
      }
      if (linked) {
        const mid = d.pins.find((n) => linked.pins.includes(n)),
          left = d.pins.find((n) => n !== mid),
          right = linked.pins.find((n) => n !== mid);
        const reversed = canon(left) === "vout";
        const order = reversed ? [linked, d] : ch,
          endpoints = reversed ? [right, mid, left] : [left, mid, right];
        order.forEach((q, i) => {
          devices[q.ref] = [
            px + i * 140,
            py,
            q.pins[0] === endpoints[i] ? 270 : 90,
          ];
          pseen.add(q.ref);
        });
        modules.push({ refs: order.map((q) => q.ref) });
      } else {
        devices[d.ref] = [px, py];
        pseen.add(d.ref);
        modules.push({ refs: [d.ref] });
      }
      px += span;
      height = Math.max(height, py + 85);
    }
  // Move a rare long upper tail away from negative drawing coordinates.
  const minY = Math.min(...Object.values(devices).map((p) => p[1]));
  if (minY < 110) for (const p of Object.values(devices)) p[1] += 110 - minY;
  height += Math.max(0, 110 - minY);
  const positions = {};
  ports.forEach((p, i) => {
    positions[p] = [90 + i * 180, 20];
  });
  for (const pos of Object.values(positions)) {
    pos[0] = Math.round(pos[0] / 10) * 10;
    pos[1] = Math.round(pos[1] / 10) * 10;
  }
  return {
    id,
    strategy: "current-path-groups",
    devices,
    ports: positions,
    modules,
    title: "Transistor-level OTA",
    description:
      "Submitted OTA arranged by differential branches, vertical current paths, output and bias. Matching native net labels connect remote groups; exact parameters remain in the editable project.",
    body_note:
      "NFET bodies → VSS; PFET bodies → VDD. Saved cell defaults omit standard body wires. Display values are rounded; source and export retain exact values.",
    draw(c) {
      drawGroups(c, ds, modules, devices, ports);
    },
  };
}

function drawGroups(c, ds, modules, placements, ports) {
  const byRef = new Map(ds.map((d) => [d.ref, d])),
    connections = [];
  const keys = (d) =>
    d.pins
      .slice(0, "np".includes(d.kind) ? 3 : 2)
      .map((n, i) => ({
        net: n,
        key:
          d.ref +
          "." +
          ("np".includes(d.kind) ? ["D", "G", "S"][i] : String(i + 1)),
        ref: d.ref,
      }));
  const graph = new Map(),
    join = (a, b) => {
      if (!graph.has(a)) graph.set(a, new Set());
      if (!graph.has(b)) graph.set(b, new Set());
      graph.get(a).add(b);
      graph.get(b).add(a);
    };
  let serial = 0;
  const route = (net, a, b, bends = []) => {
    c.w(net, a, b, bends);
    join(a, b);
  };
  const junction = (net, x, y) => {
    const k = "group-j-" + serial++;
    c.j(k, net, x, y);
    return k;
  };
  const clear = (p, q) =>
    Object.entries(placements).every(([r, [x, y]]) => {
      const d = byRef.get(r),
        rx = "np".includes(d.kind) ? 18 : 14,
        ry = "np".includes(d.kind) ? 18 : 14;
      return p.x === q.x
        ? !(
            p.x > x - rx &&
            p.x < x + rx &&
            Math.max(p.y, q.y) > y - ry &&
            Math.min(p.y, q.y) < y + ry
          )
        : !(
            p.y > y - ry &&
            p.y < y + ry &&
            Math.max(p.x, q.x) > x - rx &&
            Math.min(p.x, q.x) < x + rx
          );
    });
  for (const mod of modules) {
    const list = mod.refs.flatMap((r) => keys(byRef.get(r))),
      nets = new Map();
    for (const e of list) {
      if (!nets.has(e.net)) nets.set(e.net, []);
      nets.get(e.net).push(e);
    }
    // Actual series terminals and inward-facing mirror gates get continuous wires.
    for (const [net, ends] of nets)
      for (let i = 0; i < ends.length; i++)
        for (let j = i + 1; j < ends.length; j++) {
          const a = ends[i],
            b = ends[j],
            p = c.point(a.key),
            q = c.point(b.key);
          if (!p || !q)
            throw new Error("Missing terminal " + a.key + " / " + b.key);
          if (a.ref === b.ref) continue;
          if (
            mod.pairBus?.keys.includes(a.key) &&
            mod.pairBus.keys.includes(b.key)
          )
            continue;
          if (
            (p.x === q.x || p.y === q.y) &&
            Math.abs(p.x - q.x) + Math.abs(p.y - q.y) <= 280 &&
            clear(p, q)
          ) {
            const k = junction(
              net,
              Math.round((p.x + q.x) / 4) * 2,
              Math.round((p.y + q.y) / 4) * 2,
            );
            route(net, a.key, k);
            route(net, k, b.key);
          }
        }
    if (mod.pair) {
      const [a, b] = mod.pair.map((r) => byRef.get(r)),
        net = mod.pairBus.net,
        [ka, kb] = mod.pairBus.keys;
      const pa = c.point(ka),
        pb = c.point(kb),
        y = pa.y + (a.kind === "n" ? 36 : -36);
      const ja = junction(net, pa.x, y),
        jb = junction(net, pb.x, y);
      route(net, ka, ja);
      route(net, kb, jb);
      const bus = [ja, jb];
      for (const e of list.filter(
        (e) => e.net === net && ![ka, kb].includes(e.key),
      )) {
        const p = c.point(e.key);
        const jc = junction(net, p.x, y);
        bus.push(jc);
        route(net, jc, e.key);
      }
      bus.sort((u, v) => c.point(u).x - c.point(v).x);
      for (let i = 1; i < bus.length; i++) route(net, bus[i - 1], bus[i]);
    }
    for (const r of mod.refs) {
      const d = byRef.get(r);
      if (!"np".includes(d.kind) || d.pins[0] !== d.pins[1]) continue;
      const p = c.point(r + ".D"),
        q = c.point(r + ".G"),
        side = q.x > placements[r][0] ? 1 : -1,
        x = q.x + side * 28;
      let k = [...(graph.get(r + ".D") ?? [])].find((n) =>
        n.startsWith("group-j-"),
      );
      if (!k) {
        k = junction(d.pins[0], p.x, p.y + (d.kind === "p" ? 24 : -24));
        route(d.pins[0], r + ".D", k);
      }
      const y = c.point(k).y;
      route(d.pins[0], k, r + ".G", [
        [x, y],
        [x, q.y],
      ]);
    }
    // One explicit, bound label per drawn component. This is native named
    // connectivity, not inferred logical membership or an SVG-only label.
    for (const [net, ends] of nets) {
      const seen = new Set();
      for (const e of ends) {
        if (seen.has(e.key)) continue;
        const todo = [e.key],
          comp = [];
        while (todo.length) {
          const k = todo.pop();
          if (seen.has(k)) continue;
          seen.add(k);
          comp.push(k);
          for (const n of graph.get(k) ?? []) todo.push(n);
        }
        const existing = comp.find((k) => k.startsWith("group-j-"));
        if (existing) {
          c.boundLabel(net, existing, 14, -8, "start");
          continue;
        }
        const terminal =
          ends.find((v) => comp.includes(v.key) && !v.key.endsWith(".G")) ?? e;
        const p = c.point(terminal.key),
          d = byRef.get(terminal.ref),
          pin = terminal.key.split(".").at(-1);
        let dx = 0,
          dy = 0,
          align = "middle",
          ox = 0,
          oy = -8;
        if (
          pin === "G" ||
          ("rc".includes(d.kind) && (placements[d.ref][2] ?? 0) % 180 !== 0)
        ) {
          dx = p.x > placements[d.ref][0] ? 40 : -40;
          align = dx > 0 ? "start" : "end";
          ox = dx > 0 ? 6 : -6;
        } else dy = p.y > placements[d.ref][1] ? 38 : -38;
        const k = junction(net, p.x + dx, p.y + dy);
        route(net, terminal.key, k);
        c.boundLabel(net, k, ox, oy, align);
      }
    }
  }
  for (const name of ports) {
    const p = c.point("@" + name),
      dx = 36,
      k = junction(name.toLowerCase(), p.x + dx, p.y);
    route(name.toLowerCase(), "@" + name, k);
    c.boundLabel(name.toLowerCase(), k, 6, -8, "start");
  }
}

export function buildOtaLayout(id, source, template) {
  const ds = otaDevices(source),
    header = source
      .split(/\r?\n/)
      .find((s) => /^\s*\.subckt/i.test(s))
      .trim()
      .split(/\s+/);
  const p = header.findIndex((s) => s.toLowerCase() === "params:"),
    ports = header.slice(2, p < 0 ? undefined : p);
  return (
    twoStage(id, source, template, ds, ports) ??
    currentPaths(id, source, ds, ports)
  );
}
