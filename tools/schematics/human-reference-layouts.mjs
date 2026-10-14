import { routeDrawing } from "./orthogonal-router.mjs";

/** Source-specific drawings anchored to recognizable motifs: two representatives,
 * four guarded converter OTAs, two complementary-input OTAs and two guarded
 * folded-cascode OTAs. Public
 * figure relationships are recorded in the schematic skill; these routes follow
 * ATB's own ordered terminals, not a reference circuit's electrical data. */
export function humanReferenceLayout(id, ds) {
  if (id === "ota-drive-sky130-sonnet-5-5-r3") return driveSonnetR3MirrorOta(id, ds);
  if (id === "ota-drive-sky130-opus-5-5-r3") return driveOpusR3MirrorOta(id, ds);
  if (id === "ota-drive-sky130-opus-5-5-r1") return driveOpusR1MirrorOta(id, ds);
  if (id === "ota-precision-sky130-astra-r1") return precisionAstraFoldedOta(id, ds);
  if (id === "ota-precision-sky130-sonnet-5-5-r1") return precisionSonnetFoldedOta(id, ds);
  if (converterOtas[id]) return converterOta(id, ds);
  if (complementaryOtas[id]) return complementaryOta(id, ds);
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

/** Rail-to-rail OTAs whose NMOS and PMOS input pairs each drive their own mirror
 * load into one shared gain node; that node drives a PMOS output against an
 * IBIAS-mirrored NMOS sink, and a PMOS diode/NMOS sink converter biases the
 * PMOS tail. Neither the ten-MOS converter family nor the current-subtracting
 * OTA. Each frozen source lists every device, kind and ordered pin including B,
 * so a changed, extra or missing device fails here. otaDevices carries no model
 * or parameter text; the native importer and frozen-source contracts retain the
 * exact models, values, W/L, nf and m, which differ between the two runs. */
const complementaryOtas = {
  "ota-wide-sky130-haiku-r2": {
    devices: [
      ["XMREF","n","ibias ibias vss vss"], ["XMTN","n","tn ibias vss vss"],
      ["XMNO","n","vout ibias vss vss"], ["XMPD","p","vbp vbp vdd vdd"],
      ["XMNB","n","vbp ibias vss vss"], ["XMTP","p","tp vbp vdd vdd"],
      ["XMN1","n","dn1 vinn tn vss"], ["XMN2","n","v1 vinp tn vss"],
      ["XMPA","p","dn1 dn1 vdd vdd"], ["XMPB","p","v1 dn1 vdd vdd"],
      ["XMP1","p","dp1 vinn tp vdd"], ["XMP2","p","v1 vinp tp vdd"],
      ["XMNA","n","dp1 dp1 vss vss"], ["XMNC","n","v1 dp1 vss vss"],
      ["XMO","p","vout v1 vdd vdd"], ["CC","c","v1 nz"], ["RZ","r","nz vout"],
    ],
    roles: { ref:"XMREF", nTail:"XMTN", sink:"XMNO", convP:"XMPD", convN:"XMNB", pTail:"XMTP",
      n1:"XMN1", n2:"XMN2", pDiode:"XMPA", pLoad:"XMPB", p1:"XMP1", p2:"XMP2",
      nDiode:"XMNA", nLoad:"XMNC", out:"XMO", cc:"CC", rz:"RZ" },
  },
  "ota-wide-sky130-haiku-r3": {
    devices: [
      ["Xb0","n","ibias ibias vss vss"], ["Xtn","n","ntn ibias vss vss"],
      ["Xsk","n","vout ibias vss vss"], ["Xnr","n","vbp ibias vss vss"],
      ["Xpr","p","vbp vbp vdd vdd"], ["Xtp","p","ntp vbp vdd vdd"],
      ["Xn1","n","d1n vinn ntn vss"], ["Xn2","n","nx vinp ntn vss"],
      ["Xm3","p","d1n d1n vdd vdd"], ["Xm4","p","nx d1n vdd vdd"],
      ["Xp1","p","d1p vinn ntp vdd"], ["Xp2","p","nx vinp ntp vdd"],
      ["Xm5","n","d1p d1p vss vss"], ["Xm6","n","nx d1p vss vss"],
      ["Xo","p","vout nx vdd vdd"], ["Cc","c","nx nz"], ["Rz","r","nz vout"],
    ],
    roles: { ref:"Xb0", nTail:"Xtn", sink:"Xsk", convP:"Xpr", convN:"Xnr", pTail:"Xtp",
      n1:"Xn1", n2:"Xn2", pDiode:"Xm3", pLoad:"Xm4", p1:"Xp1", p2:"Xp2",
      nDiode:"Xm5", nLoad:"Xm6", out:"Xo", cc:"Cc", rz:"Rz" },
  },
};

// Columns run from the bias edge through VINN, the pair/tail columns, the gain
// riser and VINP to the output; rows run from VDD to VSS.
const complementaryGrid = {
  port: 20, conv: 60, vinnPort: 120, ibPort: 130, vinn: 160, ref: 180, trunkTap: 270,
  left: 250, tail: 330, right: 410, riser: 500, vinp: 560, tap: 600, vinpPort: 620,
  cc: 640, rz: 710, out: 760, voutPort: 820,
  vdd: 60, top: 110, pBar: 160, pPair: 200, nMirror: 280, ssBar: 320, gain: 340,
  ddBar: 360, pMirror: 400, comp: 420, nPair: 480, outTap: 500, nBar: 520,
  ibias: 560, bottom: 600, trunk: 640, vss: 670,
};

function complementaryOta(id, ds) {
  const spec = complementaryOtas[id], g = complementaryGrid, R = spec.roles;
  if (ds.length !== spec.devices.length || ds.some((d, i) => d.ref !== spec.devices[i][0] ||
      d.kind !== spec.devices[i][1] || d.pins.join(" ") !== spec.devices[i][2]))
    throw Error("Unreviewed complementary OTA source graph " + id);
  const dev = ref => ds.find(d => d.ref === ref);
  const [tn, tp, dn, dp, gain, bias, nz] = [dev(R.nTail).pins[0], dev(R.pTail).pins[0],
    dev(R.pDiode).pins[0], dev(R.nDiode).pins[0], dev(R.pLoad).pins[0], dev(R.convP).pins[0], dev(R.cc).pins[1]];
  const motif = {
    ref: "n ibias ibias vss vss", nTail: `n ${tn} ibias vss vss`, sink: "n vout ibias vss vss",
    convP: `p ${bias} ${bias} vdd vdd`, convN: `n ${bias} ibias vss vss`, pTail: `p ${tp} ${bias} vdd vdd`,
    n1: `n ${dn} vinn ${tn} vss`, n2: `n ${gain} vinp ${tn} vss`,
    pDiode: `p ${dn} ${dn} vdd vdd`, pLoad: `p ${gain} ${dn} vdd vdd`,
    p1: `p ${dp} vinn ${tp} vdd`, p2: `p ${gain} vinp ${tp} vdd`,
    nDiode: `n ${dp} ${dp} vss vss`, nLoad: `n ${gain} ${dp} vss vss`,
    out: `p vout ${gain} vdd vdd`, cc: `c ${gain} ${nz}`, rz: `r ${nz} vout`,
  };
  for (const [role, want] of Object.entries(motif))
    if (!dev(R[role]) || dev(R[role]).kind + " " + dev(R[role]).pins.join(" ") !== want)
      throw Error("Complementary OTA motif mismatch " + id + " " + role);
  const owned = Object.values(R);
  if (new Set([tn, tp, dn, dp, gain, bias, nz, "vdd", "vss", "vout", "ibias", "vinp", "vinn"]).size !== 13 ||
      new Set(owned).size !== ds.length || ds.some(d => !owned.includes(d.ref)))
    throw Error("Complementary OTA ownership mismatch " + id);
  // The motif fixes gain–CC–NZ–RZ–VOUT order, so rotation 270 puts each pin 1 on the left.
  const p = (role, pin) => R[role] + "." + pin;
  return {
    id, strategy: "connected-stages",
    continuousNets: [...new Set(ds.flatMap(d => d.pins))].filter(n => !["vdd","vss"].includes(n)).sort(),
    title: "Transistor-level OTA",
    description: "Complementary input pairs, each with its own mirror load, drive one shared gain node. The PMOS pair and tail hang from VDD beside the converter diode that biases the tail; the NMOS pair and tail sit above VSS beside the IBIAS reference, which also biases the converter and output sinks. The gain node drives the PMOS output stage and the submitted series compensation.",
    body_note: "NFET bodies → VSS; PFET bodies → VDD. Exact source devices, bulk defaults and parameters are retained in the native project.",
    devices: {
      [R.convP]: [g.conv + 10, g.top, "horizontal"], [R.pTail]: [g.tail - 10, g.top],
      [R.p1]: [g.left - 10, g.pPair], [R.p2]: [g.right + 10, g.pPair, "horizontal"],
      [R.nDiode]: [g.left + 10, g.nMirror, "horizontal"], [R.nLoad]: [g.right - 10, g.nMirror],
      [R.pDiode]: [g.left + 10, g.pMirror, "horizontal"], [R.pLoad]: [g.right - 10, g.pMirror],
      [R.n1]: [g.left - 10, g.nPair], [R.n2]: [g.right + 10, g.nPair, "horizontal"],
      [R.convN]: [g.conv + 10, g.ibias, "horizontal"],
      [R.ref]: [g.ref + 10, g.bottom, "horizontal"], [R.nTail]: [g.tail - 10, g.bottom],
      [R.out]: [g.out - 10, g.gain], [R.sink]: [g.out - 10, g.trunk],
      [R.cc]: [g.cc, g.comp, 270], [R.rz]: [g.rz, g.comp, 270],
    },
    ports: { VDD: [g.port, g.vdd], VSS: [g.port, g.vss], IBIAS: [g.ibPort, g.ibias - 20, 90],
      VINN: [g.vinnPort, g.pPair], VINP: [g.vinpPort, g.pPair, 180], VOUT: [g.voutPort, g.outTap, 180] },
    draw(c) {
      const j = (key, net, x, y) => c.j(key, net, x, y), w = (net, a, b, bends = []) => c.w(net, a, b, bends);
      const chain = (net, keys) => keys.reduce((a, b) => (w(net, a, b), b));
      // Both tails, their bias generators and the output stage hang from the
      // shared rails; this page contract names the supplies beside their ports.
      j("dd-conv","vdd",g.conv,g.vdd); j("dd-tail","vdd",g.tail,g.vdd);
      chain("vdd", ["@VDD","dd-conv","dd-tail"]); w("vdd","dd-tail",p("out","S"),[[g.out, g.vdd]]);
      w("vdd",p("convP","S"),"dd-conv"); w("vdd",p("pTail","S"),"dd-tail");
      c.boundLabel("vdd","dd-conv",g.port - g.conv,-12,"middle");
      j("ss-conv","vss",g.conv,g.vss); j("ss-ref","vss",g.ref,g.vss); j("ss-tail","vss",g.tail,g.vss);
      chain("vss", ["@VSS","ss-conv","ss-ref","ss-tail"]); w("vss","ss-tail",p("sink","S"),[[g.out, g.vss]]);
      w("vss",p("convN","S"),"ss-conv"); w("vss",p("ref","S"),"ss-ref"); w("vss",p("nTail","S"),"ss-tail");
      c.boundLabel("vss","ss-conv",g.port - g.conv,-12,"middle");
      // The two load mirrors meet back to back. Local supply bars keep their
      // sources explicit without wrapping either half around the other.
      j("ss-bar","vss",g.tail,g.ssBar); j("dd-bar","vdd",g.tail,g.ddBar);
      w("vss",p("nDiode","S"),"ss-bar",[[g.left, g.ssBar]]); w("vss",p("nLoad","S"),"ss-bar",[[g.right, g.ssBar]]);
      w("vdd",p("pDiode","S"),"dd-bar",[[g.left, g.ddBar]]); w("vdd",p("pLoad","S"),"dd-bar",[[g.right, g.ddBar]]);
      c.boundLabel("vss","ss-bar",0,-8,"middle"); c.boundLabel("vdd","dd-bar",0,20,"middle");
      // PMOS pair under its tail, over an NMOS mirror with a local diode closure.
      j("tp-bar",tp,g.tail,g.pBar);
      w(tp,p("pTail","D"),"tp-bar");
      w(tp,p("p1","S"),"tp-bar",[[g.left, g.pBar]]); w(tp,p("p2","S"),"tp-bar",[[g.right, g.pBar]]);
      j("dp-drain",dp,g.left,g.pPair + 40); j("dp-gates",dp,g.tail,g.nMirror);
      w(dp,p("p1","D"),"dp-drain"); w(dp,"dp-drain",p("nDiode","D"));
      w(dp,"dp-drain","dp-gates",[[g.tail, g.pPair + 40]]);
      w(dp,p("nDiode","G"),"dp-gates"); w(dp,"dp-gates",p("nLoad","G"));
      // NMOS pair under a PMOS mirror, above its centered tail.
      j("dn-drain",dn,g.left,g.pMirror + 40); j("dn-gates",dn,g.tail,g.pMirror);
      w(dn,p("pDiode","D"),"dn-drain"); w(dn,"dn-drain",p("n1","D"));
      w(dn,"dn-drain","dn-gates",[[g.tail, g.pMirror + 40]]);
      w(dn,p("pDiode","G"),"dn-gates"); w(dn,"dn-gates",p("pLoad","G"));
      j("tn-bar",tn,g.tail,g.nBar);
      w(tn,p("n1","S"),"tn-bar",[[g.left, g.nBar]]); w(tn,p("n2","S"),"tn-bar",[[g.right, g.nBar]]);
      w(tn,"tn-bar",p("nTail","D"));
      c.boundLabel(tp,"tp-bar",8,-10,"start"); c.boundLabel(tn,"tn-bar",8,20,"start");
      // Each input trunk reaches its gate in both pairs.
      j("vinn-tap","vinn",g.vinn,g.pPair); j("vinp-tap","vinp",g.vinp,g.pPair);
      w("vinn","@VINN","vinn-tap"); w("vinn","vinn-tap",p("p1","G"));
      w("vinn","vinn-tap",p("n1","G"),[[g.vinn, g.nPair]]);
      w("vinp","@VINP","vinp-tap"); w("vinp","vinp-tap",p("p2","G"));
      w("vinp","vinp-tap",p("n2","G"),[[g.vinp, g.nPair]]);
      // Both mirror outputs join one gain riser. Its single plain crossing of
      // the VINP trunk reaches the PMOS output gate and the series compensation.
      j("gain-p",gain,g.right,g.pPair + 40); j("gain-n",gain,g.right,g.pMirror + 40);
      j("gain-riser",gain,g.riser,g.gain); j("gain-tap",gain,g.tap,g.gain);
      w(gain,p("p2","D"),"gain-p"); w(gain,"gain-p",p("nLoad","D"));
      w(gain,p("pLoad","D"),"gain-n"); w(gain,"gain-n",p("n2","D"));
      w(gain,"gain-p","gain-riser",[[g.riser, g.pPair + 40]]);
      w(gain,"gain-n","gain-riser",[[g.riser, g.pMirror + 40]]);
      w(gain,"gain-riser","gain-tap"); w(gain,"gain-tap",p("out","G"));
      w(gain,"gain-tap",p("cc","1"),[[g.tap, g.comp]]);
      w(nz,p("cc","2"),p("rz","1"));
      c.boundLabel(gain,"gain-tap",8,-10,"start");
      j("out-comp","vout",g.out,g.comp); j("out-port","vout",g.out,g.outTap);
      w("vout",p("out","D"),"out-comp"); w("vout",p("rz","2"),"out-comp");
      w("vout","out-comp","out-port"); w("vout","out-port",p("sink","D")); w("vout","out-port","@VOUT");
      // The converter diode mirrors into the PMOS tail on the upper rail; its
      // drain descends the bias edge to the IBIAS-driven converter sink.
      j("vbp-drain",bias,g.conv,g.top + 40); j("vbp-gates",bias,g.conv + 50,g.top); j("vbp-label",bias,g.conv,g.gain);
      w(bias,p("convP","D"),"vbp-drain"); w(bias,"vbp-drain","vbp-gates",[[g.conv + 50, g.top + 40]]);
      w(bias,p("convP","G"),"vbp-gates"); w(bias,"vbp-gates",p("pTail","G"));
      w(bias,"vbp-drain","vbp-label"); w(bias,"vbp-label",p("convN","D"));
      c.boundLabel(bias,"vbp-label",8,5,"start");
      // The IBIAS reference sits beside the NMOS tail. Its drain feeds the port
      // and converter sink; its gate trunk feeds the tail and, beneath the
      // tail's source stub, the output sink.
      j("ib-port","ibias",g.ibPort,g.ibias); j("ib-drain","ibias",g.ref,g.ibias);
      j("ib-gates","ibias",g.ref + 50,g.bottom); j("ib-trunk","ibias",g.trunkTap,g.bottom);
      w("ibias",p("convN","G"),"ib-port"); w("ibias","@IBIAS","ib-port"); w("ibias","ib-port","ib-drain");
      w("ibias",p("ref","D"),"ib-drain"); w("ibias","ib-drain","ib-gates",[[g.ref + 50, g.ibias]]);
      w("ibias",p("ref","G"),"ib-gates"); w("ibias","ib-gates","ib-trunk");
      w("ibias","ib-trunk",p("nTail","G")); w("ibias","ib-trunk",p("sink","G"),[[g.trunkTap, g.trunk]]);
      c.boundLabel("ibias","ib-port",0,-40,"middle");
    },
  };
}

// Source-matched eighteen-MOS folded cascodes with their complete three-passive
// networks. Whole ordered pin guards admit only these two sources; models and
// parameters remain native-imported and independently frozen-source checked.
function precisionAstraFoldedOta(id, ds) {
  const expected = [["XNR","n","ibias ibias vss vss"],["XNT","n","tail ibias vss vss"],["XINP","n","fp vinp tail vss"],["XINN","n","fn vinn tail vss"],["XNBP","n","pb ibias vss vss"],["XPR","p","pb pb vdd vdd"],["XPTP","p","fp pb vdd vdd"],["XPTN","p","fn pb vdd vdd"],["RPC","r","vdd pcs"],["XPCREF","p","pc pc pcs vdd"],["XNPC","n","pc ibias vss vss"],["XPCP","p","mir pc fp vdd"],["XPCN","p","vout pc fn vdd"],["XPNC","p","nc pb vdd vdd"],["XNCREF","n","nc nc ncs vss"],["RNC","r","ncs vss"],["XNCP","n","mir nc nl vss"],["XNCN","n","vout nc nr vss"],["XNLP","n","nl mir vss vss"],["XNLN","n","nr mir vss vss"],["CDOM","c","vout vss"]];
  if (id !== "ota-precision-sky130-astra-r1" || ds.length !== expected.length ||
      ds.some((d,i) => d.ref !== expected[i][0] || d.kind !== expected[i][1] || d.pins.join(" ") !== expected[i][2]))
    throw Error("Unreviewed PRECISION Astra ordered source graph " + id);
  const devices = {"XNR":[360,580,"horizontal"],"XNT":[430,430,0],"XINP":[550,290,"horizontal"],"XINN":[330,290,0],"XNBP":[100,220,"horizontal"],"XPR":[80,110,0],"XPTP":[680,160,0],"XPTN":[180,160,"horizontal"],"RPC":[430,20,0],"XPCREF":[420,130,0],"XNPC":[420,240,0],"XPCP":[680,290,0],"XPCN":[180,290,"horizontal"],"XPNC":[80,460,0],"XNCREF":[100,560,"horizontal"],"RNC":[90,670,0],"XNCP":[680,400,0],"XNCN":[180,400,"horizontal"],"XNLP":[680,510,0],"XNLN":[180,510,"horizontal"],"CDOM":[290,410,0]};
  const ports = {"VINP":[620,290,180],"VINN":[260,290,0],"VOUT":[70,330,0],"VDD":[580,100,0],"VSS":[580,570,0],"IBIAS":[400,630,0]};
  const sections = {};
  for (const ref of ["XPTN","XPCN","XNCN","XNLN","CDOM"]) sections[ref]="left-folded";
  for (const ref of ["XPTP","XPCP","XNCP","XNLP"]) sections[ref]="right-folded";
  for (const ref of ["XINP","XINN","XNT"]) sections[ref]="pair";
  for (const ref of ["XPR","XNBP"]) sections[ref]="pb-generator";
  for (const ref of ["RPC","XPCREF","XNPC"]) sections[ref]="pc-generator";
  for (const ref of ["XPNC","XNCREF","RNC"]) sections[ref]="nc-generator";
  sections.XNR="reference";
  sections["@VINP"]=sections["@VINN"]="pair";
  sections["@VOUT"]="left-folded";
  sections["@VDD"]=sections["@VSS"]="right-folded";
  sections["@IBIAS"]="reference";
  const auxiliaryNets = new Set(["vdd","vss"]);
  return {
    id, strategy:"connected-stages", title:"Transistor-level OTA",
    description:"NMOS-input folded-cascode OTA with a wide-swing NMOS mirror, continuous internal bias controls and complete nearby reference/converter paths.",
    body_note:"NFET bodies → VSS; PFET bodies → VDD. Exact source devices, values, bulk defaults and parameters are retained in the native project.",
    devices, ports,
    continuousNets:[...new Set(ds.flatMap(d=>d.pins))].filter(n=>!auxiliaryNets.has(n)).sort(),
    draw(c) {
      const routedAnchors = new Map();
      const drawing = {...c, j(key, net, x, y) {
        c.j(key, net, x, y);
        if (!routedAnchors.has(net)) routedAnchors.set(net, []);
        routedAnchors.get(net).push({key,x,y});
      }};
      routeDrawing(drawing, ds.map(d=>({...d,labelWidth:c.referenceWidth(d.ref)/10})), devices, ports, sections,
        auxiliaryNets, {preferDeviceRoots:true,separateInputNets:true,supplyLabelWidthAllowance:12,supplyLabelClearance:2,
          netClearanceZones:{pc:[[645,285,655,295],[205,285,215,295]]}});
      const annotate = (net, near, dx, dy, align) => {
        const p = c.point(near);
        const candidates = routedAnchors.get(net) ?? [];
        if (!candidates.length) throw Error("No routed junction for annotation " + net);
        const nearest = [...candidates].sort((a,b)=>(Math.abs(a.x-p.x)+Math.abs(a.y-p.y))-(Math.abs(b.x-p.x)+Math.abs(b.y-p.y)))[0];
        c.boundLabel(net, nearest.key, dx, dy, align);
      };
      annotate("ibias", "@IBIAS", -20, 18, "middle");
      annotate("pb", "XPR.D", -8, 18, "end");
      annotate("pc", "XPCREF.D", 8, 36, "start");
      annotate("nc", "XNCREF.D", 8, 18, "start");
    },
  };
}

function precisionSonnetFoldedOta(id, ds) {
  const expected = [["XMB0","n","ibias ibias vss vss"],["XM5","n","tail ibias vss vss"],["XMNP0","n","vbp ibias vss vss"],["XMNPB","n","vbpc ibias vss vss"],["XMP0","p","vbp vbp vdd vdd"],["XMPB","p","vbpc vbpc sb vdd"],["RPB","r","vdd sb"],["XMPBN","p","vbnc vbp vdd vdd"],["XMNB3","n","vbnc vbnc rbt vss"],["RB","r","rbt vss"],["XM1","n","f1 vinp tail vss"],["XM2","n","f2 vinn tail vss"],["XMS1","p","f1 vbp vdd vdd"],["XMS2","p","f2 vbp vdd vdd"],["XMC1","p","a vbpc f1 vdd"],["XMC2","p","vout vbpc f2 vdd"],["XMQ3","n","a vbnc e1 vss"],["XMQ4","n","vout vbnc e2 vss"],["XMQ1","n","e1 a vss vss"],["XMQ2","n","e2 a vss vss"],["CEXT","c","vout vss"]];
  if (id !== "ota-precision-sky130-sonnet-5-5-r1" || ds.length !== expected.length ||
      ds.some((d,i) => d.ref !== expected[i][0] || d.kind !== expected[i][1] || d.pins.join(" ") !== expected[i][2]))
    throw Error("Unreviewed PRECISION Sonnet ordered source graph " + id);
  const devices = {"XMB0":[500,580,0],"XM5":[430,430,"horizontal"],"XM1":[310,290,0],"XM2":[530,290,"horizontal"],"XMNP0":[760,220,0],"XMP0":[780,110,"horizontal"],"XMS1":[180,160,"horizontal"],"XMS2":[680,160,0],"RPB":[430,20,0],"XMPB":[440,130,"horizontal"],"XMNPB":[440,240,"horizontal"],"XMC1":[180,290,"horizontal"],"XMC2":[680,290,0],"XMPBN":[810,460,"horizontal"],"XMNB3":[790,560,0],"RB":[800,670,0],"XMQ3":[180,400,"horizontal"],"XMQ4":[680,400,0],"XMQ1":[180,510,"horizontal"],"XMQ2":[680,510,0],"CEXT":[570,410,0]};
  const ports = {"VINP":[240,290,0],"VINN":[600,290,180],"VOUT":[790,330,180],"VDD":[280,100,180],"VSS":[280,570,180],"IBIAS":[460,630,180]};
  const sections = {};
  for (const ref of ["XMS2","XMC2","XMQ4","XMQ2","CEXT"]) sections[ref]="left-folded";
  for (const ref of ["XMS1","XMC1","XMQ3","XMQ1"]) sections[ref]="right-folded";
  for (const ref of ["XM1","XM2","XM5"]) sections[ref]="pair";
  for (const ref of ["XMP0","XMNP0"]) sections[ref]="vbp-generator";
  for (const ref of ["RPB","XMPB","XMNPB"]) sections[ref]="vbpc-generator";
  for (const ref of ["XMPBN","XMNB3","RB"]) sections[ref]="vbnc-generator";
  sections.XMB0="reference";
  sections["@VINP"]=sections["@VINN"]="pair";
  sections["@VOUT"]="left-folded";
  sections["@VDD"]=sections["@VSS"]="right-folded";
  sections["@IBIAS"]="reference";
  const auxiliaryNets = new Set(["vdd","vss"]);
  return {
    id, strategy:"connected-stages", title:"Transistor-level OTA",
    description:"NMOS-input folded-cascode OTA with a wide-swing NMOS mirror, continuous internal bias controls and complete nearby reference/converter paths. The submitted output column is on the right.",
    body_note:"NFET bodies → VSS; PFET bodies → VDD. Exact source devices, values, bulk defaults and parameters are retained in the native project.",
    devices, ports,
    continuousNets:[...new Set(ds.flatMap(d=>d.pins))].filter(n=>!auxiliaryNets.has(n)).sort(),
    draw(c) {
      const routedAnchors = new Map();
      const drawing = {...c, j(key, net, x, y) {
        c.j(key, net, x, y);
        if (!routedAnchors.has(net)) routedAnchors.set(net, []);
        routedAnchors.get(net).push({key,x,y});
      }};
      routeDrawing(drawing, ds.map(d=>({...d,labelWidth:c.referenceWidth(d.ref)/10})), devices, ports, sections,
        auxiliaryNets, {preferDeviceRoots:true,separateInputNets:true,supplyLabelWidthAllowance:12,supplyLabelClearance:2,
          netClearanceZones:{vbpc:[[645,285,655,295],[205,285,215,295]],vbnc:[[645,395,655,405],[205,395,215,405]]}});
      const annotate = (net, near, dx, dy, align) => {
        const p = c.point(near);
        const candidates = routedAnchors.get(net) ?? [];
        if (!candidates.length) throw Error("No routed junction for annotation " + net);
        const nearest = [...candidates].sort((a,b)=>(Math.abs(a.x-p.x)+Math.abs(a.y-p.y))-(Math.abs(b.x-p.x)+Math.abs(b.y-p.y)))[0];
        c.boundLabel(net, nearest.key, dx, dy, align);
      };
      annotate("ibias", "@IBIAS", 20, 18, "middle");
      annotate("vbp", "XMP0.D", 8, 18, "start");
      annotate("vbpc", "XMPB.D", -8, 36, "end");
      annotate("vbnc", "XMNB3.D", 8, 8, "start");
    },
  };
}

function driveOpusR1MirrorOta(id, ds) {
  const expected = [["XB0","n","ibias ibias vss vss"],["XT","n","tail ibias vss vss"],["XM1","n","n1 vinn tail vss"],["XM2","n","n2 vinp tail vss"],["XM3","p","n1 n1 vdd vdd"],["XM5","p","p5 n1 vdd vdd"],["XM4","p","n2 n2 vdd vdd"],["XM6","p","p6 n2 vdd vdd"],["XM5C","p","nm vbpc p5 vdd"],["XM6C","p","vout vbpc p6 vdd"],["XM7C","n","nm vbnc q7 vss"],["XM7","n","q7 nm vss vss"],["XM8C","n","vout vbnc q8 vss"],["XM8","n","q8 nm vss vss"],["XBN1","n","vbp ibias vss vss"],["XBP0","p","vbp vbp vdd vdd"],["XBP1","p","vbnc vbp vdd vdd"],["XBNC","n","vbnc vbnc xn vss"],["RN","r","xn vss"],["XBN2","n","vbpc ibias vss vss"],["XBPC","p","vbpc vbpc xp vdd"],["RP","r","vdd xp"]];
  if (id !== "ota-drive-sky130-opus-5-5-r1" || ds.length !== expected.length ||
      ds.some((d,i) => d.ref !== expected[i][0] || d.kind !== expected[i][1] || d.pins.join(" ") !== expected[i][2]))
    throw Error("Unreviewed DRIVE Opus Run1 ordered source graph " + id);
  const devices = {"XB0":[360,580,"horizontal"],"XT":[430,400,0],"XM1":[330,290,0],"XM2":[550,290,"horizontal"],"XM3":[330,160,0],"XM5":[180,160,"horizontal"],"XM4":[550,160,"horizontal"],"XM6":[680,160,0],"XM5C":[180,290,"horizontal"],"XM6C":[680,290,0],"XM7C":[160,400,0],"XM7":[180,510,"horizontal"],"XM8C":[680,400,0],"XM8":[680,510,0],"XBN1":[290,680,"horizontal"],"XBP0":[270,570,0],"XBP1":[50,460,0],"XBNC":[70,560,"horizontal"],"RN":[60,670,0],"XBN2":[880,400,0],"XBPC":[880,290,0],"RP":[890,180,0]};
  const ports = {"VINP":[600,290,180],"VINN":[280,290,0],"VOUT":[780,330,180],"VDD":[580,100,0],"VSS":[750,550,180],"IBIAS":[400,630,0]};
  const sections = {};
  for (const ref of ["XM3","XM5"]) sections[ref]="left-load-mirror";
  for (const ref of ["XM4","XM6"]) sections[ref]="right-load-mirror";
  for (const ref of ["XM5C","XM7C","XM7"]) sections[ref]="sink-mirror";
  for (const ref of ["XM6C","XM8C","XM8"]) sections[ref]="output";
  for (const ref of ["XM1","XM2","XT"]) sections[ref]="pair";
  for (const ref of ["XBP0","XBN1"]) sections[ref]="pb-generator";
  for (const ref of ["RP","XBPC","XBN2"]) sections[ref]="pc-generator";
  for (const ref of ["XBP1","XBNC","RN"]) sections[ref]="nc-generator";
  sections.XB0="reference";
  sections["@VINP"]=sections["@VINN"]="pair";
  sections["@VOUT"]="output";
  sections["@VDD"]="right-load-mirror";
  sections["@VSS"]="output";
  sections["@IBIAS"]="reference";
  const auxiliaryNets = new Set(["vdd","vss"]);
  return {
    id, strategy:"connected-stages", title:"Transistor-level OTA",
    description:"NMOS-input symmetrical current-mirror OTA with cascoded PMOS sourcing and wide-swing NMOS sinking branches, complete nearby cascode-bias paths and a local reference.",
    body_note:"NFET bodies → VSS; PFET bodies → VDD. Exact source devices, values, bulk defaults and parameters are retained in the native project.",
    devices, ports,
    continuousNets:[...new Set(ds.flatMap(d=>d.pins))].filter(n=>!auxiliaryNets.has(n)).sort(),
    draw(c) {
      const routedAnchors = new Map();
      const drawing = {...c, j(key, net, x, y) {
        c.j(key, net, x, y);
        if (!routedAnchors.has(net)) routedAnchors.set(net, []);
        routedAnchors.get(net).push({key,x,y});
      }};
      routeDrawing(drawing, ds.map(d=>({...d,labelWidth:c.referenceWidth(d.ref)/10})), devices, ports, sections,
        auxiliaryNets, {preferDeviceRoots:true,separateInputNets:true,supplyLabelWidthAllowance:12,supplyLabelClearance:2,
          netClearanceZones:{ibias:[[750,0,815,565]],vbpc:[[645,285,655,295],[205,285,215,295]],vbnc:[[645,395,655,405],[205,395,215,405],[150,0,630,450],[95,555,105,565]]}});
      const annotate = (net, near, dx, dy, align) => {
        const p = c.point(near);
        const candidates = routedAnchors.get(net) ?? [];
        if (!candidates.length) throw Error("No routed junction for annotation " + net);
        const nearest = [...candidates].sort((a,b)=>(Math.abs(a.x-p.x)+Math.abs(a.y-p.y))-(Math.abs(b.x-p.x)+Math.abs(b.y-p.y)))[0];
        c.boundLabel(net, nearest.key, dx, dy, align);
      };
      annotate("ibias", "@IBIAS", -20, 18, "middle");
      annotate("vbp", "XBP0.D", -8, 18, "end");
      annotate("vbpc", "XBPC.D", 8, 36, "start");
      annotate("vbnc", "XBNC.D", -8, 8, "end");
    },
  };
}

function driveOpusR3MirrorOta(id, ds) {
  const expected = [["XNB0","n","ibias ibias vss vss"],["XNT","n","tail ibias vss vss"],["XNB1","n","vbp0 ibias vss vss"],["XNB2","n","vbpc ibias vss vss"],["XPB0","p","vbp0 vbp0 vdd vdd"],["XPB2","p","vbnc vbp0 vdd vdd"],["RP","r","vdd pbs"],["XPB1","p","vbpc vbpc pbs vdd"],["XNB3","n","vbnc vbnc nbs vss"],["RN","r","nbs vss"],["X1A","n","da vinp tail vss"],["X1B","n","db vinn tail vss"],["XPDA","p","da da vdd vdd"],["XPDB","p","db db vdd vdd"],["XPOA","p","xa da vdd vdd"],["XPOB","p","xb db vdd vdd"],["XPCA","p","vout vbpc xa vdd"],["XPCB","p","nd vbpc xb vdd"],["XNCA","n","nd vbnc ya vss"],["XN3A","n","ya nd vss vss"],["XNCB","n","vout vbnc yb vss"],["XN3B","n","yb nd vss vss"]];
  if (id !== "ota-drive-sky130-opus-5-5-r3" || ds.length !== expected.length ||
      ds.some((d,i) => d.ref !== expected[i][0] || d.kind !== expected[i][1] || d.pins.join(" ") !== expected[i][2]))
    throw Error("Unreviewed DRIVE Opus Run1 ordered source graph " + id);
  const devices = {"XNB0":[360,580,"horizontal"],"XNT":[430,400,0],"X1B":[330,290,0],"X1A":[550,290,"horizontal"],"XPDB":[330,160,0],"XPOB":[180,160,"horizontal"],"XPDA":[550,160,"horizontal"],"XPOA":[680,160,0],"XPCB":[180,290,"horizontal"],"XPCA":[680,290,0],"XNCA":[160,400,0],"XN3A":[180,510,"horizontal"],"XNCB":[680,400,0],"XN3B":[680,510,0],"XNB1":[290,680,"horizontal"],"XPB0":[270,570,0],"XPB2":[50,460,0],"XNB3":[70,560,"horizontal"],"RN":[60,670,0],"XNB2":[880,400,0],"XPB1":[880,290,0],"RP":[890,180,0]};
  const ports = {"VINP":[600,290,180],"VINN":[280,290,0],"VOUT":[780,330,180],"VDD":[580,100,0],"VSS":[750,550,180],"IBIAS":[400,630,0]};
  const sections = {};
  for (const ref of ["XPDB","XPOB"]) sections[ref]="left-load-mirror";
  for (const ref of ["XPDA","XPOA"]) sections[ref]="right-load-mirror";
  for (const ref of ["XPCB","XNCA","XN3A"]) sections[ref]="sink-mirror";
  for (const ref of ["XPCA","XNCB","XN3B"]) sections[ref]="output";
  for (const ref of ["X1B","X1A","XNT"]) sections[ref]="pair";
  for (const ref of ["XPB0","XNB1"]) sections[ref]="pb-generator";
  for (const ref of ["RP","XPB1","XNB2"]) sections[ref]="pc-generator";
  for (const ref of ["XPB2","XNB3","RN"]) sections[ref]="nc-generator";
  sections.XNB0="reference";
  sections["@VINP"]=sections["@VINN"]="pair";
  sections["@VOUT"]="output";
  sections["@VDD"]="right-load-mirror";
  sections["@VSS"]="output";
  sections["@IBIAS"]="reference";
  const auxiliaryNets = new Set(["vdd","vss"]);
  return {
    id, strategy:"connected-stages", title:"Transistor-level OTA",
    description:"NMOS-input symmetrical current-mirror OTA with cascoded PMOS sourcing and wide-swing NMOS sinking branches, complete nearby cascode-bias paths and a local reference.",
    body_note:"NFET bodies → VSS; PFET bodies → VDD. Exact source devices, values, bulk defaults and parameters are retained in the native project.",
    devices, ports,
    continuousNets:[...new Set(ds.flatMap(d=>d.pins))].filter(n=>!auxiliaryNets.has(n)).sort(),
    draw(c) {
      const routedAnchors = new Map();
      const drawing = {...c, j(key, net, x, y) {
        c.j(key, net, x, y);
        if (!routedAnchors.has(net)) routedAnchors.set(net, []);
        routedAnchors.get(net).push({key,x,y});
      }};
      const routingDevices = ["XNB0", "XNT", "X1B", "X1A", "XPDB", "XPOB", "XPDA", "XPOA", "XPCB", "XPCA", "XNCA", "XN3A", "XNCB", "XN3B", "XNB1", "XPB0", "XPB2", "XNB3", "RN", "XNB2", "XPB1", "RP"] .map(ref => ds.find(d => d.ref === ref));
      routeDrawing(drawing, routingDevices.map(d=>({...d,labelWidth:c.referenceWidth(d.ref)/10})), devices, ports, sections,
        auxiliaryNets, {preferDeviceRoots:true,separateInputNets:true,supplyLabelWidthAllowance:12,supplyLabelClearance:2,
          netClearanceZones:{ibias:[[750,0,815,565]],vbpc:[[645,285,655,295],[205,285,215,295]],vbnc:[[645,395,655,405],[205,395,215,405],[150,0,630,450],[95,555,105,565]]}});
      const annotate = (net, near, dx, dy, align) => {
        const p = c.point(near);
        const candidates = routedAnchors.get(net) ?? [];
        if (!candidates.length) throw Error("No routed junction for annotation " + net);
        const nearest = [...candidates].sort((a,b)=>(Math.abs(a.x-p.x)+Math.abs(a.y-p.y))-(Math.abs(b.x-p.x)+Math.abs(b.y-p.y)))[0];
        c.boundLabel(net, nearest.key, dx, dy, align);
      };
      annotate("ibias", "@IBIAS", -20, 18, "middle");
      annotate("vbp0", "XPB0.D", -8, 18, "end");
      annotate("vbpc", "XPB1.D", 8, 36, "start");
      annotate("vbnc", "XNB3.D", -8, 8, "end");
    },
  };
}

function driveSonnetR3MirrorOta(id, ds) {
  const expected = [["XMN0","n","ibias ibias vss vss"],["XMNS1","n","vp ibias vss vss"],["XMNS3","n","vbp ibias vss vss"],["XMP0","p","vp vp vdd vdd"],["XMPS2","p","vbn vp vdd vdd"],["XMNB","n","vbn vbn sn vss"],["RN","r","sn vss"],["RP","r","vdd sp"],["XMPB","p","vbp vbp sp vdd"],["XM9","n","ts ibias vss vss"],["XM1","n","n3 vinp ts vss"],["XM2","n","n4 vinn ts vss"],["XM3","p","n3 n3 vdd vdd"],["XM4","p","n4 n4 vdd vdd"],["XM6","p","x6 n3 vdd vdd"],["XM6C","p","vout vbp x6 vdd"],["XM5","p","x5 n4 vdd vdd"],["XM5C","p","n7 vbp x5 vdd"],["XM7C","n","n7 vbn x7 vss"],["XM7","n","x7 n7 vss vss"],["XM8C","n","vout vbn x8 vss"],["XM8","n","x8 n7 vss vss"]];
  if (id !== "ota-drive-sky130-sonnet-5-5-r3" || ds.length !== expected.length ||
      ds.some((d,i) => d.ref !== expected[i][0] || d.kind !== expected[i][1] || d.pins.join(" ") !== expected[i][2]))
    throw Error("Unreviewed DRIVE Opus Run1 ordered source graph " + id);
  const devices = {"XMN0":[360,580,"horizontal"],"XM9":[430,400,0],"XM2":[330,290,0],"XM1":[550,290,"horizontal"],"XM4":[330,160,0],"XM5":[180,160,"horizontal"],"XM3":[550,160,"horizontal"],"XM6":[680,160,0],"XM5C":[180,290,"horizontal"],"XM6C":[680,290,0],"XM7C":[160,400,0],"XM7":[180,510,"horizontal"],"XM8C":[680,400,0],"XM8":[680,510,0],"XMNS1":[290,680,"horizontal"],"XMP0":[270,570,0],"XMPS2":[50,460,0],"XMNB":[70,560,"horizontal"],"RN":[60,670,0],"XMNS3":[880,400,0],"XMPB":[880,290,0],"RP":[890,180,0]};
  const ports = {"VINP":[600,290,180],"VINN":[280,290,0],"VOUT":[780,330,180],"VDD":[580,100,0],"VSS":[750,550,180],"IBIAS":[400,630,0]};
  const sections = {};
  for (const ref of ["XM4","XM5"]) sections[ref]="left-load-mirror";
  for (const ref of ["XM3","XM6"]) sections[ref]="right-load-mirror";
  for (const ref of ["XM5C","XM7C","XM7"]) sections[ref]="sink-mirror";
  for (const ref of ["XM6C","XM8C","XM8"]) sections[ref]="output";
  for (const ref of ["XM2","XM1","XM9"]) sections[ref]="pair";
  for (const ref of ["XMP0","XMNS1"]) sections[ref]="pb-generator";
  for (const ref of ["RP","XMPB","XMNS3"]) sections[ref]="pc-generator";
  for (const ref of ["XMPS2","XMNB","RN"]) sections[ref]="nc-generator";
  sections.XMN0="reference";
  sections["@VINP"]=sections["@VINN"]="pair";
  sections["@VOUT"]="output";
  sections["@VDD"]="right-load-mirror";
  sections["@VSS"]="output";
  sections["@IBIAS"]="reference";
  const auxiliaryNets = new Set(["vdd","vss"]);
  return {
    id, strategy:"connected-stages", title:"Transistor-level OTA",
    description:"NMOS-input symmetrical current-mirror OTA with cascoded PMOS sourcing and wide-swing NMOS sinking branches, complete nearby cascode-bias paths and a local reference.",
    body_note:"NFET bodies → VSS; PFET bodies → VDD. Exact source devices, values, bulk defaults and parameters are retained in the native project.",
    devices, ports,
    continuousNets:[...new Set(ds.flatMap(d=>d.pins))].filter(n=>!auxiliaryNets.has(n)).sort(),
    draw(c) {
      const routedAnchors = new Map();
      const drawing = {...c, j(key, net, x, y) {
        c.j(key, net, x, y);
        if (!routedAnchors.has(net)) routedAnchors.set(net, []);
        routedAnchors.get(net).push({key,x,y});
      }};
      const routingDevices = ["XMN0", "XM9", "XM2", "XM1", "XM4", "XM5", "XM3", "XM6", "XM5C", "XM6C", "XM7C", "XM7", "XM8C", "XM8", "XMNS1", "XMP0", "XMPS2", "XMNB", "RN", "XMNS3", "XMPB", "RP"] .map(ref => ds.find(d => d.ref === ref));
      routeDrawing(drawing, routingDevices.map(d=>({...d,labelWidth:c.referenceWidth(d.ref)/10})), devices, ports, sections,
        auxiliaryNets, {preferDeviceRoots:true,separateInputNets:true,supplyLabelWidthAllowance:12,supplyLabelClearance:2,
          netClearanceZones:{ibias:[[750,0,815,565]],vbp:[[645,285,655,295],[205,285,215,295]],vbn:[[645,395,655,405],[205,395,215,405],[150,0,630,450],[95,555,105,565]]}});
      const annotate = (net, near, dx, dy, align) => {
        const p = c.point(near);
        const candidates = routedAnchors.get(net) ?? [];
        if (!candidates.length) throw Error("No routed junction for annotation " + net);
        const nearest = [...candidates].sort((a,b)=>(Math.abs(a.x-p.x)+Math.abs(a.y-p.y))-(Math.abs(b.x-p.x)+Math.abs(b.y-p.y)))[0];
        c.boundLabel(net, nearest.key, dx, dy, align);
      };
      annotate("ibias", "@IBIAS", -20, 18, "middle");
      annotate("vp", "XMP0.D", -8, 18, "end");
      annotate("vbp", "XMPB.D", 8, 36, "start");
      annotate("vbn", "XMNB.D", -8, 8, "end");
    },
  };
}
