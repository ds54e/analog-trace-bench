/** Reviewed FREE submissions. Coordinates are case recipes, not topology rules.
 * Signal, load-mirror, tail and compensation paths are continuous native wires.
 * Only auxiliary bias controls use named connections between remote branches. */
const recipes = {
  "sonnet-5-5-r1": {
    chains: [
      ["XM3", "XM1", "RS1"],
      ["XM4", "XM2", "RS2"],
    ],
    tail: "XM5",
    ref: "XMB",
    output: ["XM6", "XM7"],
    compensation: ["CC", "RZ"],
    mirror: ["XM3", "XM4"],
    gain: "XM2.D",
    input: ["XM1", "XM2"],
    type: "two-stage",
  },
  "haiku-r3": {
    chains: [
      ["XM3", "XM1"],
      ["XM4", "XM2"],
    ],
    tail: "XMT",
    ref: "XMB",
    output: ["XM7", "XM6"],
    compensation: ["C1", "RZ"],
    mirror: ["XM3", "XM4"],
    gain: "XM2.D",
    input: ["XM1", "XM2"],
    bias: [["XMPB", "XMNB"]],
    type: "two-stage",
  },
  "luna-6-r3": {
    chains: [
      ["XLOADD", "XINN"],
      ["XLOADM", "XINP"],
    ],
    tail: "XTAIL",
    ref: "XNR",
    output: ["XOUTP", "XOUTN"],
    compensation: ["RZ", "CC"],
    mirror: ["XLOADD", "XLOADM"],
    gain: "XINP.D",
    input: ["XINN", "XINP"],
    bias: [["XPBIAS", "XNBIAS"]],
    shunt: "RBIAS",
    type: "two-stage",
  },
  "luna-6-r2": {
    chains: [
      ["XMPCREF", "XMPREF", "XMNCP", "XMINP"],
      ["XMPCLOAD", "XMPLOAD", "XMNCN", "XMINN"],
    ],
    tail: "XMTAIL",
    ref: "XMREF",
    input: ["XMINP", "XMINN"],
    mirror: ["XMPREF", "XMPLOAD"],
    gain: "XMPLOAD.D",
    bias: [
      ["RBN", "XMNBNHI", "XMNBNLO"],
      ["XMPCBIAS", "XMNBIAS"],
    ],
    type: "cascode",
  },
  "sol-6-1-r2": {
    chains: [
      ["XPD", "XPCD", "XCASN", "XINN"],
      ["XPM", "XPCM", "XCASP", "XINP"],
    ],
    tail: "XTAIL",
    ref: "XREF",
    input: ["XINN", "XINP"],
    output: ["XOUT", "XOSINK"],
    compensation: ["RZ", "CC"],
    mirror: ["XPD", "XPM"],
    mirrorTap: "XPCD.D",
    gain: "XPCM.D",
    bias: [
      ["XPR", "XPRS"],
      ["XCBP", "XCBU", "XCBL"],
    ],
    type: "cascode",
  },
  "deepseek-r3": {
    chains: [
      ["XM3", "XM5", "XM7", "XM1"],
      ["XM4", "XM6", "XM8", "XM2"],
    ],
    tail: "XM0",
    ref: "XM_B1",
    input: ["XM1", "XM2"],
    output: ["XM9", "XM10"],
    compensation: ["RZ", "CC"],
    mirror: ["XM3", "XM4"],
    mirrorTap: "XM5.D",
    gain: "XM6.D",
    bias: [
      ["XM_B6", "XM_B7"],
      ["XM_B2", "R1", "XM_B3"],
      ["XM_B5", "R3", "XM_B4"],
    ],
    type: "cascode",
  },
  "opus-5-5-r2": {
    input: ["XM2", "XM1"],
    top: ["XMPB", "XMPA"],
    folds: [
      ["XMCB", "XMNB"],
      ["XMCA", "XMNA"],
    ],
    tail: "XMT",
    ref: "XMB0",
    output: ["XM7", "XM6"],
    compensation: ["RZ", "CC"],
    mirror: ["XMNB", "XMNA"],
    gain: "XMCA.D",
    bias: [
      ["XMPD", "XMS1"],
      ["R1", "XMPCD", "XMS2"],
    ],
    type: "folded",
  },
  "opus-5-5-r3": {
    input: ["XM1", "XM2"],
    top: ["XM3", "XM4"],
    folds: [
      ["XM5", "XM7", "R7"],
      ["XM6", "XM8", "R8"],
    ],
    tail: "XM0",
    ref: "XMB1",
    output: ["XM10", "XM9"],
    compensation: ["Rz", "Cc"],
    mirror: ["XM7", "XM8"],
    gain: "XM6.D",
    bias: [["XMB3", "Rb", "XMB2"]],
    type: "folded",
  },
  "sonnet-5-5-r3": {
    input: ["XM1", "XM2"],
    top: ["XM3", "XM4"],
    folds: [
      ["XM5", "XM7", "XM9"],
      ["XM6", "XM8", "XM10"],
    ],
    tail: "XMT",
    ref: "XMB0",
    mirror: ["XM9", "XM10"],
    mirrorTap: "XM5.D",
    gain: "XM6.D",
    bias: [
      ["XMP1", "XMN1"],
      ["RC", "XMPC", "XMN2"],
      ["XMP2", "XMNX", "RQ"],
    ],
    type: "folded",
  },
  "sol-6-r1": {
    input: ["XNINP", "XNINN"],
    top: ["XPCS1", "XPCS2"],
    folds: [
      ["XPFO1", "XNCL", "XNML"],
      ["XPFO2", "XNCR", "XNMR"],
    ],
    tail: "XNTAIL",
    ref: "XNR",
    mirror: ["XNML", "XNMR"],
    gain: "XPFO2.D",
    bias: [
      ["XPREF", "XNPREF"],
      ["XPCB", "XNBU", "XNBL"],
      ["RFBU", "RFBL"],
    ],
    shunt: "CDAMP",
    type: "folded",
  },
  "sol-6-r3": {
    chains: [
      ["XPINN", "XNM1"],
      ["XPINP", "XNM2"],
    ],
    input: ["XPINN", "XPINP"],
    tail: "XPTAIL",
    ref: "XBN",
    output: ["XPOUT", "XNOUT"],
    compensation: ["RZ", "CC"],
    mirror: ["XNM1", "XNM2"],
    gain: "XPINP.D",
    bias: [["XPBIAS", "XBPULL"]],
    followers: [
      ["XSF1", "XSINK1"],
      ["XSF2", "XSINK2"],
    ],
    boost: "XPBOOST",
    type: "pmos-input",
  },
};

