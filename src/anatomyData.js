// Anatomy data is now stored in /data/anatomy.json (TA2/FMA-standard schema).
// This module loads it once and exposes parts / layers / regions / meta.
//
// Schema per part:
//   id, layer, region, fmaId, name_zh, name_en, name_la, parent, modeled,
//   desc_zh, desc_en, [acupoint_count, acupoints] (meridian only)

let _cache = null;

export async function loadAnatomyData() {
  if (_cache) return _cache;
  const res = await fetch('./data/anatomy.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load anatomy.json: ${res.status}`);
  const data = await res.json();
  _cache = {
    parts:   data.parts,
    layers:  data.layers,
    regions: data.regions,
    meta:    data.meta,
  };
  return _cache;
}
