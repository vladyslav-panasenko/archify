// Tokens bind asynchronous work to the source document and exact draft.
export function createRequestGeneration() {
  let generation = 0;
  return {
    invalidate() { generation++; },
    begin(identity, text) { return { generation: ++generation, identity, text }; },
    current(ticket, identity, text) {
      return ticket.generation === generation && ticket.identity === identity && ticket.text === text;
    },
  };
}
