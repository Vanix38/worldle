# Découpe « Lieu » en Quartier + Région et ajoute « Type de faction ».
# À relancer après scripts/scrape-cyberpunk-fandom.mjs :  python3 scripts/split-cyberpunk-lieu-affiliation.py
import json
p='data/cyberpunk.json'; raw=open(p,encoding='utf-8').read(); d=json.loads(raw)
# --- Lieu -> Quartier + Région
DIST={'Watson':'Watson','Kabuki':'Watson','Little China':'Watson','Northside':'Watson','Megabuilding H8':'Watson','Watson (2077)':'Watson',
 'Westbrook':'Westbrook','Japantown':'Westbrook','North Oak':'Westbrook','Charter Hill':'Westbrook',"Denny's Mansion":'Westbrook',
 'City Center':'City Center','Downtown':'City Center',
 'Heywood':'Heywood','The Glen':'Heywood',"Tucker Albach's Apartment":'Heywood',
 'Santo Domingo':'Santo Domingo','Rancho Coronado':'Santo Domingo','Coronado Dam':'Santo Domingo',"Josie Alcazar's House":'Santo Domingo',
 'Pacifica':'Pacifica','Pacifica (2077)':'Pacifica','West Wind Estate':'Pacifica',
 'Dogtown':'Dogtown','EBM Petrochem Stadium':'Dogtown','Longshore Stacks':'Dogtown','Golden Pacific':'Dogtown'}
NC={'Night City','NC','Coronado City','Urmland Street',"Kutcher's home"}
BAD={'Badlands','northern Badlands','Biotechnica Flats','Rocky Ridge','Rocky Ridge Plains','Red Peaks','Greene Homestead','Edgewood Farm','Trailer Park','Fuel Station','DaKota'}
NUSA={'NUSA','USA','Washington','D.C.','NYC','The Bronx','Brooklyn','Pittsburgh','Pennsylvania','Arizona','Yucca','Los Padres County','SoCal'}
JP={'Japan','Tokyo','Kanto'}
ABROAD={'Cuba','Havana','Soviet Union','Pacific Rim'}
NET={'Cyberspace','The Net','DataKrash'}
SPACE={'Arasaka Orbital Station','Crystal Palace'}
unk=set()
for x in d['characters']:
  parts=[v.strip() for v in x['home'].split(',') if v.strip()]
  dist=[];reg=[]
  for v in parts:
    if v in DIST: dist.append(DIST[v]); reg.append('Night City')
    elif v in NC: reg.append('Night City')
    elif v in BAD: reg.append('Badlands')
    elif v in NUSA: reg.append('NUSA')
    elif v in JP: reg.append('Japon')
    elif v in ABROAD: reg.append('Étranger')
    elif v in NET: reg.append('Net')
    elif v in SPACE: reg.append('Orbite')
    else: unk.add(v)
  # Yucca/Los Padres = Badlands sud, hors NC mais pas NUSA lointaine : gardé NUSA
  if 'Night City' in reg and 'Badlands' in reg: pass
  x['district']=', '.join(dict.fromkeys(dist)); x['region']=', '.join(dict.fromkeys(reg))
print('lieux ignorés',unk)
# --- Affiliation: normalisation + type
NORM={'Arasaka Corporation':'Arasaka','Valentino':'Valentinos','Barghest':'BARGHEST','Moxes':'The Mox','Mox':'The Mox','Network 54':'N54 News','Network News 54':'N54 News','Kiroshi Optics':'Kiroshi','nomad':'Nomad','Nomads':'Nomad',"Maine's crew":'Maine','New United States Armed Forces':'NUSA Armed Forces','United States Armed Forces':'U.S. Army'}
DROP={'None','Undisclosed','Civilian','Night City','Corpo','Strip club','Cyberpunk 2077 Netsites'}
T={}
def put(t,*names):
  for n in names: T[n]=t
