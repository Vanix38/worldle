# Ajoute le champ « cyberware » (Cyberware notable) à data/cyberpunk.json.
# Liste manuelle des implants emblématiques + « Cyberdeck » pour tout perso au rôle Netrunner.
# Usage : python3 scripts/apply-cyberpunk-cyberware.py
import json
p = 'data/cyberpunk.json'
CW = {
    'v': ['Kiroshi', 'Relic'],
    'johnny-silverhand': ['Bras cybernétique'],
    'adam-smasher': ['Corps intégral', 'Sandevistan'],
    'lizzy-wizzy': ['Corps intégral'],
    'david-martinez': ['Sandevistan', 'Cyberskeleton'],
    'lucyna-kushinada': ['Monowire', 'Cyberdeck'],
    'rebecca': ['Bras cybernétique'],
    'maine': ['Bras cybernétique'],
    'dorio-gunnarsdottir': ['Bras cybernétique'],
    'pilar': ['Bras cybernétique'],
    'kiwi': ['Cyberdeck'],
    'song-so-mi': ['Cyberdeck'],
    't-bug': ['Cyberdeck'],
}
raw = open(p, encoding='utf-8').read()
d = json.loads(raw)
ids = {x['id'] for x in d['characters']}
assert set(CW) <= ids, set(CW) - ids
chars = []
for x in d['characters']:
    vals = list(CW.get(x['id'], []))
    if 'Netrunner' in [r.strip() for r in x['role'].split(',')] and 'Cyberdeck' not in vals:
        vals.append('Cyberdeck')
    out = {}
    for k, v in x.items():
        if k == 'cyberware':
            continue
        out[k] = v
        if k == 'role':
            out['cyberware'] = ', '.join(vals)
    chars.append(out)
d['characters'] = chars
fm = {}
for k, v in d['fieldMapping'].items():
    if k == 'cyberware':
        continue
    fm[k] = v
    if k == 'role':
        fm['cyberware'] = {
            "header": "Cyberware",
            "fonction": "Multivalue",
            "description": "Cyberware notable (Sandevistan, Kiroshi, bras cybernétique, cyberdeck…). Orange si au moins un implant est commun."
        }
d['fieldMapping'] = fm
n = len(chars)
fp = {}
for k, v in d['fieldPrevalence'].items():
    if k != 'cyberware':
        fp[k] = v
    if k == 'role':
        fp['cyberware'] = round(sum(1 for x in chars if x['cyberware']) / n, 3)
d['fieldPrevalence'] = fp
open(p, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + ('\n' if raw.endswith('\n') else ''))
print('rempli', sum(1 for x in chars if x['cyberware']), '/', n)
