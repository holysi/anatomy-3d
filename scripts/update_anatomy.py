import json

with open('C:/project/hap/data/anatomy.json', encoding='utf-8') as f:
    data = json.load(f)

parts = data['parts']
existing_ids = {p['id'] for p in parts}

NEW_PARTS = [
    {"id":"tarsals_r","layer":"skeleton","region":"lower_limb","fmaId":"FMA71337","name_zh":"右跗骨（距骨等）","name_en":"Right Tarsals (excl. Calcaneus)","name_la":"Ossa tarsi dextra","parent":"foot_skeleton","modeled":True,"desc_zh":"包含距骨、舟狀骨、三塊楔骨與骰骨，組成後足與中足骨架，參與踝與足弓的傳力。","desc_en":"Talus, navicular, 3 cuneiforms, and cuboid; form the hindfoot and midfoot, transferring load through ankle and arch."},
    {"id":"tarsals_l","layer":"skeleton","region":"lower_limb","fmaId":"FMA71338","name_zh":"左跗骨（距骨等）","name_en":"Left Tarsals (excl. Calcaneus)","name_la":"Ossa tarsi sinistra","parent":"foot_skeleton","modeled":True,"desc_zh":"包含距骨、舟狀骨、三塊楔骨與骰骨，組成後足與中足骨架。","desc_en":"Talus, navicular, 3 cuneiforms, and cuboid; form the hindfoot and midfoot."},
    {"id":"gluteus_medius_r","layer":"muscle","region":"lower_limb","fmaId":"FMA22330","name_zh":"右臀中肌","name_en":"Right Gluteus Medius","name_la":"Musculus gluteus medius dexter","parent":"gluteal_muscles","modeled":True,"desc_zh":"臀部中層肌，主要功能為外展髖關節，步行中單腳站立期穩定骨盆。","desc_en":"Primary hip abductor; stabilizes the pelvis during the stance phase of gait."},
    {"id":"gluteus_medius_l","layer":"muscle","region":"lower_limb","fmaId":"FMA22331","name_zh":"左臀中肌","name_en":"Left Gluteus Medius","name_la":"Musculus gluteus medius sinister","parent":"gluteal_muscles","modeled":True,"desc_zh":"臀部中層肌，主要功能為外展髖關節，步行中穩定骨盆。","desc_en":"Primary hip abductor; stabilizes the pelvis during gait."},
    {"id":"gluteus_minimus_r","layer":"muscle","region":"lower_limb","fmaId":"FMA22332","name_zh":"右臀小肌","name_en":"Right Gluteus Minimus","name_la":"Musculus gluteus minimus dexter","parent":"gluteal_muscles","modeled":True,"desc_zh":"臀部最深層肌，協助臀中肌外展及內旋髖關節。","desc_en":"Deepest gluteal muscle; assists gluteus medius in hip abduction and internal rotation."},
    {"id":"gluteus_minimus_l","layer":"muscle","region":"lower_limb","fmaId":"FMA22333","name_zh":"左臀小肌","name_en":"Left Gluteus Minimus","name_la":"Musculus gluteus minimus sinister","parent":"gluteal_muscles","modeled":True,"desc_zh":"臀部最深層肌，協助外展及內旋髖關節。","desc_en":"Deepest gluteal muscle; assists in hip abduction and internal rotation."},
    {"id":"tensor_fasciae_latae_r","layer":"muscle","region":"lower_limb","fmaId":"FMA22425","name_zh":"右闊筋膜張肌","name_en":"Right Tensor Fasciae Latae","name_la":"Musculus tensor fasciae latae dexter","parent":"gluteal_muscles","modeled":True,"desc_zh":"位於大腿外側，張緊髂脛束，協助外展、屈曲及內旋髖關節。","desc_en":"Tensions the iliotibial band; assists hip abduction, flexion, and internal rotation."},
    {"id":"tensor_fasciae_latae_l","layer":"muscle","region":"lower_limb","fmaId":"FMA22426","name_zh":"左闊筋膜張肌","name_en":"Left Tensor Fasciae Latae","name_la":"Musculus tensor fasciae latae sinister","parent":"gluteal_muscles","modeled":True,"desc_zh":"位於大腿外側，張緊髂脛束，協助外展、屈曲及內旋髖關節。","desc_en":"Tensions the iliotibial band; assists hip abduction, flexion, and internal rotation."},
    {"id":"brachioradialis_r","layer":"muscle","region":"upper_limb","fmaId":"FMA38486","name_zh":"右肱橈肌","name_en":"Right Brachioradialis","name_la":"Musculus brachioradialis dexter","parent":"forearm_muscles","modeled":True,"desc_zh":"前臂外側表淺肌，在前臂半旋前位時屈曲肘關節效率最高。","desc_en":"Lateral forearm muscle; most efficient elbow flexor when forearm is in mid-pronation."},
    {"id":"brachioradialis_l","layer":"muscle","region":"upper_limb","fmaId":"FMA38487","name_zh":"左肱橈肌","name_en":"Left Brachioradialis","name_la":"Musculus brachioradialis sinister","parent":"forearm_muscles","modeled":True,"desc_zh":"前臂外側表淺肌，在前臂半旋前位時屈曲肘關節效率最高。","desc_en":"Lateral forearm muscle; most efficient elbow flexor in mid-pronation."},
    {"id":"supraspinatus_r","layer":"muscle","region":"upper_limb","fmaId":"FMA32544","name_zh":"右棘上肌","name_en":"Right Supraspinatus","name_la":"Musculus supraspinatus dexter","parent":"rotator_cuff","modeled":True,"desc_zh":"旋轉肌袖之一，啟動外展最初 0-15°，是最常見撕裂的旋轉肌袖肌。","desc_en":"Rotator cuff; initiates abduction 0-15°; most frequently torn rotator cuff muscle."},
    {"id":"supraspinatus_l","layer":"muscle","region":"upper_limb","fmaId":"FMA32545","name_zh":"左棘上肌","name_en":"Left Supraspinatus","name_la":"Musculus supraspinatus sinister","parent":"rotator_cuff","modeled":True,"desc_zh":"旋轉肌袖之一，啟動外展最初 0-15°，是最常見撕裂的旋轉肌袖肌。","desc_en":"Rotator cuff; initiates abduction 0-15°; most commonly torn rotator cuff muscle."},
    {"id":"infraspinatus_r","layer":"muscle","region":"upper_limb","fmaId":"FMA32547","name_zh":"右棘下肌","name_en":"Right Infraspinatus","name_la":"Musculus infraspinatus dexter","parent":"rotator_cuff","modeled":True,"desc_zh":"旋轉肌袖之一，主要功能為肩外旋，穩定肱骨頭防止前上脫位。","desc_en":"Rotator cuff; externally rotates the shoulder; prevents anterior dislocation of humeral head."},
    {"id":"infraspinatus_l","layer":"muscle","region":"upper_limb","fmaId":"FMA32548","name_zh":"左棘下肌","name_en":"Left Infraspinatus","name_la":"Musculus infraspinatus sinister","parent":"rotator_cuff","modeled":True,"desc_zh":"旋轉肌袖之一，主要功能為肩外旋，穩定肱骨頭。","desc_en":"Rotator cuff; externally rotates the shoulder and stabilizes the humeral head."},
    {"id":"subscapularis_r","layer":"muscle","region":"upper_limb","fmaId":"FMA13414","name_zh":"右肩胛下肌","name_en":"Right Subscapularis","name_la":"Musculus subscapularis dexter","parent":"rotator_cuff","modeled":True,"desc_zh":"旋轉肌袖前方最大肌，主要功能為肩內旋，是旋轉肌袖中力量最大的。","desc_en":"Largest rotator cuff muscle; primarily internally rotates the shoulder; the strongest of the cuff."},
    {"id":"subscapularis_l","layer":"muscle","region":"upper_limb","fmaId":"FMA13415","name_zh":"左肩胛下肌","name_en":"Left Subscapularis","name_la":"Musculus subscapularis sinister","parent":"rotator_cuff","modeled":True,"desc_zh":"旋轉肌袖前方最大肌，主要功能為肩內旋。","desc_en":"Largest rotator cuff muscle; primarily internally rotates the shoulder."},
    {"id":"teres_major_r","layer":"muscle","region":"upper_limb","fmaId":"FMA32551","name_zh":"右大圓肌","name_en":"Right Teres Major","name_la":"Musculus teres major dexter","parent":"shoulder_muscles","modeled":True,"desc_zh":"協助肩關節內收、伸直與內旋，與背闊肌協同作用。","desc_en":"Assists shoulder adduction, extension, and internal rotation; synergist of latissimus dorsi."},
    {"id":"teres_major_l","layer":"muscle","region":"upper_limb","fmaId":"FMA32552","name_zh":"左大圓肌","name_en":"Left Teres Major","name_la":"Musculus teres major sinister","parent":"shoulder_muscles","modeled":True,"desc_zh":"協助肩關節內收、伸直與內旋，與背闊肌協同作用。","desc_en":"Assists shoulder adduction, extension, and internal rotation; synergist of latissimus dorsi."},
    {"id":"teres_minor_r","layer":"muscle","region":"upper_limb","fmaId":"FMA32553","name_zh":"右小圓肌","name_en":"Right Teres Minor","name_la":"Musculus teres minor dexter","parent":"rotator_cuff","modeled":True,"desc_zh":"旋轉肌袖之一，外旋肩關節並穩定肱骨頭。","desc_en":"Rotator cuff; externally rotates the shoulder and stabilizes the humeral head."},
    {"id":"teres_minor_l","layer":"muscle","region":"upper_limb","fmaId":"FMA32554","name_zh":"左小圓肌","name_en":"Left Teres Minor","name_la":"Musculus teres minor sinister","parent":"rotator_cuff","modeled":True,"desc_zh":"旋轉肌袖之一，外旋肩關節並穩定肱骨頭。","desc_en":"Rotator cuff; externally rotates the shoulder and stabilizes the humeral head."},
]

tarsal_parts = [p for p in NEW_PARTS if 'tarsals' in p['id']]
muscle_parts = [p for p in NEW_PARTS if 'tarsals' not in p['id']]

# Insert tarsals after calcaneus_r
calcaneus_idx = next(i for i,p in enumerate(parts) if p['id'] == 'calcaneus_r')
for offset, p in enumerate(tarsal_parts):
    if p['id'] not in existing_ids:
        parts.insert(calcaneus_idx + 1 + offset, p)

# Insert new muscles after soleus_r
soleus_idx = next(i for i,p in enumerate(parts) if p['id'] == 'soleus_r')
for offset, p in enumerate(muscle_parts):
    if p['id'] not in existing_ids:
        parts.insert(soleus_idx + 1 + offset, p)

data['parts'] = parts
with open('C:/project/hap/data/anatomy.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Total parts: {len(parts)}")
print(f"Muscle: {sum(1 for p in parts if p['layer']=='muscle')}")
print(f"Skeleton: {sum(1 for p in parts if p['layer']=='skeleton')}")