put('Gang','Tyger Claws','Maelstrom','Valentinos','Scavengers','6th Street','Voodoo Boys','Animals','The Mox','Wraiths','BARGHEST','Cuban cartels','Gloryhole Bandits','Steel Dragons','Red Ocher','Crimson Harvest')
put('Nomades','Aldecaldos','Bright Family','Snake Nation','Pomo','Nomad','Bakkers','Red Willow')
put('Corpo','Arasaka','Militech','Kang Tao','Zetatech','Biotechnica','Petrochem','SovOil','Night Corp','Orbital Air','Delamain Corp','Hatashi Shipping Company','Blazetech','Asukaga & Finch','Kiroshi','EuroBank','SoftSys','CCI Development','Trauma Team','Haven Clinic','Charon Exotics','REO Meatwagon','Fourth Wall Studios','MSM Records','Silverhand Studios','Danger Gal','Hato','Taka','Kiji','Clouds','Delphi X',"Sal Bigelow's Braindance Paradise","Joe's Garage",'Epilogues','ITS','Night International','The Collective','Kyoko')
put('Mercenaires','Afterlife Mercs','Afterlife','Maine','David','Team King',"King's Crew",'D','Regina Jones','Rogue Amendiares','Dexter DeShawn','Mr. Hands','Wakako Okada','Muamar Reyes','Mikhail Akulov','Dino Dinovic','Faraday','Doc Ryder','Herold Lowe','Dakota Smith','Talia Yang','V','AUTOFIXER','Good Old Dogtown')
put("Forces de l'ordre",'NCPD','MaxTac','NetWatch')
put('Gouvernement & armée','NUSA','FIA','NUSA Armed Forces','U.S. Army','USMC','NUSA SpecOps','Forlorn Hope','22nd SAS Regt.',"Mayor's Office",'Night City Council','Federalist Party','Devolutionist Party','Brazilian Intelligence Agency','KGB','Soviet Union','Southern California')
put('Médias & musique','WNS','World News Service','N54 News','NC Inquirer','Morro Rock Radio','FTF Radio','HFN','Samurai','Us Cracks','Cyber6','Night City Devils')
unk=set()
for x in d['characters']:
  a=[NORM.get(v.strip(),v.strip()) for v in x['affiliation'].split(',') if v.strip()]
  a=[v for v in dict.fromkeys(a) if v not in DROP]
  x['affiliation']=', '.join(a)
  ts=[]
  for v in a:
    if v in T: ts.append(T[v])
    else: unk.add(v)
  x['affiliationType']=', '.join(dict.fromkeys(ts))
print('affiliations sans type',unk)
# --- fieldMapping
fm=d['fieldMapping']; new={}
for k,v in fm.items():
  if k=='home':
    new['district']={"header":"Quartier","fonction":"Multivalue","description":"Quartier de Night City (Watson, Westbrook, City Center, Heywood, Santo Domingo, Pacifica, Dogtown). Vide hors Night City. Orange si au moins un quartier est commun."}
    new['region']={"header":"Région","fonction":"Multivalue","description":"Région de rattachement : Night City, Badlands, NUSA, Japon, Étranger, Net, Orbite. Orange si au moins une région est commune."}
  else: new[k]=v
  if k=='affiliation':
    new['affiliationType']={"header":"Type de faction","fonction":"Multivalue","description":"Type des affiliations : Gang, Corpo, Nomades, Mercenaires, Forces de l'ordre, Gouvernement & armée, Médias & musique. Orange si au moins un type est commun."}
d['fieldMapping']=new
# characters: reorder keys, drop home
order=['id','name','aliases','gender','status','role','occupation','affiliation','affiliationType','district','region','firstAppearance','hint1','difficulty']
chars=[]
for x in d['characters']:
  x.pop('home',None); chars.append({k:x[k] for k in order if k in x} | {k:v for k,v in x.items() if k not in order})
d['characters']=chars
n=len(chars); prev={}
for k in d['fieldPrevalence']:
  if k=='home':
    for nk in ['district','region']: prev[nk]=round(sum(1 for x in chars if x[nk])/n,3)
  else: prev[k]=d['fieldPrevalence'][k]
  if k=='affiliation': prev['affiliationType']=round(sum(1 for x in chars if x['affiliationType'])/n,3)
d['fieldPrevalence']=prev
for k in ['affiliation','affiliationType']: prev[k]=round(sum(1 for x in chars if x[k])/n,3)
print(prev)
open(p,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False,indent=2)+('\n' if raw.endswith('\n') else ''))
