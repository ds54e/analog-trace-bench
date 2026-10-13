import { createHash } from "node:crypto";

/** Reviewed ordinary two-stage variants with one source-owned capacitor.
 * These four frozen sources share the existing eight-MOS motif; their extra
 * capacitor does not belong to the series compensation branch. Other sources
 * continue through their existing layouts, including the accepted pilot. */
const variants = {
  "ota-drive-sky130-sonnet-5-5-r2": {
    sha: "5e157bc9cd85aa420a072e68e897f3a0bae11fe6fbb3b74a320a8a32f1b62074",
    ref: "CDEC", pins: ["ibias", "vss"], role: "bias-ground",
  },
  "ota-drive-sky130-sol-6-1-r2": {
    sha: "4a2a805c92f1c595c8920dd73850064ade4349e84e5a3c3d83d59fccae6b4abc",
    ref: "CBIAS", pins: ["ibias", "vss"], role: "bias-ground",
  },
  "ota-precision-sky130-sol-6-1-r1": {
    sha: "719ae2e205cc62b0741bb5f4d728f3ab07fe03d2330f63fb73b34e356245b1de",
    ref: "CPS", pins: ["ndi", "vss"], role: "mirror-ground",
  },
  "ota-precision-sky130-sol-6-r1": {
    sha: "ed1917b53be6330bcb5f1fd91402243e9c07652361144b528070800b5c27302d",
    ref: "CRF", pins: ["vdd", "ibias"], role: "supply-bias",
  },
};

export function ordinaryOtaPassiveVariant(id, source, ds, ports, buildCore) {
  const variant = variants[id];
  if (!variant) return null;
  if (createHash("sha256").update(source).digest("hex") !== variant.sha)
    throw Error("Unreviewed ordinary OTA passive variant source " + id);
  const cap = ds.find((d) => d.ref === variant.ref);
  if (!cap || cap.kind !== "c" ||
      cap.pins.some((n, i) => n !== variant.pins[i]) || ds.length !== 11)
    throw Error("Wrong source-owned OTA capacitor " + id);
  // The existing matcher verifies all eight ordered-pin core roles and the
  // submitted interstage -> first passive -> second passive -> VOUT order.
  const coreDs = ds.filter((d) => d !== cap);
  const core = buildCore(coreDs);
  if (!core) throw Error("Ordinary OTA core no longer matches " + id);
  const bias = coreDs.find((d) => d.kind === "n" &&
    d.pins[0] === "ibias" && d.pins[1] === "ibias" && d.pins[2] === "vss");
  const mirror = coreDs.find((d) => d.kind === "p" &&
    d.pins[0] === d.pins[1] && d.pins[2] === "vdd");
  const port = Object.fromEntries(ports.map((n) => [n.toLowerCase(), n]));
  if (!bias || !mirror || (variant.role === "mirror-ground" &&
      cap.pins[0] !== mirror.pins[0]))
    throw Error("Wrong owning OTA motif " + id);

  // Keep the pair, short local mirror closure and centred tail intact. The
  // shunt belongs to its reference or mirror drain, not a bottom inventory row.
  const bp = core.devices[bias.ref];
  const compensationFirst = coreDs.find((d) => "rc".includes(d.kind) &&
    d.pins.includes(coreDs.find((q) => q.kind === "p" &&
      q.pins[0] === "vout").pins[1]));
  const position = variant.role === "bias-ground"
    ? [bp[0] - 90, bp[1], 0]
    : variant.role === "mirror-ground"
      ? [bp[0] - 90, core.devices[mirror.ref][1] + 110, 0]
      : [bp[0] - 90, core.devices[mirror.ref][1] + 90, 0];
  return {
    ...core,
    // Retain the connected-stage page/validation contract for these four
    // previously connected-stage runs, while authoring this matched motif.
    strategy: "connected-stages",
    devices: { ...core.devices, [cap.ref]: position },
    passiveLabels: {
      ...core.passiveLabels,
      ...(compensationFirst.ref.length > 3
        ? { [compensationFirst.ref]: { x: 30, y: -32, align: "middle" } }
        : {}),
      [cap.ref]: { x: -16, y: -4, align: "end" },
    },
    continuousNets: [...new Set(ds.flatMap((d) => d.pins)
      .filter((n) => !["vdd", "vss"].includes(n)))].sort(),
    description: "Two-stage OTA with a differential input, mirrored reference bias and the submitted capacitor beside its owning node.",
    draw(c) {
      const bs = c.point(bias.ref + ".S");
      const vssY = Math.round((bs.y + core.ports[port.vss][1]) / 20) * 10;
      c.j("variant-cap-vss", port.vss, bs.x, vssY);
      if (variant.role === "supply-bias")
        c.j("variant-cap-vdd", port.vdd,
          core.ports[port.vdd][0] + 30, core.ports[port.vdd][1]);
      // Split an existing rail leg at a real branch tap. This retains three-way
      // junctions and keeps the new lead out of the horizontal port body.
      core.draw({ ...c, w(net, from, to, bends = [], color) {
        if (from === bias.ref + ".S" && to === "vs1") {
          c.w(net, from, "variant-cap-vss", [], color);
          c.w(net, "variant-cap-vss", to, [], color);
        } else if (variant.role === "supply-bias" &&
            from === "@" + port.vdd && to === "vd1") {
          c.w(net, from, "variant-cap-vdd", [], color);
          c.w(net, "variant-cap-vdd", to, [], color);
        } else c.w(net, from, to, bends, color);
      } });
      const route = (net, from, to, bends) => {
        let previous = c.point(from);
        const clean = bends.filter(([x, y]) => {
          if (previous.x === x && previous.y === y) return false;
          previous = { x, y };
          return true;
        });
        c.w(net, from, to, clean);
      };
      const top = cap.ref + ".1", bottom = cap.ref + ".2";
      const cp = c.point(top), cq = c.point(bottom);
      if (variant.role === "bias-ground") {
        const drain = c.point(bias.ref + ".D");
        route(cap.pins[0], top, bias.ref + ".D", [[cp.x, drain.y]]);
        route(cap.pins[1], bottom, "variant-cap-vss", [[cq.x, vssY]]);
      } else if (variant.role === "mirror-ground") {
        const drain = c.point(mirror.ref + ".D");
        route(cap.pins[0], top, mirror.ref + ".D", [[cp.x, drain.y]]);
        route(cap.pins[1], bottom, "variant-cap-vss", [[cq.x, vssY]]);
      } else {
        const drain = c.point(bias.ref + ".D");
        const tap = c.point("variant-cap-vdd"), corridor = tap.y + 20;
        route(cap.pins[0], top, "variant-cap-vdd",
          [[cp.x, corridor], [tap.x, corridor]]);
        route(cap.pins[1], bottom, bias.ref + ".D", [[cq.x, drain.y]]);
      }
      // Connected-stage mode uses object-bound local supply labels. These
      // existing motif junctions remain part of the continuous physical rails.
      c.boundLabel(port.vdd, "vd1", 0, -12, "middle");
      c.boundLabel(port.vss, "vs1", -30, 22, "middle");
      c.boundLabel(port.ibias, "bias-drain", -30, -12, "middle");
    },
  };
}
