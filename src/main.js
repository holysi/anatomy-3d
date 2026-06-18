import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadAnatomyData } from './anatomyData.js';
import { createMaterials, buildBody, createGhostBody, getClickableMeshes } from './bodyBuilder.js';
import { loadRealModel } from './realModel.js';

// ── Loaded data (populated in init) ────────────────────────────
let parts, layers, regions;
let partIndex = new Map(); // id -> part

// ── State ──────────────────────────────────────────────────────
const activeLayerState = {
  skeleton: true, muscle: false, ligament: false,
  joint: false, meridian: false, nerve: false,
};

let mode = 'schematic';            // 'schematic' | 'real'
let selectedPartId = null;
let materials = null;
let clickableMeshes = [];

// schematic (procedural) vs real (STL) worlds
let schematicGroup = null, realGroup = null;
let meshMapSchematic = null, meshMapReal = new Map();
let realReady = false;

// active map for the current mode
const meshMapOf = () => (mode === 'real' ? meshMapReal : meshMapSchematic);

// ── DOM refs ───────────────────────────────────────────────────
const canvasWrap = document.getElementById('canvas-wrap');
const tooltip    = document.getElementById('tooltip');
const infoPanel  = document.getElementById('info-panel');

// ── Three.js setup ─────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(canvasWrap.clientWidth, canvasWrap.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
canvasWrap.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080d14);
scene.fog = new THREE.FogExp2(0x080d14, 0.18);

const camera = new THREE.PerspectiveCamera(42, canvasWrap.clientWidth / canvasWrap.clientHeight, 0.01, 50);
camera.position.set(0, 0.7, 3.2);
camera.lookAt(0, 0.7, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.7, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 0.4;
controls.maxDistance = 6;
controls.update();

// ── Lighting ───────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x2a4a7a, 0.9));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(2, 4, 3);
dirLight.castShadow = true;
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0x4488cc, 0.5);
fillLight.position.set(-3, 2, -2);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0x80c0ff, 0.3);
rimLight.position.set(0, -2, -3);
scene.add(rimLight);

const grid = new THREE.GridHelper(4, 20, 0x1a2a3a, 0x111a28);
grid.position.y = -0.42;
scene.add(grid);

// ── Raycasting ─────────────────────────────────────────────────
const raycaster  = new THREE.Raycaster();
const mouse      = new THREE.Vector2();
let   hovered    = null;
const origColors = new Map();

const getPartInfo        = (id) => partIndex.get(id);
const getPartLayer       = (id) => { const p = partIndex.get(id); return p ? p.layer : null; };
const getAllMeshesForPart= (id) => meshMapOf().get(id) || [];
const isLayerVisible     = (layer) => layer ? activeLayerState[layer] : false;
const isModeled          = (id) => meshMapOf().has(id);

function highlightMeshes(partId, on) {
  getAllMeshesForPart(partId).forEach(m => {
    if (on) {
      if (!origColors.has(m.uuid)) origColors.set(m.uuid, m.material.emissiveIntensity);
      m.material.emissiveIntensity = 0.85;
    } else {
      const orig = origColors.get(m.uuid);
      if (orig !== undefined) m.material.emissiveIntensity = orig;
    }
  });
}

function pickPart(e) {
  const rect = canvasWrap.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(clickableMeshes);
  for (const h of hits) {
    const id = h.object.userData.partId;
    if (id && isLayerVisible(getPartLayer(id))) return id;
  }
  return null;
}

function onMouseMove(e) {
  const id = pickPart(e);
  if (id) {
    if (id !== hovered) {
      if (hovered && hovered !== selectedPartId) highlightMeshes(hovered, false);
      hovered = id;
      if (id !== selectedPartId) highlightMeshes(id, true);
    }
    showTooltip(e.clientX, e.clientY, getPartInfo(id));
    canvasWrap.style.cursor = 'pointer';
  } else {
    if (hovered && hovered !== selectedPartId) highlightMeshes(hovered, false);
    hovered = null;
    hideTooltip();
    canvasWrap.style.cursor = 'default';
  }
}

function onClick(e) {
  const id = pickPart(e);
  if (id) {
    selectPart(id, false);
  } else {
    clearSelection();
  }
}

