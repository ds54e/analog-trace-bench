/** Source-specific drawings anchored to recognizable motifs: two representatives
 * and four guarded converter OTAs. Public figure relationships are recorded in the
 * schematic skill; these routes follow ATB's own ordered terminals, not a
 * reference circuit's electrical data. */
export function humanReferenceLayout(id, ds) {
  if (converterOtas[id]) return converterOta(id, ds);
  if (id !== "ldo-core-sky130-astra-r1" &&
      id !== "ota-precision-sky130-sonnet-5-5-r2") return null;
  const ldo = id.startsWith("ldo-");
  const continuousNets = [...new Set(ds.flatMap(d => d.pins)
    .filter(n => !(ldo ? ["vin", "vss"] : ["vdd", "vss"]).includes(n)))].sort();
  return ldo ? coreLdo(id, continuousNets) : subtractingOta(id, continuousNets);
}

function coreLdo(id, continuousNets) {
  const layout = {
    id, strategy: "connected-ldo", continuousNets,
    title: "Transistor-level LDO regulator",
    description: "Centered mirror-loaded error amplifier, local current bias, grouped supply-matching reference ladder, explicit compensation and a direct feedback return above the reference ladder.",
    body_note: "NFET bodies → VSS; PFET bodies → VIN. Exact source devices, bulk defaults and parameters are retained in the native project.",
    devices: {
      RBIAS: [140, 340], XNBIAS: [150, 460, "horizontal"],
      XNTAIL: [430, 460],
      XP1: [350, 140, "horizontal"], XP2: [530, 140],
      XNFB: [330, 280], XNREF: [550, 280, "horizontal"],
      XPPASS: [1040, 220],
      CCOMP: [840, 310, 90], RCOMP: [960, 310, 90],
      RFB1: [1050, 430], RFB2: [1050, 650],
      CFF: [930, 430], RFB3: [1170, 530],
      RREF1: [660, 530], RREFAC: [820, 470], CREFAC: [820, 560],
      RREF2: [660, 680], CREF: [820, 680],
    },
    ports: { VIN: [80, 60], VSS: [80, 580], VREF: [580, 740], VOUT: [1190, 290, 180] },
    passiveLabels: { RBIAS: { x: -16, y: -4, align: "end" } },
    draw(c) {
      const j = (key, net, x, y) => c.j(key, net, x, y);
      const w = (net, a, b, bends = []) => c.w(net, a, b, bends);
      // One supply rail for the amplifier/pass current paths; local VIN labels
      // serve the reference and sensing injection branches below them.
      for (const [key, x] of [["vin-bias",140],["vin-left",340],["vin-right",540],["vin-pass",1050]]) j(key,"vin",x,60);
      w("vin","@VIN","vin-bias"); w("vin","vin-bias","vin-left");
      w("vin","vin-left","vin-right"); w("vin","vin-right","vin-pass");
      w("vin","vin-bias","RBIAS.1"); w("vin","vin-left","XP1.S");
      w("vin","vin-right","XP2.S"); w("vin","vin-pass","XPPASS.S");
      c.boundLabel("vin","vin-bias",-50,-12,"middle");
      for (const [key,x] of [["vss-bias",140],["vss-tail",440]]) j(key,"vss",x,580);
      w("vss","@VSS","vss-bias"); w("vss","vss-bias","vss-tail");
      w("vss","XNBIAS.S","vss-bias"); w("vss","XNTAIL.S","vss-tail");
      c.boundLabel("vss","vss-bias",-50,-12,"middle");
      // The diode reference and its receiving tail share their gate row.
      j("bias-drain","bias",140,400); j("bias-dg","bias",200,460);
      w("bias","RBIAS.2","bias-drain"); w("bias","bias-drain","XNBIAS.D");
      w("bias","bias-drain","bias-dg",[[200,400]]);
      w("bias","XNBIAS.G","bias-dg"); w("bias","bias-dg","XNTAIL.G");
      // Symmetric input/load columns with a genuinely centered tail tap.
      j("n1-drain","n1",340,210); j("n1-gates","n1",400,140);
      w("n1","XP1.D","n1-drain"); w("n1","n1-drain","XNFB.D");
      w("n1","XP1.G","n1-gates"); w("n1","n1-gates","XP2.G");
      w("n1","n1-gates","n1-drain",[[400,210]]);
      j("tail-left","tail",340,340); j("tail-center","tail",440,340); j("tail-right","tail",540,340);
      w("tail","XNFB.S","tail-left"); w("tail","tail-left","tail-center");
      w("tail","tail-center","tail-right"); w("tail","tail-right","XNREF.S");
      w("tail","tail-center","XNTAIL.D");
      j("gate-drain","gate",540,220); j("gate-comp","gate",800,220);
      w("gate","XP2.D","gate-drain"); w("gate","gate-drain","XNREF.D");
      w("gate","gate-drain","gate-comp"); w("gate","gate-comp","XPPASS.G");
      w("gate","gate-comp","CCOMP.2",[[800,310]]);
      w("cm","CCOMP.1","RCOMP.2");
      // CCOMP precedes RCOMP from GATE toward VOUT, exactly as submitted.
      j("out-port","vout",1050,290); j("out-comp","vout",1050,310); j("out-sense","vout",1050,350);
      w("vout","XPPASS.D","out-port"); w("vout","out-port","@VOUT");
      w("vout","out-port","out-comp"); w("vout","out-comp","RCOMP.1");
      w("vout","out-comp","out-sense"); w("vout","out-sense","RFB1.1");
      w("vout","out-sense","CFF.1",[[930,350]]);
      j("fb-divider","fb",1050,540); j("fb-injection","fb",1050,570); j("fb-cap","fb",930,540);
      w("fb","RFB1.2","fb-divider"); w("fb","fb-divider","fb-injection");
      w("fb","fb-injection","RFB2.1"); w("fb","fb-divider","fb-cap");
      w("fb","CFF.2","fb-cap"); w("fb","fb-injection","RFB3.2",[[1170,570]]);
      // FB rises beside CFF, passes above the reference ladder and between the
      // tail bar and XNTAIL, crossing only the REF riser and the tail stem.
      w("fb","fb-cap","XNFB.G",[[890,540],[890,370],[220,370],[220,280]]);
      c.boundLabel("fb","fb-divider",-12,-12,"end");
      j("fb-vin","vin",1170,480); w("vin","fb-vin","RFB3.1");
      c.boundLabel("vin","fb-vin",8,-10,"start");
      j("fb-vss","vss",1050,710); w("vss","RFB2.2","fb-vss");
      c.boundLabel("vss","fb-vss",-8,-10,"end");
      // Reference ladder: two VIN→REF legs above two REF→VREF legs.
      // CREF bypasses RREF2, not ground. The series AC leg keeps RAC explicit.
      j("ref-vin","vin",660,420); j("ref-vin-ac","vin",820,420);
      w("vin","ref-vin","ref-vin-ac"); w("vin","ref-vin","RREF1.1");
      w("vin","ref-vin-ac","RREFAC.1"); c.boundLabel("vin","ref-vin",8,-12,"start");
      w("rac","RREFAC.2","CREFAC.1");
      j("ref-input","ref",660,590); j("ref-center","ref",660,610); j("ref-ac","ref",820,610);
      w("ref","RREF1.2","ref-input"); w("ref","ref-input","ref-center"); w("ref","ref-center","ref-ac");
      w("ref","CREFAC.2","ref-ac"); w("ref","ref-center","RREF2.1");
      w("ref","ref-ac","CREF.1");
      w("ref","ref-input","XNREF.G",[[620,590],[620,280]]);
      c.boundLabel("ref","ref-input",8,-12,"start");
      j("ref-bottom","vref",660,740); j("ref-cap-bottom","vref",820,740);
      w("vref","RREF2.2","ref-bottom"); w("vref","ref-bottom","ref-cap-bottom");
      w("vref","CREF.2","ref-cap-bottom"); w("vref","ref-bottom","@VREF");
    },
  };
  // Reviewed column slots keep the complete input, reference and sensing
  // motifs intact. This is not a global density or equal-gap transformation:
  // the reference ladder moves as a group, while its input riser and the
  // compensation branch retain separate corridors above it. The narrowed AC
  // column leaves the FB riser clear of RREFAC/CREFAC and CFF text.
  const columns = new Map([
    [80,100], [140,150], [150,160], [200,210], [220,240], [230,270],
    [330,290], [340,300], [350,310], [400,360], [430,370],
    [440,380], [530,450], [540,460], [550,470], [580,480],
    [620,520], [660,560], [800,650], [820,690], [840,690],
    [890,800], [930,830], [960,810], [1040,890], [1050,900],
    [1170,960], [1190,960],
  ]);
  const x = value => columns.get(value) ?? value;
  for (const position of [...Object.values(layout.devices), ...Object.values(layout.ports)]) position[0] = x(position[0]);
  const draw = layout.draw;
  layout.draw = c => draw({ ...c,
    j: (key, net, px, py) => c.j(key, net, x(px), py),
    w: (net, start, end, bends = []) => c.w(net, start, end, bends.map(([px,py])=>[x(px),py])),
  });
  return layout;
}

