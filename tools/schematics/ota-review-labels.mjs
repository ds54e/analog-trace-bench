/** Local, source-bound readability refinements confirmed in native renders. */
export function reviewOtaDrawing(id, c, devices) {
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

function driveInputClearance(c) {
  const lowerBranch = new Set();
  return {
    ...c,
    j(key, net, x, y) {
      // The auxiliary-pair drain formerly ended ten units below the input
      // source corner on the same axis. Separate the two circuit paths.
      if (net === "n2" && x === 410 && y === 240) {
        y = 260;
        lowerBranch.add(key);
      }
      c.j(key, net, x, y);
    },
    w(net, from, to, bends = [], color) {
      if (net === "n2" && (lowerBranch.has(from) || lowerBranch.has(to))) {
        const other = c.point(lowerBranch.has(from) ? to : from);
        if (other.x === 560 && other.y === 240) bends = [[560, 260]];
      }
      c.w(net, from, to, bends, color);
    },
  };
}
