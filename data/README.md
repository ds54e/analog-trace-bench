# Result evidence

[evidence.json](evidence.json) is the complete selected-trial catalog. It binds
each result to its public Release archive, SHA-256, model configuration, source
revision, independent verdict, timing, and [captured task definition](tasks/index.json).

Download and read original records using Python's standard library and the tools
in this public repository. See [Analysis](../docs/ANALYSIS.md) for exact commands,
schema-4 references, stream ordering, missing values and time interpretation.
Large original archives stay in Release assets and local ignored `evidence/`.
The website build uses committed sources and never needs the private repository.