// ── Selection ──────────────────────────────────────────────────
function selectPart(id, fromList) {
  if (selectedPartId && selectedPartId !== hovered) highlightMeshes(selectedPartId, false);
  selectedPartId = id;
  if (isModeled(id)) highlightMeshes(id, true);
  showInfoPanel(getPartInfo(id));
  syncListSelection();
  // Ensure the part's layer is on (so a list click reveals it)
  if (fromList) {
    const layer = getPartLayer(id);
    if (layer && !activeLayerState[layer]) {
      activeLayerState[layer] = true;
      updateLayerButton(layer);
      applyLayerVisibility();
    }
  }
}

function clearSelection() {
  if (selectedPartId) highlightMeshes(selectedPartId, false);
  selectedPartId = null;
  showInfoPanelEmpty();
  syncListSelection();
}

canvasWrap.addEventListener('mousemove', onMouseMove);
canvasWrap.addEventListener('click', onClick);

// ── Tooltip ────────────────────────────────────────────────────
function showTooltip(cx, cy, info) {
  if (!info) return;
  const layer = layers[info.layer];
  tooltip.innerHTML = `
    <div class="tt-zh">${info.name_zh}</div>
    <div class="tt-en">${info.name_en}</div>
    <div class="tt-layer" style="color:${layer.color}">${layer.label_zh} · ${layer.label_en}</div>`;
  const rect = canvasWrap.getBoundingClientRect();
  let x = cx - rect.left + 14, y = cy - rect.top - 10;
  if (x + 210 > rect.width)  x = cx - rect.left - 210;
  if (y + 80  > rect.height) y = cy - rect.top - 80;
  tooltip.style.left = x + 'px';
  tooltip.style.top  = y + 'px';
  tooltip.style.display = 'block';
}
const hideTooltip = () => { tooltip.style.display = 'none'; };

// ── Info panel ─────────────────────────────────────────────────
function showInfoPanel(info) {
  const layer = layers[info.layer];
  const region = regions[info.region];
  const meta = [];
  if (info.name_la) meta.push(`<div class="info-meta-row"><span>拉丁文 Latin</span><b>${info.name_la}</b></div>`);
  if (region)       meta.push(`<div class="info-meta-row"><span>區域 Region</span><b>${region.zh} · ${region.en}</b></div>`);
  if (info.fmaId)   meta.push(`<div class="info-meta-row"><span>FMA ID</span><b>${info.fmaId}</b></div>`);

  // joint-specific classification (from joint reference sheet)
  let jointBlock = '';
  if (info.layer === 'joint' && (info.joint_type || info.articulation_zh)) {
    const jr = [];
    if (info.joint_mobility)  jr.push(`<div class="info-meta-row"><span>動度分類</span><b>${info.joint_mobility}關節</b></div>`);
    if (info.joint_structure) jr.push(`<div class="info-meta-row"><span>構造分類</span><b>${info.joint_structure}關節</b></div>`);
    if (info.joint_type)      jr.push(`<div class="info-meta-row"><span>運動類型</span><b>${info.joint_type}</b></div>`);
    if (info.articulation_zh) jr.push(`<div class="info-meta-row info-meta-wide"><span>關節骨</span><b>${info.articulation_zh}</b></div>`);
    jointBlock = `
      <hr class="info-divider">
      <div class="info-section-title">關節分類 · Joint Classification</div>
      <div class="info-meta">${jr.join('')}</div>`;
  }

  let acu = '';
  if (info.acupoints && info.acupoints.length) {
    const chips = info.acupoints.map(a =>
      `<span class="acu-chip">${a.code} ${a.name_zh}<small>${a.name_en}</small></span>`).join('');
    acu = `
      <hr class="info-divider">
      <div class="info-section-title">代表穴位 · Key Acupoints ${info.acupoint_count ? `(共 ${info.acupoint_count} 穴)` : ''}</div>
      <div class="acu-wrap">${chips}</div>`;
  }

  const notModeled = isModeled(info.id) ? '' :
    `<div class="not-modeled">⚠ 此部位尚未建立 3D 模型，僅供清單查詢</div>`;

  infoPanel.innerHTML = `
    <div class="info-badge" style="--layer-color:${layer.color}">
      <span class="dot"></span>${layer.label_zh} · ${layer.label_en}
    </div>
    <div class="info-name-zh">${info.name_zh}</div>
    <div class="info-name-en">${info.name_en}</div>
    ${notModeled}
    <div class="info-meta">${meta.join('')}</div>
    ${jointBlock}
    <hr class="info-divider">
    <div class="info-section-title">中文說明</div>
    <p class="info-desc">${info.desc_zh}</p>
    <hr class="info-divider">
    <div class="info-section-title">English</div>
    <p class="info-desc">${info.desc_en}</p>
    ${acu}`;
  infoPanel.scrollTop = 0;
}