export function reviewedFreeLayout(id, ds, portNames) {
  const prefix = "ota-free-sky130-";
  if (!id.startsWith(prefix)) return null;
  const r = recipes[id.slice(prefix.length)];
  if (!r) return null;
  const byRef = new Map(ds.map((d) => [d.ref, d]));
  const devices = {},
    links = [];
  const nmos = (d) => d.kind === "n";
  const upper = (d) =>
    "np".includes(d.kind)
      ? nmos(d)
        ? "D"
        : "S"
      : devices[d.ref][2] === 180
        ? "2"
        : "1";
  const lower = (d) =>
    "np".includes(d.kind)
      ? nmos(d)
        ? "S"
        : "D"
      : devices[d.ref][2] === 180
        ? "1"
        : "2";
  const position = (ref, x, y, mirror = false, topNet) => {
    if (!byRef.has(ref))
      throw new Error("Recipe reference missing " + id + " " + ref);
    const d = byRef.get(ref);
    devices[ref] = [
      x,
      y,
      "np".includes(d.kind)
        ? mirror
          ? "horizontal"
          : undefined
        : topNet == null || d.pins[0] === topNet
          ? 0
          : 180,
    ];
  };
  const chain = (refs, x, y, mirror = false) => {
    refs.forEach((ref, i) => {
      const previous = i ? byRef.get(refs[i - 1]) : null;
      const topNet = previous
        ? previous.pins[
            "np".includes(previous.kind)
              ? previous.kind === "n"
                ? 2
                : 0
              : devices[previous.ref][2] === 180
                ? 0
                : 1
          ]
        : null;
      position(ref, x, y + i * 110, mirror, topNet);
    });
    for (let i = 1; i < refs.length; i++) {
      const a = byRef.get(refs[i - 1]),
        b = byRef.get(refs[i]);
      const pa = lower(a),
        pb = upper(b);
      // All case chains must be literal series paths from the submitted source.
      const pin = (d, p) =>
        d.pins[
          "np".includes(d.kind) ? ["D", "G", "S"].indexOf(p) : Number(p) - 1
        ];
      if (pin(a, pa) !== pin(b, pb))
        throw new Error(
          "Invalid series recipe " + id + " " + a.ref + " " + b.ref,
        );
      links.push([a.ref + "." + pa, b.ref + "." + pb]);
    }
  };
  const left = r.type === "pmos-input" ? 660 : r.type === "folded" ? 320 : 220,
    right = left + 160;
  let floor;
  if (r.type === "folded") {
    const foldLeft = left - 180,
      foldRight = right + 180;
    position(r.input[0], left, 240);
    position(r.input[1], right, 240, true);
    [foldLeft, foldRight].forEach((x, i) => {
      position(r.top[i], x, 110, i === 1);
      chain(r.folds[i], x, 240, i === 1);
      links.push([r.top[i] + ".D", r.folds[i][0] + ".S"]);
      links.push([
        r.top[i] + ".D",
        r.input[i] + ".D",
        [
          [x + (i === 1 ? -10 : 10), 180],
          [i === 1 ? right - 10 : left + 10, 180],
        ],
      ]);
    });
    position(r.tail, (left + right) / 2, 390);
    floor = 610;
  } else if (r.type === "pmos-input") {
    chain(r.chains[0], left, 240);
    chain(r.chains[1], right, 240, true);
    position(r.tail, (left + right) / 2, 110);
    floor = 590;
    r.followers.forEach((ch, i) => chain(ch, 260 + i * 160, 240));
  } else {
    chain(r.chains[0], left, 110);
    chain(r.chains[1], right, 110, true);
    const longest = Math.max(...r.chains.map((ch) => ch.length));
    position(r.tail, (left + right) / 2, 110 + longest * 110 + 30);
    floor = 110 + longest * 110 + 110;
  }
  (r.bias ?? []).forEach((ch, i) => chain(ch, 100 + i * 160, floor + 160));
  const outX = right + (r.type === "folded" ? 540 : 290);
  if (r.output) {
    position(r.output[0], outX, 170);
    position(r.output[1], outX, floor - 20);
  }
  position(r.ref, left - 110, floor - 110, true);
  if (byRef.get(r.mirror[0]).kind === "p") {
    devices[r.mirror[0]][2] = "horizontal";
    devices[r.mirror[1]][2] = undefined;
  }
  if (r.boost) position(r.boost, outX + 180, 170);
  const gainD = byRef.get(r.gain.split(".")[0]);
  const gainY = devices[gainD.ref][1] + ("n" === gainD.kind ? -40 : 40);
  const compY = r.output ? Math.max(290, gainY + 90) : null;
  if (r.compensation) {
    const [a, b] = r.compensation;
    const dn = byRef.get(gainD.ref).pins[0];
    position(a, right + (r.type === "folded" ? 290 : 110), compY, false, dn);
    const mid = byRef.get(a).pins.find((n) => n !== dn);
    position(b, right + (r.type === "folded" ? 400 : 220), compY, false, mid);
    devices[a][2] = byRef.get(a).pins[0] === dn ? 270 : 90;
    devices[b][2] = byRef.get(b).pins[0] === mid ? 270 : 90;
  }
  if (r.shunt)
    position(
      r.shunt,
      r.output ? right + 90 : right + 270,
      floor - 80,
      false,
      byRef.get(r.shunt).pins.find((n) => n !== "vss"),
    );
  // Exceptional source details remain explicit local case routes below.
  if (r.type === "pmos-input") {
    position("RB", outX + 180, 290, false, "gb");
    position("CB", outX + 100, 390, false, "gb");
  }
  if (Object.keys(devices).length !== ds.length)
    throw new Error(
      "Incomplete FREE recipe " +
        id +
        " " +
        ds.filter((d) => !devices[d.ref]).map((d) => d.ref),
    );
  const ports = {};
  const name = (n) =>
    portNames.find((p) => p.toLowerCase().replace("_", "") === n);
  ports[name("vdd")] = [40, 50];
  ports[name("vss")] = [40, floor + 60];
  ports[name("ibias")] = [r.type === "folded" ? 40 : left - 200, floor - 210];
  r.input.forEach((ref, i) => {
    const d = byRef.get(ref);
    if (r.type !== "pmos-input")
      ports[portNames.find((p) => p.toLowerCase() === d.pins[1])] = [
        devices[ref][0] + (i ? 70 : -70),
        devices[ref][1],
        i ? 180 : 0,
      ];
  });
  if (r.type === "pmos-input")
    r.followers.forEach(
      (ch, i) =>
        (ports[
          portNames.find((p) => p.toLowerCase() === byRef.get(ch[0]).pins[1])
        ] = [devices[ch[0]][0] - 70, 240]),
    );
  const outputKey = r.output ? r.output[0] + ".D" : r.gain;
  ports[name("vout")] = [
    r.output ? outX + 90 : right + 270,
    r.output ? 250 : gainY,
    180,
  ];
  return {
    id,
    strategy: "reviewed-free",
    devices,
    ports,
    title: "Transistor-level OTA",
    description:
      "Case-reviewed continuous signal, mirror, tail and compensation paths; named connections only for auxiliary bias controls.",
    body_note:
      "NFET bodies → VSS; PFET bodies → VDD. Exact parameters remain in the native project.",
    draw(c) {
      const graph = new Map(),
        netOf = (key) =>
          key.startsWith("@")
            ? key.slice(1).toLowerCase()
            : byRef.get(key.split(".")[0]).pins[
                "np".includes(byRef.get(key.split(".")[0]).kind)
                  ? ["D", "G", "S"].indexOf(key.split(".")[1])
                  : Number(key.split(".")[1]) - 1
              ];
      let serial = 0;
      const nodes = new Map(),
        points = new Map(),
        segments = [],
        labels = [],
        anchors = new Set();
      const point = (key) => points.get(key) ?? c.point(key);
      const j = (net, x, y) => {
        const existing = [...points].find(
          ([k, p]) => nodes.get(k) === net && p.x === x && p.y === y,
        );
        if (existing) return existing[0];
        const key = "free-" + serial++;
        nodes.set(key, net);
        points.set(key, { x, y });
        return key;
      };
      const wire = (a, b, bends = []) => {
        const net = nodes.get(a) ?? netOf(a),
          other = nodes.get(b) ?? netOf(b);
        if (net !== other)
          throw new Error(
            "Wrong FREE route " +
              id +
              " " +
              a +
              " " +
              b +
              " " +
              net +
              " " +
              other,
          );
        anchors.add(a);
        anchors.add(b);
        const path = [
          a,
          ...bends.map(([x, y]) =>
            j(net, Math.round(x / 2) * 2, Math.round(y / 2) * 2),
          ),
          b,
        ];
        for (let i = 1; i < path.length; i++) {
          const p = point(path[i - 1]),
            q = point(path[i]);
          if (p.x === q.x && p.y === q.y) continue;
          if (p.x !== q.x && p.y !== q.y)
            throw new Error("Diagonal route " + a + " " + b);
          segments.push({ net, a: path[i - 1], b: path[i] });
        }
        for (const [x, y] of [
          [a, b],
          [b, a],
        ]) {
          if (!graph.has(x)) graph.set(x, new Set());
          graph.get(x).add(y);
        }
      };
      const tap = (key, dy = 0) => {
        if (!dy) return key;
        const p = point(key),
          t = j(netOf(key), p.x, p.y + dy);
        wire(key, t);
        return t;
      };
      const label = (net, t, dx = 10, dy = -10) =>
        labels.push({ net, t, dx, dy, align: "start" });
      for (const [a, b, bends] of links) {
        const p = point(a),
          q = point(b);
        wire(
          a,
          b,
          bends ??
            (p.x === q.x
              ? []
              : [
                  [p.x, Math.round((p.y + q.y) / 4) * 2],
                  [q.x, Math.round((p.y + q.y) / 4) * 2],
                ]),
        );
      }
      // Supply rails connect to real branches; ports are never a detached legend.
      const auxiliary = new Set((r.bias ?? []).flat());
      for (const supply of ["vdd", "vss"])
        for (const isAux of [false, true]) {
          const group = ds.filter((d) => auxiliary.has(d.ref) === isAux);
          if (!group.length) continue;
          const y = isAux
            ? supply === "vdd"
              ? floor + 100
              : floor + 160 + Math.max(...r.bias.map((ch) => ch.length)) * 110
            : supply === "vdd"
              ? 50
              : floor + 60;
          const keys = group.flatMap((d) =>
            "np".includes(d.kind)
              ? ["D", "S"]
                  .filter((pin) => netOf(d.ref + "." + pin) === supply)
                  .map((pin) => d.ref + "." + pin)
              : ["1", "2"]
                  .filter((pin) => netOf(d.ref + "." + pin) === supply)
                  .map((pin) => d.ref + "." + pin),
          );
          const taps = new Map();
          for (const key of keys) {
            const p = point(key);
            if (!taps.has(p.x)) taps.set(p.x, j(supply, p.x, y));
            wire(key, taps.get(p.x));
          }
          let previous = isAux ? null : "@" + name(supply);
          for (const [, t] of [...taps].sort((a, b) => a[0] - b[0])) {
            if (previous) wire(previous, t);
            previous = t;
          }
          if (auxiliary.size && previous) label(supply, previous);
        }
      const sourceKeys =
        r.chains?.[0].at(-1) === "RS1"
          ? ["RS1.2", "RS2.2"]
          : r.input.map((ref) => ref + ".S");
      const ps = sourceKeys.map((key) => point(key));
      const busY =
        r.type === "pmos-input" ? 190 : Math.max(...ps.map((p) => p.y)) + 30;
      const bus = sourceKeys.map((key, i) => {
        const t = j(netOf(key), ps[i].x, busY);
        wire(key, t);
        return t;
      });
      const pt = point(r.tail + ".D"),
        bt = j(netOf(r.tail + ".D"), pt.x, busY);
      wire(bus[0], bt);
      wire(bt, bus[1]);
      wire(bt, r.tail + ".D");

      const [ma, mb] = r.mirror;
      const mirrorTap = r.mirrorTap ?? ma + ".D",
        mp = point(mirrorTap),
        ga = point(ma + ".G"),
        gb = point(mb + ".G");
      const my = Math.max(ga.y, gb.y) + (byRef.get(ma).kind === "n" ? 70 : 0),
        mx = ga.x + (ga.x > devices[ma][0] ? 50 : -50);
      const mt = tap(
        mirrorTap,
        byRef.get(mirrorTap.split(".")[0]).kind === "p" ? 20 : -20,
      );
      wire(mt, ma + ".G", [
        [mx, point(mt).y],
        [mx, ga.y],
      ]);
      wire(ma + ".G", mb + ".G", [
        [ga.x, my],
        [gb.x, my],
      ]);
      const refD = tap(r.ref + ".D", -20),
        refG = point(r.ref + ".G"),
        rd = point(refD);
      wire(refD, r.ref + ".G", [
        [refG.x + 30, rd.y],
        [refG.x + 30, refG.y],
      ]);
      const ip = point("@" + name("ibias"));
      wire("@" + name("ibias"), refD, [[rd.x, ip.y]]);
      label("ibias", refD);
      // A shared bias trunk drives the tail and fixed output sink when applicable.
      if (netOf(r.tail + ".G") === "ibias") {
        const tg = point(r.tail + ".G"),
          rg = point(r.ref + ".G");
        const by = Math.max(tg.y, rg.y) + 40;
        wire(r.ref + ".G", r.tail + ".G", [
          [rg.x, by],
          [tg.x, by],
        ]);
        for (const ref of r.output ?? [])
          if (netOf(ref + ".G") === "ibias") {
            const og = point(ref + ".G");
            wire(r.tail + ".G", ref + ".G", [
              [tg.x, by],
              [og.x, by],
            ]);
          }
      }
      for (const p of portNames) {
        if (["vdd", "vss", "ibias", "vout"].includes(p.toLowerCase())) continue;
        const candidates = ds.filter(
          (d) => "np".includes(d.kind) && d.pins[1] === p.toLowerCase(),
        );
        if (candidates.length !== 1)
          throw new Error("Input port ambiguity " + id + " " + p);
        wire("@" + p, candidates[0].ref + ".G");
      }
      const outT = tap(outputKey);
      if (r.output) {
        const op = point(outT),
          low = point(r.output[1] + ".D");
        wire(outT, r.output[1] + ".D", op.x === low.x ? [] : [[op.x, low.y]]);
      }
      const op = point(outT),
        vp = point("@" + name("vout"));
      wire(outT, "@" + name("vout"), [[op.x, vp.y]]);
      if (r.shunt) {
        const d = byRef.get(r.shunt),
          k = d.ref + "." + (d.pins[0] === "vss" ? "2" : "1"),
          p = point(k),
          from = r.output ? r.gain : outT,
          q = point(from);
        wire(from, k, [[p.x, q.y]]);
      }
      if (r.followers)
        r.followers.forEach((ch, i) => {
          const a = ch[0] + ".S",
            b = r.input[i] + ".G",
            p = point(a),
            q = point(b),
            y = i ? 80 : 190;
          wire(a, b, [
            [p.x + 60, p.y],
            [p.x + 60, y],
            [q.x + (i ? 60 : -60), y],
            [q.x + (i ? 60 : -60), q.y],
          ]);
        });
      if (r.boost) {
        const bg = point(r.boost + ".G"),
          rt = point("RB.1"),
          ct = point("CB.1");
        wire(r.boost + ".G", "RB.1", [
          [bg.x - 30, bg.y],
          [bg.x - 30, rt.y],
        ]);
        wire("RB.1", "CB.1", [
          [rt.x - 40, rt.y],
          [rt.x - 40, ct.y],
        ]);
        const cb = point("CB.2"),
          gn = point(r.gain);
        wire("CB.2", r.gain, [
          [cb.x, Math.max(cb.y + 40, gn.y + 90)],
          [gn.x + 50, Math.max(cb.y + 40, gn.y + 90)],
          [gn.x + 50, gn.y],
        ]);
        const p = point(r.boost + ".D");
        wire(outT, r.boost + ".D", [
          [op.x, p.y + 40],
          [p.x, p.y + 40],
        ]);
      }
      if (r.output) {
        const amp = r.output.find((ref) => netOf(ref + ".G") === netOf(r.gain));
        if (!amp) throw new Error("Missing signal output " + id);
        const gp = point(r.gain),
          ap = point(amp + ".G"),
          gainT = tap(r.gain);
        wire(gainT, amp + ".G", [
          [gp.x + 50, gp.y],
          [gp.x + 50, ap.y],
        ]);
        if (r.compensation) {
          const [a, b] = r.compensation,
            net = netOf(r.gain),
            mid = byRef.get(a).pins.find((n) => n !== net);
          const ak = a + "." + (byRef.get(a).pins[0] === net ? "1" : "2"),
            am = a + "." + (byRef.get(a).pins[0] === mid ? "1" : "2");
          const bm = b + "." + (byRef.get(b).pins[0] === mid ? "1" : "2"),
            bk = b + "." + (byRef.get(b).pins[0] === "vout" ? "1" : "2");
          const cp = point(ak);
          wire(gainT, ak, [
            [gp.x + 50, gp.y],
            [gp.x + 50, cp.y],
          ]);
          wire(am, bm);
          const bp = point(bk);
          wire(bk, outT, [[op.x, bp.y]]);
        }
      }
      for (const d of ds.filter(
        (d) =>
          "np".includes(d.kind) &&
          d.pins[0] === d.pins[1] &&
          !r.mirror.includes(d.ref) &&
          d.ref !== r.ref,
      )) {
        const gp = point(d.ref + ".G"),
          side = gp.x > devices[d.ref][0] ? 1 : -1;
        const t = tap(d.ref + ".D", d.kind === "p" ? 20 : -20);
        wire(t, d.ref + ".G", [
          [gp.x + side * 26, point(t).y],
          [gp.x + side * 26, gp.y],
        ]);
        label(d.pins[0], t);
      }
      // Labels only on remaining auxiliary bias terminals. Every native pin is
      // verified after reopening; diagram headings cannot substitute for wires.
      for (const d of ds)
        for (const pin of "np".includes(d.kind)
          ? ["D", "G", "S"]
          : ["1", "2"]) {
          const key = d.ref + "." + pin,
            net = netOf(key);
          if (graph.has(key)) continue;
          const p = point(key),
            pos = devices[d.ref];
          const gate = pin === "G",
            horizontal = "rc".includes(d.kind) && (pos[2] ?? 0) % 180 !== 0;
          const dx = gate || horizontal ? (p.x > pos[0] ? 30 : -30) : 0;
          const dy = gate || horizontal ? 0 : p.y > pos[1] ? 30 : -30;
          const t = j(net, p.x + dx, p.y + dy);
          wire(key, t);
          labels.push({
            net,
            t,
            dx: dx < 0 ? -8 : 8,
            dy: -10,
            align: dx < 0 ? "end" : "start",
          });
        }
      const named = new Set(labels.map((l) => l.net));
      for (const seg of segments)
        if (named.has(seg.net) && !nodes.has(seg.a) && !nodes.has(seg.b)) {
          const a = point(seg.a),
            b = point(seg.b);
          j(
            seg.net,
            Math.round((a.x + b.x) / 4) * 2,
            Math.round((a.y + b.y) / 4) * 2,
          );
        }
      const all = new Map();
      for (const [key, p] of points)
        all.set(nodes.get(key) + ":" + p.x + ":" + p.y, {
          key,
          net: nodes.get(key),
          ...p,
        });
      for (const seg of segments)
        for (const k of [seg.a, seg.b]) {
          const p = point(k),
            coord = seg.net + ":" + p.x + ":" + p.y;
          if (!all.has(coord) || !nodes.has(k))
            all.set(coord, { key: k, net: seg.net, ...p });
        }
      for (const k of anchors)
        if (!nodes.has(k)) {
          const p = point(k),
            net = netOf(k);
          all.set(net + ":" + p.x + ":" + p.y, { key: k, net, ...p });
        }
      const required = new Set(),
        edges = new Map();
      for (const seg of segments) {
        const p = point(seg.a),
          q = point(seg.b);
        const hits = [...all.values()]
          .filter(
            (v) =>
              v.net === seg.net &&
              (p.x === q.x
                ? v.x === p.x &&
                  v.y >= Math.min(p.y, q.y) &&
                  v.y <= Math.max(p.y, q.y)
                : v.y === p.y &&
                  v.x >= Math.min(p.x, q.x) &&
                  v.x <= Math.max(p.x, q.x)),
          )
          .sort((a, b) => (p.x === q.x ? a.y - b.y : a.x - b.x));
        for (let i = 1; i < hits.length; i++) {
          const a = hits[i - 1].key,
            b = hits[i].key,
            k = [a, b].sort().join(":");
          edges.set(k, { net: seg.net, a, b });
          required.add(a);
          required.add(b);
        }
      }
      for (const k of nodes.keys()) {
        const p = point(k);
        c.j(k, nodes.get(k), p.x, p.y);
      }
      for (const e of edges.values()) c.w(e.net, e.a, e.b);
      const physical = new Map();
      for (const e of edges.values())
        for (const [a, b] of [
          [e.a, e.b],
          [e.b, e.a],
        ]) {
          if (!physical.has(a)) physical.set(a, new Set());
          physical.get(a).add(b);
        }
      const namedNets = new Set(labels.map((l) => l.net)),
        seen = new Set();
      for (const [key, adj] of physical) {
        const net = nodes.get(key) ?? netOf(key);
        if (seen.has(key) || !namedNets.has(net)) continue;
        const todo = [key],
          component = [];
        while (todo.length) {
          const k = todo.pop();
          if (seen.has(k)) continue;
          seen.add(k);
          component.push(k);
          for (const next of physical.get(k) ?? []) todo.push(next);
        }
        const supplied = labels.find((l) => component.includes(l.t));
        const t =
          supplied && nodes.has(supplied.t)
            ? supplied.t
            : component.find((k) => nodes.has(k));
        if (!t)
          throw new Error(
            "Named connection has no native anchor " + id + " " + net,
          );
        const l = supplied ?? { dx: 10, dy: -10, align: "start" };
        c.boundLabel(net, t, l.dx, l.dy, l.align);
      }
    },
  };
}
