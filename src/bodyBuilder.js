import * as THREE from 'three';

// Build layer materials from the layers config (loaded from anatomy.json)
export function createMaterials(layers) {
  const mats = {};
  for (const [key, cfg] of Object.entries(layers)) {
    mats[key] = new THREE.MeshPhongMaterial({
      color: new THREE.Color(cfg.color),
      emissive: new THREE.Color(cfg.emissive),
      emissiveIntensity: 0.3,
      shininess: 60,
      transparent: true,
      opacity: 0.88,
    });
  }
  return mats;
}

// Create a ghost body outline (semi-transparent skin reference)
export function createGhostBody(scene) {
  const mat = new THREE.MeshPhongMaterial({
    color: 0xc8a882,
    emissive: 0x3a2510,
    transparent: true,
    opacity: 0.08,
    side: THREE.FrontSide,
    depthWrite: false,
  });

  const addGhost = (geo, pos, rot = [0, 0, 0], scale = [1, 1, 1]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.scale.set(...scale);
    m.userData.isGhost = true;
    scene.add(m);
  };

  // Head
  addGhost(new THREE.SphereGeometry(0.15, 20, 20), [0, 1.65, 0]);
  // Neck
  addGhost(new THREE.CylinderGeometry(0.055, 0.065, 0.1, 12), [0, 1.5, 0]);
  // Torso
  addGhost(new THREE.CylinderGeometry(0.19, 0.15, 0.62, 16), [0, 1.18, 0]);
  // Hips
  addGhost(new THREE.CylinderGeometry(0.18, 0.14, 0.22, 16), [0, 0.79, 0]);
  // Upper arm L/R
  addGhost(new THREE.CylinderGeometry(0.048, 0.038, 0.32, 10), [-0.27, 1.22, 0]);
  addGhost(new THREE.CylinderGeometry(0.048, 0.038, 0.32, 10), [0.27, 1.22, 0]);
  // Forearm L/R
  addGhost(new THREE.CylinderGeometry(0.036, 0.028, 0.28, 10), [-0.295, 0.9, 0]);
  addGhost(new THREE.CylinderGeometry(0.036, 0.028, 0.28, 10), [0.295, 0.9, 0]);
  // Hand L/R
  addGhost(new THREE.BoxGeometry(0.075, 0.1, 0.03), [-0.305, 0.7, 0]);
  addGhost(new THREE.BoxGeometry(0.075, 0.1, 0.03), [0.305, 0.7, 0]);
  // Thigh L/R
  addGhost(new THREE.CylinderGeometry(0.072, 0.06, 0.45, 12), [-0.1, 0.44, 0]);
  addGhost(new THREE.CylinderGeometry(0.072, 0.06, 0.45, 12), [0.1, 0.44, 0]);
  // Calf L/R
  addGhost(new THREE.CylinderGeometry(0.052, 0.032, 0.4, 12), [-0.1, -0.08, 0]);
  addGhost(new THREE.CylinderGeometry(0.052, 0.032, 0.4, 12), [0.1, -0.08, 0]);
  // Foot L/R
  addGhost(new THREE.BoxGeometry(0.085, 0.045, 0.14), [-0.1, -0.33, 0.04]);
  addGhost(new THREE.BoxGeometry(0.085, 0.045, 0.14), [0.1, -0.33, 0.04]);
}