function subtractingOta(id, continuousNets) {
  return {
    id, strategy: "connected-stages", continuousNets,
    title: "Transistor-level OTA",
    description: "Centered differential pair and tail, paired current-subtracting mirror branches, a direct NMOS second-stage handoff and local series compensation. No cascode receiver is inferred.",
    body_note: "NFET bodies → VSS; PFET bodies → VDD. Exact source devices, bulk defaults and parameters are retained in the native project.",
    devices: {
      XM1: [370,280], XM2: [590,280,"horizontal"], XM5: [470,460],
      XMPA: [230,140,"horizontal"], XMPB: [750,140],
      XMNA: [230,390,"horizontal"], XMNB: [750,390],
      XM7: [980,140], XM6: [980,300],
      RZ: [860,220,270], CC: [960,220,270],
      XM0: [290,460,"horizontal"], XMPD: [110,180,"horizontal"], XMB1: [110,350,"horizontal"],
    },
    ports: { VINN:[320,280], VINP:[640,280,180], VOUT:[1060,240,180], VDD:[80,60], VSS:[80,550], IBIAS:[330,510,90] },
    draw(c) {
      const j=(key,net,x,y)=>c.j(key,net,x,y), w=(net,a,b,bends=[])=>c.w(net,a,b,bends);
      for(const [key,x] of [["dd-left",220],["dd-right",760],["dd-out",990]]) j(key,"vdd",x,60);
      w("vdd","@VDD","dd-left"); w("vdd","dd-left","dd-right"); w("vdd","dd-right","dd-out");
      w("vdd","dd-left","XMPA.S"); w("vdd","dd-right","XMPB.S"); w("vdd","dd-out","XM7.S");
      c.boundLabel("vdd","dd-left",-140,-12,"middle");
      for(const [key,x] of [["ss-left",220],["ss-ref",280],["ss-tail",480],["ss-right",760],["ss-out",990]]) j(key,"vss",x,550);
      w("vss","@VSS","ss-left"); w("vss","ss-left","ss-ref"); w("vss","ss-ref","ss-tail");
      w("vss","ss-tail","ss-right"); w("vss","ss-right","ss-out");
      w("vss","XMNA.S","ss-left"); w("vss","XM0.S","ss-ref"); w("vss","XM5.S","ss-tail");
      w("vss","XMNB.S","ss-right"); w("vss","XM6.S","ss-out");
      c.boundLabel("vss","ss-left",-140,-12,"middle");
      j("fa-input","fa",220,240); j("fa-diode","fa",220,340); j("fa-gates","fa",300,390);
      w("fa","XMPA.D","fa-input"); w("fa","fa-input","XM1.D",[[380,240]]);
      w("fa","fa-input","fa-diode"); w("fa","fa-diode","XMNA.D");
      w("fa","fa-diode","fa-gates",[[300,340]]);
      w("fa","XMNA.G","fa-gates"); w("fa","fa-gates","XMNB.G");
      // The lower mirror-gate trunk crosses the separate NT stem without a dot;
      // it does not fold back through the input-drain handoff region.
      j("nt-left","nt",380,350); j("nt-center","nt",480,350); j("nt-right","nt",580,350);
      w("nt","XM1.S","nt-left"); w("nt","nt-left","nt-center"); w("nt","nt-center","nt-right");
      w("nt","nt-right","XM2.S"); w("nt","nt-center","XM5.D");
      w("vinn","@VINN","XM1.G"); w("vinp","@VINP","XM2.G");
      j("v1-comp","v1",760,220); j("v1-input","v1",760,240); j("v1-driver","v1",760,300);
      w("v1","XMPB.D","v1-comp"); w("v1","v1-comp","v1-input");
      w("v1","v1-input","XM2.D",[[580,240]]); w("v1","v1-input","v1-driver");
      w("v1","v1-driver","XMNB.D"); w("v1","v1-driver","XM6.G"); w("v1","v1-comp","RZ.1");
      w("nz","RZ.2","CC.1");
      j("out-comp","vout",990,220); j("out-port","vout",990,240);
      w("vout","XM7.D","out-comp"); w("vout","out-comp","CC.2");
      w("vout","out-comp","out-port"); w("vout","out-port","XM6.D"); w("vout","out-port","@VOUT");
      // VBP is a bias control, not the signal that drives XM6. One upper bus
      // carries the converter diode voltage to the load pair and output source.
      j("conv-vbp","vbp",100,250); j("conv-gate","vbp",144,180);
      w("vbp","XMPD.D","conv-vbp"); w("vbp","conv-vbp","XMB1.D");
      w("vbp","XMPD.G","conv-gate"); w("vbp","conv-gate","conv-vbp",[[144,250]]);
      j("vbp-bus","vbp",480,80); j("vbp-loads","vbp",480,140);
      w("vbp","conv-gate","vbp-bus",[[144,80]]); w("vbp","vbp-bus","vbp-loads");
      w("vbp","XMPA.G","vbp-loads"); w("vbp","vbp-loads","XMPB.G");
      w("vbp","vbp-bus","XM7.G",[[930,80],[930,140]]);
      c.boundLabel("vbp","vbp-loads",8,-10,"start");
      // Tail reference is next to the tail; the converter sink's gate joins the
      // XM0/XM5 gate node along the lower corridor, where the IBIAS port taps it.
      j("ibias-dg","ibias",340,460); j("ibias-tail","ibias",380,460); j("ibias-port","ibias",330,530);
      w("ibias","XM0.D","ibias-dg",[[280,420],[340,420]]); w("ibias","XM0.G","ibias-dg");
      w("ibias","ibias-dg","ibias-tail"); w("ibias","ibias-tail","XM5.G");
      w("ibias","XMB1.G","ibias-port",[[144,350],[144,530]]);
      w("ibias","ibias-port","ibias-tail",[[380,530]]); w("ibias","@IBIAS","ibias-port");
      c.boundLabel("ibias","ibias-port",0,-40,"middle");
      j("conv-vdd","vdd",100,110); w("vdd","conv-vdd","XMPD.S"); c.boundLabel("vdd","conv-vdd",-8,-10,"end");
      j("conv-vss","vss",100,430); w("vss","XMB1.S","conv-vss"); c.boundLabel("vss","conv-vss",-8,-10,"end");
    },
  };
}

