"""Download new muscle STLs and update anatomy.json + manifest.json."""
import json, urllib.request, os, pathlib

DEST = pathlib.Path('C:/project/hap/assets/models')
BASE_URL = 'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/main/assets/BodyParts3D_data/stl/FMA{}.stl'

# (fmaId, partId, name_en, name_zh, name_la, region, desc_zh, desc_en)
NEW_MUSCLES = [
    # ── Back ─────────────────────────────────────────────────────────────────
    ('13381','rhomboid_major_r','Right Rhomboid Major','右菱形大肌',
     'Musculus rhomboideus major dexter','upper_limb',
     '起於第2-5胸椎棘突，止於肩胛骨內側緣，功能為後縮（內收）及上旋肩胛骨，並協助維持肩胛骨貼靠胸廓。',
     'Retracts and elevates the scapula; keeps the scapula pressed against the thorax.'),
    ('13382','rhomboid_major_l','Left Rhomboid Major','左菱形大肌',
     'Musculus rhomboideus major sinister','upper_limb',
     '起於第2-5胸椎棘突，止於肩胛骨內側緣，功能為後縮及上旋肩胛骨。',
     'Retracts and elevates the scapula; keeps the scapula pressed against the thorax.'),
    ('13383','rhomboid_minor_r','Right Rhomboid Minor','右菱形小肌',
     'Musculus rhomboideus minor dexter','upper_limb',
     '起於第6-7頸椎棘突，止於肩胛骨內側緣上部，與菱形大肌協同後縮肩胛骨。',
     'Retracts the scapula and rotates glenoid cavity inferiorly; acts with rhomboid major.'),
    ('13384','rhomboid_minor_l','Left Rhomboid Minor','左菱形小肌',
     'Musculus rhomboideus minor sinister','upper_limb',
     '起於第6-7頸椎棘突，止於肩胛骨內側緣上部，協助後縮肩胛骨。',
     'Retracts the scapula; acts with rhomboid major.'),

    # ── Hip deep rotators ────────────────────────────────────────────────────
    ('22340','piriformis_r','Right Piriformis','右梨狀肌',
     'Musculus piriformis dexter','lower_limb',
     '起於薦骨前面，穿過坐骨大孔，止於股骨大轉子，是髖關節外旋的主要深層肌，也是坐骨神經的重要解剖標誌。',
     'Primary external rotator of the hip; important landmark for the sciatic nerve.'),
    ('22341','piriformis_l','Left Piriformis','左梨狀肌',
     'Musculus piriformis sinister','lower_limb',
     '起於薦骨前面，穿過坐骨大孔，止於股骨大轉子，是髖關節外旋的主要深層肌。',
     'Primary external rotator of the hip; important landmark for the sciatic nerve.'),
    ('22324','obturator_internus_r','Right Obturator Internus','右閉孔內肌',
     'Musculus obturator internus dexter','lower_limb',
     '起於閉孔膜內面，穿坐骨小孔後止於大轉子，協助外旋及外展髖關節。',
     'Externally rotates and abducts the hip; part of the deep external rotator group.'),
    ('22325','obturator_internus_l','Left Obturator Internus','左閉孔內肌',
     'Musculus obturator internus sinister','lower_limb',
     '起於閉孔膜內面，穿坐骨小孔後止於大轉子，協助外旋及外展髖關節。',
     'Externally rotates and abducts the hip.'),
    ('22338','quadratus_femoris_r','Right Quadratus Femoris','右股方肌',
     'Musculus quadratus femoris dexter','lower_limb',
     '短而扁的四邊形肌，起於坐骨結節，止於股骨轉子間嵴，外旋髖關節，並穩定股骨頭於髖臼。',
     'Short flat muscle; externally rotates and stabilizes the femoral head in the acetabulum.'),
    ('22339','quadratus_femoris_l','Left Quadratus Femoris','左股方肌',
     'Musculus quadratus femoris sinister','lower_limb',
     '短而扁的四邊形肌，外旋髖關節並穩定股骨頭於髖臼。',
     'Externally rotates and stabilizes the femoral head in the acetabulum.'),

    # ── Iliopsoas ────────────────────────────────────────────────────────────
    ('22322','iliacus_r','Right Iliacus','右髂肌',
     'Musculus iliacus dexter','lower_limb',
     '起於髂窩，與腰大肌共同形成髂腰肌，止於股骨小轉子，是髖關節最有力的屈肌。',
     'Forms iliopsoas with psoas major; most powerful hip flexor.'),
    ('22323','iliacus_l','Left Iliacus','左髂肌',
     'Musculus iliacus sinister','lower_limb',
     '起於髂窩，與腰大肌共同形成髂腰肌，是髖關節最有力的屈肌。',
     'Forms iliopsoas with psoas major; most powerful hip flexor.'),
    ('22342','psoas_major_r','Right Psoas Major','右腰大肌',
     'Musculus psoas major dexter','lower_limb',
     '起於腰椎椎體側面，穿越腹股溝韌帶止於小轉子，屈曲髖關節；站立時也可輔助腰椎屈曲。',
     'Flexes the hip and lumbar spine; forms iliopsoas with iliacus.'),
    ('22343','psoas_major_l','Left Psoas Major','左腰大肌',
     'Musculus psoas major sinister','lower_limb',
     '起於腰椎椎體側面，穿越腹股溝韌帶止於小轉子，屈曲髖關節。',
     'Flexes the hip; forms iliopsoas with iliacus.'),

    # ── Thigh medial / anterior ──────────────────────────────────────────────
    ('22354','sartorius_r','Right Sartorius','右縫匠肌',
     'Musculus sartorius dexter','lower_limb',
     '人體最長的肌肉，斜跨大腿前面，屈曲、外展及外旋髖關節，同時屈曲並內旋膝關節（裁縫師姿勢肌）。',
     'Longest muscle in the body; flexes, abducts, and laterally rotates the hip; flexes the knee.'),
    ('22355','sartorius_l','Left Sartorius','左縫匠肌',
     'Musculus sartorius sinister','lower_limb',
     '人體最長的肌肉，斜跨大腿前面，屈曲、外展及外旋髖關節，同時屈曲並內旋膝關節。',
     'Longest muscle in the body; flexes, abducts, and laterally rotates the hip; flexes the knee.'),
    ('43883','gracilis_r','Right Gracilis','右股薄肌',
     'Musculus gracilis dexter','lower_limb',
     '大腿內側最表淺的內收肌，參與鵝足腱止於脛骨，內收髖關節並屈曲膝關節。',
     'Superficial medial thigh muscle; adducts the hip and flexes the knee; part of pes anserinus.'),
    ('43884','gracilis_l','Left Gracilis','左股薄肌',
     'Musculus gracilis sinister','lower_limb',
     '大腿內側最表淺的內收肌，內收髖關節並屈曲膝關節。',
     'Adducts the hip and flexes the knee; part of pes anserinus.'),
    ('22450','pectineus_r','Right Pectineus','右恥骨肌',
     'Musculus pectineus dexter','lower_limb',
     '起於恥骨梳，止於股骨恥骨線，屈曲及內收髖關節，是最靠近中線的大腿肌肉之一。',
     'Flexes and adducts the hip; one of the most medial of the thigh muscles.'),
    ('22451','pectineus_l','Left Pectineus','左恥骨肌',
     'Musculus pectineus sinister','lower_limb',
     '起於恥骨梳，止於股骨恥骨線，屈曲及內收髖關節。',
     'Flexes and adducts the hip.'),
    ('22456','adductor_longus_r','Right Adductor Longus','右內收長肌',
     'Musculus adductor longus dexter','lower_limb',
     '位於大腿內側，是內收肌群中最前方的，主要功能為內收及屈曲髖關節。',
     'Most anterior adductor; adducts and flexes the hip; prominent in medial thigh triangle.'),
    ('22457','adductor_longus_l','Left Adductor Longus','左內收長肌',
     'Musculus adductor longus sinister','lower_limb',
     '大腿內側內收肌群中最前方，主要功能為內收及屈曲髖關節。',
     'Adducts and flexes the hip.'),
    ('22452','adductor_brevis_r','Right Adductor Brevis','右內收短肌',
     'Musculus adductor brevis dexter','lower_limb',
     '位於恥骨肌與內收長肌後方，內收並協助屈曲髖關節。',
     'Adducts and assists flexion of the hip; lies posterior to pectineus and adductor longus.'),
    ('22454','adductor_brevis_l','Left Adductor Brevis','左內收短肌',
     'Musculus adductor brevis sinister','lower_limb',
     '位於恥骨肌與內收長肌後方，內收並協助屈曲髖關節。',
     'Adducts and assists flexion of the hip.'),
    ('22459','adductor_magnus_r','Right Adductor Magnus','右內收大肌',
     'Musculus adductor magnus dexter','lower_limb',
     '大腿最大的內收肌，分為內收部（屈髖）與伸肌部（伸髖），是功能性兩用肌。',
     'Largest adductor; has adductor (hip flexion) and hamstring (hip extension) parts.'),
    ('22460','adductor_magnus_l','Left Adductor Magnus','左內收大肌',
     'Musculus adductor magnus sinister','lower_limb',
     '大腿最大的內收肌，分為內收部與伸肌部，是功能性兩用肌。',
     'Largest adductor; has adductor and hamstring parts.'),
    ('22358','semitendinosus_r','Right Semitendinosus','右半腱肌',
     'Musculus semitendinosus dexter','lower_limb',
     '後大腿肌之一，長肌腱在膝下方形成鵝足腱，伸髖並屈曲及內旋膝關節。',
     'Hamstring; extends hip and flexes/internally rotates knee; long tendon forms pes anserinus.'),
    ('22359','semitendinosus_l','Left Semitendinosus','左半腱肌',
     'Musculus semitendinosus sinister','lower_limb',
     '後大腿肌之一，伸髖並屈曲及內旋膝關節，長肌腱形成鵝足腱。',
     'Hamstring; extends hip and flexes/internally rotates knee.'),
    ('22448','semimembranosus_r','Right Semimembranosus','右半膜肌',
     'Musculus semimembranosus dexter','lower_limb',
     '後大腿最內側的膕繩肌，以寬扁的膜狀腱起始，伸髖並屈曲及內旋膝關節，並協助穩定膝關節後方。',
     'Medial hamstring; extends hip, flexes and internally rotates knee; stabilizes posterior knee.'),
    ('22449','semimembranosus_l','Left Semimembranosus','左半膜肌',
     'Musculus semimembranosus sinister','lower_limb',
     '後大腿最內側的膕繩肌，伸髖並屈曲及內旋膝關節，協助穩定膝關節後方。',
     'Medial hamstring; extends hip, flexes and internally rotates knee.'),

    # ── Lower leg lateral ────────────────────────────────────────────────────
    ('22552','fibularis_longus_r','Right Fibularis Longus','右腓骨長肌',
     'Musculus fibularis longus dexter','lower_limb',
     '沿腓骨外側走行，肌腱繞過外踝後，斜穿足底止於第一蹠骨底與內側楔骨，蹠屈及外翻踝關節，並支撐足弓。',
     'Plantarflexes and everts the ankle; long tendon crosses the sole to support the transverse arch.'),
    ('22553','fibularis_longus_l','Left Fibularis Longus','左腓骨長肌',
     'Musculus fibularis longus sinister','lower_limb',
     '蹠屈及外翻踝關節，肌腱斜穿足底支撐橫弓。',
     'Plantarflexes and everts the ankle; supports the transverse arch of the foot.'),
    ('22554','fibularis_brevis_r','Right Fibularis Brevis','右腓骨短肌',
     'Musculus fibularis brevis dexter','lower_limb',
     '沿腓骨遠端走行，止於第五蹠骨粗隆，蹠屈及外翻踝關節，防止踝關節內翻扭傷。',
     'Plantarflexes and everts the ankle; resists inversion sprains.'),
    ('22555','fibularis_brevis_l','Left Fibularis Brevis','左腓骨短肌',
     'Musculus fibularis brevis sinister','lower_limb',
     '止於第五蹠骨粗隆，蹠屈及外翻踝關節，防止踝關節內翻扭傷。',
     'Plantarflexes and everts the ankle; resists inversion sprains.'),
    ('22591','popliteus_r','Right Popliteus','右膕肌',
     'Musculus popliteus dexter','lower_limb',
     '位於膝關節後方的薄型肌，屈曲並內旋脛骨，「解鎖」完全伸直的膝關節以起始屈膝動作。',
     'Unlocks the fully extended knee by internally rotating the tibia; initiates knee flexion.'),
    ('22592','popliteus_l','Left Popliteus','左膕肌',
     'Musculus popliteus sinister','lower_limb',
     '位於膝關節後方，「解鎖」完全伸直的膝關節以起始屈膝動作。',
     'Unlocks the fully extended knee; initiates knee flexion.'),

    # ── Trunk ────────────────────────────────────────────────────────────────
    ('13295','diaphragm','Diaphragm','橫隔膜',
     'Diaphragma','trunk',
     '呼吸最主要的肌肉，分隔胸腔與腹腔，收縮時下降增大胸腔容積以吸氣，也參與腹壓調控（排便、生產等）。',
     'Primary muscle of respiration; descends on contraction to increase thoracic volume for inhalation.'),

    # ── Head / Neck ──────────────────────────────────────────────────────────
    ('49001','masseter_r','Right Masseter','右咬肌',
     'Musculus masseter dexter','head_neck',
     '人體最有力的咀嚼肌（相對體積），起於顴弓，止於下頌骨支，上提下頌（閉口）並協助前突及側方研磨。',
     'Most powerful chewing muscle per unit volume; elevates the mandible to close the jaw.'),
    ('49002','masseter_l','Left Masseter','左咬肌',
     'Musculus masseter sinister','head_neck',
     '人體最有力的咀嚼肌（相對體積），起於顴弓，止於下頌骨支，上提下頌（閉口）。',
     'Elevates the mandible; most powerful chewing muscle relative to size.'),
    ('49007','temporalis_r','Right Temporalis','右顳肌',
     'Musculus temporalis dexter','head_neck',
     '起於顳窩，止於下頌骨冠突，上提並後縮下頌，是閉口肌群之一，扇形覆蓋顳部。',
     'Elevates and retracts the mandible; fan-shaped muscle covering the temporal fossa.'),
    ('49008','temporalis_l','Left Temporalis','左顳肌',
     'Musculus temporalis sinister','head_neck',
     '起於顳窩，止於下頌骨冠突，上提並後縮下頌。',
     'Elevates and retracts the mandible.'),
    ('22728','splenius_capitis_r','Right Splenius Capitis','右頭夾肌',
     'Musculus splenius capitis dexter','head_neck',
     '起於頸椎/上胸椎棘突，止於顳骨乳突，單側收縮使頭轉向同側，雙側收縮伸展頭頸。',
     'Ipsilateral rotation and extension of head and neck.'),
    ('22729','splenius_capitis_l','Left Splenius Capitis','左頭夾肌',
     'Musculus splenius capitis sinister','head_neck',
     '單側收縮使頭轉向同側，雙側收縮伸展頭頸。',
     'Ipsilateral rotation and extension of head and neck.'),
]

