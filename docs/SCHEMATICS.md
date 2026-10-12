# Submitted circuit drawings

Two pilot traces include a transistor-level drawing inside **Final submission**,
above the complete submitted SPICE:

- OTA-FIXED / Opus 5.5 / Run 1 (`ota-fixed-sky130-opus-5-5-r1`).
- LDO-CORE / Sonnet 5.5 / Run 1 (`ldo-core-sky130-sonnet-5-5-r1`).

The diagrams are derived documentation. Recorded fragments, submission bytes,
evaluation reports and historical results remain authoritative. There is no new
simulation. The LDO's C1–RZ branch connects G to VIN; it is not redrawn as
output-connected Miller compensation.

## Drawing and review

Use [human-readable-analog-schematics](../skills/human-readable-analog-schematics/SKILL.md)
and its references. An agent reads the actual circuit, identifies functional
groups and authors its placement and routing. The pilot recipes are specific to
these circuits; they do not automatically arrange arbitrary netlists.

The site uses SVG images, with a white drawing surface in both color themes.
On narrow screens the focusable drawing region scrolls horizontally to retain
readable labels. A full-size SVG link opens the complete diagram. Each drawing
also has a device table containing ordered pins, models, W/L, nf and m. Hidden
MOS body ties are documented and checked against the cell defaults. Crossings
without a dot are unconnected; the LDO's main feedback path uses green as an
additional visual aid.

`site/schematics/<run-id>/` holds:

| File | Purpose |
| :--- | :--- |
| `schematic.svg` | Native render of the saved and reopened project. |
| `project.icproj.json` | Editable Analog Canvas project; use the editor's project import. |
| `submitted.spice` | Exact decoded bytes of the frozen final submission. |
| `exported.spice` | Structural SPICE exported from the reopened project. |
| `verification.json` | Native comparison, visible routing, body/display checks and diagnostics. |

Passive value labels are generated literal annotations, including `M` for mega.
SPICE values retain their original semantics (`meg` or numeric notation).
These labels do not automatically follow later GUI edits. Regenerate their text
from saved parameters when editing an exploratory copy. The checked-in generator
recreates the frozen benchmark circuits, not subsequent GUI changes.

## Reproduce the pilot artifacts

Normal site builds consume the saved assets using only Python; Analog Canvas is
needed only for drawing and regeneration. The native runtime is pinned to
`cascode-ai/analog-canvas` commit
`37bccd4012764dce53b34927fa606c6f430296a2` (0.9.2). Use Node 24+ and pnpm 11.16+.
The dependency checkout belongs in the ignored cache, not as a project checkout
or a separate worktree:

```sh
git clone https://github.com/cascode-ai/analog-canvas.git .cache/analog-canvas
git -C .cache/analog-canvas checkout --detach 37bccd4012764dce53b34927fa606c6f430296a2
cd .cache/analog-canvas
pnpm install --frozen-lockfile --ignore-scripts --store-dir /tmp/atb-pnpm-store --config.cache-dir=/tmp/atb-pnpm-cache
cd ../..
node tools/schematics/generate.mjs
python3 tools/build_site.py
python3 tools/check_site.py
python3 -m unittest discover -s tests -v
```

Skip clone/checkout when the prepared cache already exists at that revision.
The generation command overwrites only the two pilot artifact directories and
the drawing index. A different native checkout path can be passed as its first
argument. `native-bridge.ts` exposes the pinned native import, project, render,
netlist, connectivity and diagnostic APIs to the recipe through a local bundle.
No gallery login, publication or PDK installation is required.

Generation imports the submitted source, places native symbols and authors
explicit routes. It checks every non-body terminal's visible connectivity,
body defaults, orthogonal routes, reopened passive display values, native
unrouted connections and diagnostics. It exports and compares ordered ports,
ordered device pins, model identities and parameters against the source. Both
pilots have matching comparisons, zero unrouted connections and zero native
diagnostics. Visual review remains a separate gate: inspect SVG at normal and
close reading sizes, then inspect the actual page at desktop and mobile widths.

The pinned runtime's default export moves supply ports to the front. Its
comparison has one port-order difference for each pilot, with equal topology
and parameters; this is recorded separately in `verification.json`. The supplied
`exported.spice` uses `{format: 'spice', groundPin: 'global'}` and matches the
original ordered interface. Use that checked export for comparisons rather than
assuming an ordinary GUI export preserves port order.

## Site integration and adding another run

`site/schematics/index.json` binds each drawing to its run and submitted SHA-256,
with hashes for every artifact. `tools/schematics.py` verifies those hashes,
checks the supported SPICE contract independently, and inserts the diagram and
device table during `build_traces.py`. Canonical `content/traces/` fragments are
not edited. A stale source, changed artifact, mismatched export or unknown run
fails the build. Portable site exports copy all artifacts as well.

For another run, author and review its native project using the drawing skill,
retain the source/export/verification artifacts and register the verified entry.
Extend the generator if a reproducible recipe is needed. The independent parser
currently supports only the pilot structural subset: one subcircuit, reviewed
SKY130 four-terminal X calls, and numeric R/C values and parameters. Hierarchy,
expressions and other device types require deliberate support before registering
such a drawing; unsupported constructs fail instead of silently passing.

Publishing the website remains a separate manual action.
