# Linked diagram publications

Use a publication when the reader needs multiple diagrams in one portable HTML,
including C4-like drill-down. It connects ordinary diagrams; it is not a C4 model,
semantic zoom, or inline expansion.

## Authoring

Keep a publication manifest beside or above its source JSON files. Sources and
the manifest's `output` are portable relative paths, resolved from the manifest
folder. Sources must remain inside that folder; traversal, absolute paths,
remote sources, and symlink escapes are rejected. An explicit CLI output
override resolves from the current working directory.

```json
{
  "schema_version": 1,
  "title": "Payments platform",
  "output": "payments.html",
  "initial_diagram": "overview",
  "diagrams": [
    {
      "id": "overview",
      "label": "System overview",
      "source": "overview.architecture.json",
      "c4_level": "Containers"
    },
    {
      "id": "payments",
      "label": "Payments internals",
      "source": "payments.architecture.json",
      "c4_level": "Components"
    }
  ],
  "links": [
    {
      "from": { "diagram": "overview", "component": "payments-api" },
      "to": { "diagram": "payments" }
    }
  ]
}
```

Read [the publication schema](../schemas/publication.schema.json) and
[the runnable example](../examples/web-app.publication.json) before authoring.
Every source remains a complete, independently valid ordinary diagram.

- Diagram IDs and source files must be unique. Tab order is manifest order.
- `initial_diagram` must identify a listed diagram.
- `c4_level` is an optional display label, not a hierarchy constraint.
- Component IDs are local to each diagram. `from.component` names a semantic
  node: an architecture component, workflow/dataflow/tree node, sequence
  participant, lifecycle state, ERD entity, class type, timeline event, or
  waterfall span.
- Each source component has at most one destination. Multiple components may
  share a destination, and navigation cycles are allowed.
- Version 1 supports up to 100 diagrams and 10,000 links. These are validation
  bounds, not recommended authoring targets.

## Build

```sh
node bin/archify.mjs publication publication.json --json
```

From a repository checkout:

```sh
node archify/bin/archify.mjs publication archify/examples/web-app.publication.json web-app-publication.html --json
```

The compiler validates every source and destination and runs the ordinary typed
renderers before publishing. Failures exit nonzero with `diagnostics[]` in JSON
mode. Existing output is preserved on validation or rendering failure. The
success receipt reports `output`, `diagramCount`, and `linkCount`; it is not a
`finalize` delivery receipt or a claim of visual acceptance.

Share the generated HTML alone. Editable sources require the manifest and its
referenced JSON files together. Rendering uses saved source files.

## Reading

Tabs expose every diagram. A linked node has an accessible arrow action and an
**Explore inside** button in its details panel. Ordinary node clicks still
select and explore the node; they do not navigate automatically.

Back and browser Back/Forward follow actual navigation, restoring the prior
reader selection, camera, and scroll position. There is no authored parent or
invented Up action. A direct shared address starts without a parent history.

Addresses use `#diagram=<id>&reader=<opaque native state>`. The publication's
Copy link action and native reader copy actions point to the publication, not
temporary reader URLs. Existing PNG/JPEG/WebP/SVG/WebM exports operate on the
active diagram. Navigation badges do not enter canonical diagram exports.
Combined multi-page export is outside version 1.

An editor's temporary Blob preview is not a shareable publication address.
Its publication Copy link action is disabled, and native copy actions fail
explicitly. Open the exported HTML from a file or HTTP(S) address to share links.

The publication packages sandboxed native readers and creates their local Blob
URLs lazily. It makes no network requests for navigation. Previously visited
readers stay loaded to preserve state; hidden readers suspend motion without
changing the reader's saved Live/Still preference. Consequently HTML size and
visited-reader memory grow with the number and complexity of diagrams.

Shell controls use the initial diagram's Viewer locale; each native reader keeps
its own locale. Standalone diagram generation remains unchanged.
