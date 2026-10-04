# LDO-ALWAYS-ON-SKY130

Native qualification is recorded in [the evidence summary](../../reports/ldo-always-on-sky130/qualification/summary.json).
The [specification](../../specs/ldo-always-on-sky130.json) defines numerical requirements.
The [measurement contract](measurement.md) defines extraction. The operator-only
verification definition remains outside participant packets. No starting design
or reference result is supplied. Use only the declared pinned SKY130 MOS family
and positive R/C, with the free-netlist interface in the specification.

This application prioritizes small overhead at light loads, allowing slower responses and larger external decoupling.
Topology choice is free and is not scored. All required checks apply to the same
frozen circuit. Exploration has no case limit and a 90-minute design deadline. Reference qualification must pass the full matrix before
participant registration. Failed/invalid/missing measurements cannot pass.