# ── Step 1: Download STL files ────────────────────────────────────────────────
print('Downloading STL files...')
skipped = 0
downloaded = 0
for fma, pid, *_ in NEW_MUSCLES:
    fname = f'FMA{fma}.stl'
    dest = DEST / fname
    if dest.exists():
        skipped += 1
        continue
    url = BASE_URL.format(fma)
    try:
        urllib.request.urlretrieve(url, dest)
        downloaded += 1
        print(f'  Downloaded {fname}')
    except Exception as e:
        print(f'  FAILED {fname}: {e}')

print(f'Downloaded: {downloaded}, Skipped (exists): {skipped}')

# ── Step 2: Update anatomy.json ───────────────────────────────────────────────
anat_path = 'C:/project/hap/data/anatomy.json'
with open(anat_path, encoding='utf-8') as f:
    data = json.load(f)

parts = data['parts']
existing_ids = {p['id'] for p in parts}

new_parts = []
for fma, pid, name_en, name_zh, name_la, region, desc_zh, desc_en in NEW_MUSCLES:
    if pid in existing_ids:
        continue
    new_parts.append({
        'id': pid,
        'layer': 'muscle',
        'region': region,
        'fmaId': f'FMA{fma}',
        'name_zh': name_zh,
        'name_en': name_en,
        'name_la': name_la,
        'modeled': True,
        'desc_zh': desc_zh,
        'desc_en': desc_en,
    })

# Insert after last muscle entry
last_muscle_idx = max(i for i, p in enumerate(parts) if p['layer'] == 'muscle')
for offset, p in enumerate(new_parts):
    parts.insert(last_muscle_idx + 1 + offset, p)

data['parts'] = parts
with open(anat_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'\nAnatomy.json updated: {len(parts)} total parts')
print(f'  Muscle: {sum(1 for p in parts if p["layer"]=="muscle")}')
print(f'  Added: {len(new_parts)} new muscles')

# ── Step 3: Update manifest.json ─────────────────────────────────────────────
manifest_path = 'C:/project/hap/assets/models/manifest.json'
with open(manifest_path, encoding='utf-8') as f:
    manifest = json.load(f)

existing_files = {m['file'] for m in manifest['models']}
new_entries = []
for fma, pid, *_ in NEW_MUSCLES:
    fname = f'FMA{fma}.stl'
    if fname not in existing_files and (DEST / fname).exists():
        new_entries.append({'file': fname, 'part': pid})

manifest['models'].extend(new_entries)
with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)

print(f'Manifest updated: {len(manifest["models"])} total entries (+{len(new_entries)} new)')
