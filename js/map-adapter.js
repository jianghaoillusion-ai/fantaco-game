/** Isolated draft boundary. Replace only this loader when main publishes data/map.json. */
export async function loadMapData(fetchJSON) {
  return fetchJSON('data/map-regions-draft.json');
}