/** Ten-MOS OTAs whose gain node drives an NMOS output while the PMOS output
 * source mirrors a converter diode fed by the IBIAS-driven NMOS sink. Each
 * frozen source lists every device, kind and ordered pin including B, so a
 * changed, extra or missing device fails here. otaDevices carries no model or
 * parameter text; the native importer and frozen-source contracts retain it.
 * The passive networks differ and are matched and routed per source. The
 * converter/output PMOS row sits above the load mirror, so the outward load and
 * inward converter names stack instead of widening long references. */
const converterOtas = {
  "ota-free-sky130-haiku-r3": {
    strategy: "reviewed-free",
    devices: [
      ["XMB","n","ibias ibias vss vss"], ["XMNB","n","pb ibias vss vss"],
      ["XMPB","p","pb pb vdd vdd"], ["XMT","n","ns ibias vss vss"],
      ["XM1","n","a vinn ns vss"], ["XM2","n","n1 vinp ns vss"],
      ["XM3","p","a a vdd vdd"], ["XM4","p","n1 a vdd vdd"],
      ["XM6","n","vout n1 vss vss"], ["XM7","p","vout pb vdd vdd"],
      ["C1","c","n1 nz"], ["RZ","r","nz vout"],
    ],
    roles: { ref:"XMB", tail:"XMT", inN:"XM1", inP:"XM2", diode:"XM3", load:"XM4",
      driver:"XM6", source:"XM7", conv:"XMPB", sink:"XMNB" },
    series: ["C1","RZ"], shunts: [],
    g: { ibias:20, ref:100, left:230, tail:300, right:370, conv:480, out:710,
      vdd:50, upper:90, mirror:130, comp:150, gain:190, pair:230, bar:280, bias:330, bus:380, vss:420,
      riser:550, first:600, second:660, vinn:150, vinp:440, vout:760 },
  },
  "ota-precision-sky130-luna-6-r1": {
    strategy: "connected-stages",
    devices: [
      ["XMNREF","n","ibias ibias vss vss"], ["XMNTAIL","n","ntail ibias vss vss"],
      ["XMN1","n","n1 vinn ntail vss"], ["XMN2","n","n2 vinp ntail vss"],
      ["XMP3","p","n1 n1 vdd vdd"], ["XMP4","p","n2 n1 vdd vdd"],
      ["XMPBIAS","p","pbias pbias vdd vdd"], ["XMNBIAS","n","pbias ibias vss vss"],
      ["XMP5","p","vout pbias vdd vdd"], ["XMN5","n","vout n2 vss vss"],
      ["RCOMP","r","vout ncomp"], ["CCOMP","c","ncomp n2"],
    ],
    roles: { ref:"XMNREF", tail:"XMNTAIL", inN:"XMN1", inP:"XMN2", diode:"XMP3", load:"XMP4",
      driver:"XMN5", source:"XMP5", conv:"XMPBIAS", sink:"XMNBIAS" },
    // N2-CCOMP-NCOMP-RCOMP-VOUT runs against both submitted pin orders.
    series: ["CCOMP","RCOMP"], shunts: [],
    passiveLabels: { CCOMP: { x:-5, y:-32, align:"middle" } },
    g: { ibias:40, ref:110, left:220, tail:300, right:380, conv:490, out:740,
      vdd:50, upper:90, mirror:130, comp:150, gain:190, pair:230, bar:280, bias:330, bus:380, vss:420,
      riser:560, first:600, second:670, vinn:140, vinp:450, vout:780 },
  },
  "ota-free-sky130-luna-6-r3": {
    strategy: "reviewed-free",
    devices: [
      ["XNR","n","ibias ibias vss vss"], ["XNBIAS","n","vbp ibias vss vss"],
      ["XPBIAS","p","vbp vbp vdd vdd"], ["XTAIL","n","nt ibias vss vss"],
      ["XINN","n","n1 vinn nt vss"], ["XINP","n","n2 vinp nt vss"],
      ["XLOADD","p","n1 n1 vdd vdd"], ["XLOADM","p","n2 n1 vdd vdd"],
      ["XOUTN","n","vout n2 vss vss"], ["XOUTP","p","vout vbp vdd vdd"],
      ["RBIAS","r","n2 vss"], ["RZ","r","n2 nc"], ["CC","c","nc vout"],
    ],
    roles: { ref:"XNR", tail:"XTAIL", inN:"XINN", inP:"XINP", diode:"XLOADD", load:"XLOADM",
      driver:"XOUTN", source:"XOUTP", conv:"XPBIAS", sink:"XNBIAS" },
    // RBIAS is an interstage shunt hanging from the gain wire, not a bias generator.
    series: ["RZ","CC"], shunts: [{ ref:"RBIAS", x:610, y:300 }],
    g: { ibias:20, ref:100, left:230, tail:300, right:370, conv:480, out:710,
      vdd:50, upper:90, mirror:130, comp:150, gain:190, pair:230, bar:280, bias:330, bus:380, vss:420,
      riser:550, first:600, second:660, vinn:150, vinp:440, vout:760 },
  },
  "ota-precision-sky130-luna-6-r3": {
    strategy: "connected-stages",
    devices: [
      ["XMNREF","n","ibias ibias vss vss"], ["XMNTAIL","n","nt ibias vss vss"],
      ["XMN1","n","n1 vinn nt vss"], ["XMN2","n","n2 vinp nt vss"],
      ["XMP1","p","n1 n1 vdd vdd"], ["XMP2","p","n2 n1 vdd vdd"],
      ["XMNREFP","n","pb ibias vss vss"], ["XMPREF","p","pb pb vdd vdd"],
      ["XMPLOAD","p","vout pb vdd vdd"], ["XMN3","n","vout n2 vss vss"],
      ["RUP","r","n2 vdd"], ["RDN","r","n2 vss"], ["RZ","r","n2 nz"], ["CC","c","nz vout"],
    ],
    roles: { ref:"XMNREF", tail:"XMNTAIL", inN:"XMN1", inP:"XMN2", diode:"XMP1", load:"XMP2",
      driver:"XMN3", source:"XMPLOAD", conv:"XMPREF", sink:"XMNREFP" },
    // RUP and RDN both hang from the gain wire: RUP to a local VDD symbol,
    // RDN to the VSS rail. A rising RUP would cross the mirror or series branch.
    series: ["RZ","CC"], shunts: [{ ref:"RUP", x:600, y:250 }, { ref:"RDN", x:670, y:330 }],
    g: { ibias:40, ref:110, left:220, tail:300, right:380, conv:490, out:740,
      vdd:50, upper:90, mirror:130, comp:150, gain:190, pair:230, bar:280, bias:330, bus:380, vss:420,
      riser:560, first:610, second:670, vinn:140, vinp:450, vout:780 },
  },
};

