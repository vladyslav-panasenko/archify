# Archify Local Editor 0.1.0 acceptance record

This record is the human sign-off surface for F122, F126, F140, and F149. Automated evidence prepares these decisions but does not replace the named reviewers required by the backlog.

## Candidate identity

| Item | Value |
| --- | --- |
| Editor version | `0.1.0` |
| Implementation commit | `eefbd57192db71c24ac0dd84e6d7ef09c456945a` |
| Package | `release/archify-local-editor-0.1.0.tgz` |
| Package size | 1,340,628 bytes |
| SHA-256 | `4F138210FA6D192EEF3BDDBA7040633A673B3A27B03C55D61679480917B1D877` |
| Prepared | 2026-09-14 |

The combined release suite passed 85 Node tests, the Vite production build, the 1,000-node benchmark, and 73 Playwright tests. The fresh 1,000-node medians were 1.114 ms projection, 1.001 ms diagnostics, 0.011 ms movement, and 13.007 ms for 20 label placements. A production-dependency `npm audit --omit=dev --audit-level=high` query returned zero known vulnerabilities on 2026-09-14. These results apply to this candidate only.

Before a review session, verify the SHA-256, extract the package outside the checkout, run `npm ci`, and start it with `npm start`. Record the operating system, Node version, browser or assistive technology version, reviewer, date, findings, and outcome below. A failed workflow or unresolved material barrier keeps its gate open.

## F122 — assistive-technology acceptance

Complete this gate with at least one screen-reader user and one keyboard-only pass. Use a supported Chromium-family browser and a real screen reader such as Narrator, NVDA, VoiceOver, or Orca.

1. Start at the top of the page, use the skip link, reach the diagram, and identify its type and current selection.
2. Open a starter without a pointer. Select one item, extend the selection, inspect it, move it, undo, and redo.
3. Create an item, create or select a connection, edit a supported label, and understand validation feedback.
4. Open JSON, introduce a blocking error, locate its path and canvas subject, repair it, and apply the JSON.
5. Save, render, move between open documents, close a dirty document safely, and restore a recovery record.
6. At 200% text zoom and a 390-pixel-wide viewport, open and dismiss navigation and panels without a focus trap.
7. Confirm that drag announcements are useful without flooding speech and that every precision action has a keyboard control.

| Field | Record |
| --- | --- |
| Reviewer and relevant experience | Pending |
| OS / browser / screen reader | Pending |
| Date | Pending |
| Workflows completed | Pending |
| Barriers and issue links | Pending |
| Outcome (`Accepted` or `Rejected`) | Pending |

## F126 — representative-user and product acceptance

Use at least two people who represent intended local JSON-editor users. Give them the goals below without step-by-step UI instructions; observe where they hesitate, fail, or need explanation.

1. Find and open a workspace document, make a visual change, validate it, save it, and render HTML.
2. Create one document from a starter, add and connect content, use undo/redo, and export canonical JSON.
3. Use one non-architecture schema and complete one schema-specific operation such as lane reassignment, stage reorder, message-range shift, or lifecycle transition editing.
4. Recover from invalid JSON or a save conflict without losing the last valid source.
5. Find a shortcut or constraint in Help, export a support bundle, and explain what data it excludes.

| Field | Record |
| --- | --- |
| User 1 / role | Pending |
| User 2 / role | Pending |
| OS / browser / Node versions | Pending |
| Completed tasks and observed barriers | Pending |
| Issues resolved or explicitly accepted | Pending |
| Product owner / date | Pending |
| Outcome (`Accepted` or `Rejected`) | Pending |

## F140 — independent security and legal acceptance

The reviewer must be independent of the implementation. Review the local-server boundary in `docs/editor-release.md`, `SECURITY.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, the packaged file list, and these residual risks:

- The process can read and write within the user-selected file or workspace; users must choose a trusted workspace.
- Imported diagrams and templates are untrusted input. Size, depth, path, origin, URL, render, and iframe controls reduce exposure but are not a general-purpose content sandbox.
- The server is designed for loopback use and is not an authenticated multi-user service.
- Browser printing controls PDF layout; fonts and pagination can vary by browser and platform.
- Recovery, history, templates, and preferences use local browser storage and inherit its confidentiality, quota, and deletion behavior.
- Only Windows 11, Node 24, and bundled Chromium have recorded automated evidence for this candidate. Broader platform claims need their matrix rows completed or narrowed before approval.
- The lockfile reports MIT, Apache-2.0, ISC, and BSD-3-Clause packages. The package includes the project license and third-party notices; counsel or the accountable owner must accept the distribution obligations.

| Field | Record |
| --- | --- |
| Security reviewer / qualification | Pending |
| Legal or license reviewer / authority | Pending |
| Review date | Pending |
| Findings and issue links | Pending |
| Accepted residual risks | Pending |
| Distribution obligations accepted | Pending |
| Outcome (`Accepted` or `Rejected`) | Pending |

## F149 — release ownership and support policy

The recommended policy for this local `0.1.x` product is:

- Publish the source and versioned `.tgz` through this repository's GitHub Releases.
- Support the latest stable `0.1.x` release on the platform combinations explicitly marked verified in `docs/editor-release.md`.
- Handle ordinary defects through the repository issue tracker on a best-effort basis, without an SLA or guaranteed backports.
- Handle suspected vulnerabilities through GitHub private vulnerability reporting as defined in `SECURITY.md`.
- Ask users for a reviewed support bundle first; diagram files are attached only with the user's explicit choice.
- Publish fixes as a new versioned artifact. Do not replace an existing artifact under the same version.
- The named release owner decides severity, communication, rollback, support-window changes, and when a candidate is promoted.

| Field | Record |
| --- | --- |
| Release owner | Pending |
| Distribution channel | Recommended: GitHub Releases |
| Supported platform rows | Pending |
| Support window / response commitment | Recommended: latest stable, best effort, no SLA |
| Ordinary issue contact | Recommended: repository issue tracker |
| Security incident contact | Recommended: GitHub private vulnerability reporting |
| Accepted deviations from this policy | None recorded |
| Final approval and date | Pending |

## Closure rule

The release is signed off only when all four outcomes are `Accepted`, every reviewer and date field is complete, material findings are resolved or explicitly accepted, the package hash still matches, and the release owner approves the exact candidate. If code or packaged dependencies change, create a new candidate identity and rerun affected reviews.
