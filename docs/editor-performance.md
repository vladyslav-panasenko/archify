# Large-diagram benchmark

Run `npm run bench` from `editor`. The deterministic sparse service maps contain 100, 500 and 1,000 nodes, with one labeled connection per adjacent service. Each result is the median of seven local runs. Projection includes cloning a fresh source document; other operations reuse the same immutable input. This is a computation benchmark, not an end-to-end frame-rate measurement.

Measured on Windows / Node 24.11.1 during F51:

| Nodes | Label placement before (20 labels, ms) | After (ms) |
| ----- | -------------------------------------- | ---------- |
| 100   | 3.426                                  | 1.450      |
| 500   | 55.698                                 | 7.011      |
| 1,000 | 199.316                                | 13.527     |

The previous algorithm tested every candidate against every box before sorting valid candidates. The new algorithm sorts candidates by distance and stops at the first collision-free point. Stable candidate ordering preserves ties and exact placement; regression tests compare it with the exhaustive algorithm on 50 deterministic layouts. No diagram fields change. Dense pathological layouts may still require testing many candidates.

The 1,000-node projection remained around 1.1 ms and diagnostics around 1.0 ms, so those paths were left intact. Browser coverage imports a 500-service document, edits one service, verifies unrelated services/connections and undoes the edit. Machine load and browser rendering costs vary; these figures are not performance guarantees.

For F131, no remaining measured browser computation crossed the threshold that would justify worker startup, message-copy, cancellation and revision-reconciliation cost. Compiler rendering and batch export already run in child processes behind abort signals; workspace indexing runs in the local Node server. The editor therefore keeps the measured projection and label paths synchronous and revision-safe. A worker should be introduced only when the repeatable benchmark or browser trace shows interaction work exceeding a frame budget; it must then carry the document revision and discard late results, matching render-request behavior.
