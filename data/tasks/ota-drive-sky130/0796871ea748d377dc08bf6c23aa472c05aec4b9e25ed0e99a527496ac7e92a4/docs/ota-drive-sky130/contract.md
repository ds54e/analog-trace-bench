# OTA-DRIVE-SKY130

Native qualification is recorded in [the evidence summary](../../reports/ota-drive-sky130/qualification/summary.json).
The [specification](../../specs/ota-drive-sky130.json) defines numerical requirements.
The [measurement contract](measurement.md) defines extraction. The operator-only
verification definition remains outside participant packets. No starting design
or reference result is supplied. Use only the declared pinned SKY130 MOS family
and positive R/C, with the free-netlist interface in the specification.

This application prioritizes driving 20–50 pF at high speed, allowing more supply power and device area.
Topology choice is free and is not scored. All required checks apply to the same
frozen circuit. Exploration has no case limit and a 90-minute design deadline. Reference qualification must pass the full matrix before
participant registration. Failed/invalid/missing measurements cannot pass.