function showInfoPanelEmpty() {
  infoPanel.innerHTML = `
    <div class="info-empty">
      <span class="arrow">☝️</span>
      點擊 3D 模型上的部位，或從<br>下方清單選擇，查看詳細說明<br><br>
      <small>Click a body part or pick<br>from the list below</small>
    </div>`;
}

// ── Layer visibility ───────────────────────────────────────────
function applyLayerVisibility() {
  meshMapOf().forEach((meshes, partId) => {
    const visible = isLayerVisible(getPartLayer(partId));
    meshes.forEach(m => { m.visible = visible; });
  });
  filterList();
}

function updateLayerButton(layer) {
  const btn = document.querySelector(`.layer-btn[data-layer="${layer}"]`);
  if (btn) btn.classList.toggle('active', activeLayerState[layer]);
}

// ── Sidebar: layer toggles ─────────────────────────────────────
function buildLayerButtons() {
  const layerContainer = document.getElementById('layer-buttons');
  layerContainer.innerHTML = '';
  Object.entries(layers).forEach(([key, cfg]) => {
    const count = parts.filter(p => p.layer === key).length;
    const btn = document.createElement('button');
    btn.className = 'layer-btn' + (activeLayerState[key] ? ' active' : '');
    btn.style.setProperty('--layer-color', cfg.color);
    btn.dataset.layer = key;
    btn.innerHTML = `
      <span class="layer-dot" style="background:${cfg.color};box-shadow:0 0 6px ${cfg.color}"></span>
      <span class="layer-name-zh">${cfg.label_zh}</span>
      <span class="layer-count">${count}</span>
      <span class="layer-name-en">${cfg.label_en}</span>
      <span class="layer-check"></span>`;
    btn.addEventListener('click', () => {
      activeLayerState[key] = !activeLayerState[key];
      btn.classList.toggle('active', activeLayerState[key]);
      applyLayerVisibility();
      if (selectedPartId && getPartLayer(selectedPartId) === key && !activeLayerState[key]) {
        clearSelection();
      }
    });
    layerContainer.appendChild(btn);
  });
}

// ── Sidebar: searchable part list ──────────────────────────────
let listSearchTerm = '';

function buildPartList() {
  const listEl = document.getElementById('part-list');
  listEl.innerHTML = '';
  // group by layer, preserving layers config order
  Object.keys(layers).forEach(layerKey => {
    const cfg = layers[layerKey];
    const group = parts.filter(p => p.layer === layerKey);
    if (!group.length) return;
    const groupEl = document.createElement('div');
    groupEl.className = 'list-group';
    groupEl.dataset.layer = layerKey;
    groupEl.innerHTML = `<div class="list-group-head" style="--layer-color:${cfg.color}">
      <span class="layer-dot" style="background:${cfg.color}"></span>${cfg.label_zh} ${cfg.label_en}</div>`;
    group.forEach(p => {
      const item = document.createElement('button');
      item.className = 'list-item';
      item.dataset.id = p.id;
      item.dataset.search = `${p.name_zh} ${p.name_en} ${p.name_la || ''}`.toLowerCase();
      item.innerHTML = `
        <span class="li-zh">${p.name_zh}</span>
        <span class="li-en">${p.name_en}</span>
        ${isModeled(p.id) ? '' : '<span class="li-flag">未建模</span>'}`;
      item.addEventListener('click', () => {
        selectPart(p.id, true);
        if (isModeled(p.id)) pulseHighlight(p.id);
      });
      groupEl.appendChild(item);
    });
    listEl.appendChild(groupEl);
  });
}

function filterList() {
  const term = listSearchTerm.trim().toLowerCase();
  document.querySelectorAll('.list-group').forEach(group => {
    const layerKey = group.dataset.layer;
    const layerOn = activeLayerState[layerKey];
    let anyVisible = false;
    group.querySelectorAll('.list-item').forEach(item => {
      const matchTerm = !term || item.dataset.search.includes(term);
      // When searching, show across all layers; otherwise respect layer toggle
      const show = term ? matchTerm : (matchTerm && layerOn);
      item.style.display = show ? '' : 'none';
      if (show) anyVisible = true;
    });
    group.style.display = anyVisible ? '' : 'none';
  });
}

