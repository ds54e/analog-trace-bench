/** Reviewed direct-pass LDO motifs. Each admitted frozen submission has the
 * same complete seven-MOS core and three passives, with an optional VOUT-FB
 * capacitor. Compensation, translated inputs, output-fed bias and the accepted
 * pilot remain on their own source-specific recipes. */
import { createHash } from "node:crypto";

const reviewedSources = {
  "ldo-always-on-sky130-astra-r1": {
    "sourceSha256": "61eed336f602f60125d9eb4777a8220d5f3d932ff212c7b9c0b1842709193578",
    "roles": {
      "pass": "XPPASS",
      "mirror_load": "XPM2",
      "mirror_diode": "XPM1",
      "reference_input": "XNIN2",
      "feedback_input": "XNIN1",
      "tail": "XNTAIL",
      "bias_diode": "XNBIAS"
    },
    "nets": {
      "pass_gate": "gate",
      "mirror": "n1",
      "reference_input": "vref",
      "feedback_input": "fb",
      "tail": "tail",
      "bias": "nb"
    },
    "cff": true
  },
  "ldo-always-on-sky130-sol-6-1-r1": {
    "sourceSha256": "d6bd1a255ee93a938265ecaf48fbfea213e4a4f146db135bfebf2aaf0e234a87",
    "roles": {
      "pass": "XPASS",
      "mirror_load": "XPM",
      "mirror_diode": "XPD",
      "reference_input": "XREF",
      "feedback_input": "XFB",
      "tail": "XTAIL",
      "bias_diode": "XBN"
    },
    "nets": {
      "pass_gate": "pg",
      "mirror": "nd",
      "reference_input": "vref",
      "feedback_input": "fb",
      "tail": "ns",
      "bias": "bn"
    },
    "cff": true
  },
  "ldo-always-on-sky130-opus-5-5-r2": {
    "sourceSha256": "206ae333350c120e01396117592325f72add3063d7ba5878b6b368694f797a90",
    "roles": {
      "pass": "XMP",
      "mirror_load": "XM4",
      "mirror_diode": "XM3",
      "reference_input": "XM2",
      "feedback_input": "XM1",
      "tail": "XMT1",
      "bias_diode": "XMNB"
    },
    "nets": {
      "pass_gate": "g",
      "mirror": "d1",
      "reference_input": "vref",
      "feedback_input": "fb",
      "tail": "tail",
      "bias": "nb"
    },
    "cff": true
  },
  "ldo-quiet-sky130-sol-6-r2": {
    "sourceSha256": "3ec18cbc21c806c7c1d9f7e40416f3fa67ac356686d116e1a8a734c802cdca82",
    "roles": {
      "pass": "XPASS",
      "mirror_load": "XPLOAD2",
      "mirror_diode": "XPLOAD1",
      "reference_input": "XNIN2",
      "feedback_input": "XNIN1",
      "tail": "XNTAIL",
      "bias_diode": "XNBIAS"
    },
    "nets": {
      "pass_gate": "g",
      "mirror": "na",
      "reference_input": "vref",
      "feedback_input": "fb",
      "tail": "st",
      "bias": "nb"
    },
    "cff": true
  },
  "ldo-always-on-sky130-sonnet-5-5-r1": {
    "sourceSha256": "7c439cede06ec2660a410a9ebcb8c64b6515b3779c3f5b517f90421702bfe4d1",
    "roles": {
      "pass": "XMP",
      "mirror_load": "XM4",
      "mirror_diode": "XM3",
      "reference_input": "XM2",
      "feedback_input": "XM1",
      "tail": "XMT",
      "bias_diode": "XMB"
    },
    "nets": {
      "pass_gate": "x",
      "mirror": "a",
      "reference_input": "vref",
      "feedback_input": "fb",
      "tail": "tl",
      "bias": "nb"
    },
    "cff": false
  },
  "ldo-always-on-sky130-deepseek-r3": {
    "sourceSha256": "d39e4d45809a0c1f375b4d8872d0c04dd359ce1d45d9b492c2c79f22c4bd1f6c",
    "roles": {
      "pass": "XPASS",
      "mirror_load": "XM4",
      "mirror_diode": "XM3",
      "reference_input": "XM2",
      "feedback_input": "XM1",
      "tail": "XM5",
      "bias_diode": "XM6"
    },
    "nets": {
      "pass_gate": "vg",
      "mirror": "n3",
      "reference_input": "vref",
      "feedback_input": "fb",
      "tail": "nt",
      "bias": "nb"
    },
    "cff": false
  },
  "ldo-always-on-sky130-haiku-r1": {
    "sourceSha256": "9551ed1629b192e382193254504b66c5e19e84879c72b12b479f93bc73d1eb0a",
    "roles": {
      "pass": "XMP",
      "mirror_load": "XM4",
      "mirror_diode": "XM3",
      "reference_input": "XM2",
      "feedback_input": "XM1",
      "tail": "XM5",
      "bias_diode": "XM6"
    },
    "nets": {
      "pass_gate": "vg",
      "mirror": "na",
      "reference_input": "vref",
      "feedback_input": "vfb",
      "tail": "vs",
      "bias": "vb"
    },
    "cff": false
  },
  "ldo-always-on-sky130-haiku-r2": {
    "sourceSha256": "2afd3833599e520283365c2fab0d7ca6feeb9c9410f0a02702ac6b23d188b4c5",
    "roles": {
      "pass": "XMP",
      "mirror_load": "XM4",
      "mirror_diode": "XM3",
      "reference_input": "XM2",
      "feedback_input": "XM1",
      "tail": "XMT",
      "bias_diode": "XMB"
    },
    "nets": {
      "pass_gate": "nout",
      "mirror": "nd1",
      "reference_input": "vref",
      "feedback_input": "fb",
      "tail": "nt",
      "bias": "nb"
    },
    "cff": false
  },
  "ldo-always-on-sky130-haiku-r3": {
    "sourceSha256": "ecf5b0630b633269ba65f8f031cdf5d64d690b976e25ed9d4b15abf59646b820",
    "roles": {
      "pass": "XMP",
      "mirror_load": "XM4",
      "mirror_diode": "XM3",
      "reference_input": "XM2",
      "feedback_input": "XM1",
      "tail": "XM5",
      "bias_diode": "XMB"
    },
    "nets": {
      "pass_gate": "gate",
      "mirror": "d1",
      "reference_input": "vref",
      "feedback_input": "fb",
      "tail": "tail",
      "bias": "bias"
    },
    "cff": false
  },
  "ldo-quiet-sky130-luna-6-r3": {
    "sourceSha256": "4a908d420e01466bfd84e57785a1e75968bb5e6bcaaaa2fa52d3bc9d46f09d1d",
    "roles": {
      "pass": "XPASS",
      "mirror_load": "XMP2",
      "mirror_diode": "XMP1",
      "reference_input": "XM2",
      "feedback_input": "XM1",
      "tail": "XNT",
      "bias_diode": "XNB"
    },
    "nets": {
      "pass_gate": "drv",
      "mirror": "ndl",
      "reference_input": "vref",
      "feedback_input": "vfb",
      "tail": "ntail",
      "bias": "nbias"
    },
    "cff": false
  },
  "ldo-quiet-sky130-haiku-r1": {
    "sourceSha256": "307fd46360e8625fec75121ec9e553bf617b4a3bbebbb1b1aa4a98d96f4c417f",
    "roles": {
      "pass": "XMP",
      "mirror_load": "XP2",
      "mirror_diode": "XP1",
      "reference_input": "XM2",
      "feedback_input": "XM1",
      "tail": "XMT",
      "bias_diode": "XNB"
    },
    "nets": {
      "pass_gate": "vg",
      "mirror": "nd1",
      "reference_input": "vref",
      "feedback_input": "vfb",
      "tail": "pt",
      "bias": "vbn"
    },
    "cff": false
  },
  "ldo-quiet-sky130-haiku-r2": {
    "sourceSha256": "6ab899cbb7fd0d613109d702ac070969fde563a6eeb2b1c346fa9e9a27806acf",
    "roles": {
      "pass": "XMP",
      "mirror_load": "XM4",
      "mirror_diode": "XM3",
      "reference_input": "XM2",
      "feedback_input": "XM1",
      "tail": "XM5",
      "bias_diode": "XM6"
    },
    "nets": {
      "pass_gate": "gate",
      "mirror": "n1",
      "reference_input": "vref",
      "feedback_input": "fb",
      "tail": "nt",
      "bias": "nb"
    },
    "cff": false
  }
};

