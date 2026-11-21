# Ajoute le champ « type » (Humain / IA / Engramme / Animal) à data/cyberpunk.json
# et ramène le statut à Vivant / Mort / Inconnu.
# Usage : python3 scripts/apply-cyberpunk-type.py
import json
p = 'data/cyberpunk.json'
TYPE = {
    'delamain': 'IA', 'altiera-cunningham': 'IA', 'brendan': 'IA', 'capricorn': 'IA',
    'johnny-silverhand': 'Engramme',
    'nibbles': 'Animal',
}
# Statut : l'engramme / l'état particulier est porté par « type » désormais.
STATUS = {
    'johnny-silverhand': 'Mort', 'saburo-arasaka': 'Mort', 'jackie-welles': 'Mort',
    'altiera-cunningham': 'Vivant', 'brendan': 'Inconnu', 'martha-frakes': 'Vivant',
    'nuka-shank-ohlone': '',
}
raw = open(p, encoding='utf-8').read()
d = json.loads(raw)
ids = {x['id'] for x in d['characters']}
assert set(TYPE) <= ids and set(STATUS) <= ids
chars = []
for x in d['characters']:
    x['status'] = STATUS.get(x['id'], x['status'])
    out = {}
    for k, v in x.items():
        if k == 'type':
            continue
        out[k] = v
        if k == 'gender':
            out['type'] = TYPE.get(x['id'], 'Humain')
    chars.append(out)
d['characters'] = chars
bad = {x['status'] for x in chars} - {'', 'Vivant', 'Mort', 'Inconnu'}
assert not bad, bad
fm = {}
for k, v in d['fieldMapping'].items():
    if k == 'type':
        continue
    if k == 'status':
        v['description'] = 'Vivant, Mort ou Inconnu.'
    fm[k] = v
    if k == 'gender':
        fm['type'] = {
            "header": "Type",
            "fonction": "Classique",
            "columnWidth": "small",
            "description": "Nature du personnage : Humain, IA (Delamain, Alt…), Engramme (Johnny) ou Animal (Nibbles)."
        }
d['fieldMapping'] = fm
fp = {}
for k, v in d['fieldPrevalence'].items():
    if k != 'type':
        fp[k] = v
    if k == 'gender':
        fp['type'] = 1
d['fieldPrevalence'] = fp
open(p, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + ('\n' if raw.endswith('\n') else ''))
from collections import Counter
print(Counter(x['type'] for x in chars), Counter(x['status'] for x in chars))