// Main body builder — returns Map<partId, THREE.Mesh[]>
export function buildBody(scene, materials, parts) {
  const meshMap = new Map(); // partId -> Mesh[]

  function addMesh(id, geo, pos, rot = [0, 0, 0], scale = [1, 1, 1]) {
    const partData = parts.find(p => p.id === id);
    if (!partData) return;
    const mat = materials[partData.layer].clone();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.userData.partId = id;
    scene.add(mesh);
    if (!meshMap.has(id)) meshMap.set(id, []);
    meshMap.get(id).push(mesh);
  }

  function tube(curve, id, radius = 0.007) {
    const geo = new THREE.TubeGeometry(curve, 30, radius, 7, false);
    addMesh(id, geo, [0, 0, 0]);
  }

  function curve(...pts) {
    return new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  }

  // ══════════════ SKELETON ══════════════
  // Skull
  addMesh('skull', new THREE.SphereGeometry(0.145, 18, 18), [0, 1.65, 0]);
  // Mandible
  addMesh('mandible', new THREE.BoxGeometry(0.11, 0.045, 0.09), [0, 1.525, 0.04]);
  // Cervical vertebrae
  for (let i = 0; i < 7; i++) addMesh('cervical', new THREE.CylinderGeometry(0.022, 0.024, 0.055, 8), [0, 1.445 - i * 0.057, -0.01]);
  // Thoracic vertebrae
  for (let i = 0; i < 12; i++) addMesh('thoracic', new THREE.CylinderGeometry(0.025, 0.027, 0.055, 8), [0, 1.053 - i * 0.055, -0.015]);
  // Lumbar vertebrae
  for (let i = 0; i < 5; i++) addMesh('lumbar', new THREE.CylinderGeometry(0.032, 0.034, 0.055, 8), [0, 0.397 - i * 0.057, -0.01]);
  // Sternum
  addMesh('sternum', new THREE.BoxGeometry(0.038, 0.21, 0.02), [0, 1.28, 0.095]);
  // Ribs (6 pairs shown)
  for (let i = 0; i < 6; i++) {
    const y = 1.38 - i * 0.055, rx = 0.12 + i * 0.005;
    const ribGeo = new THREE.TorusGeometry(rx, 0.011, 7, 18, Math.PI * 1.05);
    addMesh('ribs', ribGeo, [0, y, 0], [Math.PI / 2, 0, 0]);
  }
  // Clavicles
  addMesh('clavicle_l', new THREE.CylinderGeometry(0.011, 0.011, 0.22, 8), [-0.12, 1.445, 0.055], [0, 0, Math.PI / 3.2]);
  addMesh('clavicle_r', new THREE.CylinderGeometry(0.011, 0.011, 0.22, 8), [0.12, 1.445, 0.055], [0, 0, -Math.PI / 3.2]);
  // Scapulae (simplified flat triangles)
  addMesh('scapula_l', new THREE.BoxGeometry(0.11, 0.14, 0.015), [-0.18, 1.28, -0.06]);
  addMesh('scapula_r', new THREE.BoxGeometry(0.11, 0.14, 0.015), [0.18, 1.28, -0.06]);
  // Pelvis
  addMesh('pelvis', new THREE.TorusGeometry(0.155, 0.038, 9, 16, Math.PI * 1.6), [0, 0.78, 0], [Math.PI / 2, 0, Math.PI * 0.8]);
  // Humerus
  addMesh('humerus_l', new THREE.CylinderGeometry(0.026, 0.021, 0.33, 9), [-0.275, 1.22, 0]);
  addMesh('humerus_r', new THREE.CylinderGeometry(0.026, 0.021, 0.33, 9), [0.275, 1.22, 0]);
  // Radius
  addMesh('radius_l', new THREE.CylinderGeometry(0.014, 0.011, 0.27, 8), [-0.31, 0.905, 0.028]);
  addMesh('radius_r', new THREE.CylinderGeometry(0.014, 0.011, 0.27, 8), [0.31, 0.905, 0.028]);
  // Ulna
  addMesh('ulna_l', new THREE.CylinderGeometry(0.012, 0.009, 0.27, 8), [-0.275, 0.905, -0.02]);
  addMesh('ulna_r', new THREE.CylinderGeometry(0.012, 0.009, 0.27, 8), [0.275, 0.905, -0.02]);
  // Femur
  addMesh('femur_l', new THREE.CylinderGeometry(0.036, 0.031, 0.46, 10), [-0.1, 0.445, 0]);
  addMesh('femur_r', new THREE.CylinderGeometry(0.036, 0.031, 0.46, 10), [0.1, 0.445, 0]);
  // Patella
  addMesh('patella_l', new THREE.SphereGeometry(0.025, 10, 10), [-0.1, 0.2, 0.045]);
  addMesh('patella_r', new THREE.SphereGeometry(0.025, 10, 10), [0.1, 0.2, 0.045]);
  // Tibia
  addMesh('tibia_l', new THREE.CylinderGeometry(0.026, 0.02, 0.4, 9), [-0.1, -0.08, 0.01]);
  addMesh('tibia_r', new THREE.CylinderGeometry(0.026, 0.02, 0.4, 9), [0.1, -0.08, 0.01]);
  // Fibula
  addMesh('fibula_l', new THREE.CylinderGeometry(0.012, 0.009, 0.38, 8), [-0.127, -0.09, -0.01]);
  addMesh('fibula_r', new THREE.CylinderGeometry(0.012, 0.009, 0.38, 8), [0.127, -0.09, -0.01]);

  // ══════════════ MUSCLE ══════════════
  addMesh('trapezius', new THREE.BoxGeometry(0.36, 0.22, 0.032), [0, 1.36, -0.07]);
  addMesh('pec_major', new THREE.BoxGeometry(0.31, 0.175, 0.055), [0, 1.285, 0.095]);
  addMesh('deltoid_l', new THREE.SphereGeometry(0.068, 12, 10), [-0.225, 1.38, 0], [0, 0, 0], [1, 0.75, 0.85]);
  addMesh('deltoid_r', new THREE.SphereGeometry(0.068, 12, 10), [0.225, 1.38, 0], [0, 0, 0], [1, 0.75, 0.85]);
  addMesh('biceps_l', new THREE.CylinderGeometry(0.042, 0.032, 0.26, 9), [-0.273, 1.24, 0.032]);
  addMesh('biceps_r', new THREE.CylinderGeometry(0.042, 0.032, 0.26, 9), [0.273, 1.24, 0.032]);
  addMesh('rectus_abdominis', new THREE.BoxGeometry(0.095, 0.29, 0.042), [0, 1.1, 0.105]);
  addMesh('quadriceps_l', new THREE.CylinderGeometry(0.066, 0.055, 0.38, 10), [-0.1, 0.445, 0.042]);
  addMesh('quadriceps_r', new THREE.CylinderGeometry(0.066, 0.055, 0.38, 10), [0.1, 0.445, 0.042]);
  addMesh('gastrocnemius_l', new THREE.CylinderGeometry(0.046, 0.026, 0.29, 9), [-0.1, -0.065, -0.02]);
  addMesh('gastrocnemius_r', new THREE.CylinderGeometry(0.046, 0.026, 0.29, 9), [0.1, -0.065, -0.02]);

  // ══════════════ JOINT ══════════════
  addMesh('shoulder_l', new THREE.SphereGeometry(0.044, 14, 14), [-0.225, 1.43, 0]);
  addMesh('shoulder_r', new THREE.SphereGeometry(0.044, 14, 14), [0.225, 1.43, 0]);
  addMesh('elbow_l', new THREE.SphereGeometry(0.034, 12, 12), [-0.285, 1.06, 0]);
  addMesh('elbow_r', new THREE.SphereGeometry(0.034, 12, 12), [0.285, 1.06, 0]);
  addMesh('hip_l', new THREE.SphereGeometry(0.05, 14, 14), [-0.145, 0.68, 0]);
  addMesh('hip_r', new THREE.SphereGeometry(0.05, 14, 14), [0.145, 0.68, 0]);
  addMesh('knee_l', new THREE.SphereGeometry(0.047, 14, 14), [-0.1, 0.2, 0]);
  addMesh('knee_r', new THREE.SphereGeometry(0.047, 14, 14), [0.1, 0.2, 0]);
  addMesh('ankle_l', new THREE.SphereGeometry(0.032, 12, 12), [-0.1, -0.295, 0]);
  addMesh('ankle_r', new THREE.SphereGeometry(0.032, 12, 12), [0.1, -0.295, 0]);

  // ══════════════ LIGAMENT ══════════════
  // ACL L/R — angled inside knee
  addMesh('acl_l', new THREE.CylinderGeometry(0.008, 0.008, 0.085, 6), [-0.1, 0.2, 0.01], [0.3, 0, 0.12]);
  addMesh('acl_r', new THREE.CylinderGeometry(0.008, 0.008, 0.085, 6), [0.1, 0.2, 0.01], [0.3, 0, -0.12]);
  addMesh('pcl_l', new THREE.CylinderGeometry(0.009, 0.009, 0.085, 6), [-0.1, 0.2, -0.01], [-0.3, 0, 0.1]);
  addMesh('pcl_r', new THREE.CylinderGeometry(0.009, 0.009, 0.085, 6), [0.1, 0.2, -0.01], [-0.3, 0, -0.1]);
  addMesh('mcl_l', new THREE.CylinderGeometry(0.009, 0.009, 0.125, 6), [-0.148, 0.2, 0]);
  addMesh('mcl_r', new THREE.CylinderGeometry(0.009, 0.009, 0.125, 6), [0.148, 0.2, 0]);
  // Shoulder ligament bands
  addMesh('lig_shoulder_l', new THREE.TorusGeometry(0.04, 0.007, 6, 12, Math.PI * 1.2), [-0.225, 1.43, 0], [Math.PI / 2, 0.3, 0]);
  addMesh('lig_shoulder_r', new THREE.TorusGeometry(0.04, 0.007, 6, 12, Math.PI * 1.2), [0.225, 1.43, 0], [Math.PI / 2, -0.3, 0]);

  // ══════════════ MERIDIAN ══════════════
  // Lung Meridian LU — inner anterior arm L, down to thumb
  tube(curve([-0.08, 1.28, 0.1], [-0.18, 1.22, 0.07], [-0.26, 1.06, 0.05], [-0.3, 0.87, 0.06], [-0.315, 0.7, 0.06], [-0.33, 0.65, 0.07]), 'lung_meridian', 0.006);
  // Heart Meridian HT — inner posterior arm L
  tube(curve([-0.07, 1.38, 0.0], [-0.2, 1.22, -0.03], [-0.26, 1.06, -0.05], [-0.28, 0.87, -0.06], [-0.295, 0.7, -0.05], [-0.31, 0.62, -0.03]), 'heart_meridian', 0.006);
  // Stomach Meridian ST — anterior, face to toe
  tube(curve([-0.04, 1.66, 0.13], [-0.05, 1.45, 0.13], [-0.055, 1.25, 0.13], [-0.06, 1.05, 0.13], [-0.07, 0.85, 0.11], [-0.08, 0.68, 0.09], [-0.1, 0.44, 0.08], [-0.1, 0.2, 0.09], [-0.1, -0.08, 0.09], [-0.1, -0.3, 0.08]), 'stomach_meridian', 0.006);
  // Governing Vessel GV — posterior midline
  tube(curve([0, 0.68, -0.07], [0, 0.9, -0.07], [0, 1.1, -0.06], [0, 1.3, -0.055], [0, 1.5, -0.04], [0, 1.64, -0.02], [0, 1.73, 0.0], [0, 1.79, 0.07]), 'governing_vessel', 0.007);
  // Conception Vessel CV — anterior midline
  tube(curve([0, 0.68, 0.085], [0, 0.9, 0.1], [0, 1.1, 0.115], [0, 1.3, 0.115], [0, 1.5, 0.1], [0, 1.63, 0.085], [0, 1.73, 0.07]), 'conception_vessel', 0.007);
  // Bladder Meridian BL — bilateral posterior, eye to little toe
  tube(curve([-0.03, 1.73, -0.1], [-0.03, 1.5, -0.09], [-0.03, 1.3, -0.09], [-0.035, 1.1, -0.09], [-0.04, 0.9, -0.085], [-0.07, 0.7, -0.06], [-0.09, 0.5, -0.04], [-0.1, 0.3, -0.03], [-0.1, 0.1, -0.03], [-0.1, -0.09, -0.03], [-0.1, -0.28, -0.03]), 'bladder_meridian', 0.006);

  // ══════════════ NERVE ══════════════
  // Brachial plexus — C5-T1 fan out to arm L
  tube(curve([-0.04, 1.52, -0.01], [-0.1, 1.47, 0.01], [-0.18, 1.43, 0.01], [-0.24, 1.38, 0.01], [-0.27, 1.25, 0.01], [-0.28, 1.06, 0.01]), 'brachial_plexus', 0.005);
  // Sciatic L — posterior thigh to foot
  tube(curve([-0.08, 0.66, -0.05], [-0.09, 0.5, -0.05], [-0.1, 0.34, -0.04], [-0.1, 0.2, -0.04], [-0.1, 0.0, -0.04], [-0.1, -0.15, -0.035], [-0.1, -0.28, -0.02]), 'sciatic_l', 0.006);
  // Sciatic R
  tube(curve([0.08, 0.66, -0.05], [0.09, 0.5, -0.05], [0.1, 0.34, -0.04], [0.1, 0.2, -0.04], [0.1, 0.0, -0.04], [0.1, -0.15, -0.035], [0.1, -0.28, -0.02]), 'sciatic_r', 0.006);
  // Femoral L — anterior thigh
  tube(curve([-0.09, 0.67, 0.05], [-0.1, 0.52, 0.06], [-0.1, 0.37, 0.07], [-0.1, 0.22, 0.08]), 'femoral_l', 0.005);
  // Femoral R
  tube(curve([0.09, 0.67, 0.05], [0.1, 0.52, 0.06], [0.1, 0.37, 0.07], [0.1, 0.22, 0.08]), 'femoral_r', 0.005);
  // Median L — medial forearm
  tube(curve([-0.24, 1.06, 0.02], [-0.28, 0.92, 0.03], [-0.305, 0.78, 0.03], [-0.315, 0.66, 0.03]), 'median_l', 0.005);
  // Median R
  tube(curve([0.24, 1.06, 0.02], [0.28, 0.92, 0.03], [0.305, 0.78, 0.03], [0.315, 0.66, 0.03]), 'median_r', 0.005);
  // Radial L — lateral forearm
  tube(curve([-0.27, 1.06, -0.01], [-0.31, 0.92, -0.01], [-0.33, 0.78, -0.01], [-0.34, 0.64, -0.01]), 'radial_l', 0.005);
  // Radial R
  tube(curve([0.27, 1.06, -0.01], [0.31, 0.92, -0.01], [0.33, 0.78, -0.01], [0.34, 0.64, -0.01]), 'radial_r', 0.005);

  // ══════════════ SKELETON (extended) ══════════════
  addMesh('sacrum', new THREE.ConeGeometry(0.052, 0.13, 8), [0, 0.1, -0.012], [Math.PI, 0, 0]);
  addMesh('coccyx', new THREE.ConeGeometry(0.018, 0.05, 6), [0, 0.025, 0.0], [Math.PI, 0, 0]);
  addMesh('carpals_l', new THREE.BoxGeometry(0.052, 0.03, 0.026), [-0.31, 0.655, 0.018]);
  addMesh('carpals_r', new THREE.BoxGeometry(0.052, 0.03, 0.026), [0.31, 0.655, 0.018]);
  addMesh('metacarpals_l', new THREE.BoxGeometry(0.06, 0.07, 0.02), [-0.31, 0.6, 0.018]);
  addMesh('metacarpals_r', new THREE.BoxGeometry(0.06, 0.07, 0.02), [0.31, 0.6, 0.018]);
  addMesh('phalanges_hand_l', new THREE.BoxGeometry(0.06, 0.05, 0.015), [-0.31, 0.545, 0.018]);
  addMesh('phalanges_hand_r', new THREE.BoxGeometry(0.06, 0.05, 0.015), [0.31, 0.545, 0.018]);
  addMesh('calcaneus_l', new THREE.SphereGeometry(0.03, 10, 10), [-0.1, -0.345, -0.04]);
  addMesh('calcaneus_r', new THREE.SphereGeometry(0.03, 10, 10), [0.1, -0.345, -0.04]);
  addMesh('metatarsals_l', new THREE.BoxGeometry(0.06, 0.022, 0.085), [-0.1, -0.36, 0.06]);
  addMesh('metatarsals_r', new THREE.BoxGeometry(0.06, 0.022, 0.085), [0.1, -0.36, 0.06]);
  addMesh('phalanges_foot_l', new THREE.BoxGeometry(0.06, 0.016, 0.03), [-0.1, -0.365, 0.12]);
  addMesh('phalanges_foot_r', new THREE.BoxGeometry(0.06, 0.016, 0.03), [0.1, -0.365, 0.12]);

  // ══════════════ MUSCLE (extended) ══════════════
  addMesh('sternocleidomastoid', new THREE.CylinderGeometry(0.013, 0.013, 0.16, 8), [-0.05, 1.5, 0.05], [0.2, 0, 0.35]);
  addMesh('sternocleidomastoid', new THREE.CylinderGeometry(0.013, 0.013, 0.16, 8), [0.05, 1.5, 0.05], [0.2, 0, -0.35]);
  addMesh('latissimus_dorsi', new THREE.BoxGeometry(0.34, 0.3, 0.03), [0, 1.12, -0.075]);
  addMesh('triceps_l', new THREE.CylinderGeometry(0.04, 0.03, 0.26, 9), [-0.275, 1.23, -0.03]);
  addMesh('triceps_r', new THREE.CylinderGeometry(0.04, 0.03, 0.26, 9), [0.275, 1.23, -0.03]);
  addMesh('forearm_flexors_l', new THREE.CylinderGeometry(0.034, 0.022, 0.24, 9), [-0.3, 0.9, 0.03]);
  addMesh('forearm_flexors_r', new THREE.CylinderGeometry(0.034, 0.022, 0.24, 9), [0.3, 0.9, 0.03]);
  addMesh('external_oblique', new THREE.BoxGeometry(0.06, 0.2, 0.07), [-0.13, 1.08, 0.04]);
  addMesh('external_oblique', new THREE.BoxGeometry(0.06, 0.2, 0.07), [0.13, 1.08, 0.04]);
  addMesh('gluteus_maximus', new THREE.SphereGeometry(0.085, 12, 10), [-0.08, 0.69, -0.085], [0, 0, 0], [1, 0.9, 0.8]);
  addMesh('gluteus_maximus', new THREE.SphereGeometry(0.085, 12, 10), [0.08, 0.69, -0.085], [0, 0, 0], [1, 0.9, 0.8]);
  addMesh('biceps_femoris_l', new THREE.CylinderGeometry(0.058, 0.048, 0.38, 10), [-0.1, 0.445, -0.042]);
  addMesh('biceps_femoris_r', new THREE.CylinderGeometry(0.058, 0.048, 0.38, 10), [0.1, 0.445, -0.042]);
  addMesh('tibialis_anterior_l', new THREE.CylinderGeometry(0.03, 0.02, 0.34, 9), [-0.082, -0.07, 0.035]);
  addMesh('tibialis_anterior_r', new THREE.CylinderGeometry(0.03, 0.02, 0.34, 9), [0.082, -0.07, 0.035]);

  // ── Gluteal group (medius / minimus / TFL) ────────────────────────────────
  addMesh('gluteus_medius_l', new THREE.SphereGeometry(0.062, 12, 10), [-0.1, 0.73, -0.055], [0, 0, 0], [1, 0.78, 0.7]);
  addMesh('gluteus_medius_r', new THREE.SphereGeometry(0.062, 12, 10), [0.1, 0.73, -0.055], [0, 0, 0], [1, 0.78, 0.7]);
  addMesh('gluteus_minimus_l', new THREE.SphereGeometry(0.044, 10, 10), [-0.11, 0.7, -0.035], [0, 0, 0], [1, 0.68, 0.64]);
  addMesh('gluteus_minimus_r', new THREE.SphereGeometry(0.044, 10, 10), [0.11, 0.7, -0.035], [0, 0, 0], [1, 0.68, 0.64]);
  addMesh('tensor_fasciae_latae_l', new THREE.CylinderGeometry(0.024, 0.017, 0.14, 8), [-0.14, 0.7, 0.03]);
  addMesh('tensor_fasciae_latae_r', new THREE.CylinderGeometry(0.024, 0.017, 0.14, 8), [0.14, 0.7, 0.03]);

  // ── Rotator cuff ─────────────────────────────────────────────────────────
  addMesh('supraspinatus_l', new THREE.CylinderGeometry(0.021, 0.015, 0.13, 8), [-0.205, 1.395, -0.024], [0, 0, Math.PI * 0.46]);
  addMesh('supraspinatus_r', new THREE.CylinderGeometry(0.021, 0.015, 0.13, 8), [0.205, 1.395, -0.024], [0, 0, -Math.PI * 0.46]);
  addMesh('infraspinatus_l', new THREE.BoxGeometry(0.09, 0.08, 0.02), [-0.18, 1.245, -0.077]);
  addMesh('infraspinatus_r', new THREE.BoxGeometry(0.09, 0.08, 0.02), [0.18, 1.245, -0.077]);
  addMesh('subscapularis_l', new THREE.BoxGeometry(0.088, 0.1, 0.018), [-0.184, 1.27, -0.028]);
  addMesh('subscapularis_r', new THREE.BoxGeometry(0.088, 0.1, 0.018), [0.184, 1.27, -0.028]);
  addMesh('teres_minor_l', new THREE.CylinderGeometry(0.016, 0.011, 0.15, 8), [-0.21, 1.285, -0.054], [0, 0, 0.32]);
  addMesh('teres_minor_r', new THREE.CylinderGeometry(0.016, 0.011, 0.15, 8), [0.21, 1.285, -0.054], [0, 0, -0.32]);
  addMesh('teres_major_l', new THREE.CylinderGeometry(0.022, 0.015, 0.2, 8), [-0.22, 1.195, -0.043], [0, 0, 0.3]);
  addMesh('teres_major_r', new THREE.CylinderGeometry(0.022, 0.015, 0.2, 8), [0.22, 1.195, -0.043], [0, 0, -0.3]);

  // ── Forearm / serratus / soleus (missing from earlier) ───────────────────
  addMesh('brachioradialis_l', new THREE.CylinderGeometry(0.022, 0.013, 0.22, 8), [-0.31, 0.9, 0.018]);
  addMesh('brachioradialis_r', new THREE.CylinderGeometry(0.022, 0.013, 0.22, 8), [0.31, 0.9, 0.018]);
  addMesh('serratus_anterior', new THREE.BoxGeometry(0.05, 0.19, 0.04), [-0.175, 1.2, 0.072]);
  addMesh('serratus_anterior', new THREE.BoxGeometry(0.05, 0.19, 0.04), [0.175, 1.2, 0.072]);
  addMesh('soleus_l', new THREE.CylinderGeometry(0.04, 0.022, 0.27, 9), [-0.1, -0.112, -0.018]);
  addMesh('soleus_r', new THREE.CylinderGeometry(0.04, 0.022, 0.27, 9), [0.1, -0.112, -0.018]);

  // ── Rhomboids (back between scapulae) ────────────────────────────────────
  addMesh('rhomboid_major_l', new THREE.BoxGeometry(0.088, 0.1, 0.022), [-0.13, 1.21, -0.078], [0, 0, -0.2]);
  addMesh('rhomboid_major_r', new THREE.BoxGeometry(0.088, 0.1, 0.022), [0.13, 1.21, -0.078], [0, 0, 0.2]);
  addMesh('rhomboid_minor_l', new THREE.BoxGeometry(0.06, 0.055, 0.018), [-0.1, 1.33, -0.074], [0, 0, -0.18]);
  addMesh('rhomboid_minor_r', new THREE.BoxGeometry(0.06, 0.055, 0.018), [0.1, 1.33, -0.074], [0, 0, 0.18]);

  // ── Deep hip rotators ────────────────────────────────────────────────────
  addMesh('piriformis_l', new THREE.CylinderGeometry(0.021, 0.014, 0.13, 8), [-0.09, 0.625, -0.063], [0, 0, Math.PI * 0.38]);
  addMesh('piriformis_r', new THREE.CylinderGeometry(0.021, 0.014, 0.13, 8), [0.09, 0.625, -0.063], [0, 0, -Math.PI * 0.38]);
  addMesh('obturator_internus_l', new THREE.CylinderGeometry(0.017, 0.013, 0.09, 7), [-0.084, 0.598, -0.027], [0, 0.5, 0.45]);
  addMesh('obturator_internus_r', new THREE.CylinderGeometry(0.017, 0.013, 0.09, 7), [0.084, 0.598, -0.027], [0, -0.5, -0.45]);
  addMesh('quadratus_femoris_l', new THREE.CylinderGeometry(0.019, 0.019, 0.088, 7), [-0.098, 0.578, -0.053], [0, 0, Math.PI / 2]);
  addMesh('quadratus_femoris_r', new THREE.CylinderGeometry(0.019, 0.019, 0.088, 7), [0.098, 0.578, -0.053], [0, 0, Math.PI / 2]);

  // ── Iliopsoas ────────────────────────────────────────────────────────────
  addMesh('iliacus_l', new THREE.CylinderGeometry(0.038, 0.023, 0.19, 9), [-0.09, 0.62, 0.038], [0.18, 0, 0.22]);
  addMesh('iliacus_r', new THREE.CylinderGeometry(0.038, 0.023, 0.19, 9), [0.09, 0.62, 0.038], [0.18, 0, -0.22]);
  addMesh('psoas_major_l', new THREE.CylinderGeometry(0.024, 0.019, 0.34, 8), [-0.05, 0.55, 0.028], [0.12, 0, 0.16]);
  addMesh('psoas_major_r', new THREE.CylinderGeometry(0.024, 0.019, 0.34, 8), [0.05, 0.55, 0.028], [0.12, 0, -0.16]);

  // ── Sartorius (diagonal across anterior thigh) ────────────────────────────
  addMesh('sartorius_l', new THREE.CylinderGeometry(0.013, 0.009, 0.54, 8), [-0.09, 0.44, 0.05], [0, 0, 0.14]);
  addMesh('sartorius_r', new THREE.CylinderGeometry(0.013, 0.009, 0.54, 8), [0.09, 0.44, 0.05], [0, 0, -0.14]);

  // ── Medial thigh (adductors + gracilis + pectineus) ───────────────────────
  addMesh('gracilis_l', new THREE.CylinderGeometry(0.013, 0.009, 0.44, 8), [-0.04, 0.39, 0.014]);
  addMesh('gracilis_r', new THREE.CylinderGeometry(0.013, 0.009, 0.44, 8), [0.04, 0.39, 0.014]);
  addMesh('pectineus_l', new THREE.CylinderGeometry(0.021, 0.016, 0.1, 8), [-0.072, 0.608, 0.042], [0.12, 0, 0.28]);
  addMesh('pectineus_r', new THREE.CylinderGeometry(0.021, 0.016, 0.1, 8), [0.072, 0.608, 0.042], [0.12, 0, -0.28]);
  addMesh('adductor_longus_l', new THREE.CylinderGeometry(0.027, 0.018, 0.33, 9), [-0.06, 0.44, 0.038], [0.1, 0, 0.18]);
  addMesh('adductor_longus_r', new THREE.CylinderGeometry(0.027, 0.018, 0.33, 9), [0.06, 0.44, 0.038], [0.1, 0, -0.18]);
  addMesh('adductor_brevis_l', new THREE.CylinderGeometry(0.023, 0.016, 0.2, 8), [-0.065, 0.538, 0.018], [0.16, 0, 0.26]);
  addMesh('adductor_brevis_r', new THREE.CylinderGeometry(0.023, 0.016, 0.2, 8), [0.065, 0.538, 0.018], [0.16, 0, -0.26]);
  addMesh('adductor_magnus_l', new THREE.CylinderGeometry(0.04, 0.027, 0.44, 10), [-0.055, 0.415, 0.0], [0, 0, 0.1]);
  addMesh('adductor_magnus_r', new THREE.CylinderGeometry(0.04, 0.027, 0.44, 10), [0.055, 0.415, 0.0], [0, 0, -0.1]);

  // ── Posterior thigh (semi*) ───────────────────────────────────────────────
  addMesh('semitendinosus_l', new THREE.CylinderGeometry(0.025, 0.017, 0.36, 9), [-0.068, 0.44, -0.056]);
  addMesh('semitendinosus_r', new THREE.CylinderGeometry(0.025, 0.017, 0.36, 9), [0.068, 0.44, -0.056]);
  addMesh('semimembranosus_l', new THREE.CylinderGeometry(0.031, 0.021, 0.35, 9), [-0.055, 0.44, -0.042]);
  addMesh('semimembranosus_r', new THREE.CylinderGeometry(0.031, 0.021, 0.35, 9), [0.055, 0.44, -0.042]);

  // ── Lateral lower leg (fibularis) ─────────────────────────────────────────
  addMesh('fibularis_longus_l', new THREE.CylinderGeometry(0.021, 0.013, 0.3, 8), [-0.128, -0.08, 0.014]);
  addMesh('fibularis_longus_r', new THREE.CylinderGeometry(0.021, 0.013, 0.3, 8), [0.128, -0.08, 0.014]);
  addMesh('fibularis_brevis_l', new THREE.CylinderGeometry(0.017, 0.011, 0.2, 8), [-0.128, -0.166, 0.012]);
  addMesh('fibularis_brevis_r', new THREE.CylinderGeometry(0.017, 0.011, 0.2, 8), [0.128, -0.166, 0.012]);
  addMesh('popliteus_l', new THREE.CylinderGeometry(0.017, 0.013, 0.065, 7), [-0.1, 0.167, -0.043], [0, 0, 0.36]);
  addMesh('popliteus_r', new THREE.CylinderGeometry(0.017, 0.013, 0.065, 7), [0.1, 0.167, -0.043], [0, 0, -0.36]);

  // ── Diaphragm (horizontal ring at base of ribcage) ────────────────────────
  addMesh('diaphragm', new THREE.TorusGeometry(0.114, 0.017, 8, 18), [0, 0.988, 0.018], [Math.PI / 2, 0, 0]);

  // ── Head / jaw muscles ───────────────────────────────────────────────────
  addMesh('masseter_l', new THREE.BoxGeometry(0.03, 0.062, 0.024), [-0.063, 1.545, 0.06]);
  addMesh('masseter_r', new THREE.BoxGeometry(0.03, 0.062, 0.024), [0.063, 1.545, 0.06]);
  addMesh('temporalis_l', new THREE.SphereGeometry(0.052, 10, 10), [-0.1, 1.675, -0.005], [0, 0, 0], [1, 0.47, 0.57]);
  addMesh('temporalis_r', new THREE.SphereGeometry(0.052, 10, 10), [0.1, 1.675, -0.005], [0, 0, 0], [1, 0.47, 0.57]);
  addMesh('splenius_capitis_l', new THREE.CylinderGeometry(0.013, 0.011, 0.185, 8), [-0.04, 1.474, -0.044], [0.16, 0, 0.3]);
  addMesh('splenius_capitis_r', new THREE.CylinderGeometry(0.013, 0.011, 0.185, 8), [0.04, 1.474, -0.044], [0.16, 0, -0.3]);

  // ══════════════ JOINT (extended) ══════════════
  addMesh('wrist_l', new THREE.SphereGeometry(0.026, 12, 12), [-0.31, 0.66, 0.012]);
  addMesh('wrist_r', new THREE.SphereGeometry(0.026, 12, 12), [0.31, 0.66, 0.012]);
  addMesh('tmj', new THREE.SphereGeometry(0.018, 10, 10), [-0.072, 1.56, 0.035]);
  addMesh('tmj', new THREE.SphereGeometry(0.018, 10, 10), [0.072, 1.56, 0.035]);
  addMesh('sacroiliac_l', new THREE.SphereGeometry(0.022, 10, 10), [-0.05, 0.17, -0.025]);
  addMesh('sacroiliac_r', new THREE.SphereGeometry(0.022, 10, 10), [0.05, 0.17, -0.025]);

  // ══════════════ JOINT (from joint reference sheet) ══════════════
  const jointGeo = () => new THREE.SphereGeometry(0.02, 12, 12);
  addMesh('atlanto_occipital', jointGeo(), [0, 1.55, -0.01]);
  addMesh('atlanto_axial', jointGeo(), [0, 1.50, -0.01]);
  addMesh('sternoclavicular', new THREE.SphereGeometry(0.017, 10, 10), [-0.04, 1.43, 0.05]);
  addMesh('sternoclavicular', new THREE.SphereGeometry(0.017, 10, 10), [0.04, 1.43, 0.05]);
  addMesh('acromioclavicular', new THREE.SphereGeometry(0.017, 10, 10), [-0.2, 1.45, 0.02]);
  addMesh('acromioclavicular', new THREE.SphereGeometry(0.017, 10, 10), [0.2, 1.45, 0.02]);
  addMesh('proximal_radioulnar', new THREE.SphereGeometry(0.016, 10, 10), [-0.27, 1.05, -0.01]);
  addMesh('proximal_radioulnar', new THREE.SphereGeometry(0.016, 10, 10), [0.27, 1.05, -0.01]);
  addMesh('distal_radioulnar', new THREE.SphereGeometry(0.016, 10, 10), [-0.305, 0.69, 0.0]);
  addMesh('distal_radioulnar', new THREE.SphereGeometry(0.016, 10, 10), [0.305, 0.69, 0.0]);
  addMesh('pubic_symphysis', new THREE.SphereGeometry(0.02, 12, 12), [0, 0.635, 0.085]);
  addMesh('proximal_tibiofibular', new THREE.SphereGeometry(0.016, 10, 10), [-0.13, 0.12, 0.0]);
  addMesh('proximal_tibiofibular', new THREE.SphereGeometry(0.016, 10, 10), [0.13, 0.12, 0.0]);
  addMesh('distal_tibiofibular', new THREE.SphereGeometry(0.015, 10, 10), [-0.115, -0.26, 0.0]);
  addMesh('distal_tibiofibular', new THREE.SphereGeometry(0.015, 10, 10), [0.115, -0.26, 0.0]);

  // ══════════════ LIGAMENT (extended) ══════════════
  addMesh('lcl_l', new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), [-0.052, 0.2, 0]);
  addMesh('lcl_r', new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), [0.052, 0.2, 0]);
  addMesh('patellar_lig_l', new THREE.CylinderGeometry(0.01, 0.01, 0.06, 6), [-0.1, 0.158, 0.05]);
  addMesh('patellar_lig_r', new THREE.CylinderGeometry(0.01, 0.01, 0.06, 6), [0.1, 0.158, 0.05]);
  addMesh('atfl_l', new THREE.CylinderGeometry(0.006, 0.006, 0.045, 6), [-0.122, -0.3, 0.028], [0, 0, 0.5]);
  addMesh('atfl_r', new THREE.CylinderGeometry(0.006, 0.006, 0.045, 6), [0.122, -0.3, 0.028], [0, 0, -0.5]);

  // ══════════════ MERIDIAN (extended) ══════════════
  // Large Intestine LI — index finger up lateral arm to opposite nostril
  tube(curve([-0.33, 0.62, 0.0], [-0.34, 0.78, -0.01], [-0.3, 1.0, -0.02], [-0.26, 1.2, -0.02], [-0.18, 1.4, 0.0], [-0.06, 1.5, 0.05], [0.02, 1.6, 0.12]), 'large_intestine_meridian', 0.006);
  // Spleen SP — medial big toe up inner leg to abdomen
  tube(curve([-0.13, -0.36, 0.05], [-0.11, -0.2, 0.0], [-0.085, 0.0, 0.02], [-0.07, 0.3, 0.05], [-0.09, 0.6, 0.08], [-0.11, 0.9, 0.1], [-0.13, 1.15, 0.09]), 'spleen_meridian', 0.006);
  // Small Intestine SI — little finger up posterior arm over scapula to ear
  tube(curve([-0.33, 0.62, -0.03], [-0.31, 0.78, -0.04], [-0.28, 1.0, -0.05], [-0.24, 1.2, -0.04], [-0.18, 1.38, -0.05], [-0.1, 1.45, -0.04], [-0.06, 1.55, 0.02]), 'small_intestine_meridian', 0.006);
  // Kidney KI — sole up inner posterior leg to abdomen
  tube(curve([-0.1, -0.38, 0.02], [-0.1, -0.34, -0.02], [-0.09, -0.15, -0.03], [-0.08, 0.1, -0.01], [-0.07, 0.4, 0.04], [-0.05, 0.7, 0.08], [-0.04, 1.0, 0.1], [-0.03, 1.25, 0.09]), 'kidney_meridian', 0.006);
  // Pericardium PC — chest down midline inner arm to middle finger
  tube(curve([-0.06, 1.3, 0.1], [-0.16, 1.25, 0.06], [-0.24, 1.1, 0.04], [-0.28, 0.9, 0.04], [-0.31, 0.72, 0.03], [-0.32, 0.6, 0.02]), 'pericardium_meridian', 0.006);
  // Sanjiao TE — ring finger up midline outer arm to ear/brow
  tube(curve([-0.33, 0.6, -0.02], [-0.33, 0.78, -0.02], [-0.3, 1.0, -0.03], [-0.26, 1.2, -0.02], [-0.2, 1.38, -0.02], [-0.1, 1.47, -0.02], [-0.05, 1.58, 0.0]), 'sanjiao_meridian', 0.006);
  // Gallbladder GB — outer eye, side head, side trunk, lateral leg to 4th toe (zig-zag)
  tube(curve([-0.06, 1.66, 0.08], [-0.1, 1.6, 0.0], [-0.06, 1.5, -0.05], [-0.15, 1.3, -0.02], [-0.16, 1.1, 0.0], [-0.16, 0.85, 0.02], [-0.15, 0.6, 0.03], [-0.14, 0.3, 0.0], [-0.13, 0.0, -0.02], [-0.12, -0.3, 0.04]), 'gallbladder_meridian', 0.006);
  // Liver LR — big toe up inner leg to ribs
  tube(curve([-0.11, -0.36, 0.06], [-0.1, -0.2, 0.02], [-0.08, 0.0, 0.03], [-0.07, 0.3, 0.06], [-0.08, 0.6, 0.09], [-0.1, 0.9, 0.1], [-0.12, 1.15, 0.09]), 'liver_meridian', 0.006);

  // ══════════════ NERVE (extended) ══════════════
  // Ulnar L/R — medial forearm to little-finger side
  tube(curve([-0.24, 1.06, -0.01], [-0.27, 0.92, 0.0], [-0.29, 0.78, 0.0], [-0.31, 0.66, 0.0]), 'ulnar_l', 0.005);
  tube(curve([0.24, 1.06, -0.01], [0.27, 0.92, 0.0], [0.29, 0.78, 0.0], [0.31, 0.66, 0.0]), 'ulnar_r', 0.005);
  // Tibial L/R — posterior calf to sole
  tube(curve([-0.1, 0.0, -0.04], [-0.1, -0.15, -0.035], [-0.1, -0.28, -0.02], [-0.1, -0.36, 0.0]), 'tibial_l', 0.005);
  tube(curve([0.1, 0.0, -0.04], [0.1, -0.15, -0.035], [0.1, -0.28, -0.02], [0.1, -0.36, 0.0]), 'tibial_r', 0.005);
  // Common Peroneal L/R — around fibular neck to anterolateral leg
  tube(curve([-0.1, 0.05, -0.04], [-0.125, -0.05, -0.01], [-0.13, -0.15, 0.02], [-0.12, -0.28, 0.02]), 'common_peroneal_l', 0.005);
  tube(curve([0.1, 0.05, -0.04], [0.125, -0.05, -0.01], [0.13, -0.15, 0.02], [0.12, -0.28, 0.02]), 'common_peroneal_r', 0.005);

  return meshMap;
}

// Collect all clickable meshes (non-ghost)
export function getClickableMeshes(scene) {
  const result = [];
  scene.traverse(obj => {
    if (obj.isMesh && !obj.userData.isGhost) result.push(obj);
  });
  return result;
}
