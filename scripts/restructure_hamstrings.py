"""Rename hamstrings → biceps_femoris and split out semitendinosus / semimembranosus."""
import json, copy

# ── manifest.json ─────────────────────────────────────────────────────────────
manifest_path = 'C:/project/hap/assets/models/manifest.json'
with open(manifest_path, encoding='utf-8') as f:
    manifest = json.load(f)

models = manifest['models']

# 1. Rename hamstrings → biceps_femoris in manifest (keep only biceps files)
semi_files = {'FMA22358.stl','FMA22359.stl','FMA22448.stl','FMA22449.stl'}
for m in models:
    if m['part'] == 'hamstrings_r' and m['file'] not in semi_files:
        m['part'] = 'biceps_femoris_r'
    elif m['part'] == 'hamstrings_l' and m['file'] not in semi_files:
        m['part'] = 'biceps_femoris_l'

# 2. Remap semi* files to their new parts
remap = {
    'FMA22358.stl': 'semitendinosus_r',
    'FMA22359.stl': 'semitendinosus_l',
    'FMA22448.stl': 'semimembranosus_r',
    'FMA22449.stl': 'semimembranosus_l',
}
for m in models:
    if m['file'] in remap:
        m['part'] = remap[m['file']]

manifest['models'] = models
with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)
print(f'Manifest updated: {len(models)} entries')

# ── anatomy.json ──────────────────────────────────────────────────────────────
anat_path = 'C:/project/hap/data/anatomy.json'
with open(anat_path, encoding='utf-8') as f:
    data = json.load(f)

parts = data['parts']

# Replace hamstrings_r with biceps_femoris_r, hamstrings_l with biceps_femoris_l
replacements = {
    'hamstrings_r': {
        'id': 'biceps_femoris_r',
        'name_zh': '右股二頭肌',
        'name_en': 'Right Biceps Femoris',
        'name_la': 'Musculus biceps femoris dexter',
        'fmaId': 'FMA45888',
        'desc_zh': '大腿後外側膕繩肌，由長頭（坐骨結節）與短頭（股骨粗線）組成，止於腓骨頭。主要功能為伸髖及屈膝，屈膝時並外旋小腿。',
        'desc_en': 'Lateral hamstring; long head extends hip, both heads flex and externally rotate the knee.',
    },
    'hamstrings_l': {
        'id': 'biceps_femoris_l',
        'name_zh': '左股二頭肌',
        'name_en': 'Left Biceps Femoris',
        'name_la': 'Musculus biceps femoris sinister',
        'fmaId': 'FMA45889',
        'desc_zh': '大腿後外側膕繩肌，由長頭與短頭組成，止於腓骨頭。伸髖及屈膝，屈膝時外旋小腿。',
        'desc_en': 'Lateral hamstring; extends hip, flexes and externally rotates the knee.',
    },
}

for p in parts:
    if p['id'] in replacements:
        rep = replacements[p['id']]
        p.update(rep)

# Remove the duplicate semitendinosus/semimembranosus that were added by add_muscles.py
# (they now have proper entries but may already be in parts list correctly)
# Check for any remaining hamstrings entries
ids_seen = set()
deduped = []
for p in parts:
    if p['id'] not in ids_seen:
        ids_seen.add(p['id'])
        deduped.append(p)
    else:
        print(f'  Removed duplicate: {p["id"]}')

data['parts'] = deduped
with open(anat_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

total = len(deduped)
muscles = sum(1 for p in deduped if p['layer'] == 'muscle')
print(f'Anatomy.json: {total} parts, {muscles} muscles')

# Verify the key parts exist
check = ['biceps_femoris_r','biceps_femoris_l','semitendinosus_r','semitendinosus_l',
         'semimembranosus_r','semimembranosus_l']
for cid in check:
    found = next((p for p in deduped if p['id'] == cid), None)
    status = found['name_en'] if found else 'MISSING'
    print(f'  {cid}: {status}')