export function directPassLdoMotif(id, source, ds) {
  const admitted = reviewedSources[id];
  if (!admitted) return null;
  const hash = createHash("sha256").update(source).digest("hex");
  if (hash !== admitted.sourceSha256)
    throw Error("Changed source requires fresh direct-pass motif review: " + id);
  const byRef = new Map(ds.map(d => [d.ref, d]));
  const role = name => byRef.get(admitted.roles[name]);
  const n = admitted.nets;
  const samePins = (d, kind, pins) => d?.kind === kind &&
    JSON.stringify(d.pins) === JSON.stringify(pins);
  const expected = {
    pass: ["p", ["vout", n.pass_gate, "vin", "vin"]],
    mirror_load: ["p", [n.pass_gate, n.mirror, "vin", "vin"]],
    mirror_diode: ["p", [n.mirror, n.mirror, "vin", "vin"]],
    reference_input: ["n", [n.pass_gate, "vref", n.tail, "vss"]],
    feedback_input: ["n", [n.mirror, n.feedback_input, n.tail, "vss"]],
    tail: ["n", [n.tail, n.bias, "vss", "vss"]],
    bias_diode: ["n", [n.bias, n.bias, "vss", "vss"]],
  };
  if (!Object.entries(expected).every(([key, [kind, pins]]) =>
      samePins(role(key), kind, pins)))
    throw Error("Direct-pass motif ordered-pin guard failed: " + id);
  const findPassive = (kind, a, b) => ds.find(d => d.kind === kind &&
    d.pins.length === 2 && d.pins.includes(a) && d.pins.includes(b));
  const biasR = findPassive("r", "vin", n.bias);
  const highR = findPassive("r", "vout", n.feedback_input);
  const lowR = findPassive("r", n.feedback_input, "vss");
  const cff = findPassive("c", "vout", n.feedback_input);
  const all = [...Object.keys(expected).map(role), biasR, highR, lowR,
    ...(admitted.cff ? [cff] : [])];
  if (all.some(d => !d) || new Set(all).size !== ds.length ||
      ds.length !== (admitted.cff ? 11 : 10) || Boolean(cff) !== admitted.cff)
    throw Error("Direct-pass motif complete passive guard failed: " + id);
  const ref = key => role(key).ref;
  const devices = {
    [ref("bias_diode")]: [120, 400, "horizontal"], [biasR.ref]: [110, 280],
    [ref("mirror_diode")]: [310, 140, "horizontal"],
    [ref("mirror_load")]: [450, 140],
    [ref("feedback_input")]: [290, 280],
    [ref("reference_input")]: [470, 280, "horizontal"],
    [ref("tail")]: [370, 400], [ref("pass")]: [620, 220],
    [highR.ref]: [630, 380, highR.pins[0] === "vout" ? 0 : 180],
    [lowR.ref]: [630, 520, lowR.pins[0] === n.feedback_input ? 0 : 180],
  };
  if (cff) devices[cff.ref] = [510, 380, cff.pins[0] === "vout" ? 0 : 180];
  const pin = (d, net) => d.ref + "." + (d.pins[0] === net ? 1 : 2);
  return {
    id, strategy: "connected-ldo", devices,
    ports: { VIN: [70, 60], VSS: [70, 580], VREF: [580, 280, 180], VOUT: [710, 290, 180] },
    continuousNets: [...new Set(ds.flatMap(d => d.pins)
      .filter(net => !["vin", "vss"].includes(net)))].sort(),
    title: "Transistor-level LDO regulator",
    description: "Direct-pass LDO with a centered mirror-loaded error amplifier, nearby diode bias and output-divider feedback.",
    body_note: "NFET bodies → VSS; PFET bodies → VIN. Exact source devices, bulk defaults and parameters are retained in the native project.",
    draw(c) {
      const j = (key, net, x, y) => c.j(key, net, x, y);
      const w = (net, a, b, bends = []) => c.w(net, a, b, bends);
      const terminal = (key, pin) => ref(key) + "." + pin;
      for (const [key,x] of [["vin-bias",110],["vin-left",300],["vin-right",460],["vin-pass",630]]) j(key,"vin",x,60);
      w("vin","@VIN","vin-bias"); w("vin","vin-bias","vin-left");
      w("vin","vin-left","vin-right"); w("vin","vin-right","vin-pass");
      w("vin","vin-bias",pin(biasR,"vin")); w("vin","vin-left",terminal("mirror_diode","S"));
      w("vin","vin-right",terminal("mirror_load","S")); w("vin","vin-pass",terminal("pass","S"));
      c.boundLabel("vin","vin-bias",-40,-14,"middle");
      for (const [key,x] of [["vss-bias",110],["vss-tail",380],["vss-sense",630]]) j(key,"vss",x,580);
      w("vss","@VSS","vss-bias"); w("vss","vss-bias","vss-tail"); w("vss","vss-tail","vss-sense");
      w("vss",terminal("bias_diode","S"),"vss-bias"); w("vss",terminal("tail","S"),"vss-tail");
      w("vss",pin(lowR,"vss"),"vss-sense");
      c.boundLabel("vss","vss-bias",-40,-14,"middle");
      // The gate-row crossing is in the shared trunk's open middle, separated
      // from the local diode closure, rather than suggesting a BIAS junction.
      j("bias-drain",n.bias,110,350); j("bias-dg",n.bias,170,400);
      w(n.bias,pin(biasR,n.bias),"bias-drain"); w(n.bias,"bias-drain",terminal("bias_diode","D"));
      w(n.bias,"bias-drain","bias-dg",[[170,350]]); w(n.bias,terminal("bias_diode","G"),"bias-dg");
      w(n.bias,"bias-dg",terminal("tail","G"));
      j("mirror-drain",n.mirror,300,210); j("mirror-gates",n.mirror,360,140);
      w(n.mirror,terminal("mirror_diode","D"),"mirror-drain");
      w(n.mirror,"mirror-drain",terminal("feedback_input","D"));
      w(n.mirror,terminal("mirror_diode","G"),"mirror-gates");
      w(n.mirror,"mirror-gates",terminal("mirror_load","G"));
      w(n.mirror,"mirror-gates","mirror-drain",[[360,210]]);
      for (const [key,x] of [["tail-left",300],["tail-center",380],["tail-right",460]]) j(key,n.tail,x,340);
      w(n.tail,terminal("feedback_input","S"),"tail-left"); w(n.tail,"tail-left","tail-center");
      w(n.tail,"tail-center","tail-right"); w(n.tail,"tail-right",terminal("reference_input","S"));
      w(n.tail,"tail-center",terminal("tail","D"));
      j("gate-drain",n.pass_gate,460,220);
      w(n.pass_gate,terminal("mirror_load","D"),"gate-drain");
      w(n.pass_gate,"gate-drain",terminal("reference_input","D"));
      w(n.pass_gate,"gate-drain",terminal("pass","G"));
      w("vref","@VREF",terminal("reference_input","G"));
      j("out-port","vout",630,290); j("out-sense","vout",630,330);
      w("vout",terminal("pass","D"),"out-port"); w("vout","out-port","@VOUT");
      w("vout","out-port","out-sense"); w("vout","out-sense",pin(highR,"vout"));
      j("fb-divider",n.feedback_input,630,450); j("fb-return",n.feedback_input,510,450);
      w(n.feedback_input,pin(highR,n.feedback_input),"fb-divider");
      w(n.feedback_input,"fb-divider",pin(lowR,n.feedback_input));
      w(n.feedback_input,"fb-divider","fb-return");
      w(n.feedback_input,"fb-return",terminal("feedback_input","G"),[[510,500],[240,500],[240,280]]);
      if (cff) {
        w("vout","out-sense",pin(cff,"vout"),[[510,330]]);
        w(n.feedback_input,pin(cff,n.feedback_input),"fb-return");
      }
    },
  };
}
