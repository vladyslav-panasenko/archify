# Editor schema capability inventory

Generated from the five schemas by `editor/scripts/generate-capability-inventory.mjs`. Regenerate with `npm run inventory`. “Visual” means the editor exposes a form, canvas gesture, or structure control. “JSON” means the field is preserved and editable in the validated JSON panel, with compiler output as the authority.

## architecture

| Schema field | Editing mode |
| --- | --- |
| `/boundaries` | JSON |
| `/boundaries/*/kind` | Visual + JSON |
| `/boundaries/*/label` | Visual + JSON |
| `/boundaries/*/pad` | Visual + JSON |
| `/boundaries/*/wraps` | Visual + JSON |
| `/cards` | JSON |
| `/cards/*/dot` | JSON |
| `/cards/*/items` | JSON |
| `/cards/*/title` | JSON |
| `/components` | JSON |
| `/components/*/brand` | Visual + JSON |
| `/components/*/col` | Visual + JSON |
| `/components/*/icon` | JSON |
| `/components/*/id` | Visual + JSON |
| `/components/*/label` | Visual + JSON |
| `/components/*/ports` | JSON |
| `/components/*/ports/*/id` | JSON |
| `/components/*/ports/*/label` | JSON |
| `/components/*/ports/*/offset` | JSON |
| `/components/*/ports/*/side` | JSON |
| `/components/*/pos` | Visual + JSON |
| `/components/*/row` | Visual + JSON |
| `/components/*/size` | Visual + JSON |
| `/components/*/sources` | JSON |
| `/components/*/sources/*/end_line` | JSON |
| `/components/*/sources/*/label` | JSON |
| `/components/*/sources/*/line` | JSON |
| `/components/*/sources/*/path` | JSON |
| `/components/*/sublabel` | Visual + JSON |
| `/components/*/tag` | Visual + JSON |
| `/components/*/type` | Visual + JSON |
| `/connections` | JSON |
| `/connections/*/from` | Visual + JSON |
| `/connections/*/fromPort` | JSON |
| `/connections/*/fromSide` | Visual + JSON |
| `/connections/*/id` | Visual + JSON |
| `/connections/*/label` | Visual + JSON |
| `/connections/*/labelAt` | Visual + JSON |
| `/connections/*/labelDx` | JSON |
| `/connections/*/labelDy` | JSON |
| `/connections/*/labelSegment` | JSON |
| `/connections/*/route` | Visual + JSON |
| `/connections/*/to` | Visual + JSON |
| `/connections/*/toPort` | JSON |
| `/connections/*/toSide` | Visual + JSON |
| `/connections/*/variant` | JSON |
| `/connections/*/via` | Visual + JSON |
| `/connections/*/width` | JSON |
| `/diagram_type` | JSON |
| `/layout` | JSON |
| `/layout/cellH` | JSON |
| `/layout/cellW` | JSON |
| `/layout/cols` | JSON |
| `/layout/gapX` | JSON |
| `/layout/gapY` | JSON |
| `/layout/mode` | JSON |
| `/layout/origin` | JSON |
| `/meta` | JSON |
| `/meta/animation` | Visual + JSON |
| `/meta/engineering_profile` | JSON |
| `/meta/legend` | JSON |
| `/meta/legend/entries` | JSON |
| `/meta/legend/entries/backend` | JSON |
| `/meta/legend/entries/backend/label` | JSON |
| `/meta/legend/entries/backend/visible` | JSON |
| `/meta/legend/entries/cloud` | JSON |
| `/meta/legend/entries/cloud/label` | JSON |
| `/meta/legend/entries/cloud/visible` | JSON |
| `/meta/legend/entries/database` | JSON |
| `/meta/legend/entries/database/label` | JSON |
| `/meta/legend/entries/database/visible` | JSON |
| `/meta/legend/entries/external` | JSON |
| `/meta/legend/entries/external/label` | JSON |
| `/meta/legend/entries/external/visible` | JSON |
| `/meta/legend/entries/frontend` | JSON |
| `/meta/legend/entries/frontend/label` | JSON |
| `/meta/legend/entries/frontend/visible` | JSON |
| `/meta/legend/entries/messagebus` | JSON |
| `/meta/legend/entries/messagebus/label` | JSON |
| `/meta/legend/entries/messagebus/visible` | JSON |
| `/meta/legend/entries/security` | JSON |
| `/meta/legend/entries/security/label` | JSON |
| `/meta/legend/entries/security/visible` | JSON |
| `/meta/legend/mode` | JSON |
| `/meta/locale` | Visual + JSON |
| `/meta/output` | Visual + JSON |
| `/meta/quality_profile` | Visual + JSON |
| `/meta/repository` | JSON |
| `/meta/repository/link_mode` | JSON |
| `/meta/repository/provider` | JSON |
| `/meta/repository/revision` | JSON |
| `/meta/repository/url` | JSON |
| `/meta/subtitle` | Visual + JSON |
| `/meta/title` | Visual + JSON |
| `/meta/translations` | JSON |
| `/meta/viewBox` | Visual + JSON |
| `/meta/views` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/focus` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/id` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/label` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/note` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/visual_preset` | Visual + JSON |
| `/schema_version` | JSON |

## workflow

| Schema field | Editing mode |
| --- | --- |
| `/cards` | JSON |
| `/cards/*/dot` | JSON |
| `/cards/*/items` | JSON |
| `/cards/*/title` | JSON |
| `/diagram_type` | JSON |
| `/edges` | JSON |
| `/edges/*/bias` | JSON |
| `/edges/*/channelX` | JSON |
| `/edges/*/channelY` | JSON |
| `/edges/*/from` | Visual + JSON |
| `/edges/*/fromSide` | Visual + JSON |
| `/edges/*/id` | Visual + JSON |
| `/edges/*/label` | Visual + JSON |
| `/edges/*/labelAt` | Visual + JSON |
| `/edges/*/labelDx` | JSON |
| `/edges/*/labelDy` | JSON |
| `/edges/*/labelSegment` | JSON |
| `/edges/*/role` | JSON |
| `/edges/*/route` | Visual + JSON |
| `/edges/*/to` | Visual + JSON |
| `/edges/*/toSide` | Visual + JSON |
| `/edges/*/variant` | JSON |
| `/edges/*/via` | Visual + JSON |
| `/edges/*/width` | JSON |
| `/groups` | JSON |
| `/groups/*/fromCol` | JSON |
| `/groups/*/id` | JSON |
| `/groups/*/label` | Visual + JSON |
| `/groups/*/lane` | Visual + JSON |
| `/groups/*/toCol` | JSON |
| `/groups/*/variant` | JSON |
| `/lanes` | JSON |
| `/lanes/*/id` | Visual + JSON |
| `/lanes/*/label` | Visual + JSON |
| `/lanes/*/variant` | JSON |
| `/mainPath` | JSON |
| `/meta` | JSON |
| `/meta/animation` | Visual + JSON |
| `/meta/legend` | JSON |
| `/meta/legend/entries` | JSON |
| `/meta/legend/entries/backend` | JSON |
| `/meta/legend/entries/backend/label` | JSON |
| `/meta/legend/entries/backend/visible` | JSON |
| `/meta/legend/entries/cloud` | JSON |
| `/meta/legend/entries/cloud/label` | JSON |
| `/meta/legend/entries/cloud/visible` | JSON |
| `/meta/legend/entries/database` | JSON |
| `/meta/legend/entries/database/label` | JSON |
| `/meta/legend/entries/database/visible` | JSON |
| `/meta/legend/entries/external` | JSON |
| `/meta/legend/entries/external/label` | JSON |
| `/meta/legend/entries/external/visible` | JSON |
| `/meta/legend/entries/frontend` | JSON |
| `/meta/legend/entries/frontend/label` | JSON |
| `/meta/legend/entries/frontend/visible` | JSON |
| `/meta/legend/entries/messagebus` | JSON |
| `/meta/legend/entries/messagebus/label` | JSON |
| `/meta/legend/entries/messagebus/visible` | JSON |
| `/meta/legend/entries/security` | JSON |
| `/meta/legend/entries/security/label` | JSON |
| `/meta/legend/entries/security/visible` | JSON |
| `/meta/legend/mode` | JSON |
| `/meta/locale` | Visual + JSON |
| `/meta/output` | Visual + JSON |
| `/meta/quality_profile` | Visual + JSON |
| `/meta/repository` | JSON |
| `/meta/repository/link_mode` | JSON |
| `/meta/repository/provider` | JSON |
| `/meta/repository/revision` | JSON |
| `/meta/repository/url` | JSON |
| `/meta/subtitle` | Visual + JSON |
| `/meta/title` | Visual + JSON |
| `/meta/translations` | JSON |
| `/meta/viewBox` | Visual + JSON |
| `/meta/views` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/focus` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/id` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/label` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/note` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/visual_preset` | Visual + JSON |
| `/nodes` | JSON |
| `/nodes/*/brand` | Visual + JSON |
| `/nodes/*/col` | Visual + JSON |
| `/nodes/*/height` | Visual + JSON |
| `/nodes/*/icon` | JSON |
| `/nodes/*/id` | Visual + JSON |
| `/nodes/*/label` | Visual + JSON |
| `/nodes/*/lane` | Visual + JSON |
| `/nodes/*/sources` | JSON |
| `/nodes/*/sources/*/end_line` | JSON |
| `/nodes/*/sources/*/label` | JSON |
| `/nodes/*/sources/*/line` | JSON |
| `/nodes/*/sources/*/path` | JSON |
| `/nodes/*/sublabel` | Visual + JSON |
| `/nodes/*/tag` | Visual + JSON |
| `/nodes/*/type` | Visual + JSON |
| `/nodes/*/width` | Visual + JSON |
| `/nodes/*/yOffset` | Visual + JSON |
| `/phases` | JSON |
| `/phases/*/fromCol` | JSON |
| `/phases/*/id` | JSON |
| `/phases/*/label` | JSON |
| `/phases/*/toCol` | JSON |
| `/phases/*/variant` | JSON |
| `/schema_version` | JSON |
| `/semanticChecks` | JSON |
| `/semanticChecks/allowedRoots` | JSON |
| `/semanticChecks/allowedTerminals` | JSON |
| `/semanticChecks/requiredEdges` | JSON |
| `/semanticChecks/requiredEdges/*/from` | JSON |
| `/semanticChecks/requiredEdges/*/to` | JSON |
| `/semanticChecks/requiredPaths` | JSON |
| `/semanticChecks/requiredPaths/*/from` | JSON |
| `/semanticChecks/requiredPaths/*/to` | JSON |

