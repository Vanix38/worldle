# Ajoute le champ « importance » (Principal / Secondaire / Figurant) à data/cyberpunk.json.
# Principal = liste manuelle (histoire principale du jeu, de Phantom Liberty, cast d'Edgerunners S1).
# Sinon : Très facile / Facile / Moyen -> Secondaire ; Difficile / Impossible -> Figurant.
# Usage : python3 scripts/apply-cyberpunk-importance.py
import json
p = 'data/cyberpunk.json'
PRINCIPAL = {
    # Jeu vidéo
    'v', 'johnny-silverhand', 'jackie-welles', 'judy-alvarez', 'panam-palmer', 'river-ward',
    'kerry-eurodyne', 'goro-takemura', 'evelyn-parker', 'dexter-deshawn', 'viktor-vektor',
    'misty-olszewski', 't-bug', 'altiera-cunningham', 'saburo-arasaka', 'hanako-arasaka',
    'yorinobu-arasaka', 'rogue-amendiares', 'adam-smasher', 'meredith-stout', 'placide',
    'maman-brigitte', 'anders-hellman', 'dum-dum', 'sandayu-oda', 'saul-bright',
    # Phantom Liberty
    'song-so-mi', 'solomon-reed', 'rosalind-myers', 'kurt-hansen', 'alena-xenakis',
    # Edgerunners S1
    'david-martinez', 'lucyna-kushinada', 'rebecca', 'maine', 'kiwi', 'dorio-gunnarsdottir',
    'pilar', 'falco', 'faraday', 'gloria-martinez',
}
raw = open(p, encoding='utf-8').read()
d = json.loads(raw)
ids = {x['id'] for x in d['characters']}
assert PRINCIPAL <= ids, PRINCIPAL - ids
for x in d['characters']:
    if x['id'] in PRINCIPAL:
        x['importance'] = 'Principal'
    elif x['difficulty'] in ('Très facile', 'Facile', 'Moyen'):
        x['importance'] = 'Secondaire'
    else:
        x['importance'] = 'Figurant'
fm = {}
for k, v in d['fieldMapping'].items():
    if k == 'importance':
        continue
    if k == 'difficulty':
        fm['importance'] = {
            "header": "Importance",
            "fonction": "Comparaison",
            "columnWidth": "small",
            "order": ["Principal", "Secondaire", "Figurant"],
            "description": "Place du personnage dans l’histoire : Principal (intrigue principale du jeu, de Phantom Liberty ou d’Edgerunners), Secondaire (quêtes annexes, rôle récurrent) ou Figurant."
        }
    fm[k] = v
d['fieldMapping'] = fm
fp = {}
for k, v in d['fieldPrevalence'].items():
    if k == 'difficulty':
        fp['importance'] = 1
    if k != 'importance':
        fp[k] = v
d['fieldPrevalence'] = fp
open(p, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + ('\n' if raw.endswith('\n') else ''))
from collections import Counter
print(Counter(x['importance'] for x in d['characters']))
