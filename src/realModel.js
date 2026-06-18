import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

// Loads real BodyParts3D STL files (CC BY-SA 2.1 JP). All files share the
// BodyParts3D world coordinate space, so they self-align relative to each other.
// We load them into one group, then normalize (orient up, scale, recenter) to
// fit the scene roughly where the schematic body stands.

const TARGET_HEIGHT = 1.95; // scene units, head-to-toe
const CENTER_Y = 0.62;      // vertical center placement in scene

// ── Per-region bone colors (skeleton layer) ──────────────────────────────────
const REGION_MAT = {
  head_neck:  { color: 0xf5e8d3, emissive: 0x604020 },  // ivory
  trunk:      { color: 0xe8d5b0, emissive: 0x5a3a1a },  // warm cream
  upper_limb: { color: 0xd4bc88, emissive: 0x503010 },  // golden beige
  lower_limb: { color: 0xc8aa70, emissive: 0x482808 },  // amber beige
  systemic:   { color: 0xd0be98, emissive: 0x503820 },
};

// ── Per-layer colors (non-skeleton) ──────────────────────────────────────────
const LAYER_MAT = {
  muscle:  { color: 0xb03020, roughness: 0.6, metalness: 0.0, emissive: 0x601008 },
  ligament:{ color: 0xd0820a, roughness: 0.5, metalness: 0.0, emissive: 0x703008 },
  joint:   { color: 0x4070c8, roughness: 0.4, metalness: 0.1, emissive: 0x182850 },
};

function makeMat(partId, partIndex) {
  const part = partIndex?.get(partId);
  const layer  = part?.layer  || 'skeleton';
  const region = part?.region || 'trunk';

  if (layer !== 'skeleton' && LAYER_MAT[layer]) {
    const cfg = LAYER_MAT[layer];
    return new THREE.MeshStandardMaterial({
      color: cfg.color, roughness: cfg.roughness, metalness: cfg.metalness,
      emissive: cfg.emissive, emissiveIntensity: 0.0,
      transparent: true, opacity: 0.92,
    });
  }

  const cfg = REGION_MAT[region] || REGION_MAT.trunk;
  return new THREE.MeshStandardMaterial({
    color: cfg.color, roughness: 0.65, metalness: 0.05,
    emissive: cfg.emissive, emissiveIntensity: 0.0,
  });
}

export async function loadRealModel(partIndex) {
  const res = await fetch('./assets/models/manifest.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`manifest.json: ${res.status}`);
  const manifest = await res.json();

  const loader = new STLLoader();
  const inner = new THREE.Group();     // raw STL, BodyParts3D coords
  const meshMap = new Map();            // partId -> Mesh[]

  await Promise.all(manifest.models.map(async (m) => {
    const geo = await loader.loadAsync(`./assets/models/${m.file}`);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, makeMat(m.part, partIndex));
    mesh.castShadow = true;
    mesh.userData.partId = m.part;
    mesh.userData.real = true;
    inner.add(mesh);
    if (!meshMap.has(m.part)) meshMap.set(m.part, []);
    meshMap.get(m.part).push(mesh);
  }));

  // ── Orient: bring the longest bbox axis (body height) to +Y ──────────────
  // BodyParts3D uses Z as body height, feet at +Z and head at -Z.
  // Rx(+π/2): -Z→+Y (head up), anterior +Y→+Z (faces camera).
  let box = new THREE.Box3().setFromObject(inner);
  let size = box.getSize(new THREE.Vector3());
  const longest = size.x >= size.y && size.x >= size.z ? 'x'
                : size.z >= size.y ? 'z' : 'y';
  if (longest === 'z') {
    // BodyParts3D: head at +Z, feet at -Z, anterior at +Y.
    // Rx(-π/2): +Z→+Y (head up), -Z→-Y (feet down), +Y→-Z (anterior).
    // Ry(π): flips anterior from -Z to +Z so it faces the camera.
    inner.rotation.x = -Math.PI / 2;
    inner.rotation.y = Math.PI;
  } else if (longest === 'x') {
    inner.rotation.z = Math.PI / 2;
    inner.rotation.y = Math.PI;
  } else {
    inner.rotation.y = Math.PI;
  }

  // Wrap so we can scale/translate after orientation bakes into world matrix
  const group = new THREE.Group();
  group.add(inner);
  group.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(group);
  size = box.getSize(new THREE.Vector3());
  const scale = TARGET_HEIGHT / size.y;
  group.scale.setScalar(scale);
  group.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.set(-center.x, CENTER_Y - center.y, -center.z);

  group.visible = false;
  return { group, meshMap, count: manifest.models.length };
}