function converterOta(id, ds) {
  const spec = converterOtas[id], g = spec.g, R = spec.roles;
  if (ds.length !== spec.devices.length || ds.some((d, i) => d.ref !== spec.devices[i][0] ||
      d.kind !== spec.devices[i][1] || d.pins.join(" ") !== spec.devices[i][2]))
    throw Error("Unreviewed converter OTA source graph " + id);
  const dev = ref => ds.find(d => d.ref === ref);
  const [tail, mirror, gain, bias] = [dev(R.tail).pins[0], dev(R.diode).pins[0], dev(R.load).pins[0], dev(R.conv).pins[0]];
  const motif = {
    ref: "n ibias ibias vss vss", tail: `n ${tail} ibias vss vss`,
    inN: `n ${mirror} vinn ${tail} vss`, inP: `n ${gain} vinp ${tail} vss`,
    diode: `p ${mirror} ${mirror} vdd vdd`, load: `p ${gain} ${mirror} vdd vdd`,
    driver: `n vout ${gain} vss vss`, source: `p vout ${bias} vdd vdd`,
    conv: `p ${bias} ${bias} vdd vdd`, sink: `n ${bias} ibias vss vss`,
  };
  for (const [role, want] of Object.entries(motif))
    if (!dev(R[role]) || dev(R[role]).kind + " " + dev(R[role]).pins.join(" ") !== want)
      throw Error("Converter OTA motif mismatch " + id + " " + role);
  const [first, second] = spec.series.map(dev), mid = first.pins.find(n => n !== gain);
  const shunts = spec.shunts.map(s => ({ ...s, d: dev(s.ref), rail: dev(s.ref)?.pins.find(n => n !== gain) }));
  const owned = [...Object.values(R), ...spec.series, ...spec.shunts.map(s => s.ref)];
  if (new Set([tail, mirror, gain, bias, mid, "vdd", "vss", "vout", "ibias", "vinp", "vinn"]).size !== 11 ||
      first.pins.filter(n => n === gain).length !== 1 ||
      [...second.pins].sort().join(" ") !== [mid, "vout"].sort().join(" ") ||
      shunts.some(s => !s.d || !"rc".includes(s.d.kind) ||
        s.d.pins.filter(n => n === gain).length !== 1 || !["vdd","vss"].includes(s.rail)) ||
      new Set(owned).size !== ds.length || ds.some(d => !owned.includes(d.ref)))
    throw Error("Converter OTA passive or ownership mismatch " + id);
  // Passive pins keep their submitted order; rotation decides which end faces each node.
  const pin = (d, net) => d.ref + "." + (d.pins[0] === net ? "1" : "2");
  const p = (role, name) => R[role] + "." + name;
  const shuntText = shunts.length ? ` ${shunts.map(s => s.ref).join(" and ")} shunt${shunts.length > 1 ? "" : "s"} it to ${shunts.map(s => s.rail.toUpperCase()).join(" and ")}.` : "";
  return {
    id, strategy: spec.strategy,
    continuousNets: [...new Set(ds.flatMap(d => d.pins))].filter(n => !["vdd","vss"].includes(n)).sort(),
    title: "Transistor-level OTA",
    description: `Centered NMOS pair, PMOS mirror load and tail beside the IBIAS reference. The gain node drives the NMOS output stage and the submitted series compensation.${shuntText} The converter diode mirrors IBIAS into the PMOS output source.`,
    body_note: "NFET bodies → VSS; PFET bodies → VDD. Exact source devices, bulk defaults and parameters are retained in the native project.",
    devices: {
      [R.ref]: [g.ref + 10, g.bias, "horizontal"], [R.tail]: [g.tail - 10, g.bias],
      [R.inN]: [g.left - 10, g.pair], [R.inP]: [g.right + 10, g.pair, "horizontal"],
      [R.diode]: [g.left + 10, g.mirror, "horizontal"], [R.load]: [g.right - 10, g.mirror],
      [R.conv]: [g.conv + 10, g.upper, "horizontal"], [R.sink]: [g.conv - 10, g.bus],
      [R.source]: [g.out - 10, g.upper], [R.driver]: [g.out - 10, g.gain],
      [first.ref]: [g.first, g.comp, first.pins[0] === gain ? 270 : 90],
      [second.ref]: [g.second, g.comp, second.pins[0] === mid ? 270 : 90],
      ...Object.fromEntries(shunts.map(s => [s.ref, [s.x, s.y, s.d.pins[0] === gain ? 0 : 180]])),
    },
    passiveLabels: spec.passiveLabels,
    ports: { VDD: [40, g.vdd], VSS: [40, g.vss], IBIAS: [g.ibias, g.bias - 40],
      VINN: [g.vinn, g.pair], VINP: [g.vinp, g.pair, 180], VOUT: [g.vout, g.comp - 20, 180] },
    draw(c) {
      const j = (key, net, x, y) => c.j(key, net, x, y), w = (net, a, b, bends = []) => c.w(net, a, b, bends);
      const chain = (net, keys) => keys.reduce((a, b) => (w(net, a, b), b));
      // Both supplies are continuous rails; the converter diode and the output
      // source share the upper rail beside the load mirror.
      for (const [key, x] of [["dd-left",g.left],["dd-right",g.right],["dd-conv",g.conv],["dd-out",g.out]]) j(key, "vdd", x, g.vdd);
      chain("vdd", ["@VDD","dd-left","dd-right","dd-conv","dd-out"]);
      w("vdd","dd-left",p("diode","S")); w("vdd","dd-right",p("load","S"));
      w("vdd","dd-conv",p("conv","S")); w("vdd","dd-out",p("source","S"));
      const vssTaps = [["ss-ref",g.ref],["ss-tail",g.tail],["ss-sink",g.conv],["ss-out",g.out],
        ...shunts.filter(s => s.rail === "vss").map(s => ["ss-" + s.ref, s.x])].sort((a, b) => a[1] - b[1]);
      for (const [key, x] of vssTaps) j(key, "vss", x, g.vss);
      chain("vss", ["@VSS", ...vssTaps.map(t => t[0])]);
      w("vss",p("ref","S"),"ss-ref"); w("vss",p("tail","S"),"ss-tail");
      w("vss",p("sink","S"),"ss-sink"); w("vss",p("driver","S"),"ss-out");
      // Pair under the load mirror, local diode closure and a centered tail.
      j("m-drain", mirror, g.left, g.mirror + 40); j("m-gates", mirror, g.tail, g.mirror);
      w(mirror,p("diode","D"),"m-drain"); w(mirror,"m-drain",p("inN","D"));
      w(mirror,p("diode","G"),"m-gates"); w(mirror,"m-gates",p("load","G"));
      w(mirror,"m-drain","m-gates",[[g.tail, g.mirror + 40]]);
      j("t-bar", tail, g.tail, g.bar);
      w(tail,p("inN","S"),"t-bar",[[g.left, g.bar]]); w(tail,p("inP","S"),"t-bar",[[g.right, g.bar]]);
      w(tail,"t-bar",p("tail","D"));
      w("vinn","@VINN",p("inN","G")); w("vinp","@VINP",p("inP","G"));
      // The gain tap is level with the receiving NMOS gate; the series branch
      // rises to VOUT between the two output devices and shunts hang below.
      const gainTaps = [["gain-comp", g.riser], ...shunts.map(s => ["gain-" + s.ref, s.x])].sort((a, b) => a[1] - b[1]);
      j("gain-core", gain, g.right, g.gain);
      for (const [key, x] of gainTaps) j(key, gain, x, g.gain);
      w(gain,p("load","D"),"gain-core"); w(gain,"gain-core",p("inP","D"));
      chain(gain, ["gain-core", ...gainTaps.map(t => t[0]), p("driver","G")]);
      w(gain,"gain-comp",pin(first, gain),[[g.riser, g.comp]]);
      for (const s of shunts) {
        w(gain,"gain-" + s.ref,pin(s.d, gain));
        if (s.rail === "vss") w("vss",pin(s.d, "vss"),"ss-" + s.ref);
        else {
          j("su-" + s.ref, "vdd", s.x, s.y + 40); w("vdd",pin(s.d, "vdd"),"su-" + s.ref);
          c.boundLabel("vdd","su-" + s.ref,0,16,"middle");
        }
      }
      w(mid,pin(first, mid),pin(second, mid));
      j("out-port","vout",g.out,g.comp - 20); j("out-comp","vout",g.out,g.comp);
      w("vout",p("source","D"),"out-port"); w("vout","out-port","out-comp");
      w("vout","out-comp",p("driver","D")); w("vout","out-port","@VOUT");
      w("vout",pin(second, "vout"),"out-comp");
      // The IBIAS reference sits beside the tail. Its gate trunk feeds the
      // tail and passes beneath it to the converter sink.
      j("ib-drain","ibias",g.ref,g.bias - 40); j("ib-dg","ibias",g.ref + 60,g.bias); j("ib-bus","ibias",g.ref + 100,g.bias);
      w("ibias","@IBIAS","ib-drain"); w("ibias","ib-drain",p("ref","D"));
      w("ibias","ib-drain","ib-dg",[[g.ref + 60, g.bias - 40]]); w("ibias",p("ref","G"),"ib-dg");
      w("ibias","ib-dg","ib-bus"); w("ibias","ib-bus",p("tail","G"));
      w("ibias","ib-bus",p("sink","G"),[[g.ref + 100, g.bus]]);
      // The converter diode faces the output source as a PMOS mirror; its drain
      // descends to the sink, plainly crossing the gain wire.
      j("b-drain", bias, g.conv, g.upper + 40); j("b-gates", bias, g.conv + 40, g.upper); j("b-label", bias, g.conv, g.bar);
      w(bias,p("conv","D"),"b-drain"); w(bias,"b-drain","b-gates",[[g.conv + 40, g.upper + 40]]);
      w(bias,p("conv","G"),"b-gates"); w(bias,"b-gates",p("source","G"));
      w(bias,"b-drain","b-label"); w(bias,"b-label",p("sink","D"));
      c.boundLabel(bias,"b-label",8,5,"start");
      c.boundLabel(gain,"gain-core",8,-10,"start");
      if (spec.strategy === "connected-stages") {
        // This page contract names supplies and IBIAS beside their ports.
        c.boundLabel("vdd","dd-left",40 - g.left,-12,"middle");
        c.boundLabel("vss","ss-ref",40 - g.ref,-12,"middle");
        c.boundLabel("ibias","ib-drain",g.ibias - g.ref,-12,"middle");
      }
    },
  };
}
