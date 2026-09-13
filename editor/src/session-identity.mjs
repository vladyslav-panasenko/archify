// Imports have no canonical filesystem path. A filename is never an identity.
export function importedSession(session, document, name, id = crypto.randomUUID()) {
  return {
    token: session.token,
    workspace: session.workspace,
    document,
    name,
    writable: false,
    workspaceId: null,
    revision: null,
    recoveryKey: `import:${id}`,
  };
}
