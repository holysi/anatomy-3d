import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

// Loads real BodyParts3D STL bones (CC BY-SA 2.1 JP). All files share the
// BodyParts3D world coordinate space, so they self-align relative to each other.
// We load them into one group, then normalize (orient up, scale, recenter) to
// fit the scene roughly where the schematic body stands.

const TARGET_HEIGHT = 1.95; // scene units, head-to-toe
const CENTER_Y = 0.62;      // vertical center placement in scene

export async function loadRealModel(partIndex) {
  const res = await fetch('./assets/models/manifest.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`manifest.json: ${res.status}`);
  const manifest = await res.json();

  const loader = new STLLoader();
  const inner = new THREE.Group();           // raw STL, BodyParts3D coords
  const meshMap = new Map();                  // partId -> Mesh[]

  const boneMat = () => new THREE.MeshStandardMaterial({
    color: 0xe8dcc0, roughness: 0.65, metalness: 0.05,
    emissive: 0x6b5a3a, emissiveIntensity: 0.0,
  });

  await Promise.all(manifest.models.map(async (m) => {
    const geo = await loader.loadAsync(`./assets/models/${m.file}`);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, boneMat());
    mesh.castShadow = true;
    mesh.userData.partId = m.part;
    mesh.userData.real = true;
    inner.add(mesh);
    if (!meshMap.has(m.part)) meshMap.set(m.part, []);
    meshMap.get(m.part).push(mesh);
  }));

  // ── Orient: bring the longest bbox axis (body height) to +Y ──
  let box = new THREE.Box3().setFromObject(inner);
  let size = box.getSize(new THREE.Vector3());
  const longest = size.x >= size.y && size.x >= size.z ? 'x'
                : size.z >= size.y ? 'z' : 'y';
  if (longest === 'z') inner.rotation.x = -Math.PI / 2;       // Z-up -> Y-up
  else if (longest === 'x') inner.rotation.z = Math.PI / 2;   // X-up -> Y-up
  inner.rotation.y = Math.PI; // face +Z (BodyParts3D anterior convention)

  // Wrap so we can scale/translate after orientation bakes into world matrix
  const group = new THREE.Group();
  group.add(inner);
  group.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(group);
  size = box.getSize(new THREE.Vector3());
  const scale = TARGET_HEIGHT / size.y;
  group.scale.setScalar(scale);
  group.updateMatrixWorld(true);

  // Recenter to (0, CENTER_Y, 0) — applied last so the model sits on the axis
  box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.set(-center.x, CENTER_Y - center.y, -center.z);

  group.visible = false; // starts hidden; toggled on demand
  return { group, meshMap, count: manifest.models.length };
}
