export function supportBundle({ session, document, errors = [], notice = "", userAgent = "" }) {
  return {
    format: "archify-editor-support-v1",
    createdAt: new Date().toISOString(),
    editorVersion: "0.1.0",
    environment: { userAgent },
    document: document ? {
      name: session?.name,
      diagramType: document.diagram_type,
      schemaVersion: document.schema_version,
      writable: Boolean(session?.writable),
      workspace: Boolean(session?.workspace),
      itemCount: [document.components, document.nodes, document.states, document.participants].find(Array.isArray)?.length || 0,
    } : { name: session?.name, unsupported: true },
    status: { notice, errors: errors.map((value) => String(value).slice(0, 2000)).slice(0, 20) },
    privacy: "Diagram labels, metadata, JSON content, filesystem paths, session tokens, recovery data and document revisions are excluded.",
  };
}
