/** Local, source-bound readability refinements confirmed in native renders. */
export function reviewOtaDrawing(id, c, devices) {
  if (id === "ota-wide-sky130-opus-5-5-r1" ||
      id === "ota-wide-sky130-fable-r1" ||
      id === "ota-wide-sky130-sonnet-5-5-r1" ||
      id === "ota-wide-sky130-sonnet-5-5-r3") return controlLabelClearance(id, c);
  if (id === "ota-drive-sky130-sol-6-r1") return driveInputClearance(c);
  if (id !== "ota-wide-sky130-opus-5-5-r2") return c;

  const leftCascode = c.point("XM7.G"),
    rightCascode = c.point("XM8.G"),
    lowerCascode = c.point("XM11.G"),
    nTail = c.point("XMTN.S"),
    lowerGateLabels = new Set();

  return {
    ...c,
    j(key, net, x, y) {
      // The lower-left auxiliary gate escape nearly touched the signal riser.
      // Keep its short stub and label entirely on the gate's side of that riser.
      if (
        net === "vbnc" &&
        x === lowerCascode.x + 20 &&
        y === lowerCascode.y
      ) {
        x -= 10;
        y += 10;
        lowerGateLabels.add(key);
      }
      c.j(key, net, x, y);
    },
    w(net, from, to, bends = [], color) {
      if (
        net === "vbnc" &&
        (lowerGateLabels.has(from) || lowerGateLabels.has(to))
      ) {
        // A short downturned tip points at the control label in the available
        // pocket without approaching the signal riser or source rail.
        bends = [[lowerCascode.x + 10, lowerCascode.y]];
      }
      c.w(net, from, to, bends, color);
    },
    boundLabel(net, key, dx, dy, align) {
      const p = c.point(key);
      // Put both cascode controls over their gate stubs, clear of the D/S
      // columns and the input-port labels. Only text offsets change here.
      if (
        net === "vbpc" &&
        p.x === leftCascode.x + 20 &&
        p.y === leftCascode.y
      ) {
        dx = -28;
        dy = -24;
        align = "start";
      } else if (
        net === "vbpc" &&
        p.x === rightCascode.x - 20 &&
        p.y === rightCascode.y
      ) {
        dx = 28;
        dy = -24;
        align = "end";
      } else if (net === "vbnc" && lowerGateLabels.has(key)) {
        dx = 12;
        dy = 20;
        align = "end";
      } else if (
        net === "vss" &&
        p.x === nTail.x &&
        p.y === nTail.y + 20
      ) {
        // Opposite-polarity tails share an axis. Distinct label sides make
        // the upper tail's VSS and lower tail's VDD ownership unambiguous.
        dx = -8;
        align = "end";
      }
      c.boundLabel(net, key, dx, dy, align);
    },
  };
}

function controlLabelClearance(id, c) {
  return {
    ...c,
    boundLabel(net, key, dx, dy, align) {
      const p = c.point(key);
      if ((id === "ota-wide-sky130-opus-5-5-r1" && net === "vbpc") ||
          (id === "ota-wide-sky130-fable-r1" && net === "vbp2")) {
        // Above the input-port text and the adjacent mirror return, rather
        // than letting native label-overlap recovery move text onto that wire.
        const refs = id.includes("opus") ? ["XMP3", "XMP4"] : ["XM7", "XM8"];
        if (refs.some(ref => Math.abs(p.y - c.point(ref + ".G").y) < 1)) dy = -48;
      }
      if (id === "ota-wide-sky130-sonnet-5-5-r3" &&
          ["vbnc", "vbpc"].includes(net)) {
        const ref = net === "vbnc" ? "XMNC2" : "XMPC4", gate = c.point(ref + ".G");
        if (p.x === gate.x + 20 && p.y === gate.y) {
          // Put the control above its owner's outside reference. The narrow
          // gate-to-output pocket cannot contain the complete control word.
          dx = -80; dy = -34; align = "end";
        }
      }
      if (id === "ota-wide-sky130-sonnet-5-5-r1") {
        const mirrorGate = c.point("XMmca.G"), sinkGate = c.point("XMna.G");
        if (net === "vcn" && p.y === mirrorGate.y && p.x === mirrorGate.x + 100)
          dy = -48;
        if (net === "ibias" && p.y === sinkGate.y && p.x === sinkGate.x - 20) {
          dx = 70; dy = -24; align = "start";
        }
      }
      c.boundLabel(net, key, dx, dy, align);
    },
  };
}

function driveInputClearance(c) {
  const inputSource = c.point("XINP.S");
  const lowerBranch = new Set();
  return {
    ...c,
    j(key, net, x, y) {
      // The auxiliary-pair drain formerly ended ten units below the input
      // source corner on the same axis. Separate the two circuit paths.
      if (net === "n2" && x === inputSource.x && y === inputSource.y + 10) {
        y += 20;
        lowerBranch.add(key);
      }
      c.j(key, net, x, y);
    },
    w(net, from, to, bends = [], color) {
      if (net === "n2" && (lowerBranch.has(from) || lowerBranch.has(to))) {
        const other = c.point(lowerBranch.has(from) ? to : from);
        if (other.y === inputSource.y + 10 && other.x !== inputSource.x)
          bends = [[other.x, inputSource.y + 30]];
      }
      c.w(net, from, to, bends, color);
    },
  };
}
