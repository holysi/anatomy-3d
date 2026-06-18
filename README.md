# 人體解剖生理學學習平台 · Human Anatomy & Physiology

互動式 3D 人體解剖學習網站。可縮放旋轉的人體模型，分骨骼、肌肉、韌帶、關節、經絡、神經六大圖層，每個部位附中／英／拉丁文名詞與說明。

An interactive 3D human-anatomy learning site. Rotatable/zoomable body model with six filterable layers (skeleton, muscle, ligament, joint, meridian, nerve); every part carries Chinese / English / Latin names and descriptions.

## 功能 · Features

- **3D 互動模型**：滑鼠拖曳旋轉、滾輪縮放、點擊部位查看詳情（Three.js + OrbitControls）
- **六大圖層 filter**：🦴 骨骼・💪 肌肉・🔗 韌帶・⚙️ 關節・〰️ 經絡・⚡ 神經
- **159 個部位**，採 Terminologia Anatomica (TA2) / FMA 命名標準，含中／英／拉丁文
- **可搜尋部位清單**（中／英／拉丁名即時過濾）
- **關節分類資料**：動度（不動/微動/可動）、構造（纖維/軟骨/滑液）、運動類型、關節骨
- **經絡穴位**：十二正經 + 任督二脈，附代表穴位
- **雙模式切換**：示意圖（程式生成幾何）↔ 真實模型（BodyParts3D STL 骨架）

## 技術 · Stack

純靜態前端，**無 build step**。Three.js 透過 importmap 由 CDN 載入。

- `index.html` — 入口與版面
- `src/main.js` — 場景、raycast 互動、清單、模式切換
- `src/bodyBuilder.js` — 程式生成的示意幾何
- `src/realModel.js` — 真實 STL 模型載入（STLLoader）
- `data/anatomy.json` — 部位資料（TA2/FMA schema）
- `assets/models/` — 真實骨骼 STL（BodyParts3D）

## 本機執行 · Run locally

需用本機伺服器（因 ES module 與 fetch）：

```bash
npx serve            # 或 python -m http.server
# 開啟 http://localhost:3000 (或對應 port)
```

## 部署 · Deploy (GitHub Pages)

1. push 到 GitHub repo
2. **Settings → Pages → Source** 選 `main` 分支 `/ (root)`
3. 數分鐘後上線於 `https://<帳號>.github.io/<repo>/`

（已含 `.nojekyll`，路徑皆為相對路徑，子路徑部署即可運作。）

## 授權與出處 · License & Attribution

本專案以 **CC BY-SA 4.0** 釋出，並整合 CC BY-SA 授權的第三方資料／模型。
**完整出處與授權聲明見 [ATTRIBUTION.md](ATTRIBUTION.md)**，授權全文見 [LICENSE](LICENSE)。

- 3D 骨骼模型：**BodyParts3D, © The Database Center for Life Science** (CC BY-SA 2.1 JP)
- 命名／分層資料參考：**Z-Anatomy** (CC BY-SA 4.0)、Terminologia Anatomica

> ⚠️ 教育用途。內容力求正確但不應作為臨床或診斷依據。
