/** Source-derived LDO drawings. The regulator loop, current paths and bias
 * controls are physical native wires; only local supply rails use names. */
import { otaDevices } from "./ota-layouts.mjs";
import { routeDrawing } from "./orthogonal-router.mjs";
import { refineLdoCase } from "./ldo-case-refinements.mjs";
import { compactPlacement, placementRegions } from "./layout-spacing.mjs";
const supplies = new Set(["vin", "vss"]);
const mos = (d) => "np".includes(d.kind);
const top = (d) => d.pins[d.kind === "p" ? 2 : 0];
const bottom = (d) => d.pins[d.kind === "p" ? 0 : 2];
const ends = (d) => (mos(d) ? [d.pins[0], d.pins[2]] : d.pins);
const grid = (n) => Math.round(n / 10) * 10;

export function buildLdoLayout(id, source) {
  const ds = otaDevices(source),
    byRef = new Map(ds.map((d) => [d.ref, d]));
  const portNames = source
    .split(/\r?\n/)
    .find((s) => /^\s*\.subckt/i.test(s))
    .trim()
    .split(/\s+/)
    .slice(2);
  const transistors = ds.filter(mos),
    resistors = ds.filter((d) => d.kind === "r");
  const passes = transistors.filter(
    (d) => d.kind === "p" && d.pins[0] === "vout" && d.pins[2] === "vin",
  );
  if (!passes.length) throw Error("No source-matched PMOS pass device " + id);
  const passGates = new Set(passes.map((d) => d.pins[1]));
  const devices = {},
    sections = {},
    used = new Set(),
    blocks = [];
  function put(d, axis, y, mirror = false, section = "amplifier") {
    if (used.has(d.ref)) return;
    devices[d.ref] = [
      axis + (mos(d) ? (mirror ? 10 : -10) : 0),
      y,
      mos(d) ? (mirror ? "horizontal" : undefined) : 0,
    ];
    sections[d.ref] = section;
    used.add(d.ref);
  }
  function putPassive(
    d,
    x,
    y,
    first,
    horizontal = false,
    section = "amplifier",
  ) {
    put(d, x, y, false, section);
    devices[d.ref][2] = horizontal
      ? d.pins[0] === first
        ? 270
        : 90
      : d.pins[0] === first
        ? 0
        : 180;
  }
  // Identify actual series current paths. Fan-out at a common source or fold
  // remains a visible branch, never a reason to collapse devices into a stack.
  const next = new Map(),
    prev = new Map();
  for (const n of new Set(
    transistors.flatMap(ends).filter((n) => !supplies.has(n) && n !== "vout"),
  )) {
    const up = transistors.filter(
      (d) => bottom(d) === n && !passes.includes(d),
    );
    const down = transistors.filter((d) => top(d) === n && !passes.includes(d));
    if (up.length === 1 && down.length === 1 && up[0] !== down[0]) {
      next.set(up[0].ref, down[0]);
      prev.set(down[0].ref, up[0]);
    }
  }
  const chains = [],
    chained = new Set();
  for (const start of [
    ...transistors.filter((d) => !prev.has(d.ref)),
    ...transistors,
  ]) {
    if (chained.has(start.ref) || passes.includes(start)) continue;
    const ch = [];
    let d = start;
    while (d && !chained.has(d.ref)) {
      ch.push(d);
      chained.add(d.ref);
      d = next.get(d.ref);
    }
    chains.push(ch);
  }
  const chainFor = (d) => chains.find((ch) => ch.includes(d));
  const refRoots = new Set(["vref"]);
  for (let i = 0; i < ds.length; i++) {
    for (const r of resistors) {
      for (let k = 0; k < 2; k++)
        if (
          refRoots.has(r.pins[k]) &&
          !supplies.has(r.pins[1 - k]) &&
          r.pins[1 - k] !== "vout"
        )
          refRoots.add(r.pins[1 - k]);
    }
    for (const d of transistors)
      if (refRoots.has(d.pins[1]) && supplies.has(d.pins[0]))
        refRoots.add(d.pins[2]);
  }
  const sourceLink = (a, b) => {
    if (a.pins[2] === b.pins[2] && !supplies.has(a.pins[2]))
      return { net: a.pins[2], resistors: [] };
    for (const ra of resistors.filter((r) => r.pins.includes(a.pins[2])))
      for (const rb of resistors.filter(
        (r) => r !== ra && r.pins.includes(b.pins[2]),
      )) {
        const na = ra.pins.find((n) => n !== a.pins[2]),
          nb = rb.pins.find((n) => n !== b.pins[2]);
        if (na === nb) return { net: na, resistors: [ra, rb] };
      }
    return null;
  };
  const pairCandidates = [];
  for (const a of transistors)
    for (const b of transistors) {
      if (
        a.ref >= b.ref ||
        a.kind !== b.kind ||
        a.pins[1] === b.pins[1] ||
        passes.includes(a) ||
        passes.includes(b)
      )
        continue;
      const link = sourceLink(a, b);
      if (!link || chainFor(a) === chainFor(b)) continue;
      const score =
        Number(refRoots.has(a.pins[1]) !== refRoots.has(b.pins[1])) * 10 +
        Number(/fb/i.test(a.pins[1]) || /fb/i.test(b.pins[1])) * 5;
      pairCandidates.push({ pair: [a, b], link, score });
    }
  // A few submitted circuits have separately degenerated or grounded input
  // branches. Pair their matching mirror-loaded transconductors without adding
  // a nonexistent common tail.
  if (!pairCandidates.some((p) => p.score)) {
    const a = transistors.find(
      (d) => refRoots.has(d.pins[1]) && !passes.includes(d),
    );
    const b =
      a &&
      transistors.find(
        (d) => d !== a && d.kind === a.kind && /fb/i.test(d.pins[1]),
      );
    if (a && b)
      pairCandidates.push({
        pair: [a, b],
        link: { net: null, resistors: [] },
        score: 20,
      });
  }
  pairCandidates.sort(
    (a, b) => b.score - a.score || a.pair[0].ref.localeCompare(b.pair[0].ref),
  );
  const pairs = [],
    paired = new Set();
  for (const p of pairCandidates)
    if (p.pair.every((d) => !paired.has(d.ref))) {
      pairs.push(p);
      p.pair.forEach((d) => paired.add(d.ref));
    }
  if (!pairs.length) throw Error("No input branches identified " + id);
  let mainRight = 0,
    mainBottom = 0;
  // Main amplifier first; auxiliary differential buffers occupy a second row
  // when this keeps the total drawing balanced rather than extending a ribbon.
  pairs.forEach((p, index) => {
    const arms = p.pair.map(chainFor);
    if (arms.some((ch) => ch.some((d) => used.has(d.ref)))) return;
    const diode = (ch) => ch.some((d) => d.pins[0] === d.pins[1]);
    if (!diode(arms[0]) && diode(arms[1])) {
      p.pair.reverse();
      arms.reverse();
      p.link.resistors.reverse();
    }
    const col = index % 2,
      row = Math.floor(index / 2);
    const nameWidth = (d) => d.ref.length * 10.4;
    const insideWidth = (arm) => Math.max(...arm.filter((d) =>
      d.kind === p.pair[0].kind).map(nameWidth));
    const pitch = Math.max(180, Math.ceil((insideWidth(arms[0]) +
      insideWidth(arms[1]) + 60) / 20) * 20);
    const baseX = 340 + col * 640,
      baseY = 180 + row * 720;
    const upper = Math.max(...p.pair.map((d, i) => arms[i].indexOf(d)));
    const yPair = baseY + upper * 120 + (p.pair[0].kind === "p" ? 180 : 0);
    const block = {
      refs: [],
      pair: p.pair,
      x: baseX,
      y: baseY,
      kind: index ? "buffer" : "error-amplifier",
    };
    arms.forEach((ch, i) => {
      ch.forEach((d, k) => {
        put(
          d,
          baseX + i * pitch,
          yPair + (k - ch.indexOf(p.pair[i])) * 120,
          i === 1,
          block.kind + index,
        );
        block.refs.push(d.ref);
      });
      // Mirror gates face one another, while the D/S branch axes stay fixed.
      for (const d of ch.filter((d) => d.kind !== p.pair[0].kind))
        ((devices[d.ref][2] = i === 0 ? "horizontal" : undefined),
          (devices[d.ref][0] = baseX + i * pitch + (i === 0 ? 10 : -10)));
    });
    const sign = p.pair[0].kind === "n" ? 1 : -1;
    p.link.resistors.forEach((r, i) => {
      putPassive(
        r,
        baseX + i * pitch,
        yPair + sign * 90,
        sign > 0 ? p.pair[i].pins[2] : p.link.net,
        false,
        block.kind + index,
      );
      block.refs.push(r.ref);
    });
    const tails = chains.filter(
      (ch) =>
        !ch.some((d) => used.has(d.ref)) &&
        ch.some((d) => d.kind === p.pair[0].kind && d.pins[0] === p.link.net),
    );
    tails.forEach((ch, j) => {
      const t = ch.find((d) => d.pins[0] === p.link.net),
        ty = yPair + sign * (p.link.resistors.length ? 240 : 160);
      ch.forEach((d, k) => {
        put(
          d,
          baseX + pitch / 2 + j * 150,
          ty + (k - ch.indexOf(t)) * 120,
          false,
          block.kind + index,
        );
        block.refs.push(d.ref);
      });
    });
    if (!tails.length && p.link.net && !supplies.has(p.link.net)) {
      const r = resistors.find(
        (r) =>
          !used.has(r.ref) &&
          r.pins.includes(p.link.net) &&
          r.pins.some((n) => supplies.has(n)),
      );
      if (r) {
        putPassive(
          r,
          baseX + pitch / 2,
          yPair + sign * (p.link.resistors.length ? 240 : 150),
          sign > 0 ? p.link.net : r.pins.find((n) => supplies.has(n)),
          false,
          block.kind + index,
        );
        block.refs.push(r.ref);
      }
    }
    blocks.push(block);
    mainRight = Math.max(
      mainRight,
      ...block.refs.map((r) => devices[r][0] + 90),
    );
    mainBottom = Math.max(
      mainBottom,
      ...block.refs.map((r) => devices[r][1] + 100),
    );
  });
  // A shared drain can break the maximal series-chain detector. Recover
  // source-matched load mirrors beside the actual input branch rather than
  // treating the missing mirror leg as a remote stage or bias island.
  for (const block of blocks.filter((b) => b.pair)) {
    const pair = block.pair;
    const loads = pair.map((input) => transistors.filter((d) =>
      d.kind !== input.kind && d.pins[0] === input.pins[0] &&
      supplies.has(d.pins[2])));
    const a = loads[0].find((d) => loads[1].some((q) =>
      q.pins[1] === d.pins[1] && q.pins[2] === d.pins[2] &&
      [d.pins[0], q.pins[0]].includes(d.pins[1])));
    const b = a && loads[1].find((d) => d.pins[1] === a.pins[1] &&
      d.pins[2] === a.pins[2]);
    if (!a || !b) continue;
    [a, b].forEach((d, i) => {
      if (used.has(d.ref)) return;
      const input = devices[pair[i].ref],
        axis = input[0] + (input[2] === "horizontal" ? -10 : 10);
      put(d, axis, input[1] + (pair[i].kind === "n" ? -120 : 120),
        i === 0, block.kind);
      block.refs.push(d.ref);
    });
  }
  // Extend stages in gate order from the error amplifier toward the pass gate.
  const signalNets = new Set(
    blocks.flatMap((b) =>
      b.refs.flatMap((r) => ends(byRef.get(r))).filter((n) => !supplies.has(n)),
    ),
  );
  const signalChains = [],
    auxChains = [];
  let pending = chains.filter((ch) => !ch.some((d) => used.has(d.ref))),
    advanced = true;
  while (advanced) {
    advanced = false;
    for (const ch of [...pending])
      if (
        ch.some((d) => signalNets.has(d.pins[1]) || passGates.has(d.pins[0]))
      ) {
        signalChains.push(ch);
        pending = pending.filter((c) => c !== ch);
        ch.flatMap(ends)
          .filter((n) => !supplies.has(n))
          .forEach((n) => signalNets.add(n));
        advanced = true;
      }
  }
  auxChains.push(...pending);
  let stageX = Math.max(810, mainRight + 130),
    stageRow = 0;
  signalChains.forEach((ch, index) => {
    if (stageX > 1530) {
      stageX = 810;
      stageRow++;
    }
    const driven = ch.findIndex((d) => signalNets.has(d.pins[1]) && !supplies.has(d.pins[1]));
    const inputNet = driven >= 0 ? ch[driven].pins[1] : null;
    const taps = inputNet ? transistors.filter((d) => used.has(d.ref) &&
      d.pins[0] === inputNet).map((d) => devices[d.ref][1] + (d.kind === "n" ? -40 : 40)) : [];
    const y = taps.length && stageRow === 0
      ? grid(taps.reduce((sum, yy) => sum + yy, 0) / taps.length - driven * 140)
      : 180 + stageRow * 650;
    ch.forEach((d, i) => put(d, stageX, y + i * 140, false, "stage" + index));
    blocks.push({ refs: ch.map((d) => d.ref), kind: "stage" });
    mainRight = Math.max(mainRight, stageX + 80);
    mainBottom = Math.max(mainBottom, y + (ch.length - 1) * 140 + 90);
    stageX += 220;
  });
  // Place the independent bias paths against the amplifier and near their
  // receiving gates. Every bias-control net is subsequently physically wired.
  auxChains.filter((ch) => !ch.some((d) => ends(d).includes("vout"))).forEach((ch, index) => {
    const x = index === 0 ? 140 : 160 + ((index - 1) % 5) * 220;
    const y =
      index === 0 ? 180 : mainBottom + 130 + Math.floor((index - 1) / 5) * 420;
    ch.forEach((d, i) =>
      put(d, x, y + i * 140, d.pins[0] === d.pins[1], "bias" + index),
    );
    blocks.push({ refs: ch.map((d) => d.ref), kind: "bias" });
  });
  const passX = Math.max(860, mainRight + 160),
    passY = 300;
  passes.forEach((d, i) =>
    put(
      d,
      passX + (i % 2) * 180,
      passY + Math.floor(i / 2) * 150,
      passes.length > 1 && passes.every((p) => p.pins[1] === d.pins[1]) && i % 2 === 0,
      "pass",
    ),
  );
  auxChains.filter((ch) => ch.some((d) => ends(d).includes("vout")))
    .forEach((ch, index) => {
      const y = passY + 150;
      const x = [passX - 260 - index * 180, passX + 220 + index * 180,
        passX - 440 - index * 180, passX + 400 + index * 180].find((axis) =>
        ch.every((d, i) => Object.values(devices).every((p) =>
          Math.abs(p[0] - axis) >= 150 || Math.abs(p[1] - y - i * 140) >= 110)));
      if (x === undefined) throw Error("No nearby output sensing placement " + id);
      ch.forEach((d, i) => put(d, x, y + i * 140, false, "output-sensing"));
    });
  // The actual output divider stays on the pass-drain axis. Intermediate taps
  // and parallel feed-forward capacitors retain their exact source endpoints.
  const gates = new Set(transistors.map((d) => d.pins[1]));
  let divider = null;
  for (const r of resistors.filter((r) => r.pins.includes("vout"))) {
    const n = r.pins.find((n) => n !== "vout");
    const low = resistors.find(
      (q) => q !== r && q.pins.includes(n) && q.pins.includes("vss"),
    );
    if (low && (gates.has(n) || /fb/i.test(n))) {
      const score = Number(/fb/i.test(n)) * 10 + Number(gates.has(n));
      if (!divider || score > divider.score)
        divider = { high: r, low, net: n, score };
    }
  }
  if (divider) {
    const y = passY + Math.ceil(passes.length / 2) * 150;
    putPassive(divider.high, passX, y, "vout", false, "pass");
    putPassive(divider.low, passX, y + 160, divider.net, false, "pass");
    ds.filter(
      (d) =>
        d.kind === "c" &&
        d.pins.includes("vout") &&
        d.pins.includes(divider.net),
    ).forEach((d, i) =>
      putPassive(d, passX - 120 - i * 120, y, "vout", false, "pass"),
    );
  }
  // Attach source resistors to their branch axes and bias feed resistors to the
  // diode they feed before fitting other passive networks into nearby space.
  const occupied = (x, y, w = 125, h = 80) =>
    Object.values(devices).some(
      (p) => Math.abs(p[0] - x) < w && Math.abs(p[1] - y) < h,
    );
  for (const d of transistors.filter((d) => used.has(d.ref))) {
    const axis =
        devices[d.ref][0] + (devices[d.ref][2] === "horizontal" ? -10 : 10),
      y = devices[d.ref][1];
    const sourceR = resistors.find(
      (r) =>
        !used.has(r.ref) &&
        r.pins.includes(d.pins[2]) &&
        r.pins.some((n) => supplies.has(n)) &&
        !supplies.has(d.pins[2]),
    );
    if (sourceR) {
      const py = y + (d.kind === "p" ? -120 : 120);
      if (!occupied(axis, py, 80, 70))
        putPassive(
          sourceR,
          axis,
          py,
          d.kind === "p"
            ? sourceR.pins.find((n) => supplies.has(n))
            : d.pins[2],
          false,
          sections[d.ref],
        );
    }
    if (d.pins[0] === d.pins[1]) {
      const r = resistors.find(
        (r) =>
          !used.has(r.ref) &&
          r.pins.includes(d.pins[0]) &&
          r.pins.some((n) => supplies.has(n)),
      );
      if (r) {
        const py = y + (d.kind === "n" ? -140 : 140);
        if (!occupied(axis, py, 80, 70))
          putPassive(
            r,
            axis,
            py,
            d.kind === "n" ? r.pins.find((n) => supplies.has(n)) : d.pins[0],
            false,
            sections[d.ref],
          );
      }
    }
  }
  // Keep each residual R/C chain together. Find free nearby slots against the
  // actual connected transistor positions; no detached passive inventory row.
  const remaining = ds.filter((d) => !used.has(d.ref));
  const components = [];
  for (const start of remaining) {
    if (components.some((ch) => ch.includes(start))) continue;
    const ch = [start];
    let changed = true;
    while (changed) {
      changed = false;
      for (const d of remaining)
        if (
          !ch.includes(d) &&
          !components.some((g) => g.includes(d)) &&
          d.pins.some(
            (n) =>
              !supplies.has(n) &&
              n !== "vout" &&
              ch.some((q) => q.pins.includes(n)) &&
              ds.filter((q) => q.pins.includes(n)).length === 2,
          )
        ) {
          ch.push(d);
          changed = true;
        }
    }
    components.push(ch);
  }
  const yMax = Math.max(800, ...Object.values(devices).map((p) => p[1] + 180));
  components.sort((a, b) => b.length - a.length);
  components.forEach((ch, index) => {
    const nets = new Set(
      ch.flatMap((d) => d.pins).filter((n) => !supplies.has(n)),
    );
    const peers = ds.filter(
      (d) =>
        used.has(d.ref) &&
        d.pins.slice(0, mos(d) ? 3 : 2).some((n) => nets.has(n)),
    );
    const anchors = peers.map((d) => devices[d.ref]);
    const mx = anchors.length
      ? anchors.reduce((s, p) => s + p[0], 0) / anchors.length
      : 450;
    const my = anchors.length
      ? anchors.reduce((s, p) => s + p[1], 0) / anchors.length
      : 500;
    let choice = null;
    const orientations = ch.length > 1 ? [true, false] : [false, true];
    for (const horizontal of orientations)
      for (let y = 80; y <= yMax + 300; y += 100)
        for (let x = 140; x <= passX + 230; x += 110) {
          const ps = ch.map((d, i) => [
            x + (horizontal ? i * 130 : 0),
            y + (horizontal ? 0 : i * 120),
          ]);
          if (
            ps.some(([px, py], i) => {
              const boxes = placementRegions(ch[i], [px, py, horizontal ? 270 : 0]);
              return ds.filter((d) => used.has(d.ref)).some((d) => {
                const regions = placementRegions(d, devices[d.ref]);
                return boxes.some((box) => regions.some((other) =>
                  box.x1 < other.x2 + 10 && box.x2 + 10 > other.x1 &&
                  box.y1 < other.y2 + 10 && box.y2 + 10 > other.y1));
              });
            })
          )
            continue;
          const score =
            ps.reduce(
              (s, p) => s + Math.abs(p[0] - mx) + Math.abs(p[1] - my),
              0,
            ) /
              ps.length +
            Math.max(0, y - yMax) * 2 +
            Number(horizontal && ch.length === 1) * 30;
          if (!choice || score < choice.score)
            choice = { ps, horizontal, score };
        }
    if (!choice)
      throw Error(
        "No local passive placement " + id + " " + ch.map((d) => d.ref),
      );
    const section = peers.length ? sections[peers[0].ref] : "passive" + index;
    ch.forEach((d, i) => {
      const first =
        ch.length > 1 && i > 0
          ? d.pins.find((n) => ch[i - 1].pins.includes(n))
          : (d.pins.find((n) => supplies.has(n)) ?? d.pins[0]);
      putPassive(d, ...choice.ps[i], first, choice.horizontal, section);
    });
  });
  // This source implements each PMOS input branch with two distinct parallel
  // devices. Keep all four visible above the branch they actually feed.
  if (id === "ldo-quiet-sky130-astra-r1") {
    Object.assign(devices, {
      XIR0: [290, 280],
      XIR1: [430, 280],
      XIF0: [610, 280, "horizontal"],
      XIF1: [750, 280, "horizontal"],
      XTAIL: [510, 100],
      XIRC: [360, 410],
      XIFC: [680, 410, "horizontal"],
      XNRC: [380, 550, "horizontal"],
      XNOC: [660, 550],
      XNR: [380, 700, "horizontal"],
      XNO: [660, 700],
      XBN: [150, 570, "horizontal"],
      RBIAS: [140, 420],
      XBN2: [130, 260],
      XBP: [150, 100, "horizontal"],
      XPD: [1030, 170],
      XDRV: [1030, 390],
      XPASS: [1270, 300],
      RREF: [210, 350, 270],
      RCOMP: [910, 540, 270],
      CCOMP: [1050, 540, 270],
      CFEED: [910, 690],
      RFB1: [1280, 460],
      RFB2: [1280, 630],
    });
    for (const r of [
      "XIR0",
      "XIR1",
      "XIF0",
      "XIF1",
      "XTAIL",
      "XIRC",
      "XIFC",
      "XNRC",
      "XNOC",
      "XNR",
      "XNO",
    ])
      sections[r] = "parallel-input";
    for (const r of ["XBN", "RBIAS", "XBN2", "XBP"]) sections[r] = "local-bias";
  }
  if (id === "ldo-quiet-sky130-sol-6-1-r3") {
    Object.assign(devices, {
      XSR: [290, 250],
      XSF: [910, 250, "horizontal"],
      RSR: [300, 420],
      RSF: [900, 420],
      XPB: [150, 140, "horizontal"],
      RB: [140, 290],
      XPT: [610, 140],
      XPI1: [500, 300],
      XPI2: [740, 300, "horizontal"],
      XNL1: [520, 480, "horizontal"],
      XNL2: [720, 480],
      XREP: [1070, 160],
      XDR: [1070, 390],
      XPASS: [1310, 300],
      RFB1: [1320, 460],
      RFB2: [1320, 630],
      CFB: [1200, 460],
      RCOMP: [940, 600, 270],
      CCOMP: [1080, 600, 270],
      CEA: [950, 740],
    });
    for (const r of ["XPI1", "XPI2", "XPT", "XNL1", "XNL2"])
      sections[r] = "error-amplifier";
    sections.XSR = "reference-follower";
    sections.XSF = "feedback-follower";
  }
  compactPlacement(ds, devices);
  refineLdoCase(id, ds, devices, sections);
  if (id === "ldo-always-on-sky130-luna-6-r3") {
    // The compensating branch's fixed vertical terminal escape otherwise
    // touches the long XMPLOADOUT reference in the standalone SVG font.
    devices.RZ[0] += 40;
    devices.CCOMPZ[0] += 40;
    devices.CCOMP[0] += 60;
  }
  if (id === "ldo-low-voltage-sky130-sol-6-r2") devices.RUFLOAD[0] += 100;
  if (id === "ldo-core-sky130-sol-6-r1") {
    // Preserve clearance from XPUSR to the compensation branch's fixed lead.
    devices.RZ[0] += 40;
    devices.CCOMP[0] += 40;
  }
  if (id === "ldo-low-voltage-sky130-luna-6-r1") {
    // Keep fixed terminal escapes clear of RFBIAS and RFSIG annotations.
    devices.RLOADFB[0] += 40;
    devices.CFF[0] += 50;
  }
  for (const d of ds.filter(
    (d) => !mos(d) && d.pins.some((n) => supplies.has(n)),
  ))
    sections[d.ref] = "supply-passive-" + d.ref;
  // Ports belong to their branch. VIN/VSS have the same horizontal orientation
  // as ordinary named power ports, retaining the submitted interface identities.
  const primary = blocks[0],
    firstPair = primary.pair;
  const refDevice =
    firstPair.find((d) => d.pins[1] === "vref") ??
    transistors.find((d) => d.pins[1] === "vref");
  const refNear = refDevice ?? ds.find((d) => d.pins.includes("vref"));
  const rpos = devices[refNear.ref];
  const pyMin = Math.min(...primary.refs.map((r) => devices[r][1])),
    pyMax = Math.max(...primary.refs.map((r) => devices[r][1]));
  const ports = {};
  const safePort = (preferred, direction) => {
    const choices = [];
    for (const dy of [0, -40, 40, -80, 80, -120, 120, -160, 160, -200, 200])
      for (const dx of [0, -40, 40, -80, 80, -120, 120, -180, 180, -220, 220, -260, 260]) {
        const x = preferred[0] + dx,
          y = preferred[1] + dy;
        if (x < 40 || y < 30) continue;
        if (
          ds.some((d) => {
            const p = devices[d.ref],
              mir = p[2] === "horizontal",
              horizontal = !mos(d) && (p[2] ?? 0) % 180 !== 0;
            const left = mos(d)
              ? p[0] - (mir ? Math.max(60, d.ref.length * 9 + 25) : 25)
              : p[0] - (horizontal ? 60 : 20);
            const right = mos(d)
              ? p[0] + (mir ? 25 : Math.max(60, d.ref.length * 9 + 25))
              : p[0] + (horizontal ? 60 : Math.max(75, d.ref.length * 9 + 20));
            return (
              x + 42 > left &&
              x - 42 < right &&
              // Port names sit above the terminal. Reserve the neighboring
              // device's pin and escape too, not just its body/reference.
              Math.abs(y - p[1]) < (horizontal ? 75 : mos(d) ? 80 : 100)
            );
          })
        )
          continue;
        if (
          Object.values(ports).some(
            (p) => Math.abs(p[0] - x) < 100 && Math.abs(p[1] - y) < 50,
          )
        )
          continue;
        choices.push({
          p: [x, y, ...(direction ? [direction] : [])],
          score: Math.abs(dx) + Math.abs(dy) * 1.4,
        });
      }
    if (!choices.length) throw Error("No clear native port " + id);
    return choices.sort((a, b) => a.score - b.score)[0].p;
  };
  for (const name of portNames) {
    const n = name.toLowerCase();
    if (supplies.has(n)) {
      const preferred = [
        250,
        n === "vin" ? Math.max(30, pyMin - 90) : pyMax + 90,
      ];
      ports[name] = safePort(preferred, 0);
      const supplyDevices = ds.filter((d) => ends(d).includes(n));
      const nearest = supplyDevices.sort((a, b) => {
        const p = devices[a.ref],
          q = devices[b.ref],
          target = ports[name];
        return (
          Math.abs(p[0] - target[0]) +
          Math.abs(p[1] - target[1]) -
          Math.abs(q[0] - target[0]) -
          Math.abs(q[1] - target[1])
        );
      })[0];
      sections["@" + name] = sections[nearest.ref];
    } else if (n === "vout") {
      const p = devices[passes[0].ref];
      ports[name] = safePort(
        [Math.max(...passes.map((d) => devices[d.ref][0])) + 140, p[1] + 60],
        180,
      );
      sections["@" + name] = "pass";
    } else if (n === "vref") {
      const right = rpos[2] === "horizontal";
      ports[name] = safePort(
        [rpos[0] + (right ? 100 : -100), rpos[1]],
        right ? 180 : 0,
      );
    } else throw Error("Unsupported LDO port " + name);
  }
  if (id === "ldo-low-voltage-sky130-sol-6-r1") ports.VSS[0] -= 60;
  if (id === "ldo-always-on-sky130-sol-6-r1") ports.VSS[1] -= 30;
  const minY = Math.min(
    ...Object.values(devices).map((p) => p[1]),
    ...Object.values(ports).map((p) => p[1]),
  );
  if (minY < 60)
    for (const p of [...Object.values(devices), ...Object.values(ports)])
      p[1] += 60 - minY;
  for (const p of [...Object.values(devices), ...Object.values(ports)]) {
    p[0] = grid(p[0]);
    p[1] = grid(p[1]);
  }
  if (used.size !== ds.length) throw Error("Incomplete LDO layout " + id);
  return {
    id,
    strategy: "connected-ldo",
    devices,
    ports,
    continuousNets: [
      ...new Set(ds.flatMap((d) => d.pins).filter((n) => !supplies.has(n))),
    ].sort(),
    title: "Transistor-level LDO regulator",
    description:
      "Source-matched error amplifier, pass stage, feedback divider, compensation and bias paths with continuous native wiring.",
    body_note:
      "NFET bodies → VSS; PFET bodies → VIN. Saved bulk defaults omit standard body wires; exact device parameters remain in source and native project.",
    draw(c) {
      routeDrawing(
        c,
        ds.map((d) => ({
          ...d,
          labelWidth: c.referenceWidth(d.ref) / 10,
          labelClearance: 0.6,
        })),
        devices,
        ports,
        sections,
        supplies,
        // Reserve a small visible gap around supply names in the standalone
        // fallback font as well as the native label's nominal advance box.
        {
          supplyLabelWidthAllowance: 5,
          supplyLabelClearance: 4,
          requireClearSupplyLabels: true,
          preferDeviceRoots: true,
          deviceRootMinTerminals: 0,
          netClearanceZones:
            id === "ldo-always-on-sky130-sol-6-r1"
              ? { fb: [[300, 300, 650, 550]] }
              : id === "ldo-core-sky130-sol-6-1-r2"
                ? {
                    fb: [[850, 300, 1090, 410]],
                    dnfb: [[400, 640, 1000, 700]],
                    pb: [[260, 200, 610, 720]],
                  }
                : id === "ldo-low-voltage-sky130-opus-5-5-r2"
                  ? { e2: [[530, 340, 700, 440]] }
                  : undefined,
        },
      );
      if (id === "ldo-low-voltage-sky130-deepseek-r2") {
        const p = c.point("XM5.D");
        c.j("source-open-S1", "s1", p.x, p.y + 40);
        c.w("s1", "XM5.D", "source-open-S1");
        c.boundLabel("s1", "source-open-S1", 10, 5, "start");
      }
    },
  };
}
