export const publicationText = (manifest) => JSON.stringify(manifest, null, 2) + "\n";

export function publicationNodes(document) {
  const collections = { architecture: "components", workflow: "nodes", sequence: "participants", dataflow: "nodes", lifecycle: "states", erd: "entities", tree: "nodes", class: "types", timeline: "events", waterfall: "spans" };
  return document?.[collections[document?.diagram_type]] || [];
}

export function newPublication(entry) {
  return {
    schema_version: 1,
    title: "New publication",
    output: "publication.html",
    initial_diagram: entry.id,
    diagrams: [entry],
    links: [],
  };
}

export function removePublicationDiagram(manifest, id) {
  if (manifest.diagrams.length <= 1)
    throw new Error("A publication must retain at least one diagram.");
  const diagrams = manifest.diagrams.filter((entry) => entry.id !== id);
  return {
    ...manifest,
    diagrams,
    initial_diagram: manifest.initial_diagram === id ? diagrams[0].id : manifest.initial_diagram,
    links: manifest.links.filter((link) => link.from.diagram !== id && link.to.diagram !== id),
  };
}

export function movePublicationDiagram(manifest, id, direction) {
  const diagrams = [...manifest.diagrams], index = diagrams.findIndex((entry) => entry.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= diagrams.length) return manifest;
  [diagrams[index], diagrams[next]] = [diagrams[next], diagrams[index]];
  return { ...manifest, diagrams };
}

export function setPublicationLink(manifest, diagram, component, target) {
  const links = manifest.links.filter((link) => link.from.diagram !== diagram || link.from.component !== component);
  if (target) links.push({ from: { diagram, component }, to: { diagram: target } });
  return { ...manifest, links };
}

export function publicationSourcesClean(diagrams, drafts) {
  return !diagrams.some((entry) => drafts.some((draft) => draft.id === entry.workspaceId && draft.dirty));
}
