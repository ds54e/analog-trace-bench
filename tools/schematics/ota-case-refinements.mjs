/** Small source-specific refinements for parallel branches, sensing pairs and
 * input networks which do not have a unique maximal series-chain placement.
 * These are geometry only: terminal direction/order remains source-derived. */
export function refineOtaCase(id, ds, devices) {
  const mos = (refs, x, y, mirror = false, dy = 110) =>
    refs.split(" ").forEach((r, i) => {
      if (!devices[r]) throw Error("Missing refinement " + id + " " + r);
      devices[r] = [x, y + i * dy, mirror ? "horizontal" : undefined];
    });
  const passive = (ref, x, y, leftOrTop, horizontal = false) => {
    const d = ds.find((d) => d.ref === ref);
    if (!d || !devices[ref]) throw Error("Missing passive " + id + " " + ref);
    if (!d.pins.includes(leftOrTop.toLowerCase()))
      throw Error("Wrong passive end " + id + " " + ref);
    devices[ref] = [
      x,
      y,
      horizontal
        ? d.pins[0] === leftOrTop.toLowerCase()
          ? 270
          : 90
        : d.pins[0] === leftOrTop.toLowerCase()
          ? 0
          : 180,
    ];
  };
  if (id === "ota-drive-sky130-sonnet-5-5-r1") {
    mos("XM1", 380, 300);
    mos("XM2", 600, 300, true);
    mos("XPSL XPCL XNCL XNBL", 160, 160, false, 140);
    mos("XPSRa XPCR XNCR XNBR", 820, 160, true, 140);
    mos("XPSRb", 1020, 160);
    ["1", "2", "3"].forEach((n, i) =>
      mos(`XNTC${n} XNT${n}`, 330 + i * 200, 730),
    );
  }
  if (id === "ota-drive-sky130-luna-6-r1") {
    mos("XOUTP", 820, 200);
    mos("XOUTP2", 1040, 200);
    mos("XOUTN", 930, 420);
    passive("RZ", 580, 300, "nd2", true);
    passive("CC", 690, 300, "xcomp", true);
  }
  if (id === "ota-drive-sky130-luna-6-r2") {
    mos("XTC", 300, 400);
    mos("XNT", 220, 550);
    mos("XNT2", 420, 550);
    mos("XPCOMP", 630, 120);
    mos("XFF", 630, 450);
    mos("XPO", 1020, 120);
    mos("XPO2", 1230, 120);
    mos("XNO", 1020, 300);
    passive("RZ", 800, 230, "x", true);
    passive("CC", 910, 230, "nc", true);
  }
  if (id === "ota-drive-sky130-sol-6-r1") {
    mos("XAP1", 180, 550);
    mos("XAP2", 420, 550, true);
    mos("XATAIL", 300, 690);
    mos("XPOUT", 850, 120);
    mos("XMNOUT", 850, 240);
    passive("RZ", 600, 180, "n2", true);
    passive("CC", 710, 180, "nc", true);
  }
  if (
    id === "ota-precision-sky130-sonnet-5-5-r2" ||
    id === "ota-wide-sky130-deepseek-r3"
  ) {
    const wide = id.startsWith("ota-wide");
    if (wide) {
      mos("Xm3", 160, 160);
      mos("Xm4", 820, 160, true);
      mos("Xm1", 380, 300);
      mos("Xm2", 600, 300, true);
      mos("Xm21", 490, 440);
      mos("Xm8", 180, 760, true);
      mos("Xm9", 800, 760);
      mos("Xm6", 380, 650);
      mos("Xm7", 600, 650, true);
      mos("Xm24", 490, 540);
      mos("Xm13", 380, 800);
      mos("Xm14", 600, 800, true);
      mos("Xm25", 1240, 180);
      mos("Xm11", 1240, 340);
      passive("Rz", 1000, 260, "b", true);
      passive("Cc", 1110, 260, "nz", true);
    } else {
      mos("XMPA", 160, 160);
      mos("XMPB", 820, 160, true);
      mos("XM1", 380, 300);
      mos("XM2", 600, 300, true);
      mos("XM5", 490, 440);
      mos("XMNA", 180, 550, true);
      mos("XMNB", 800, 550);
      mos("XM7", 1220, 180);
      mos("XM6", 1220, 340);
      passive("RZ", 980, 260, "v1", true);
      passive("CC", 1090, 260, "nz", true);
    }
  }
  if (id === "ota-precision-sky130-sol-6-r3") {
    mos("XP1 XN1", 180, 160);
    mos("XP2 XN2", 420, 160, true);
    mos("XTAIL1", 300, 410);
    mos("XP3", 800, 220, true);
    mos("XP4", 1000, 220);
    mos("XN3", 780, 330);
    mos("XN4", 1020, 330, true);
    mos("XTAIL2", 900, 480);
    passive("RZ", 630, 410, "b", true);
    passive("CC", 750, 410, "nc", true);
    passive("RCM1", 190, 560, "a");
    passive("RCM2", 410, 560, "b");
    passive("RSHIFT", 310, 680, "cm");
    passive("RBASE", 310, 790, "pg");
    mos("XSW", 520, 680);
    passive("CA", 90, 370, "a");
  }
  if (id === "ota-wide-sky130-astra-r1") {
    mos("XPT", 610, 160);
    mos("XP1", 500, 300);
    mos("XP2", 720, 300, true);
    mos("XN1", 520, 520, true);
    mos("XN2", 700, 520);
    passive("RIN", 350, 300, "vinn", true);
    passive("CIN", 350, 220, "vinn", true);
    passive("RGN", 380, 460, "in");
    mos("XCN", 230, 460);
    passive("RIP", 870, 300, "ip", true);
    passive("CIP", 870, 220, "ip", true);
    passive("RGP", 830, 470, "ip");
    mos("XCP", 990, 470);
    mos("XPO", 1360, 230);
    mos("XNO", 1360, 400);
    passive("RC", 1110, 340, "g2", true);
    passive("CC", 1220, 340, "cm", true);
  }
  if (id === "ota-wide-sky130-sol-6-1-r1") {
    passive("RN", 300, 160, "vinn", true);
    passive("CN", 300, 80, "vinn", true);
    passive("RBN", 290, 430, "gn");
    passive("CBN", 400, 500, "gn");
    passive("RP", 660, 160, "gp", true);
    passive("CP", 660, 80, "gp", true);
    passive("RBP", 690, 430, "gp");
    passive("CBP", 580, 500, "gp");
    mos("XTAIL", 490, 600);
  }
  if (id === "ota-wide-sky130-opus-5-5-r3") {
    passive("RS5", 170, 150, "vdd");
    passive("RS6", 830, 150, "vdd");
    mos("XMP5 XMP7", 160, 260, false, 140);
    mos("XMP6 XMP8", 820, 260, true, 140);
    mos("XM1", 380, 400);
    mos("XM2", 600, 400, true);
    mos("XMNT", 490, 520);
    mos("XM3", 380, 790);
    mos("XM4", 600, 790, true);
    mos("XMPT", 490, 680);
    mos("XMN7", 160, 790);
    mos("XMN8", 820, 790, true);
    mos("XMN5", 180, 930, true);
    mos("XMN6", 800, 930);
    passive("RD5", 170, 1040, "d5");
    passive("RD6", 810, 1040, "d6");
    mos("XMPL", 1240, 330);
    mos("XMNO", 1240, 450);
    passive("RZ", 1000, 390, "o1", true);
    passive("CC", 1110, 390, "oz", true);
  }
  if (id === "ota-wide-sky130-astra-r3") {
    mos("Xnloadp Xnfoldp", 160, 160, false, 140);
    mos("Xnloadn Xnfoldn", 820, 160, true, 140);
    mos("Xnip", 380, 300);
    mos("Xnin", 600, 300, true);
    mos("Xnt", 490, 440);
    mos("Xpip", 380, 650);
    mos("Xpin", 600, 650, true);
    mos("Xpt", 490, 540);
    mos("Xcasplp Xplp", 160, 650);
    mos("Xcaspln Xpln", 820, 650, true);
    mos("Xpfd Xcaspfd", 1080, 160);
    mos("Xcaspfold Xpfold", 1080, 650);
    mos("Xpfo Xcaspfo", 1340, 160);
    mos("Xcasplo Xplo", 1340, 650);
    mos("Xoutbias", 1770, 180);
    mos("Xout", 1770, 350);
    passive("Rz", 1520, 290, "g1", true);
    passive("Cc", 1630, 290, "cz", true);
  }
  if (id === "ota-wide-sky130-sol-6-1-r2") {
    mos("XND1 XNI1", 180, 160);
    mos("XND2 XNI2", 420, 160, true);
    mos("XNT", 300, 410);
    mos("XPI1 XPD1", 180, 700);
    mos("XPI2 XPD2", 420, 700, true);
    mos("XPT", 300, 590);
    mos("XNM1", 700, 160);
    mos("XFK", 900, 160);
    mos("XPM1", 700, 810);
    mos("XKD", 900, 810);
    mos("XNM2", 1180, 160);
    mos("XFA", 1380, 160);
    mos("XPM2", 1180, 810);
    mos("XKM", 1380, 810);
    mos("XOP", 1790, 180);
    mos("XON", 1790, 350);
    passive("RC", 1530, 290, "a", true);
    passive("CM", 1640, 290, "cc", true);
  }
  if (id === "ota-wide-sky130-sonnet-5-5-r1") {
    mos("XMsa XMcpa", 160, 160, false, 140);
    mos("XMsb XMcpb", 820, 160, true, 140);
    mos("XMn1", 380, 300);
    mos("XMn2", 600, 300, true);
    mos("XMtn", 490, 440);
    mos("XMp1", 380, 650);
    mos("XMp2", 600, 650, true);
    mos("XMtp", 490, 540);
    mos("XMcna XMna", 160, 650);
    mos("XMcnb XMnb", 820, 650, true);
    mos("XMmca", 40, 650);
    mos("XMma", 60, 880, true);
    mos("XMmcb", 980, 650, true);
    mos("XMmb", 960, 880);
  }

  if (id === "ota-wide-sky130-sonnet-5-5-r3") {
    mos("XMPS1 XMPC1 XMNC1 XMNM1", 160, 160, false, 140);
    mos("XMPS2 XMPC2 XMNC2 XMNM2", 820, 160, true, 140);
    mos("XMN1", 380, 300);
    mos("XMN2", 600, 300, true);
    mos("XMNT", 490, 440);
    mos("XMPM1 XMPC3 XMNC3 XMNS1", 160, 770, false, 140);
    mos("XMPM2 XMPC4 XMNC4 XMNS2", 820, 770, true, 140);
    mos("XMP1", 380, 1050);
    mos("XMP2", 600, 1050, true);
    mos("XMPT", 490, 910);
    passive("CX", 1020, 500, "vout");
  }
  if (id === "ota-wide-sky130-sol-6-r1") {
    mos("XP5", 380, 160);
    mos("XP3", 600, 160, true);
    mos("XN2", 380, 300);
    mos("XN1", 600, 300, true);
    mos("XNT", 490, 440);
    mos("XP6", 160, 160);
    mos("XP4", 820, 160, true);
    mos("XN5", 180, 500, true);
    mos("XN6", 800, 500);
    mos("XP1 XN3", 380, 780);
    mos("XP2 XN4", 600, 780, true);
    mos("XPT", 490, 670);
    mos("XPFF XPDI", 1030, 140);
    passive("RFF", 1040, 360, "rr");
    mos("XOUTP", 1320, 420);
    mos("XOUTN", 1320, 680);
    passive("RPS", 1330, 270, "vdd");
    passive("RNS", 1330, 810, "ns");
    passive("CBP", 1500, 270, "vdd");
    passive("RZ", 1090, 550, "v1", true);
    passive("CC", 1200, 550, "vc", true);
    mos("XZR", 1110, 440);
    passive("RBLEED", 1530, 580, "vdd");
    passive("RNG", 250, 300, "vinp", true);
    passive("RPG", 740, 780, "pgin", true);
    passive("CNG", 280, 460, "ngin");
  }
  if (id === "ota-wide-sky130-sol-6-r2") {
    passive("RPSL", 170, 130, "vdd");
    passive("RPSR", 830, 130, "vdd");
    mos("XPSL XPFL", 160, 240, false, 140);
    mos("XPSR XPFR", 820, 240, true, 140);
    mos("XNIL", 380, 380);
    mos("XNIR", 600, 380, true);
    mos("XNT", 490, 520);
    mos("XNFD", 180, 550, true);
    mos("XNFO", 800, 550);
    passive("RAL", 310, 200, "vdd");
    passive("RAR", 960, 200, "vdd");
    passive("RTAILP", 500, 740, "vdd");
    mos("XPIL", 380, 850);
    mos("XPIR", 600, 850, true);
    mos("XNPD", 400, 990, true);
    mos("XNPO", 580, 990);
    passive("RTN", 250, 850, "vinn", true);
    passive("CTN", 250, 780, "vinn", true);
    passive("RBN", 180, 1070, "shn");
    passive("CBN", 330, 1120, "shn");
    passive("RTP", 750, 850, "shp", true);
    passive("CTP", 750, 780, "shp", true);
    passive("RBP", 810, 1070, "shp");
    passive("CBP", 660, 1120, "shp");
    mos("XPSREF", 1230, 100);
    mos("XNSP", 1120, 230);
    mos("XNSN", 1340, 230, true);
    passive("RSENSE", 1240, 380, "nsense");
    mos("XOP", 1230, 620);
    mos("XONS", 1230, 860);
    passive("RZ", 990, 710, "gate", true);
    passive("CC", 1100, 710, "cz", true);
    passive("RG", 1000, 980, "gate");
  }
  if (id === "ota-wide-sky130-sol-6-r3") {
    mos("XPT", 490, 160);
    mos("XPN", 380, 300);
    mos("XPP", 600, 300, true);
    mos("XSFN XSFC2", 180, 510);
    mos("XSFP XSFC1", 820, 510, true);
    mos("XHPT", 490, 540);
    mos("XHPN", 380, 650);
    mos("XHPP", 600, 650, true);
    mos("XPMD", 400, 790, true);
    mos("XPMO", 580, 790);
    mos("XPO", 1250, 310);
    mos("XNO", 1250, 450);
    passive("RZ", 1000, 390, "x", true);
    passive("CC", 1110, 390, "cm", true);
  }
  if (id === "ota-drive-sky130-sol-6-1-r3") {
    mos("XPBIAS", 720, 160);
    passive("RNC", 730, 270, "ncg");
    mos("XNCD", 720, 380);
    mos("XNBSINK", 720, 600);
    mos("XNSF", 910, 490);
  }
  if (id === "ota-precision-sky130-sol-6-1-r1") passive("CPS", 90, 190, "ndi");
}
