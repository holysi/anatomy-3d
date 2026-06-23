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

  addGhost(new THREE.SphereGeometry(0.15, 20, 20), [0, 1.65, 0]);                    // 頭
  addGhost(new THREE.CylinderGeometry(0.055, 0.065, 0.1, 12), [0, 1.5, 0]);          // 頸
  addGhost(new THREE.CylinderGeometry(0.19, 0.15, 0.62, 16), [0, 1.18, 0]);          // 軀幹
  addGhost(new THREE.CylinderGeometry(0.18, 0.14, 0.22, 16), [0, 0.79, 0]);          // 骨盆區
  addGhost(new THREE.CylinderGeometry(0.048, 0.038, 0.32, 10), [-0.27, 1.22, 0]);    // 左上臂
  addGhost(new THREE.CylinderGeometry(0.048, 0.038, 0.32, 10), [0.27, 1.22, 0]);     // 右上臂
  addGhost(new THREE.CylinderGeometry(0.036, 0.028, 0.28, 10), [-0.295, 0.9, 0]);    // 左前臂
  addGhost(new THREE.CylinderGeometry(0.036, 0.028, 0.28, 10), [0.295, 0.9, 0]);     // 右前臂
  addGhost(new THREE.BoxGeometry(0.075, 0.1, 0.03), [-0.305, 0.7, 0]);               // 左手
  addGhost(new THREE.BoxGeometry(0.075, 0.1, 0.03), [0.305, 0.7, 0]);                // 右手
  addGhost(new THREE.CylinderGeometry(0.072, 0.06, 0.45, 12), [-0.1, 0.44, 0]);      // 左大腿
  addGhost(new THREE.CylinderGeometry(0.072, 0.06, 0.45, 12), [0.1, 0.44, 0]);       // 右大腿
  addGhost(new THREE.CylinderGeometry(0.052, 0.032, 0.4, 12), [-0.1, -0.08, 0]);     // 左小腿
  addGhost(new THREE.CylinderGeometry(0.052, 0.032, 0.4, 12), [0.1, -0.08, 0]);      // 右小腿
  addGhost(new THREE.BoxGeometry(0.085, 0.045, 0.14), [-0.1, -0.33, 0.04]);          // 左足
  addGhost(new THREE.BoxGeometry(0.085, 0.045, 0.14), [0.1, -0.33, 0.04]);           // 右足
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

  // ══════════════ 骨骼 SKELETON ══════════════
  addMesh('skull', new THREE.SphereGeometry(0.145, 18, 18), [0, 1.65, 0]);                                                                  // 頭骨
  addMesh('mandible', new THREE.BoxGeometry(0.11, 0.045, 0.09), [0, 1.525, 0.04]);                                                          // 下頜骨
  for (let i = 0; i < 7; i++)  addMesh('cervical',  new THREE.CylinderGeometry(0.022, 0.024, 0.055, 8), [0, 1.445 - i * 0.057, -0.01]);    // 頸椎 C1-C7
  for (let i = 0; i < 12; i++) addMesh('thoracic',  new THREE.CylinderGeometry(0.025, 0.027, 0.055, 8), [0, 1.053 - i * 0.055, -0.015]);   // 胸椎 T1-T12
  for (let i = 0; i < 5; i++)  addMesh('lumbar',    new THREE.CylinderGeometry(0.032, 0.034, 0.055, 8), [0, 0.397 - i * 0.057, -0.01]);    // 腰椎 L1-L5
  addMesh('sternum', new THREE.BoxGeometry(0.038, 0.21, 0.02), [0, 1.28, 0.095]);                                                           // 胸骨
  for (let i = 0; i < 6; i++) {                                                                                                              // 肋骨（示意 6 對）
    const y = 1.38 - i * 0.055, rx = 0.12 + i * 0.005;
    addMesh('ribs', new THREE.TorusGeometry(rx, 0.011, 7, 18, Math.PI * 1.05), [0, y, 0], [Math.PI / 2, 0, 0]);
  }
  addMesh('clavicle_l', new THREE.CylinderGeometry(0.011, 0.011, 0.22, 8), [-0.12, 1.445, 0.055], [0, 0,  Math.PI / 3.2]); // 左鎖骨
  addMesh('clavicle_r', new THREE.CylinderGeometry(0.011, 0.011, 0.22, 8), [ 0.12, 1.445, 0.055], [0, 0, -Math.PI / 3.2]); // 右鎖骨
  addMesh('scapula_l', new THREE.BoxGeometry(0.11, 0.14, 0.015), [-0.18, 1.28, -0.06]);  // 左肩胛骨
  addMesh('scapula_r', new THREE.BoxGeometry(0.11, 0.14, 0.015), [ 0.18, 1.28, -0.06]);  // 右肩胛骨
  addMesh('pelvis', new THREE.TorusGeometry(0.155, 0.038, 9, 16, Math.PI * 1.6), [0, 0.78, 0], [Math.PI / 2, 0, Math.PI * 0.8]); // 骨盆
  addMesh('humerus_l', new THREE.CylinderGeometry(0.026, 0.021, 0.33, 9), [-0.275, 1.22, 0]); // 左肱骨
  addMesh('humerus_r', new THREE.CylinderGeometry(0.026, 0.021, 0.33, 9), [ 0.275, 1.22, 0]); // 右肱骨
  addMesh('radius_l', new THREE.CylinderGeometry(0.014, 0.011, 0.27, 8), [-0.31, 0.905,  0.028]); // 左橈骨
  addMesh('radius_r', new THREE.CylinderGeometry(0.014, 0.011, 0.27, 8), [ 0.31, 0.905,  0.028]); // 右橈骨
  addMesh('ulna_l',   new THREE.CylinderGeometry(0.012, 0.009, 0.27, 8), [-0.275, 0.905, -0.02]); // 左尺骨
  addMesh('ulna_r',   new THREE.CylinderGeometry(0.012, 0.009, 0.27, 8), [ 0.275, 0.905, -0.02]); // 右尺骨
  addMesh('femur_l', new THREE.CylinderGeometry(0.036, 0.031, 0.46, 10), [-0.1, 0.445, 0]); // 左股骨
  addMesh('femur_r', new THREE.CylinderGeometry(0.036, 0.031, 0.46, 10), [ 0.1, 0.445, 0]); // 右股骨
  addMesh('patella_l', new THREE.SphereGeometry(0.025, 10, 10), [-0.1, 0.2,  0.045]); // 左髕骨
  addMesh('patella_r', new THREE.SphereGeometry(0.025, 10, 10), [ 0.1, 0.2,  0.045]); // 右髕骨
  addMesh('tibia_l', new THREE.CylinderGeometry(0.026, 0.02, 0.4, 9), [-0.1,  -0.08,  0.01]); // 左脛骨
  addMesh('tibia_r', new THREE.CylinderGeometry(0.026, 0.02, 0.4, 9), [ 0.1,  -0.08,  0.01]); // 右脛骨
  addMesh('fibula_l', new THREE.CylinderGeometry(0.012, 0.009, 0.38, 8), [-0.127, -0.09, -0.01]); // 左腓骨
  addMesh('fibula_r', new THREE.CylinderGeometry(0.012, 0.009, 0.38, 8), [ 0.127, -0.09, -0.01]); // 右腓骨

  // ══════════════ 肌肉 MUSCLE（主要表淺層）══════════════
  addMesh('trapezius',        new THREE.BoxGeometry(0.36, 0.22, 0.032),        [0, 1.36, -0.07]);                      // 斜方肌（後背上）
  addMesh('pec_major',        new THREE.BoxGeometry(0.31, 0.175, 0.055),        [0, 1.285, 0.095]);                    // 胸大肌（前胸）
  addMesh('deltoid_l',        new THREE.SphereGeometry(0.068, 12, 10),  [-0.225, 1.38, 0],   [0,0,0], [1,0.75,0.85]); // 左三角肌
  addMesh('deltoid_r',        new THREE.SphereGeometry(0.068, 12, 10),  [ 0.225, 1.38, 0],   [0,0,0], [1,0.75,0.85]); // 右三角肌
  addMesh('biceps_l',         new THREE.CylinderGeometry(0.042, 0.032, 0.26, 9), [-0.273, 1.24,  0.032]);              // 左肱二頭肌
  addMesh('biceps_r',         new THREE.CylinderGeometry(0.042, 0.032, 0.26, 9), [ 0.273, 1.24,  0.032]);              // 右肱二頭肌
  addMesh('rectus_abdominis', new THREE.BoxGeometry(0.095, 0.29, 0.042),         [0, 1.1, 0.105]);                     // 腹直肌（前腹正中）
  addMesh('quadriceps_l',     new THREE.CylinderGeometry(0.066, 0.055, 0.38, 10), [-0.1, 0.445,  0.042]);             // 左股四頭肌（前大腿）
  addMesh('quadriceps_r',     new THREE.CylinderGeometry(0.066, 0.055, 0.38, 10), [ 0.1, 0.445,  0.042]);             // 右股四頭肌
  addMesh('gastrocnemius_l',  new THREE.CylinderGeometry(0.046, 0.026, 0.29, 9), [-0.1, -0.065, -0.02]);              // 左腓腸肌（小腿後）
  addMesh('gastrocnemius_r',  new THREE.CylinderGeometry(0.046, 0.026, 0.29, 9), [ 0.1, -0.065, -0.02]);              // 右腓腸肌

  // ══════════════ 關節 JOINT ══════════════
  addMesh('shoulder_l', new THREE.SphereGeometry(0.044, 14, 14), [-0.225, 1.43, 0]);  // 左肩關節
  addMesh('shoulder_r', new THREE.SphereGeometry(0.044, 14, 14), [ 0.225, 1.43, 0]);  // 右肩關節
  addMesh('elbow_l',    new THREE.SphereGeometry(0.034, 12, 12), [-0.285, 1.06, 0]);  // 左肘關節
  addMesh('elbow_r',    new THREE.SphereGeometry(0.034, 12, 12), [ 0.285, 1.06, 0]);  // 右肘關節
  addMesh('hip_l',      new THREE.SphereGeometry(0.05,  14, 14), [-0.145, 0.68, 0]);  // 左髖關節
  addMesh('hip_r',      new THREE.SphereGeometry(0.05,  14, 14), [ 0.145, 0.68, 0]);  // 右髖關節
  addMesh('knee_l',     new THREE.SphereGeometry(0.047, 14, 14), [-0.1,   0.2,  0]);  // 左膝關節
  addMesh('knee_r',     new THREE.SphereGeometry(0.047, 14, 14), [ 0.1,   0.2,  0]);  // 右膝關節
  addMesh('ankle_l',    new THREE.SphereGeometry(0.032, 12, 12), [-0.1,  -0.295, 0]); // 左踝關節
  addMesh('ankle_r',    new THREE.SphereGeometry(0.032, 12, 12), [ 0.1,  -0.295, 0]); // 右踝關節

  // ══════════════ 韌帶 LIGAMENT ══════════════
  addMesh('acl_l', new THREE.CylinderGeometry(0.008, 0.008, 0.085, 6), [-0.1, 0.2,  0.01],  [ 0.3, 0,  0.12]); // 左前十字韌帶
  addMesh('acl_r', new THREE.CylinderGeometry(0.008, 0.008, 0.085, 6), [ 0.1, 0.2,  0.01],  [ 0.3, 0, -0.12]); // 右前十字韌帶
  addMesh('pcl_l', new THREE.CylinderGeometry(0.009, 0.009, 0.085, 6), [-0.1, 0.2, -0.01],  [-0.3, 0,  0.1]);  // 左後十字韌帶
  addMesh('pcl_r', new THREE.CylinderGeometry(0.009, 0.009, 0.085, 6), [ 0.1, 0.2, -0.01],  [-0.3, 0, -0.1]);  // 右後十字韌帶
  addMesh('mcl_l', new THREE.CylinderGeometry(0.009, 0.009, 0.125, 6), [-0.148, 0.2, 0]);                       // 左內側副韌帶
  addMesh('mcl_r', new THREE.CylinderGeometry(0.009, 0.009, 0.125, 6), [ 0.148, 0.2, 0]);                       // 右內側副韌帶
  addMesh('lig_shoulder_l', new THREE.TorusGeometry(0.04, 0.007, 6, 12, Math.PI * 1.2), [-0.225, 1.43, 0], [Math.PI / 2,  0.3, 0]); // 左肩韌帶弧
  addMesh('lig_shoulder_r', new THREE.TorusGeometry(0.04, 0.007, 6, 12, Math.PI * 1.2), [ 0.225, 1.43, 0], [Math.PI / 2, -0.3, 0]); // 右肩韌帶弧

  // ══════════════ 經絡 MERIDIAN ══════════════
  tube(curve([-0.08,1.28,0.1],[-0.18,1.22,0.07],[-0.26,1.06,0.05],[-0.3,0.87,0.06],[-0.315,0.7,0.06],[-0.33,0.65,0.07]), 'lung_meridian', 0.006);              // 肺經 LU（左前臂內側→拇指）
  tube(curve([-0.07,1.38,0.0],[-0.2,1.22,-0.03],[-0.26,1.06,-0.05],[-0.28,0.87,-0.06],[-0.295,0.7,-0.05],[-0.31,0.62,-0.03]), 'heart_meridian', 0.006);         // 心經 HT（左前臂後內側）
  tube(curve([-0.04,1.66,0.13],[-0.05,1.45,0.13],[-0.055,1.25,0.13],[-0.06,1.05,0.13],[-0.07,0.85,0.11],[-0.08,0.68,0.09],[-0.1,0.44,0.08],[-0.1,0.2,0.09],[-0.1,-0.08,0.09],[-0.1,-0.3,0.08]), 'stomach_meridian', 0.006); // 胃經 ST（前正中偏左，頭→腳趾）
  tube(curve([0,0.68,-0.07],[0,0.9,-0.07],[0,1.1,-0.06],[0,1.3,-0.055],[0,1.5,-0.04],[0,1.64,-0.02],[0,1.73,0.0],[0,1.79,0.07]), 'governing_vessel', 0.007);     // 督脈 GV（後正中線）
  tube(curve([0,0.68,0.085],[0,0.9,0.1],[0,1.1,0.115],[0,1.3,0.115],[0,1.5,0.1],[0,1.63,0.085],[0,1.73,0.07]), 'conception_vessel', 0.007);                      // 任脈 CV（前正中線）
  tube(curve([-0.03,1.73,-0.1],[-0.03,1.5,-0.09],[-0.03,1.3,-0.09],[-0.035,1.1,-0.09],[-0.04,0.9,-0.085],[-0.07,0.7,-0.06],[-0.09,0.5,-0.04],[-0.1,0.3,-0.03],[-0.1,0.1,-0.03],[-0.1,-0.09,-0.03],[-0.1,-0.28,-0.03]), 'bladder_meridian', 0.006); // 膀胱經 BL（後側，眼→小趾）

  // ══════════════ 神經 NERVE ══════════════
  tube(curve([-0.04,1.52,-0.01],[-0.1,1.47,0.01],[-0.18,1.43,0.01],[-0.24,1.38,0.01],[-0.27,1.25,0.01],[-0.28,1.06,0.01]), 'brachial_plexus', 0.005);  // 臂叢神經（C5-T1，左側）
  tube(curve([-0.08,0.66,-0.05],[-0.09,0.5,-0.05],[-0.1,0.34,-0.04],[-0.1,0.2,-0.04],[-0.1,0.0,-0.04],[-0.1,-0.15,-0.035],[-0.1,-0.28,-0.02]), 'sciatic_l', 0.006); // 左坐骨神經
  tube(curve([ 0.08,0.66,-0.05],[ 0.09,0.5,-0.05],[ 0.1,0.34,-0.04],[ 0.1,0.2,-0.04],[ 0.1,0.0,-0.04],[ 0.1,-0.15,-0.035],[ 0.1,-0.28,-0.02]), 'sciatic_r', 0.006); // 右坐骨神經
  tube(curve([-0.09,0.67,0.05],[-0.1,0.52,0.06],[-0.1,0.37,0.07],[-0.1,0.22,0.08]), 'femoral_l', 0.005); // 左股神經
  tube(curve([ 0.09,0.67,0.05],[ 0.1,0.52,0.06],[ 0.1,0.37,0.07],[ 0.1,0.22,0.08]), 'femoral_r', 0.005); // 右股神經
  tube(curve([-0.24,1.06,0.02],[-0.28,0.92,0.03],[-0.305,0.78,0.03],[-0.315,0.66,0.03]), 'median_l', 0.005);  // 左正中神經
  tube(curve([ 0.24,1.06,0.02],[ 0.28,0.92,0.03],[ 0.305,0.78,0.03],[ 0.315,0.66,0.03]), 'median_r', 0.005); // 右正中神經
  tube(curve([-0.27,1.06,-0.01],[-0.31,0.92,-0.01],[-0.33,0.78,-0.01],[-0.34,0.64,-0.01]), 'radial_l', 0.005);  // 左橈神經
  tube(curve([ 0.27,1.06,-0.01],[ 0.31,0.92,-0.01],[ 0.33,0.78,-0.01],[ 0.34,0.64,-0.01]), 'radial_r', 0.005); // 右橈神經

  // ══════════════ 骨骼（延伸部位）══════════════
  addMesh('sacrum',  new THREE.ConeGeometry(0.052, 0.13, 8), [0, 0.618, -0.055], [Math.PI, 0, 0]); // 薦骨（骨盆後側）
  addMesh('coccyx',  new THREE.ConeGeometry(0.018, 0.05, 6), [0, 0.535, -0.06],  [Math.PI, 0, 0]); // 尾骨
  addMesh('carpals_l',       new THREE.BoxGeometry(0.052, 0.03,  0.026), [-0.31, 0.655, 0.018]); // 左腕骨
  addMesh('carpals_r',       new THREE.BoxGeometry(0.052, 0.03,  0.026), [ 0.31, 0.655, 0.018]); // 右腕骨
  addMesh('metacarpals_l',   new THREE.BoxGeometry(0.06,  0.07,  0.02),  [-0.31, 0.6,   0.018]); // 左掌骨
  addMesh('metacarpals_r',   new THREE.BoxGeometry(0.06,  0.07,  0.02),  [ 0.31, 0.6,   0.018]); // 右掌骨
  addMesh('phalanges_hand_l',new THREE.BoxGeometry(0.06,  0.05,  0.015), [-0.31, 0.545, 0.018]); // 左手指骨
  addMesh('phalanges_hand_r',new THREE.BoxGeometry(0.06,  0.05,  0.015), [ 0.31, 0.545, 0.018]); // 右手指骨
  addMesh('calcaneus_l',     new THREE.SphereGeometry(0.03, 10, 10),     [-0.1, -0.345, -0.04]); // 左跟骨
  addMesh('calcaneus_r',     new THREE.SphereGeometry(0.03, 10, 10),     [ 0.1, -0.345, -0.04]); // 右跟骨
  addMesh('metatarsals_l',   new THREE.BoxGeometry(0.06, 0.022, 0.085),  [-0.1, -0.36,   0.06]); // 左蹠骨
  addMesh('metatarsals_r',   new THREE.BoxGeometry(0.06, 0.022, 0.085),  [ 0.1, -0.36,   0.06]); // 右蹠骨
  addMesh('phalanges_foot_l',new THREE.BoxGeometry(0.06, 0.016, 0.03),   [-0.1, -0.365,  0.12]); // 左足趾骨
  addMesh('phalanges_foot_r',new THREE.BoxGeometry(0.06, 0.016, 0.03),   [ 0.1, -0.365,  0.12]); // 右足趾骨

  // ══════════════ 肌肉（延伸層）══════════════
  addMesh('sternocleidomastoid', new THREE.CylinderGeometry(0.013, 0.013, 0.16, 8), [-0.05, 1.5, 0.05], [0.2, 0,  0.35]); // 左胸鎖乳突肌
  addMesh('sternocleidomastoid', new THREE.CylinderGeometry(0.013, 0.013, 0.16, 8), [ 0.05, 1.5, 0.05], [0.2, 0, -0.35]); // 右胸鎖乳突肌
  addMesh('latissimus_dorsi',    new THREE.BoxGeometry(0.34, 0.3, 0.03),             [0, 1.12, -0.075]);                   // 背闊肌（後背大面）
  addMesh('triceps_l',           new THREE.CylinderGeometry(0.04,  0.03,  0.26, 9),  [-0.275, 1.23, -0.03]);              // 左肱三頭肌（後上臂）
  addMesh('triceps_r',           new THREE.CylinderGeometry(0.04,  0.03,  0.26, 9),  [ 0.275, 1.23, -0.03]);              // 右肱三頭肌
  addMesh('forearm_flexors_l',   new THREE.CylinderGeometry(0.034, 0.022, 0.24, 9),  [-0.3, 0.9,  0.03]);                 // 左前臂屈肌群
  addMesh('forearm_flexors_r',   new THREE.CylinderGeometry(0.034, 0.022, 0.24, 9),  [ 0.3, 0.9,  0.03]);                 // 右前臂屈肌群
  addMesh('external_oblique',    new THREE.BoxGeometry(0.06, 0.2, 0.07),             [-0.13, 1.08, 0.04]);                 // 左腹外斜肌
  addMesh('external_oblique',    new THREE.BoxGeometry(0.06, 0.2, 0.07),             [ 0.13, 1.08, 0.04]);                 // 右腹外斜肌
  addMesh('gluteus_maximus',     new THREE.SphereGeometry(0.085, 12, 10),            [-0.08, 0.69, -0.085], [0,0,0], [1,0.9,0.8]); // 左臀大肌
  addMesh('gluteus_maximus',     new THREE.SphereGeometry(0.085, 12, 10),            [ 0.08, 0.69, -0.085], [0,0,0], [1,0.9,0.8]); // 右臀大肌
  addMesh('biceps_femoris_l',    new THREE.CylinderGeometry(0.058, 0.048, 0.38, 10), [-0.1, 0.445, -0.042]);               // 左股二頭肌（後大腿外側）
  addMesh('biceps_femoris_r',    new THREE.CylinderGeometry(0.058, 0.048, 0.38, 10), [ 0.1, 0.445, -0.042]);               // 右股二頭肌
  addMesh('tibialis_anterior_l', new THREE.CylinderGeometry(0.03,  0.02,  0.34, 9),  [-0.082, -0.07, 0.035]);              // 左脛骨前肌（小腿前外）
  addMesh('tibialis_anterior_r', new THREE.CylinderGeometry(0.03,  0.02,  0.34, 9),  [ 0.082, -0.07, 0.035]);              // 右脛骨前肌

  // ── 臀部肌群（臀中肌 / 臀小肌 / 闊筋膜張肌）────────────────────────────
  addMesh('gluteus_medius_l',       new THREE.SphereGeometry(0.062, 12, 10), [-0.1,  0.73, -0.055], [0,0,0], [1,0.78,0.7]);  // 左臀中肌
  addMesh('gluteus_medius_r',       new THREE.SphereGeometry(0.062, 12, 10), [ 0.1,  0.73, -0.055], [0,0,0], [1,0.78,0.7]);  // 右臀中肌
  addMesh('gluteus_minimus_l',      new THREE.SphereGeometry(0.044, 10, 10), [-0.11, 0.7,  -0.035], [0,0,0], [1,0.68,0.64]); // 左臀小肌（深層）
  addMesh('gluteus_minimus_r',      new THREE.SphereGeometry(0.044, 10, 10), [ 0.11, 0.7,  -0.035], [0,0,0], [1,0.68,0.64]); // 右臀小肌
  addMesh('tensor_fasciae_latae_l', new THREE.CylinderGeometry(0.024, 0.017, 0.14, 8), [-0.14, 0.7, 0.03]); // 左闊筋膜張肌（髂脛束上端）
  addMesh('tensor_fasciae_latae_r', new THREE.CylinderGeometry(0.024, 0.017, 0.14, 8), [ 0.14, 0.7, 0.03]); // 右闊筋膜張肌

  // ── 旋轉肌袖（棘上 / 棘下 / 肩胛下 / 小圓 / 大圓）──────────────────────
  addMesh('supraspinatus_l',  new THREE.CylinderGeometry(0.021, 0.015, 0.13, 8), [-0.205, 1.395, -0.024], [0, 0,  Math.PI * 0.46]); // 左棘上肌（肩胛岡上方）
  addMesh('supraspinatus_r',  new THREE.CylinderGeometry(0.021, 0.015, 0.13, 8), [ 0.205, 1.395, -0.024], [0, 0, -Math.PI * 0.46]); // 右棘上肌
  addMesh('infraspinatus_l',  new THREE.BoxGeometry(0.09, 0.08, 0.02), [-0.18,  1.245, -0.077]); // 左棘下肌（肩胛岡下方）
  addMesh('infraspinatus_r',  new THREE.BoxGeometry(0.09, 0.08, 0.02), [ 0.18,  1.245, -0.077]); // 右棘下肌
  addMesh('subscapularis_l',  new THREE.BoxGeometry(0.088, 0.1, 0.018), [-0.184, 1.27, -0.028]); // 左肩胛下肌（肩胛骨前面）
  addMesh('subscapularis_r',  new THREE.BoxGeometry(0.088, 0.1, 0.018), [ 0.184, 1.27, -0.028]); // 右肩胛下肌
  addMesh('teres_minor_l',    new THREE.CylinderGeometry(0.016, 0.011, 0.15, 8), [-0.21, 1.285, -0.054], [0, 0,  0.32]); // 左小圓肌
  addMesh('teres_minor_r',    new THREE.CylinderGeometry(0.016, 0.011, 0.15, 8), [ 0.21, 1.285, -0.054], [0, 0, -0.32]); // 右小圓肌
  addMesh('teres_major_l',    new THREE.CylinderGeometry(0.022, 0.015, 0.2,  8), [-0.22, 1.195, -0.043], [0, 0,  0.3]);  // 左大圓肌
  addMesh('teres_major_r',    new THREE.CylinderGeometry(0.022, 0.015, 0.2,  8), [ 0.22, 1.195, -0.043], [0, 0, -0.3]);  // 右大圓肌

  // ── 前臂 / 前鋸肌 / 比目魚肌 ─────────────────────────────────────────────
  addMesh('brachioradialis_l',  new THREE.CylinderGeometry(0.022, 0.013, 0.22, 8), [-0.31, 0.9, 0.018]); // 左肱橈肌（前臂外側）
  addMesh('brachioradialis_r',  new THREE.CylinderGeometry(0.022, 0.013, 0.22, 8), [ 0.31, 0.9, 0.018]); // 右肱橈肌
  addMesh('serratus_anterior',  new THREE.BoxGeometry(0.05, 0.19, 0.04), [-0.175, 1.2, 0.072]); // 左前鋸肌（肋骨外側）
  addMesh('serratus_anterior',  new THREE.BoxGeometry(0.05, 0.19, 0.04), [ 0.175, 1.2, 0.072]); // 右前鋸肌
  addMesh('soleus_l',           new THREE.CylinderGeometry(0.04, 0.022, 0.27, 9), [-0.1, -0.112, -0.018]); // 左比目魚肌（腓腸肌深層）
  addMesh('soleus_r',           new THREE.CylinderGeometry(0.04, 0.022, 0.27, 9), [ 0.1, -0.112, -0.018]); // 右比目魚肌

  // ── 菱形肌（上背、肩胛骨之間）────────────────────────────────────────────
  addMesh('rhomboid_major_l', new THREE.BoxGeometry(0.088, 0.1,   0.022), [-0.13, 1.21, -0.078], [0, 0, -0.2]); // 左菱形大肌（T2-T5 → 肩胛骨內緣）
  addMesh('rhomboid_major_r', new THREE.BoxGeometry(0.088, 0.1,   0.022), [ 0.13, 1.21, -0.078], [0, 0,  0.2]); // 右菱形大肌
  addMesh('rhomboid_minor_l', new THREE.BoxGeometry(0.06,  0.055, 0.018), [-0.1,  1.33, -0.074], [0, 0, -0.18]); // 左菱形小肌（C6-T1 → 肩胛骨）
  addMesh('rhomboid_minor_r', new THREE.BoxGeometry(0.06,  0.055, 0.018), [ 0.1,  1.33, -0.074], [0, 0,  0.18]); // 右菱形小肌

  // ── 髖深層旋肌 ───────────────────────────────────────────────────────────
  addMesh('piriformis_l',       new THREE.CylinderGeometry(0.021, 0.014, 0.13, 8), [-0.09, 0.625, -0.063], [0, 0,  Math.PI * 0.38]); // 左梨狀肌（薦骨→大轉子）
  addMesh('piriformis_r',       new THREE.CylinderGeometry(0.021, 0.014, 0.13, 8), [ 0.09, 0.625, -0.063], [0, 0, -Math.PI * 0.38]); // 右梨狀肌
  addMesh('obturator_internus_l', new THREE.CylinderGeometry(0.017, 0.013, 0.09, 7), [-0.084, 0.598, -0.027], [0,  0.5,  0.45]); // 左閉孔內肌
  addMesh('obturator_internus_r', new THREE.CylinderGeometry(0.017, 0.013, 0.09, 7), [ 0.084, 0.598, -0.027], [0, -0.5, -0.45]); // 右閉孔內肌
  addMesh('quadratus_femoris_l',  new THREE.CylinderGeometry(0.019, 0.019, 0.088, 7), [-0.098, 0.578, -0.053], [0, 0,  Math.PI / 2]); // 左股方肌（坐骨→轉子間嵴）
  addMesh('quadratus_femoris_r',  new THREE.CylinderGeometry(0.019, 0.019, 0.088, 7), [ 0.098, 0.578, -0.053], [0, 0, -Math.PI / 2]); // 右股方肌

  // ── 髂腰肌（髂肌 + 腰大肌）──────────────────────────────────────────────
  addMesh('iliacus_l',    new THREE.CylinderGeometry(0.038, 0.023, 0.19, 9), [-0.09, 0.62,  0.038], [0.18, 0,  0.22]); // 左髂肌（髂窩→小轉子）
  addMesh('iliacus_r',    new THREE.CylinderGeometry(0.038, 0.023, 0.19, 9), [ 0.09, 0.62,  0.038], [0.18, 0, -0.22]); // 右髂肌
  addMesh('psoas_major_l',new THREE.CylinderGeometry(0.024, 0.019, 0.34, 8), [-0.05, 0.55,  0.028], [0.12, 0,  0.16]); // 左腰大肌（腰椎→小轉子）
  addMesh('psoas_major_r',new THREE.CylinderGeometry(0.024, 0.019, 0.34, 8), [ 0.05, 0.55,  0.028], [0.12, 0, -0.16]); // 右腰大肌

  // ── 縫匠肌（最長肌，斜跨大腿前面）───────────────────────────────────────
  addMesh('sartorius_l', new THREE.CylinderGeometry(0.013, 0.009, 0.54, 8), [-0.09, 0.44, 0.05], [0, 0,  0.14]); // 左縫匠肌（ASIS→脛骨內側）
  addMesh('sartorius_r', new THREE.CylinderGeometry(0.013, 0.009, 0.54, 8), [ 0.09, 0.44, 0.05], [0, 0, -0.14]); // 右縫匠肌

  // ── 大腿內側（內收肌群 + 股薄肌 + 恥骨肌）───────────────────────────────
  addMesh('gracilis_l',       new THREE.CylinderGeometry(0.013, 0.009, 0.44, 8), [-0.04,  0.39,   0.014]);                       // 左股薄肌（最內側細長）
  addMesh('gracilis_r',       new THREE.CylinderGeometry(0.013, 0.009, 0.44, 8), [ 0.04,  0.39,   0.014]);                       // 右股薄肌
  addMesh('pectineus_l',      new THREE.CylinderGeometry(0.021, 0.016, 0.1,  8), [-0.072, 0.608,  0.042], [0.12, 0,  0.28]);     // 左恥骨肌（恥骨→股骨）
  addMesh('pectineus_r',      new THREE.CylinderGeometry(0.021, 0.016, 0.1,  8), [ 0.072, 0.608,  0.042], [0.12, 0, -0.28]);     // 右恥骨肌
  addMesh('adductor_longus_l',new THREE.CylinderGeometry(0.027, 0.018, 0.33, 9), [-0.06,  0.44,   0.038], [0.1,  0,  0.18]);     // 左內收長肌
  addMesh('adductor_longus_r',new THREE.CylinderGeometry(0.027, 0.018, 0.33, 9), [ 0.06,  0.44,   0.038], [0.1,  0, -0.18]);     // 右內收長肌
  addMesh('adductor_brevis_l',new THREE.CylinderGeometry(0.023, 0.016, 0.2,  8), [-0.065, 0.538,  0.018], [0.16, 0,  0.26]);     // 左內收短肌（在長肌後方）
  addMesh('adductor_brevis_r',new THREE.CylinderGeometry(0.023, 0.016, 0.2,  8), [ 0.065, 0.538,  0.018], [0.16, 0, -0.26]);     // 右內收短肌
  addMesh('adductor_magnus_l',new THREE.CylinderGeometry(0.04,  0.027, 0.44, 10),[-0.055, 0.415,  0.0],   [0,    0,  0.1]);      // 左內收大肌（最大、兩用）
  addMesh('adductor_magnus_r',new THREE.CylinderGeometry(0.04,  0.027, 0.44, 10),[ 0.055, 0.415,  0.0],   [0,    0, -0.1]);      // 右內收大肌

  // ── 大腿後側（膕繩肌群：半腱 / 半膜）────────────────────────────────────
  addMesh('semitendinosus_l',  new THREE.CylinderGeometry(0.025, 0.017, 0.36, 9), [-0.068, 0.44, -0.056]); // 左半腱肌（細長，止於鵝足腱）
  addMesh('semitendinosus_r',  new THREE.CylinderGeometry(0.025, 0.017, 0.36, 9), [ 0.068, 0.44, -0.056]); // 右半腱肌
  addMesh('semimembranosus_l', new THREE.CylinderGeometry(0.031, 0.021, 0.35, 9), [-0.055, 0.44, -0.042]); // 左半膜肌（扁寬，最內側膕繩肌）
  addMesh('semimembranosus_r', new THREE.CylinderGeometry(0.031, 0.021, 0.35, 9), [ 0.055, 0.44, -0.042]); // 右半膜肌

  // ── 小腿外側（腓骨肌群 + 膕肌）──────────────────────────────────────────
  addMesh('fibularis_longus_l',  new THREE.CylinderGeometry(0.021, 0.013, 0.3,  8), [-0.128, -0.08,  0.014]); // 左腓骨長肌（沿腓骨外側）
  addMesh('fibularis_longus_r',  new THREE.CylinderGeometry(0.021, 0.013, 0.3,  8), [ 0.128, -0.08,  0.014]); // 右腓骨長肌
  addMesh('fibularis_brevis_l',  new THREE.CylinderGeometry(0.017, 0.011, 0.2,  8), [-0.128, -0.166, 0.012]); // 左腓骨短肌（止於第五蹠骨）
  addMesh('fibularis_brevis_r',  new THREE.CylinderGeometry(0.017, 0.011, 0.2,  8), [ 0.128, -0.166, 0.012]); // 右腓骨短肌
  addMesh('popliteus_l',         new THREE.CylinderGeometry(0.017, 0.013, 0.065, 7), [-0.1, 0.167, -0.043], [0, 0,  0.36]); // 左膕肌（解鎖膝關節）
  addMesh('popliteus_r',         new THREE.CylinderGeometry(0.017, 0.013, 0.065, 7), [ 0.1, 0.167, -0.043], [0, 0, -0.36]); // 右膕肌

  // ── 橫隔膜（肋骨下緣水平環）─────────────────────────────────────────────
  addMesh('diaphragm', new THREE.TorusGeometry(0.114, 0.017, 8, 18), [0, 0.988, 0.018], [Math.PI / 2, 0, 0]); // 橫隔膜（呼吸主肌，分隔胸腹）

  // ── 頭顏面肌肉 ───────────────────────────────────────────────────────────
  addMesh('masseter_l',       new THREE.BoxGeometry(0.03, 0.062, 0.024),   [-0.063, 1.545, 0.06]);                        // 左咬肌（顴弓→下頜骨）
  addMesh('masseter_r',       new THREE.BoxGeometry(0.03, 0.062, 0.024),   [ 0.063, 1.545, 0.06]);                        // 右咬肌
  addMesh('temporalis_l',     new THREE.SphereGeometry(0.052, 10, 10),     [-0.1, 1.675, -0.005], [0,0,0], [1,0.47,0.57]); // 左顳肌（扇形，顳窩）
  addMesh('temporalis_r',     new THREE.SphereGeometry(0.052, 10, 10),     [ 0.1, 1.675, -0.005], [0,0,0], [1,0.47,0.57]); // 右顳肌
  addMesh('splenius_capitis_l',new THREE.CylinderGeometry(0.013, 0.011, 0.185, 8), [-0.04, 1.474, -0.044], [0.16, 0,  0.3]); // 左頭夾肌（後頸，同側轉頭）
  addMesh('splenius_capitis_r',new THREE.CylinderGeometry(0.013, 0.011, 0.185, 8), [ 0.04, 1.474, -0.044], [0.16, 0, -0.3]); // 右頭夾肌

  // ══════════════ 關節（延伸）══════════════
  addMesh('wrist_l',             new THREE.SphereGeometry(0.026, 12, 12), [-0.31, 0.66,   0.012]); // 左腕關節
  addMesh('wrist_r',             new THREE.SphereGeometry(0.026, 12, 12), [ 0.31, 0.66,   0.012]); // 右腕關節
  addMesh('tmj',                 new THREE.SphereGeometry(0.018, 10, 10), [-0.072, 1.56,  0.035]); // 左顳顎關節 TMJ
  addMesh('tmj',                 new THREE.SphereGeometry(0.018, 10, 10), [ 0.072, 1.56,  0.035]); // 右顳顎關節
  addMesh('sacroiliac_l',        new THREE.SphereGeometry(0.022, 10, 10), [-0.05,  0.62, -0.05]);  // 左薦髂關節
  addMesh('sacroiliac_r',        new THREE.SphereGeometry(0.022, 10, 10), [ 0.05,  0.62, -0.05]);  // 右薦髂關節

  // ── 關節（細部參考位置）──────────────────────────────────────────────────
  const jointGeo = () => new THREE.SphereGeometry(0.02, 12, 12);
  addMesh('atlanto_occipital',    jointGeo(), [0,     1.55,  -0.01]); // 寰枕關節（頭顱與C1）
  addMesh('atlanto_axial',        jointGeo(), [0,     1.50,  -0.01]); // 寰樞關節（C1與C2，旋頭）
  addMesh('sternoclavicular',     new THREE.SphereGeometry(0.017, 10, 10), [-0.04, 1.43, 0.05]); // 左胸鎖關節
  addMesh('sternoclavicular',     new THREE.SphereGeometry(0.017, 10, 10), [ 0.04, 1.43, 0.05]); // 右胸鎖關節
  addMesh('acromioclavicular',    new THREE.SphereGeometry(0.017, 10, 10), [-0.2,  1.45, 0.02]); // 左肩鎖關節
  addMesh('acromioclavicular',    new THREE.SphereGeometry(0.017, 10, 10), [ 0.2,  1.45, 0.02]); // 右肩鎖關節
  addMesh('proximal_radioulnar',  new THREE.SphereGeometry(0.016, 10, 10), [-0.27, 1.05, -0.01]); // 左近端橈尺關節
  addMesh('proximal_radioulnar',  new THREE.SphereGeometry(0.016, 10, 10), [ 0.27, 1.05, -0.01]); // 右近端橈尺關節
  addMesh('distal_radioulnar',    new THREE.SphereGeometry(0.016, 10, 10), [-0.305, 0.69, 0.0]); // 左遠端橈尺關節
  addMesh('distal_radioulnar',    new THREE.SphereGeometry(0.016, 10, 10), [ 0.305, 0.69, 0.0]); // 右遠端橈尺關節
  addMesh('pubic_symphysis',      new THREE.SphereGeometry(0.02,  12, 12), [0,     0.635, 0.085]); // 恥骨聯合
  addMesh('proximal_tibiofibular',new THREE.SphereGeometry(0.016, 10, 10), [-0.13,  0.12, 0.0]);  // 左近端脛腓關節
  addMesh('proximal_tibiofibular',new THREE.SphereGeometry(0.016, 10, 10), [ 0.13,  0.12, 0.0]);  // 右近端脛腓關節
  addMesh('distal_tibiofibular',  new THREE.SphereGeometry(0.015, 10, 10), [-0.115, -0.26, 0.0]); // 左遠端脛腓關節
  addMesh('distal_tibiofibular',  new THREE.SphereGeometry(0.015, 10, 10), [ 0.115, -0.26, 0.0]); // 右遠端脛腓關節

  // ══════════════ 韌帶（延伸）══════════════
  addMesh('lcl_l',        new THREE.CylinderGeometry(0.008, 0.008, 0.12,  6), [-0.052, 0.2,    0]);                   // 左外側副韌帶
  addMesh('lcl_r',        new THREE.CylinderGeometry(0.008, 0.008, 0.12,  6), [ 0.052, 0.2,    0]);                   // 右外側副韌帶
  addMesh('patellar_lig_l',new THREE.CylinderGeometry(0.01,  0.01,  0.06,  6), [-0.1,   0.158,  0.05]);               // 左髕韌帶
  addMesh('patellar_lig_r',new THREE.CylinderGeometry(0.01,  0.01,  0.06,  6), [ 0.1,   0.158,  0.05]);               // 右髕韌帶
  addMesh('atfl_l',       new THREE.CylinderGeometry(0.006, 0.006, 0.045, 6), [-0.122, -0.3,   0.028], [0, 0,  0.5]); // 左距腓前韌帶（踝外側）
  addMesh('atfl_r',       new THREE.CylinderGeometry(0.006, 0.006, 0.045, 6), [ 0.122, -0.3,   0.028], [0, 0, -0.5]); // 右距腓前韌帶

  // ══════════════ 經絡（延伸）══════════════
  tube(curve([-0.33,0.62,0.0],[-0.34,0.78,-0.01],[-0.3,1.0,-0.02],[-0.26,1.2,-0.02],[-0.18,1.4,0.0],[-0.06,1.5,0.05],[0.02,1.6,0.12]), 'large_intestine_meridian', 0.006); // 大腸經 LI（食指→對側鼻翼）
  tube(curve([-0.13,-0.36,0.05],[-0.11,-0.2,0.0],[-0.085,0.0,0.02],[-0.07,0.3,0.05],[-0.09,0.6,0.08],[-0.11,0.9,0.1],[-0.13,1.15,0.09]), 'spleen_meridian', 0.006);       // 脾經 SP（大趾→腹部）
  tube(curve([-0.33,0.62,-0.03],[-0.31,0.78,-0.04],[-0.28,1.0,-0.05],[-0.24,1.2,-0.04],[-0.18,1.38,-0.05],[-0.1,1.45,-0.04],[-0.06,1.55,0.02]), 'small_intestine_meridian', 0.006); // 小腸經 SI（小指→耳）
  tube(curve([-0.1,-0.38,0.02],[-0.1,-0.34,-0.02],[-0.09,-0.15,-0.03],[-0.08,0.1,-0.01],[-0.07,0.4,0.04],[-0.05,0.7,0.08],[-0.04,1.0,0.1],[-0.03,1.25,0.09]), 'kidney_meridian', 0.006); // 腎經 KI（足底→腹）
  tube(curve([-0.06,1.3,0.1],[-0.16,1.25,0.06],[-0.24,1.1,0.04],[-0.28,0.9,0.04],[-0.31,0.72,0.03],[-0.32,0.6,0.02]), 'pericardium_meridian', 0.006);                     // 心包經 PC（胸→中指）
  tube(curve([-0.33,0.6,-0.02],[-0.33,0.78,-0.02],[-0.3,1.0,-0.03],[-0.26,1.2,-0.02],[-0.2,1.38,-0.02],[-0.1,1.47,-0.02],[-0.05,1.58,0.0]), 'sanjiao_meridian', 0.006);   // 三焦經 TE（無名指→耳眉）
  tube(curve([-0.06,1.66,0.08],[-0.1,1.6,0.0],[-0.06,1.5,-0.05],[-0.15,1.3,-0.02],[-0.16,1.1,0.0],[-0.16,0.85,0.02],[-0.15,0.6,0.03],[-0.14,0.3,0.0],[-0.13,0.0,-0.02],[-0.12,-0.3,0.04]), 'gallbladder_meridian', 0.006); // 膽經 GB（外眼角→第四趾）
  tube(curve([-0.11,-0.36,0.06],[-0.1,-0.2,0.02],[-0.08,0.0,0.03],[-0.07,0.3,0.06],[-0.08,0.6,0.09],[-0.1,0.9,0.1],[-0.12,1.15,0.09]), 'liver_meridian', 0.006);          // 肝經 LR（大趾→肋下）

  // ══════════════ 神經（延伸）══════════════
  tube(curve([-0.24,1.06,-0.01],[-0.27,0.92,0.0],[-0.29,0.78,0.0],[-0.31,0.66,0.0]), 'ulnar_l', 0.005);  // 左尺神經（前臂內側→小指）
  tube(curve([ 0.24,1.06,-0.01],[ 0.27,0.92,0.0],[ 0.29,0.78,0.0],[ 0.31,0.66,0.0]), 'ulnar_r', 0.005); // 右尺神經
  tube(curve([-0.1,0.0,-0.04],[-0.1,-0.15,-0.035],[-0.1,-0.28,-0.02],[-0.1,-0.36,0.0]), 'tibial_l', 0.005);  // 左脛神經（小腿後→足底）
  tube(curve([ 0.1,0.0,-0.04],[ 0.1,-0.15,-0.035],[ 0.1,-0.28,-0.02],[ 0.1,-0.36,0.0]), 'tibial_r', 0.005); // 右脛神經
  tube(curve([-0.1,0.05,-0.04],[-0.125,-0.05,-0.01],[-0.13,-0.15,0.02],[-0.12,-0.28,0.02]), 'common_peroneal_l', 0.005);  // 左腓總神經（繞腓骨頭）
  tube(curve([ 0.1,0.05,-0.04],[ 0.125,-0.05,-0.01],[ 0.13,-0.15,0.02],[ 0.12,-0.28,0.02]), 'common_peroneal_r', 0.005); // 右腓總神經

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
