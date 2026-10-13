/** Two representative, source-specific drawings anchored to recognizable motifs.
 * Public figure relationships are recorded in the schematic skill; these routes
 * follow ATB's own ordered terminals, not a reference circuit's electrical data. */
export function humanReferenceLayout(id, ds) {
  if (id !== "ldo-core-sky130-astra-r1" &&
      id !== "ota-precision-sky130-sonnet-5-5-r2") return null;
  const ldo = id.startsWith("ldo-");
  const continuousNets = [...new Set(ds.flatMap(d => d.pins)
    .filter(n => !(ldo ? ["vin", "vss"] : ["vdd", "vss", "ibias", "vbp"]).includes(n)))].sort();
  return ldo ? coreLdo(id, continuousNets) : subtractingOta(id, continuousNets);
}

function coreLdo(id, continuousNets) {
  const layout = {
    id, strategy: "connected-ldo", continuousNets,
    title: "Transistor-level LDO regulator",
    description: "Centered mirror-loaded error amplifier, local current bias, grouped supply-matching reference ladder, explicit compensation and outer feedback return.",
    body_note: "NFET bodies → VSS; PFET bodies → VIN. Exact source devices, bulk defaults and parameters are retained in the native project.",
    devices: {
      RBIAS: [140, 300], XNBIAS: [150, 420, "horizontal"],
      XNTAIL: [430, 420],
      XP1: [350, 140, "horizontal"], XP2: [530, 140],
      XNFB: [330, 280], XNREF: [550, 280, "horizontal"],
      XPPASS: [1040, 220],
      CCOMP: [840, 310, 90], RCOMP: [960, 310, 90],
      RFB1: [1050, 430], RFB2: [1050, 650],
      CFF: [930, 430], RFB3: [1170, 530],
      RREF1: [660, 500], RREFAC: [820, 440], CREFAC: [820, 530],
      RREF2: [660, 710], CREF: [820, 710],
    },
    ports: { VIN: [80, 60], VSS: [80, 580], VREF: [580, 770], VOUT: [1190, 290, 180] },
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
      j("bias-drain","bias",140,360); j("bias-dg","bias",200,420);
      w("bias","RBIAS.2","bias-drain"); w("bias","bias-drain","XNBIAS.D");
      w("bias","bias-drain","bias-dg",[[200,360]]);
      w("bias","XNBIAS.G","bias-dg"); w("bias","bias-dg","XNTAIL.G");
      // Symmetric input/load columns with a genuinely centered tail tap.
      j("n1-drain","n1",340,210); j("n1-gates","n1",400,140);
      w("n1","XP1.D","n1-drain"); w("n1","n1-drain","XNFB.D");
      w("n1","XP1.G","n1-gates"); w("n1","n1-gates","XP2.G");
      w("n1","n1-gates","n1-drain",[[400,210]]);
      j("tail-left","tail",340,360); j("tail-center","tail",440,360); j("tail-right","tail",540,360);
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
      w("fb","fb-cap","XNFB.G",[[890,540],[890,840],[230,840],[230,280]]);
      c.boundLabel("fb","fb-divider",-12,-12,"end");
      j("fb-vin","vin",1170,480); w("vin","fb-vin","RFB3.1");
      c.boundLabel("vin","fb-vin",8,-10,"start");
      j("fb-vss","vss",1050,710); w("vss","RFB2.2","fb-vss");
      c.boundLabel("vss","fb-vss",-8,-10,"end");
      // Reference ladder: two VIN→REF legs above two REF→VREF legs.
      // CREF bypasses RREF2, not ground. The series AC leg keeps RAC explicit.
      j("ref-vin","vin",660,390); j("ref-vin-ac","vin",820,390);
      w("vin","ref-vin","ref-vin-ac"); w("vin","ref-vin","RREF1.1");
      w("vin","ref-vin-ac","RREFAC.1"); c.boundLabel("vin","ref-vin",8,-12,"start");
      w("rac","RREFAC.2","CREFAC.1");
      j("ref-input","ref",660,600); j("ref-center","ref",660,620); j("ref-ac","ref",820,620);
      w("ref","RREF1.2","ref-input"); w("ref","ref-input","ref-center"); w("ref","ref-center","ref-ac");
      w("ref","CREFAC.2","ref-ac"); w("ref","ref-center","RREF2.1");
      w("ref","ref-ac","CREF.1");
      w("ref","ref-input","XNREF.G",[[620,600],[620,280]]);
      c.boundLabel("ref","ref-input",8,-12,"start");
      j("ref-bottom","vref",660,770); j("ref-cap-bottom","vref",820,770);
      w("vref","RREF2.2","ref-bottom"); w("vref","ref-bottom","ref-cap-bottom");
      w("vref","CREF.2","ref-cap-bottom"); w("vref","ref-bottom","@VREF");
    },
  };
  // Reviewed column slots keep the complete input, reference and sensing
  // motifs intact. This is not a global density or equal-gap transformation:
  // the reference ladder moves as a group, while its input riser and the
  // compensation branch retain separate corridors above it.
  const columns = new Map([
    [80,70], [140,120], [150,130], [200,180], [230,190],
    [330,290], [340,300], [350,310], [400,360], [430,370],
    [440,380], [530,450], [540,460], [550,470], [580,480],
    [620,520], [660,560], [800,650], [820,720], [840,690],
    [890,800], [930,830], [960,810], [1040,890], [1050,900],
    [1170,1020], [1190,1040],
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
      XM7: [1050,140], XM6: [1050,300],
      RZ: [900,220,270], CC: [1030,220,270],
      XM0: [290,460,"horizontal"], XMPD: [110,180,"horizontal"], XMB1: [90,350],
    },
    ports: { VINN:[320,280], VINP:[640,280,180], VOUT:[1170,240,180], VDD:[80,60], VSS:[80,550], IBIAS:[330,510] },
    draw(c) {
      const j=(key,net,x,y)=>c.j(key,net,x,y), w=(net,a,b,bends=[])=>c.w(net,a,b,bends);
      for(const [key,x] of [["dd-left",220],["dd-right",760],["dd-out",1060]]) j(key,"vdd",x,60);
      w("vdd","@VDD","dd-left"); w("vdd","dd-left","dd-right"); w("vdd","dd-right","dd-out");
      w("vdd","dd-left","XMPA.S"); w("vdd","dd-right","XMPB.S"); w("vdd","dd-out","XM7.S");
      c.boundLabel("vdd","dd-left",-140,-12,"middle");
      for(const [key,x] of [["ss-left",220],["ss-ref",280],["ss-tail",480],["ss-right",760],["ss-out",1060]]) j(key,"vss",x,550);
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
      j("out-comp","vout",1060,220); j("out-port","vout",1060,240);
      w("vout","XM7.D","out-comp"); w("vout","out-comp","CC.2");
      w("vout","out-comp","out-port"); w("vout","out-port","XM6.D"); w("vout","out-port","@VOUT");
      // VBP is a bias control, not the signal that drives XM6.
      j("vbp-loads","vbp",480,140); w("vbp","XMPA.G","vbp-loads"); w("vbp","vbp-loads","XMPB.G");
      c.boundLabel("vbp","vbp-loads",0,-14,"middle");
      j("vbp-output","vbp",1000,140); w("vbp","vbp-output","XM7.G"); c.boundLabel("vbp","vbp-output",-8,-10,"end");
      // Tail reference is next to the tail. Only the auxiliary converter uses
      // named remote controls, retaining its complete local current path.
      j("ibias-dg","ibias",340,460); j("ibias-tail","ibias",380,460); j("ibias-port","ibias",380,510);
      w("ibias","XM0.D","ibias-dg",[[280,420],[340,420]]); w("ibias","XM0.G","ibias-dg");
      w("ibias","ibias-dg","ibias-tail"); w("ibias","ibias-tail","XM5.G");
      w("ibias","ibias-tail","ibias-port"); w("ibias","@IBIAS","ibias-port");
      c.boundLabel("ibias","ibias-port",-50,-12,"middle");
      j("conv-vdd","vdd",100,110); w("vdd","conv-vdd","XMPD.S"); c.boundLabel("vdd","conv-vdd",-8,-10,"end");
      j("conv-vbp","vbp",100,250); w("vbp","XMPD.D","conv-vbp"); w("vbp","conv-vbp","XMB1.D");
      w("vbp","XMPD.G","conv-vbp",[[160,180],[160,250]]); c.boundLabel("vbp","conv-vbp",-8,-10,"end");
      j("conv-ibias","ibias",50,350); w("ibias","conv-ibias","XMB1.G"); c.boundLabel("ibias","conv-ibias",-8,-10,"end");
      j("conv-vss","vss",100,430); w("vss","XMB1.S","conv-vss"); c.boundLabel("vss","conv-vss",-8,-10,"end");
    },
  };
}