function syncListSelection() {
  document.querySelectorAll('.list-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.id === selectedPartId);
  });
  const sel = document.querySelector('.list-item.selected');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function pulseHighlight(id) {
  highlightMeshes(id, true);
}

// ── Control buttons ────────────────────────────────────────────
function wireControls() {
  document.getElementById('btn-all').addEventListener('click', () => {
    Object.keys(activeLayerState).forEach(k => activeLayerState[k] = true);
    document.querySelectorAll('.layer-btn').forEach(b => b.classList.add('active'));
    applyLayerVisibility();
  });
  document.getElementById('btn-none').addEventListener('click', () => {
    Object.keys(activeLayerState).forEach(k => activeLayerState[k] = false);
    document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
    clearSelection();
    applyLayerVisibility();
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    controls.target.set(0, 0.7, 0);
    camera.position.set(0, 0.7, 3.2);
    controls.update();
  });
  const search = document.getElementById('part-search');
  search.addEventListener('input', () => { listSearchTerm = search.value; filterList(); });
}

// ── Resize ─────────────────────────────────────────────────────
const ro = new ResizeObserver(() => {
  const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});
ro.observe(canvasWrap);

// ── Render loop ────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// ── Init ───────────────────────────────────────────────────────
async function init() {
  const data = await loadAnatomyData();
  parts   = data.parts;
  layers  = data.layers;
  regions = data.regions;
  partIndex = new Map(parts.map(p => [p.id, p]));

  materials = createMaterials(layers);

  // Schematic (procedural) world — built into its own group
  schematicGroup = new THREE.Group();
  scene.add(schematicGroup);
  meshMapSchematic = buildBody(schematicGroup, materials, parts);
  createGhostBody(schematicGroup);

  clickableMeshes = getClickableMeshes(schematicGroup);

  buildLayerButtons();
  buildPartList();
  wireControls();
  wireModeToggle();
  applyLayerVisibility();
  showInfoPanelEmpty();
  updateStatLine();

  animate();

  // Real model (STL) loads asynchronously in the background
  loadRealModel(partIndex)
    .then(({ group, meshMap, count }) => {
      realGroup = group;
      meshMapReal = meshMap;
      realReady = true;
      scene.add(realGroup);
      const btn = document.querySelector('.mode-btn[data-mode="real"]');
      if (btn) { btn.disabled = false; btn.dataset.count = count; }
      if (mode === 'real') enterMode('real'); // in case user switched while loading
    })
    .catch(err => {
      console.error('real model load failed:', err);
      const btn = document.querySelector('.mode-btn[data-mode="real"]');
      if (btn) { btn.disabled = true; btn.title = '真實模型載入失敗：' + err.message; }
    });
}

function updateStatLine() {
  const statEl = document.getElementById('stat-line');
  if (!statEl) return;
  const modeledCount = parts.filter(p => meshMapOf().has(p.id)).length;
  const label = mode === 'real' ? '真實 STL' : '示意 3D';
  statEl.textContent = `${parts.length} 部位 · ${modeledCount} ${label}`;
}

// ── Mode switching ─────────────────────────────────────────────
function wireModeToggle() {
  const realBtn = document.querySelector('.mode-btn[data-mode="real"]');
  if (realBtn) { realBtn.disabled = true; realBtn.title = '真實模型載入中…'; }
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.mode;
      if (target === mode) return;
      if (target === 'real' && !realReady) return;
      enterMode(target);
    });
  });
}

function enterMode(target) {
  // clear any highlight in the old world before switching
  if (selectedPartId) highlightMeshes(selectedPartId, false);
  mode = target;

  document.querySelectorAll('.mode-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === mode));

  if (schematicGroup) schematicGroup.visible = (mode === 'schematic');
  if (realGroup)      realGroup.visible      = (mode === 'real');

  clickableMeshes = getClickableMeshes(mode === 'real' ? realGroup : schematicGroup);

  applyLayerVisibility();
  updateStatLine();
  // re-render list flags (modeled differs per mode) and info panel
  buildPartList();
  if (selectedPartId) {
    if (meshMapOf().has(selectedPartId) && isLayerVisible(getPartLayer(selectedPartId)))
      highlightMeshes(selectedPartId, true);
    showInfoPanel(getPartInfo(selectedPartId));
    syncListSelection();
  }
}

init().catch(err => {
  console.error(err);
  infoPanel.innerHTML = `<div class="info-empty" style="color:#e06">載入資料失敗：${err.message}</div>`;
});
