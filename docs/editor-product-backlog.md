# Editor product completion backlog

Updated 2026-09-13. Planning list only: every item below is **Proposed**, with no implementation authorized by this document. F01–F60 remain recorded as implemented in the [feature index](editor-features.md), [refinement backlog](editor-refinement-backlog.md), [precision backlog](editor-precision-backlog.md), and [workflow backlog](editor-workflow-backlog.md).

The finished core product is a reliable local editor for all five Archify diagram types: **JSON → visual editing → JSON → Archify HTML rendering**. Unknown fields and source versions survive editing. Editor preferences stay outside exported JSON. Constrained diagram types use their native placement rules. These rows extend or verify existing capabilities; they do not reset completed features to unfinished.

**Scope:** Release = required before declaring the local product finished; Next = professional editing improvements that can ship later; Optional = separate product expansion, not a release requirement. Verification items may close without code changes when existing behavior already satisfies them. Proposed work still needs selection and prioritization before implementation.

**Can GPT-5.6 Sol implement it?** **Yes** means a bounded implementation with clear acceptance criteria. **Yes, split/review** means Sol can implement it in smaller tasks with design decisions and independent review. **No, human-owned** means completion requires human judgment, real users, credentials, or external acceptance; Sol can prepare supporting work. These are engineering estimates, not measured guarantees or official per-feature ratings. [OpenAI's GPT-5.6 Sol documentation](https://developers.openai.com/api/docs/models/gpt-5.6-sol) documents coding-related tool support; successful delivery still depends on task scope and verification.

## Release integration and document integrity

| ID | Feature or completion task | Complete when | Scope | Sol |
| --- | --- | --- | --- | --- |
| F61 | F53–F60 integration closure | Run the combined regression/build checks, review interactions and responsive layouts, fix confirmed regressions, and record batch evidence. | Release | Yes |
| F62 | Five-schema capability inventory | Map every supported schema field and operation to visual editing, JSON-only editing, or an explicit unsupported explanation. | Release | Yes |
| F63 | Lossless editing contract | Fixtures prove unknown metadata, IDs, versions, optional fields, and unrelated routing survive each supported edit/save round trip. | Release | Yes, split/review |
| F64 | Unsupported and future schema handling | Unknown versions or unsupported constructs open with clear limitations; unsafe edits are blocked without discarding source data. | Release | Yes, split/review |
| F65 | Explicit schema migration | Supported version upgrades show a diff, retain a recoverable original, and never occur implicitly during ordinary saving. | Next | Yes, split/review |
| F66 | Consistent validation severity | Separate blocking errors from warnings; JSON paths and canvas subjects agree, including document-level errors. | Release | Yes |
| F67 | Schema boundary coverage | Exercise minimums, maximums, empty optional collections, Unicode, duplicate IDs, malformed references, and extreme geometry for all types. | Release | Yes, split/review |
| F68 | Canonical export contract | Document and verify normalization, omitted/default fields, encoding, newline behavior, and editor-metadata exclusion. | Release | Yes |

## Everyday canvas editing

| ID | Feature or completion task | Complete when | Scope | Sol |
| --- | --- | --- | --- | --- |
| F69 | Complete inline-label interaction | Extend existing inline labels with keyboard entry, visible validation, documented blur behavior, and supported connection-label editing. | Next | Yes |
| F70 | Discoverable navigation controls | Verify or add zoom percentage, reset/fit controls, shortcut hints, and predictable zoom around the pointer. | Release | Yes |
| F71 | Large-diagram overview | Add an optional minimap with viewport navigation, selection indication, and a keyboard equivalent. | Next | Yes |
| F72 | Selection tools and overlap cycling | Make marquee, add/remove selection, select-all-visible, and cycling through overlapping items predictable and documented. | Next | Yes |
| F73 | Temporary visibility filters | Filter by type, text, or connection neighborhood without deleting JSON; hidden selections and reset state remain clear. | Next | Yes |
| F74 | Drag-resizable panels | Extend width controls with bounded mouse/keyboard dividers and restore defaults across supported window sizes. | Next | Yes |
| F75 | Context-action completeness | Audit node, connection, boundary, multiselection, and background actions; explain disabled actions and preserve focus. | Next | Yes |
| F76 | Cross-document clipboard | Paste compatible selections between documents with fresh IDs, remapped references, and explicit handling of external dependencies. | Next | Yes, split/review |
| F77 | Constrained-type bulk editing | Extend shared-property edits and duplication where each schema permits; show mixed values and reject invalid compound operations atomically. | Next | Yes, split/review |
| F78 | Predictable selection after edits | Create, duplicate, delete, undo, redo, and source replacement leave a visible, valid selection and sensible keyboard focus. | Release | Yes |
| F79 | Touch and pen support | Supported devices can select, pan, zoom, and move without browser-gesture conflicts; precision actions retain accessible alternatives. | Next | Yes, split/review |
| F80 | Customizable shortcuts | Detect shortcut conflicts, offer a reset, and keep preferences outside diagram JSON. | Next | Yes |

## Connections, boundaries, and layout

| ID | Feature or completion task | Complete when | Scope | Sol |
| --- | --- | --- | --- | --- |
| F81 | Orthogonal route authoring | Extend waypoint tools with bend insertion/removal and endpoint-segment editing using only supported route fields. | Next | Yes, split/review |
| F82 | Obstacle-aware routing | Preview bounded deterministic route changes around boxes and respect locked/manual routes; failed routing leaves the document unchanged. | Next | Yes, split/review |
| F83 | Parallel edges and self-loops | Selection, handles, labels, and supported route edits remain usable for repeated endpoint pairs and self-connections. | Release | Yes, split/review |
| F84 | Attachment editing completeness | Expose all schema-supported endpoint attachment fields; do not invent persisted ports the compiler cannot read. | Next | Yes, split/review |
| F85 | Batch connection properties | Change shared supported connection properties with mixed-value feedback and one undo step. | Next | Yes |
| F86 | Boundary membership by gesture | Preview add/remove membership and explain positional effects before committing; preserve valid references and support cancellation. | Next | Yes, split/review |
| F87 | Layout-preview consistency | Layout, routing, insertion, and overlap previews use action-specific wording and consistent apply/cancel, selection, and busy rules. | Release | Yes |
| F88 | Layout failure diagnostics | Explain pinned obstacles, dense-search limits, and unrepresentable placements; offer bounded alternatives without partial writes. | Next | Yes |
| F89 | Label collision refinement | Detect overlapping labels and preview selected-label placement changes without moving unrelated elements. | Next | Yes, split/review |
| F90 | Preset portability | Import/export validated layout presets with versioning, bounded size, duplicate-name choices, and no diagram mutation. | Next | Yes |

## Diagram-type authoring completeness

| ID | Feature or completion task | Complete when | Scope | Sol |
| --- | --- | --- | --- | --- |
| F91 | Workflow authoring parity | Close inventory-confirmed gaps in lane/column reorder, insertion, and reassignment with explicit effects on nodes and edges. | Release | Yes, split/review |
| F92 | Dataflow authoring parity | Close inventory-confirmed gaps in stage/row insertion and reorder while retaining valid flow references and native placement. | Release | Yes, split/review |
| F93 | Lifecycle authoring parity | Close inventory-confirmed gaps in state/transition and lane controls while respecting fixed bands and lifecycle rules. | Release | Yes, split/review |
| F94 | Sequence authoring parity | Verify participant reorder, message insertion, activation edits, and segment edits together; expose remaining supported fields. | Release | Yes, split/review |
| F95 | Sequence range operations | Preview shifting or duplicating a message range with activation/segment dependencies and schema-valid time ordering. | Next | Yes, split/review |
| F96 | Complete guided-view workflow | Preview authored focus sets, explain missing members, and verify saved views through the compiler. | Next | Yes |
| F97 | Templates for all diagram types | Provide validated starter templates for five types and insert compatible reusable structures with correct reference remapping. | Next | Yes, split/review |
| F98 | Template-library management | Name, organize, import/export, validate, and remove local templates with explicit replacement behavior and size limits. | Next | Yes |

## Files, workspaces, recovery, and history

| ID | Feature or completion task | Complete when | Scope | Sol |
| --- | --- | --- | --- | --- |
| F99 | Stable document identity | Drafts, preferences, and history cannot collide between equal filenames in different folders or unrelated imports. | Release | Yes, split/review |
| F100 | Workspace rename and move | Confined operations handle source revisions, existing destinations, active documents, and recovery-key migration explicitly. | Next | Yes, split/review |
| F101 | Workspace folder management | Create folders within the allowed root; show permission and path errors and reject traversal or unsafe symlink escapes. | Next | Yes, split/review |
| F102 | Recent files and quick switching | Search scoped workspace files and recent documents; preserve pending drafts and explain missing or malformed files. | Next | Yes |
| F103 | Multi-document tabs | Each tab has isolated selection, dirty state, history, recovery, and save status; closing cannot silently discard work. | Next | Yes, split/review |
| F104 | Workspace content search | Find IDs, labels, and supported metadata across files with bounded indexing and no silent file modification. | Next | Yes, split/review |
| F105 | Storage quota and recovery health | Explain disabled/full/corrupt local storage, show retained recovery limits, and offer an explicit backup before eviction. | Release | Yes, split/review |
| F106 | Recovery and checkpoint manager | Inspect dates/sizes, export or remove selected local recovery records, and adjust bounded retention without editing source JSON. | Next | Yes |
| F107 | Portable recovery bundle | Export/import draft and optional history/checkpoints with validation, privacy disclosure, collision handling, and versioning. | Next | Yes, split/review |
| F108 | Cross-tab edit coordination | Detect another editor writing the same document and require reconciliation instead of silently overwriting newer work. | Release | Yes, split/review |
| F109 | Save and conflict state-machine audit | Exercise duplicate saves, cancelled requests, stale responses, source switches, watcher failures, and unresolved merges. | Release | Yes, split/review |
| F110 | File-write failure recovery | Verify denied writes, full disk, interrupted replacement, and temporary-file cleanup preserve the last valid source or a recoverable copy. | Release | Yes, split/review |
| F111 | Persistent saved-session history | Optionally retain bounded history for clean saved documents, with clear expiry and validation against changed source files. | Next | Yes, split/review |
| F112 | Explicit project preferences | Share chosen defaults through an opt-in versioned project config while keeping machine-local state and diagram content separate. | Next | Yes, split/review |

## Compiler preview and delivery

| ID | Feature or completion task | Complete when | Scope | Sol |
| --- | --- | --- | --- | --- |
| F113 | Preview freshness contract | Identify the exact draft/revision rendered; show stale output and discard late results after newer edits or document switches. | Release | Yes, split/review |
| F114 | Cancellable render workflow | Bound render duration/output, allow cancellation, and surface actionable compiler failures without freezing editing. | Release | Yes, split/review |
| F115 | Canvas/compiler difference guidance | Explain intentional canvas differences and unsupported previews, with the compiler output as the final-render reference. | Release | Yes |
| F116 | Export options and offline output | Expose supported compiler HTML options and verify required assets work offline; identify any deliberate external dependencies. | Release | Yes, split/review |
| F117 | Image and PDF delivery | Add exports through supported compiler/browser capabilities with explicit page size, scale, font, and clipping behavior. | Next | Yes, split/review |
| F118 | Batch validation and export | Process selected workspace files with per-file results, cancellation, confined destinations, and explicit overwrite choices. | Next | Yes, split/review |

## Accessibility, guidance, and product polish

| ID | Feature or completion task | Complete when | Scope | Sol |
| --- | --- | --- | --- | --- |
| F119 | Keyboard-only workflow closure | Create, connect, arrange, validate, save, recover, and render representative documents without a mouse or focus traps. | Release | Yes, split/review |
| F120 | Accessible diagram structure | Expose useful item/connection relationships and change announcements without flooding assistive technology during dragging. | Release | Yes, split/review |
| F121 | Display accessibility closure | Verify high contrast, non-color cues, reduced motion, text zoom, focus visibility, and supported narrow layouts. | Release | Yes |
| F122 | Manual assistive-technology acceptance | Real screen-reader and keyboard users complete defined workflows; record and resolve observed barriers. | Release | No, human-owned |
| F123 | First-run sample gallery | Explain local files versus imports and offer editable examples for every diagram type without overwriting existing work. | Release | Yes |
| F124 | Contextual help and shortcut reference | Searchable help explains schema constraints, save/recovery behavior, route tools, and disabled actions where they occur. | Release | Yes |
| F125 | Error and empty-state consistency | Missing files, invalid JSON, disconnected server, empty workspace, and failed exports always offer a meaningful next action. | Release | Yes |
| F126 | User acceptance and product sign-off | Representative users complete core tasks; a product owner accepts usability tradeoffs and the release scope. | Release | No, human-owned |
| F127 | Localization readiness | Separate user-facing strings, handle Unicode labels and locale formatting, and define right-to-left limitations. | Next | Yes |
| F128 | Translated UI and documentation | Add selected languages with native-speaker review of editing terminology and layout. | Optional | Yes, split/review |

## Performance, maintainability, and security

| ID | Feature or completion task | Complete when | Scope | Sol |
| --- | --- | --- | --- | --- |
| F129 | Interaction performance budgets | Measure drag, selection, inspection, undo, validation, and render at agreed sparse/dense sizes; publish supported limits. | Release | Yes, split/review |
| F130 | Measured canvas optimization | Address demonstrated bottlenecks with indexing, memoization, or virtualization while preserving selection and keyboard behavior. | Next | Yes, split/review |
| F131 | Bounded background computation | Move proven expensive work off the interaction path with cancellation, revision checks, and deterministic results. | Next | Yes, split/review |
| F132 | Long-session memory and history audit | Profile repeated edits/switches, history serialization, and recovery writes; bound memory and eliminate confirmed leaks or stalls. | Release | Yes, split/review |
| F133 | Shared editing transactions | Consolidate mutation, validation, preview, history, and dirty-state rules so every operation commits once or cancels completely. | Next | Yes, split/review |
| F134 | Shared action capabilities | Use consistent availability rules across toolbar, keyboard, context actions, and inspector for all diagram types. | Next | Yes, split/review |
| F135 | Maintainable editor modules | Separate document sessions, canvas interaction, workspace I/O, and panels with explicit contracts and behavior-preserving tests. | Next | Yes, split/review |
| F136 | Local-server security boundary | Verify bind address, host/origin checks, cross-site write protection, and scoped file access against a documented threat model. | Release | Yes, split/review |
| F137 | Untrusted-content isolation | Audit imported labels, URLs, metadata, and generated HTML preview for script execution and unsafe navigation. | Release | Yes, split/review |
| F138 | Resource-exhaustion limits | Bound input depth/size, geometry work, render processes, diagnostic output, and template/recovery imports with actionable errors. | Release | Yes, split/review |
| F139 | Dependency and license inventory | Record dependency licenses, attribution, vulnerability handling, and reproducible lockfile installation. | Release | Yes |
| F140 | Independent security and legal acceptance | Qualified owners assess findings, distribution obligations, and residual risks; implementation assistance does not constitute certification. | Release | No, human-owned |

## Installation, verification, and release operations

| ID | Feature or completion task | Complete when | Scope | Sol |
| --- | --- | --- | --- | --- |
| F141 | Supported-platform matrix | Declare supported OS/browser/runtime versions and verify core workflows on each claimed combination. | Release | Yes, split/review |
| F142 | Clean-install smoke coverage | A clean machine can install, start, open/edit/save/render, and stop using documented commands without developer-only state. | Release | Yes, split/review |
| F143 | Reliable launcher and shutdown | Handle occupied ports, missing runtime, startup failures, browser opening, and graceful termination predictably. | Release | Yes |
| F144 | Reproducible release package | Produce versioned artifacts containing the required editor/compiler assets and verify them independently of the development checkout. | Release | Yes, split/review |
| F145 | Versioning and compatibility policy | Define editor/compiler compatibility, config/recovery migrations, release notes, upgrade instructions, and rollback limitations. | Release | Yes |
| F146 | Automated release checks | Run agreed unit/browser/build/package checks through a reproducible entry point; add hosted CI only when selected for the project. | Release | Yes |
| F147 | Regression fixture and visual coverage | Maintain representative diagrams and stable interaction/render checks; distinguish intentional visual changes from regressions. | Release | Yes, split/review |
| F148 | Troubleshooting and support bundle | Document recovery and file conflicts; export an opt-in diagnostic bundle with explicit content review and redaction. | Release | Yes |
| F149 | Release ownership and support policy | A human owner chooses support commitments, distribution channels, incident handling, and final release approval. | Release | No, human-owned |

## Optional product expansions

These require separate scope and architecture decisions. None is necessary to finish the local JSON editor.

**Local implementation status (0.2.0, 2026-09-15):** F150, F152, F156, F157, F160-F162, F165, and F166 are implemented as local-only capabilities. F151 has reproducible unsigned packaging, checksums, and detached-signature verification; release identities and signed install/update/rollback acceptance remain human-owned. F153-F155, F158-F159, F163, and F164 remain unimplemented because they require cloud storage, shared identity/collaboration, hosted operation or AI, or telemetry. See [Local product expansions](editor-local-expansions.md) for the delivered contracts and limitations.

| ID | Feature or completion task | Complete when | Scope | Sol |
| --- | --- | --- | --- | --- |
| F150 | Desktop application | Package a native launcher/window with scoped filesystem access, lifecycle management, and platform integration. | Optional | Yes, split/review |
| F151 | Signed installers and trusted updates | Owners provide signing identities and distribution accounts; signed installation, update, and rollback are verified on target systems. | Optional | No, human-owned |
| F152 | Browser-only offline edition | Define persistence/export limits without the local server and support offline editing with explicit compiler availability. | Optional | Yes, split/review |
| F153 | Cloud project storage | Add authenticated storage, ownership, quotas, backup/restore, conflict handling, and a migration path from local JSON. | Optional | Yes, split/review |
| F154 | Team permissions and sharing | Enforce project roles and revocable access on the server, including export and link-sharing policies. | Optional | Yes, split/review |
| F155 | Real-time collaboration | Define conflict semantics for topology/layout, presence, reconnect, offline work, and collaborative undo before implementing synchronization. | Optional | Yes, split/review |
| F156 | Comments and review workflow | Anchor comments to stable document subjects, track resolution, and handle deleted items without contaminating Archify JSON. | Optional | Yes, split/review |
| F157 | Server version history and audit | Record authorized changes and restore versions with retention, access control, and auditable administrative actions. | Optional | Yes, split/review |
| F158 | Enterprise identity and policy | Implement chosen SSO/provisioning and administrative controls against explicit identity-provider contracts. | Optional | Yes, split/review |
| F159 | Cloud operational readiness | Operators accept backup drills, monitoring, incident response, tenancy isolation, capacity, and privacy commitments. | Optional | No, human-owned |
| F160 | External diagram import/export | Implement selected formats with documented mappings, loss reports, stable IDs, and explicit acceptance of unsupported constructs. | Optional | Yes, split/review |
| F161 | Generated-source refinement workflow | Reapply explicit manual overrides to regenerated diagrams using stable IDs and conflict review; avoid inferred runtime topology. | Optional | Yes, split/review |
| F162 | Extension API | Define versioned, permission-scoped commands and schema adapters with failure isolation and compatibility tests. | Optional | Yes, split/review |
| F163 | AI-assisted editing proposals | Preview schema-valid JSON changes with bounded scope, data-sharing consent, cancellation, cost limits, and explicit apply/undo. | Optional | Yes, split/review |
| F164 | Optional usage research | Collect only explicitly approved, minimized signals with opt-out/deletion controls and a documented product question. | Optional | Yes, split/review |
| F165 | Domain-specific diagram packs | Add selected validated templates, themes, examples, and terminology without silently changing the core document contract. | Optional | Yes |
| F166 | New schema capabilities | Coordinate compiler and editor changes for requirements such as nested boundaries or persisted ports, including versioning and round-trip support. | Optional | Yes, split/review |