## dataflow

| Schema field | Editing mode |
| --- | --- |
| `/cards` | JSON |
| `/cards/*/dot` | JSON |
| `/cards/*/items` | JSON |
| `/cards/*/title` | JSON |
| `/diagram_type` | JSON |
| `/flows` | JSON |
| `/flows/*/channelX` | JSON |
| `/flows/*/channelY` | JSON |
| `/flows/*/classification` | JSON |
| `/flows/*/from` | Visual + JSON |
| `/flows/*/fromSide` | Visual + JSON |
| `/flows/*/id` | Visual + JSON |
| `/flows/*/label` | Visual + JSON |
| `/flows/*/labelAt` | Visual + JSON |
| `/flows/*/labelDx` | JSON |
| `/flows/*/labelDy` | JSON |
| `/flows/*/labelSegment` | JSON |
| `/flows/*/route` | Visual + JSON |
| `/flows/*/to` | Visual + JSON |
| `/flows/*/toSide` | Visual + JSON |
| `/flows/*/variant` | JSON |
| `/flows/*/via` | Visual + JSON |
| `/flows/*/width` | JSON |
| `/meta` | JSON |
| `/meta/animation` | Visual + JSON |
| `/meta/legend` | JSON |
| `/meta/legend/entries` | JSON |
| `/meta/legend/entries/dashed` | JSON |
| `/meta/legend/entries/dashed/label` | JSON |
| `/meta/legend/entries/dashed/visible` | JSON |
| `/meta/legend/entries/database` | JSON |
| `/meta/legend/entries/database/label` | JSON |
| `/meta/legend/entries/database/visible` | JSON |
| `/meta/legend/entries/default` | JSON |
| `/meta/legend/entries/default/label` | JSON |
| `/meta/legend/entries/default/visible` | JSON |
| `/meta/legend/entries/emphasis` | JSON |
| `/meta/legend/entries/emphasis/label` | JSON |
| `/meta/legend/entries/emphasis/visible` | JSON |
| `/meta/legend/entries/security` | JSON |
| `/meta/legend/entries/security/label` | JSON |
| `/meta/legend/entries/security/visible` | JSON |
| `/meta/legend/mode` | JSON |
| `/meta/locale` | Visual + JSON |
| `/meta/output` | Visual + JSON |
| `/meta/quality_profile` | Visual + JSON |
| `/meta/repository` | JSON |
| `/meta/repository/link_mode` | JSON |
| `/meta/repository/provider` | JSON |
| `/meta/repository/revision` | JSON |
| `/meta/repository/url` | JSON |
| `/meta/subtitle` | Visual + JSON |
| `/meta/title` | Visual + JSON |
| `/meta/translations` | JSON |
| `/meta/viewBox` | Visual + JSON |
| `/meta/views` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/focus` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/id` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/label` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/note` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/visual_preset` | Visual + JSON |
| `/nodes` | JSON |
| `/nodes/*/brand` | Visual + JSON |
| `/nodes/*/height` | Visual + JSON |
| `/nodes/*/icon` | JSON |
| `/nodes/*/id` | Visual + JSON |
| `/nodes/*/label` | Visual + JSON |
| `/nodes/*/row` | Visual + JSON |
| `/nodes/*/sources` | JSON |
| `/nodes/*/sources/*/end_line` | JSON |
| `/nodes/*/sources/*/label` | JSON |
| `/nodes/*/sources/*/line` | JSON |
| `/nodes/*/sources/*/path` | JSON |
| `/nodes/*/stage` | Visual + JSON |
| `/nodes/*/sublabel` | Visual + JSON |
| `/nodes/*/tag` | Visual + JSON |
| `/nodes/*/type` | Visual + JSON |
| `/nodes/*/width` | Visual + JSON |
| `/nodes/*/yOffset` | Visual + JSON |
| `/schema_version` | JSON |
| `/stages` | JSON |
| `/stages/*/label` | Visual + JSON |

## lifecycle

| Schema field | Editing mode |
| --- | --- |
| `/cards` | JSON |
| `/cards/*/dot` | JSON |
| `/cards/*/items` | JSON |
| `/cards/*/title` | JSON |
| `/diagram_type` | JSON |
| `/mainPath` | Visual + JSON |
| `/meta` | JSON |
| `/meta/animation` | Visual + JSON |
| `/meta/legend` | JSON |
| `/meta/legend/entries` | JSON |
| `/meta/legend/entries/active` | JSON |
| `/meta/legend/entries/active/label` | JSON |
| `/meta/legend/entries/active/visible` | JSON |
| `/meta/legend/entries/decision` | JSON |
| `/meta/legend/entries/decision/label` | JSON |
| `/meta/legend/entries/decision/visible` | JSON |
| `/meta/legend/entries/external` | JSON |
| `/meta/legend/entries/external/label` | JSON |
| `/meta/legend/entries/external/visible` | JSON |
| `/meta/legend/entries/failure` | JSON |
| `/meta/legend/entries/failure/label` | JSON |
| `/meta/legend/entries/failure/visible` | JSON |
| `/meta/legend/entries/neutral` | JSON |
| `/meta/legend/entries/neutral/label` | JSON |
| `/meta/legend/entries/neutral/visible` | JSON |
| `/meta/legend/entries/start` | JSON |
| `/meta/legend/entries/start/label` | JSON |
| `/meta/legend/entries/start/visible` | JSON |
| `/meta/legend/entries/success` | JSON |
| `/meta/legend/entries/success/label` | JSON |
| `/meta/legend/entries/success/visible` | JSON |
| `/meta/legend/entries/waiting` | JSON |
| `/meta/legend/entries/waiting/label` | JSON |
| `/meta/legend/entries/waiting/visible` | JSON |
| `/meta/legend/mode` | JSON |
| `/meta/locale` | Visual + JSON |
| `/meta/output` | Visual + JSON |
| `/meta/quality_profile` | Visual + JSON |
| `/meta/repository` | JSON |
| `/meta/repository/link_mode` | JSON |
| `/meta/repository/provider` | JSON |
| `/meta/repository/revision` | JSON |
| `/meta/repository/url` | JSON |
| `/meta/subtitle` | Visual + JSON |
| `/meta/title` | Visual + JSON |
| `/meta/translations` | JSON |
| `/meta/views` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/focus` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/id` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/label` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/note` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/visual_preset` | Visual + JSON |
| `/schema_version` | JSON |
| `/states` | JSON |
| `/states/*/brand` | Visual + JSON |
| `/states/*/icon` | JSON |
| `/states/*/id` | Visual + JSON |
| `/states/*/label` | Visual + JSON |
| `/states/*/sources` | JSON |
| `/states/*/sources/*/end_line` | JSON |
| `/states/*/sources/*/label` | JSON |
| `/states/*/sources/*/line` | JSON |
| `/states/*/sources/*/path` | JSON |
| `/states/*/step` | Visual + JSON |
| `/states/*/sublabel` | Visual + JSON |
| `/states/*/tag` | Visual + JSON |
| `/states/*/type` | Visual + JSON |
| `/transitions` | JSON |
| `/transitions/*/from` | Visual + JSON |
| `/transitions/*/id` | Visual + JSON |
| `/transitions/*/label` | Visual + JSON |
| `/transitions/*/note` | JSON |
| `/transitions/*/to` | Visual + JSON |
| `/transitions/*/variant` | JSON |

## sequence

| Schema field | Editing mode |
| --- | --- |
| `/activations` | JSON |
| `/activations/*/from` | Visual + JSON |
| `/activations/*/participant` | Visual + JSON |
| `/activations/*/to` | Visual + JSON |
| `/activations/*/type` | JSON |
| `/cards` | JSON |
| `/cards/*/dot` | JSON |
| `/cards/*/items` | JSON |
| `/cards/*/title` | JSON |
| `/diagram_type` | JSON |
| `/messages` | JSON |
| `/messages/*/from` | Visual + JSON |
| `/messages/*/id` | Visual + JSON |
| `/messages/*/label` | Visual + JSON |
| `/messages/*/note` | JSON |
| `/messages/*/to` | Visual + JSON |
| `/messages/*/variant` | JSON |
| `/messages/*/y` | Visual + JSON |
| `/meta` | JSON |
| `/meta/animation` | Visual + JSON |
| `/meta/column_fit` | Visual + JSON |
| `/meta/legend` | JSON |
| `/meta/legend/entries` | JSON |
| `/meta/legend/entries/dashed` | JSON |
| `/meta/legend/entries/dashed/label` | JSON |
| `/meta/legend/entries/dashed/visible` | JSON |
| `/meta/legend/entries/default` | JSON |
| `/meta/legend/entries/default/label` | JSON |
| `/meta/legend/entries/default/visible` | JSON |
| `/meta/legend/entries/emphasis` | JSON |
| `/meta/legend/entries/emphasis/label` | JSON |
| `/meta/legend/entries/emphasis/visible` | JSON |
| `/meta/legend/entries/return` | JSON |
| `/meta/legend/entries/return/label` | JSON |
| `/meta/legend/entries/return/visible` | JSON |
| `/meta/legend/entries/security` | JSON |
| `/meta/legend/entries/security/label` | JSON |
| `/meta/legend/entries/security/visible` | JSON |
| `/meta/legend/mode` | JSON |
| `/meta/locale` | Visual + JSON |
| `/meta/output` | Visual + JSON |
| `/meta/quality_profile` | Visual + JSON |
| `/meta/repository` | JSON |
| `/meta/repository/link_mode` | JSON |
| `/meta/repository/provider` | JSON |
| `/meta/repository/revision` | JSON |
| `/meta/repository/url` | JSON |
| `/meta/subtitle` | Visual + JSON |
| `/meta/title` | Visual + JSON |
| `/meta/translations` | JSON |
| `/meta/viewBox` | Visual + JSON |
| `/meta/views` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/focus` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/id` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/label` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/views/*/note` | Unsupported by Archify 3.1.0; read-only source |
| `/meta/visual_preset` | Visual + JSON |
| `/participants` | JSON |
| `/participants/*/brand` | Visual + JSON |
| `/participants/*/icon` | JSON |
| `/participants/*/id` | Visual + JSON |
| `/participants/*/label` | Visual + JSON |
| `/participants/*/sources` | JSON |
| `/participants/*/sources/*/end_line` | JSON |
| `/participants/*/sources/*/label` | JSON |
| `/participants/*/sources/*/line` | JSON |
| `/participants/*/sources/*/path` | JSON |
| `/participants/*/sublabel` | Visual + JSON |
| `/participants/*/type` | Visual + JSON |
| `/schema_version` | JSON |
| `/segments` | JSON |
| `/segments/*/from` | Visual + JSON |
| `/segments/*/label` | Visual + JSON |
| `/segments/*/to` | Visual + JSON |

## Operations and explicit limits

| Operation | Support |
| --- | --- |
| Open, validate, edit, undo/redo, recovery, canonical JSON export, compiler check/render | All five current types; lifecycle requires v3 |
| Free positioning, resizing, route waypoints and endpoint sides | Architecture where represented by its schema; lifecycle geometry is automatic |
| Lane/stage/state/participant/message/range structure | Visual controls use each constrained type's native fields; lifecycle uses states/transitions/mainPath |
| Fields without a visual control | Validated JSON editing; preserved by visual edits |
| Guided views/story, legacy lifecycle, unknown diagram type, schema version, field, or invalid construct | Read-only original-source view with download; visual editing, migration, direct save and render are blocked |
| Required meta.output | New documents use diagram.html; existing documents are not defaulted or migrated on open/save |
| Schema migration | Explicit preview/apply only; ordinary open/save never upgrades a document |
| Persisted ports | Architecture v2 supports component ports and connection port references |
| Inferred runtime topology | Unsupported; topology remains authored |
| Editor preferences, recovery, tabs, locks, filters and viewport | Local session/project state; excluded from exported diagram JSON |
