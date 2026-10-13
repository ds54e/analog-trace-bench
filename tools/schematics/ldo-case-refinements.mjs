/** Source-specific placement refinements for the larger regulator topologies. */
export function refineLdoCase(id, ds, devices, sections) {
  const byRef = new Map(ds.map((d) => [d.ref, d]));
  const assigned = new Set();
  // x is the drain/source axis. Mirroring a gate does not move its branch.
  const mos = (ref, x, y, mirror = false, section = "amplifier") => {
    const d = byRef.get(ref);
    if (!d || !"np".includes(d.kind))
      throw Error("Missing LDO transistor " + id + " " + ref);
    devices[ref] = [
      x + (mirror ? 10 : -10),
      y,
      mirror ? "horizontal" : undefined,
    ];
    sections[ref] = section;
    assigned.add(ref);
  };
  const passive = (
    ref,
    x,
    y,
    first,
    horizontal = false,
    section = "amplifier",
  ) => {
    const d = byRef.get(ref),
      net = first.toLowerCase();
    if (!d || !d.pins.includes(net))
      throw Error("Missing LDO passive endpoint " + id + " " + ref);
    devices[ref] = [
      x,
      y,
      horizontal ? (d.pins[0] === net ? 270 : 90) : d.pins[0] === net ? 0 : 180,
    ];
    sections[ref] = section;
    assigned.add(ref);
  };
  let refined = false;
  if (id === "ldo-core-sky130-sol-6-1-r2") {
    refined = true;
    // Degenerated PMOS input and both locally regulated drain branches.
    mos("XTAIL", 410, 130);
    passive("RSREF", 300, 260, "pt");
    passive("RSFB", 520, 260, "pt");
    mos("XINREF", 300, 350);
    mos("XINFB", 520, 350, true);
    mos("XNCREF", 300, 480, true);
    mos("XNCFB", 520, 480);
    mos("XNREF", 300, 610, true);
    mos("XNFB", 520, 610);
    // Place the receiving mirror beside the input taps, with its output branch
    // on the same row. The two lower gates retain the two distinct input nets.
    mos("XPUPREF", 800, 130, true, "fold");
    mos("XPCREF", 800, 270, true, "fold");
    mos("XNCFOLD", 800, 480, true, "fold");
    mos("XNFOLD", 800, 610, false, "fold");
    mos("XPUP", 1040, 130, false, "fold");
    mos("XPCOUT", 1040, 270, false, "fold");
    mos("XNCDOWN", 1040, 480, false, "fold");
    mos("XNDOWN", 1040, 610, false, "fold");
    mos("XPASS", 1390, 350, false, "pass");
    passive("RFBT", 1390, 520, "vout", false, "pass");
    passive("RFBB", 1390, 700, "fb", false, "pass");
    passive("CFF", 1250, 520, "vout", false, "pass");
    passive("RMILL", 1180, 200, "pg", true, "compensation");
    passive("CMILL", 1340, 200, "mc", true, "compensation");
    passive("RLEAD", 1150, 570, "pg", false, "compensation");
    passive("CGCOMP", 1150, 710, "gc", false, "compensation");
    // Quarter-reference regulator stays directly below the amplifier it biases.
    passive("RBDT", 160, 820, "vref", false, "regulated-bias");
    passive("RBDB", 160, 1030, "bref", false, "regulated-bias");
    passive("CBREF", 280, 1030, "bref", false, "regulated-bias");
    passive("RBTAIL", 490, 770, "vin", false, "regulated-bias");
    mos("XBA2", 380, 900, false, "regulated-bias");
    mos("XBA1", 600, 900, true, "regulated-bias");
    mos("XBN1", 380, 1030, true, "regulated-bias");
    mos("XBN2", 600, 1030, false, "regulated-bias");
    mos("XPBIAS", 800, 800, true, "regulated-bias-output");
    mos("XBSET", 800, 940, false, "regulated-bias-output");
    passive("RBSET", 800, 1080, "bs", false, "regulated-bias-output");
    passive("CBAC", 680, 1080, "ba", false, "regulated-bias-output");
    mos("XNCBIAS", 1030, 870, false, "n-cascode-bias");
    mos("XNCB", 1030, 1030, true, "n-cascode-bias");
    passive("CNC", 1150, 1030, "nc", false, "n-cascode-bias");
    mos("XPCB", 1340, 870, true, "p-cascode-bias");
    passive("RPC", 1340, 1030, "pc", false, "p-cascode-bias");
    passive("CPC", 1480, 870, "vin", false, "p-cascode-bias");
  }
  if (id === "ldo-quiet-sky130-sol-6-1-r1") {
    refined = true;
    mos("XIT", 380, 230);
    mos("XIF", 270, 420);
    mos("XIR", 490, 420, true);
    mos("XNS1", 270, 610, true);
    mos("XNS2", 490, 610);
    // Both folded receivers have their sources at the input-drain height.
    mos("XPM1", 740, 150, true, "fold");
    mos("XPC1", 740, 290, true, "fold");
    mos("XNF1", 740, 450, true, "fold");
    mos("XPM2", 960, 150, false, "fold");
    mos("XPC2", 960, 290, false, "fold");
    mos("XNF2", 960, 450, false, "fold");
    passive("RCP1", 830, 50, "pc", true, "fold");
    passive("RCP2", 1050, 140, "vin", false, "fold");
    // The local voltage follower remains visible between EA and the pass gate.
    mos("XBP1", 1200, 240, true, "buffer");
    mos("XBP2", 1420, 240, false, "buffer");
    mos("XB1", 1200, 420, false, "buffer");
    mos("XB2", 1420, 420, true, "buffer");
    mos("XBT", 1310, 610, false, "buffer");
    passive("RGB2", 1530, 100, "vin", false, "buffer");
    passive("RGB1", 1530, 260, "bg", false, "buffer");
    mos("XPP", 1670, 420, false, "pass");
    passive("RFT", 1670, 590, "vout", false, "pass");
    passive("RFB", 1670, 750, "fb", false, "pass");
    passive("CFF", 1530, 590, "vout", false, "pass");
    passive("RCOMP", 950, 640, "ea", true, "compensation");
    passive("CCOMP", 1100, 640, "xc", true, "compensation");
    // A short bias row sits against its receiving branches, with each supply
    // local to its current path rather than an enclosing full-sheet rail.
    passive("RBIAS", 160, 800, "vin", false, "bias-reference");
    mos("XBN", 160, 960, true, "bias-reference");
    mos("XPB", 380, 800, true, "p-bias");
    mos("XNB", 380, 960, false, "p-bias");
    passive("RPC", 590, 800, "bp", false, "p-cascode-bias");
    mos("XNPC", 590, 960, false, "p-cascode-bias");
    passive("RNC", 810, 800, "vin", false, "fold-bias");
    mos("XNC", 810, 960, true, "fold-bias");
    mos("XPBB", 1120, 800, false, "buffer-bias");
    mos("XNBB", 1120, 960, true, "buffer-bias");
  }
  if (id === "ldo-quiet-sky130-sol-6-1-r2") {
    refined = true;
    mos("XEL", 300, 160, true);
    mos("XEO", 520, 160);
    mos("XCL", 300, 300, true);
    mos("XCR", 520, 300);
    mos("XEF", 300, 460);
    mos("XER", 520, 460, true);
    mos("XET", 410, 630);
    passive("RGC", 150, 170, "vin", false, "cascode-bias");
    passive("RGR", 150, 320, "gc", false, "cascode-bias");
    passive("RBA", 150, 520, "vin", false, "fixed-bias");
    mos("XB0", 150, 680, true, "fixed-bias");
    // Complementary followers share an EA corridor on the left and a PG
    // corridor on the right; neither half masquerades as a separate gain stage.
    mos("XBL", 860, 180, true, "n-buffer");
    mos("XBO", 1080, 180, false, "n-buffer");
    mos("XBF", 860, 340, false, "n-buffer");
    mos("XBR", 1080, 340, true, "n-buffer");
    mos("XBT", 970, 510, false, "n-buffer");
    mos("XPT", 970, 730, false, "p-buffer");
    mos("XPF", 860, 880, false, "p-buffer");
    mos("XPR", 1080, 880, true, "p-buffer");
    mos("XPL", 860, 1030, true, "p-buffer");
    mos("XPO", 1080, 1030, false, "p-buffer");
    mos("XP", 1400, 340, false, "pass");
    passive("RFH", 1400, 550, "vout", false, "pass");
    passive("RFL", 1400, 730, "fb", false, "pass");
    passive("CF", 1250, 160, "vin", false, "pass");
    passive("RC", 630, 580, "ea", true, "compensation");
    passive("CC", 780, 580, "ec", true, "compensation");
    passive("RBB", 300, 820, "vin", false, "adaptive-bias");
    mos("XBN", 300, 1000, true, "adaptive-bias");
    mos("XS", 510, 820, true, "adaptive-bias");
    mos("XBP", 630, 860, true, "adaptive-bias-mirror");
    mos("XBI", 630, 1030, false, "adaptive-bias-mirror");
  }
  if (id === "ldo-low-voltage-sky130-opus-5-5-r2") {
    refined = true;
    // Slow precision loop: matched input branches followed by the source
    // follower that establishes VS for the faster error pair.
    mos("XS3", 250, 160, true, "precision-loop");
    mos("XS4", 450, 160, false, "precision-loop");
    mos("XS2", 250, 340, false, "precision-loop");
    mos("XS1", 450, 340, true, "precision-loop");
    passive("RTS", 350, 520, "ts", false, "precision-loop");
    mos("XY", 670, 220, false, "reference-follower");
    mos("XR", 670, 400, false, "reference-follower");
    passive("RTR", 670, 550, "tr", false, "reference-follower");
    passive("RM", 430, 640, "vs", true, "reference-follower");
    passive("CM", 580, 640, "em", true, "reference-follower");
    // The current-output fast pair has two diode loads. Its mirror receiving
    // branches stay beside it: D1 -> D3 -> G and D2 -> G remain visible.
    mos("XP1", 890, 160, true, "fast-loop");
    mos("XP2", 1090, 160, true, "fast-loop");
    mos("XF1", 890, 340, false, "fast-loop");
    mos("XF2", 1090, 340, true, "fast-loop");
    mos("XNT", 990, 520, false, "fast-loop");
    mos("XP1O", 1310, 160, false, "gate-driver");
    mos("XN3", 1310, 340, true, "gate-driver");
    mos("XP2O", 1530, 160, false, "gate-driver");
    mos("XN3O", 1530, 340, false, "gate-driver");
    mos("XMP", 1800, 340, false, "pass");
    passive("RA", 1800, 520, "vout", false, "pass");
    passive("RBD", 1800, 690, "fa", false, "pass");
    passive("RC", 1800, 860, "fb", false, "pass");
    passive("CFF", 1650, 520, "vout", false, "pass");
    passive("RZ", 1330, 560, "g", true, "gate-compensation");
    passive("CZ", 1480, 560, "nz", true, "gate-compensation");
    // The two transient assist paths occupy the lower row directly below the
    // gate driver. Their DC references are adjacent, not isolated far away.
    passive("RB", 160, 810, "vin", false, "bias-reference");
    mos("XNB", 160, 970, true, "bias-reference");
    mos("XBRP", 380, 810, true, "down-reference");
    mos("XBR1", 380, 970, false, "down-reference");
    mos("XBRP3", 600, 810, true, "up-reference-mirror");
    mos("XBR3", 600, 970, false, "up-reference-mirror");
    mos("XBRP2", 820, 810, false, "up-reference");
    mos("XBR2", 820, 970, true, "up-reference");
    mos("XBX", 1080, 810, false, "down-assist");
    mos("XBY", 1080, 970, true, "down-assist");
    mos("XBD", 1310, 970, false, "down-assist-output");
    mos("XBV", 1530, 810, true, "up-assist");
    mos("XBU", 1530, 970, false, "up-assist");
    mos("XBUP", 1800, 1040, false, "up-assist-output");
    passive("RX1", 570, 1130, "rp", true, "down-assist-input");
    passive("CX1", 770, 1130, "gx", true, "down-assist-input");
    passive("RX2", 1140, 1200, "rn", true, "up-assist-input");
    passive("CX2", 1340, 1200, "gu", true, "up-assist-input");
  }
  if (id === "ldo-core-sky130-sol-6-1-r1") {
    refined = true;
    // Keep the divided reference beside its input and the error-pair drains
    // beside the balanced pull-up / pull-down current-gain branches.
    passive("RVR1", 150, 270, "vref", false, "reference-divider");
    passive("RVR2", 150, 470, "vr", false, "reference-divider");
    passive("CVR", 270, 470, "vr", false, "reference-divider");
    mos("XTAIL", 490, 150);
    mos("XIN1", 390, 330);
    mos("XIN2", 590, 330, true);
    mos("XNR", 390, 500, true);
    mos("XNF", 590, 500);
    mos("XPU", 820, 150, true, "current-gain");
    mos("XNX", 820, 330, false, "current-gain");
    mos("XPDRV", 1040, 150, false, "gate-driver");
    mos("XNDRV", 1040, 330, false, "gate-driver");
    mos("XPASS", 1420, 330, false, "pass");
    passive("RFB1", 1420, 530, "vout", false, "pass");
    passive("RFB2", 1420, 720, "fb", false, "pass");
    passive("CFF", 1280, 530, "vout", false, "pass");
    passive("RCOMP", 1190, 180, "gp", true, "compensation");
    passive("CCOMP", 1350, 180, "cz", true, "compensation");
    // The reference and adaptive bias branches sit below their receivers.
    // Neither lower mirror nor output discharge is left on a remote island.
    passive("RBIAS", 160, 660, "vin", false, "bias-reference");
    mos("XNB", 160, 820, true, "bias-reference");
    mos("XBP", 390, 660, true, "p-bias");
    mos("XNBP", 390, 820, false, "p-bias");
    mos("XADB", 610, 820, false, "adaptive-bias-output");
    mos("XSENSE", 830, 660, false, "adaptive-bias");
    mos("XAD", 830, 820, true, "adaptive-bias");
    passive("CBOOST", 610, 650, "bp", true, "adaptive-bias-output");
    passive("CDIS", 1090, 640, "gp", false, "active-discharge");
    mos("XDIS", 1090, 820, false, "active-discharge");
    passive("RDIS", 920, 940, "bn", true, "active-discharge");
  }
  if (id === "ldo-low-voltage-sky130-opus-5-5-r1") {
    refined = true;
    mos("XM3", 270, 140, true);
    mos("XM4", 490, 140, false);
    mos("XM1", 270, 320);
    mos("XM2", 490, 320, true);
    passive("RT", 380, 510, "t");
    passive("CI", 600, 490, "vi", false, "interstage");
    passive("RS2", 760, 140, "vin", false, "interstage");
    mos("XMS2", 760, 320, false, "interstage");
    mos("XMS3", 760, 490, true, "interstage");
    mos("XMD", 1020, 140, true, "gate-driver");
    mos("XMB", 1020, 320, false, "gate-driver");
    mos("XMP", 1540, 320, false, "pass");
    passive("R1", 1540, 500, "vout", false, "pass");
    passive("R2", 1540, 670, "fb", false, "pass");
    // Output-dependent DC bias and both complementary transient paths remain
    // complete local columns directly below the gate-driving region.
    passive("RB", 170, 660, "vout", false, "bias-reference");
    mos("XMBN", 170, 830, true, "bias-reference");
    mos("XMBP", 390, 660, true, "p-bias");
    mos("XMBN2", 390, 830, false, "p-bias");
    mos("XMI0", 610, 660, false, "bias-output");
    mos("XMW", 830, 660, true, "rise-assist");
    mos("XMQ", 830, 830, false, "rise-assist");
    mos("XMWP", 1050, 660, false, "rise-assist-output");
    mos("XMR", 1270, 660, false, "fall-assist");
    mos("XMRD", 1270, 830, true, "fall-assist");
    mos("XMRP", 1510, 870, false, "fall-assist-output");
    passive("RBQ", 630, 950, "bn", true, "rise-assist-input");
    passive("CQ", 840, 950, "q", true, "rise-assist-input");
    passive("RBR", 1110, 1010, "bp", true, "fall-assist-input");
    passive("CR", 1320, 1010, "rg", true, "fall-assist-input");
  }
  if (id === "ldo-quiet-sky130-opus-5-5-r2") {
    refined = true;
    passive("RSA", 180, 100, "vin");
    passive("RSB", 380, 100, "vin");
    mos("XMA", 180, 240, true);
    mos("XMB", 380, 240);
    mos("XM1", 180, 410);
    mos("XM2", 380, 410, true);
    mos("XM5", 280, 600);
    passive("RREF", 120, 700, "vin", false, "bias-reference");
    mos("XMR", 120, 870, true, "bias-reference");
    // The two degenerated receiving mirrors and their NMOS mirror are the
    // intermediate gain stage, placed between the input pair and transconductor.
    passive("RSC", 580, 100, "vin", false, "intermediate-stage");
    passive("RSD2", 780, 100, "vin", false, "intermediate-stage");
    mos("XMC", 580, 240, false, "intermediate-stage");
    mos("XMD2", 780, 240, true, "intermediate-stage");
    mos("XM8", 580, 600, true, "intermediate-stage");
    mos("XM7", 780, 600, false, "intermediate-stage");
    passive("RD1", 440, 750, "nx", true, "gain-network");
    passive("RD2", 640, 750, "nlag", true, "gain-network");
    passive("CD", 640, 870, "nlag", true, "gain-network");
    mos("XMM", 1000, 240, true, "transconductor");
    mos("XMD", 1000, 410, false, "transconductor");
    passive("RS", 1000, 600, "nsd", false, "transconductor");
    mos("XMPA", 1200, 410, false, "pass");
    mos("XMPB", 1370, 410, false, "pass");
    passive("R1", 1300, 610, "vout", false, "pass");
    passive("R2", 1300, 800, "fb", false, "pass");
    passive("CFF", 1160, 610, "vout", false, "pass");
  }
  if (id === "ldo-low-voltage-sky130-astra-r1") {
    refined = true;
    // Put the translated reference beside its receiving gate and feedback on
    // the opposite side of the pair; neither input returns through the other.
    mos("XPM2", 320, 140, true);
    mos("XPM1", 540, 140, false);
    mos("XIN2", 320, 340, false);
    mos("XIN1", 540, 340, true);
    mos("XTAIL", 430, 520, false);
    passive("RREFV", 120, 180, "vin", false, "reference-translation");
    passive("RREFR", 130, 340, "vref", true, "reference-translation");
    passive("RREFG", 120, 510, "vr", false, "reference-translation");
    passive("CREF", 240, 510, "vr", false, "reference-translation");
    passive("RBIAS", 430, 650, "vin", false, "bias-reference");
    mos("XNB", 430, 780, true, "bias-reference");
    mos("XPASS", 890, 340, false, "pass");
    passive("RFBO", 890, 520, "vout", false, "pass");
    passive("RFBG", 890, 730, "fb", false, "pass");
    passive("CFF", 750, 520, "vout", false, "pass");
    passive("RFBV", 750, 730, "fb", false, "feedback-translation");
    // Show the actual PG-to-VOUT series compensation as a short horizontal
    // path above the pass gate, with no vertical hairpin around that gate.
    passive("RCOMP", 660, 230, "pg", true, "compensation");
    passive("CCOMP", 820, 230, "cm", true, "compensation");
  }
  if (id === "ldo-quiet-sky130-astra-r1") {
    refined = true;
    // A simple two-column bias path replaces the long enclosing returns.
    // The reference resistor is above the input pair, clear of either bias leg.
    passive("RBIAS", 140, 140, "vin", false, "n-bias-reference");
    mos("XBN", 140, 310, true, "n-bias-reference");
    mos("XBP", 140, 500, true, "p-bias-reference");
    mos("XBN2", 140, 670, true, "p-bias-reference");
    passive("RREF", 400, 180, "vref", true, "reference-input");
    mos("XTAIL", 540, 100, false, "parallel-input");
    mos("XIR0", 320, 310, false, "parallel-input");
    mos("XIR1", 460, 310, false, "parallel-input");
    mos("XIF0", 640, 310, true, "parallel-input");
    mos("XIF1", 780, 310, true, "parallel-input");
    // Supply-connected cascode gates have local supply terminations; the EA
    // drain leaves at the same height as the next-stage receiving gate.
    mos("XIRC", 390, 450, false, "reference-p-cascode");
    mos("XIFC", 710, 450, true, "feedback-p-cascode");
    mos("XNRC", 390, 590, true, "n-load-mirror");
    mos("XNOC", 710, 590, false, "n-load-mirror");
    mos("XNR", 390, 740, true, "n-load-mirror");
    mos("XNO", 710, 740, false, "n-load-mirror");
    mos("XPD", 1070, 190, true, "gate-driver");
    mos("XDRV", 1070, 490, false, "gate-driver");
    mos("XPASS", 1310, 330, false, "pass");
    passive("RFB1", 1310, 510, "vout", false, "pass");
    passive("RFB2", 1310, 710, "fb", false, "pass");
    passive("RCOMP", 930, 610, "ea", true, "compensation");
    passive("CCOMP", 1080, 610, "nc", true, "compensation");
    passive("CFEED", 930, 760, "ea", false, "compensation");
  }
  if (refined && assigned.size !== ds.length) {
    throw Error(
      "Incomplete source-specific LDO refinement " +
        id +
        ": " +
        ds
          .filter((d) => !assigned.has(d.ref))
          .map((d) => d.ref)
          .join(", "),
    );
  }
}
