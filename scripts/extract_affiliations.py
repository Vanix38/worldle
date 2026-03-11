#!/usr/bin/env python3
"""Extrait la liste des affiliations du JSON pour le glossaire."""
import json
from pathlib import Path
from collections import Counter

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "affiliations_glossaire.md"

SIGNIFICATIONS = {
    "Inconnu": "Non renseigné",
    "Civil": "Écoles, universités, entreprises, lieux civils (sans affiliation militaire/super-héroïque)",
    "X-Men": "Équipe de mutants (films Fox)",
    "USA": "Armée, FBI, CIA, forces armées américaines",
    "Wakanda": "Royaume de Wakanda et ses tribus",
    "Asgard": "Royaume d'Asgard et ses habitants",
    "S.H.I.E.L.D.": "Strategic Homeland Intervention, Enforcement and Logistics Division",
    "Avengers": "Équipe des Avengers",
    "Kamar-Taj": "Maîtres des arts mystiques (sorcellerie)",
    "Oscorp": "Oscorp Industries (entreprise Norman Osborn)",
    "Guardiens de la Galaxie": "Équipe spatiale de Peter Quill",
    "Vortex (TVA)": "Personnages liés au Vortex / TVA (Loki, Kid Loki, etc.)",
    "Stark Industries": "Entreprise de Tony Stark",
    "Tribunal des Variations Anachroniques (TVA)": "Autorité temporelle (série Loki)",
    "Dix Anneaux": "Organisation criminelle de Shang-Chi",
    "Hydra": "Organisation terroriste nazie",
    "Ravageurs": "Pilleurs de l'espace (Guardians of the Galaxy)",
    "Starforce": "Unité militaire Kree (Captain Marvel)",
    "Ordre noir (Thanos)": "Serviteurs de Thanos",
    "Ta Lo": "Royaume mystique (Shang-Chi)",
    "*Spider-Gang": "Équipe de Spider-Man (Spider-Verse animé)",
    "Illuminati": "Conseil secret de super-héros (Terre-838)",
    "Inhumains": "Race d'humains modifiés",
    "Le Daily Bugle": "Journal new-yorkais (Spider-Man)",
    "Russie": "URSS, armée soviétique, KGB",
    "Équipe de Ghost (Ant-Man)": "Équipe de Luis / Ghost",
    "Poissonnerie des Wilson": "Commerce de la famille Wilson (Falcon)",
    "Sakaar": "Planète-arène (Thor: Ragnarok)",
    "A.I.M.": "Advanced Idea Mechanics (organisation scientifique)",
    "Choctaw": "Nation amérindienne Choctaw",
    "Ordre des chastes": "Ordre de ninjas (Daredevil)",
    "Chambre Rouge": "Programme d'entraînement des Veuves noires",
    "Talokan": "Royaume sous-marin (Black Panther: Wakanda Forever)",
    "Conseil des Kangs": "Assemblée des variants de Kang",
    "La Main": "Organisation ninja (Daredevil, Iron Fist)",
    "X-Force": "Unité paramilitaire de mutants (Deadpool)",
    "French Resistance": "Résistance française (WWII)",
    "Mohawk": "Nation mohawk",
    "FLG": "Flag Smashers (Falcon and the Winter Soldier)",
    "U-GIN": "Unité GIN (Black Widow)",
    # Affiliations consolidées (issues du JSON après replace_affiliations)
    "Skrull": "Race extraterrestre (Captain Marvel, Secret Invasion)",
    "Harlem": "Quartier / gangs de Harlem (Luke Cage)",
    "Wilson Fisk": "Kingpin, criminel (Daredevil, Hawkeye)",
    "Le Vautour": "Adrian Toomes, voleur (Spider-Man)",
    "Dieux Egyptiens (Moon Knight)": "Ennéade, panthéon égyptien (Moon Knight)",
    "Famille royale de Titan (Thanos)": "Famille de Thanos (Titan)",
    "Le Collectionneur": "Tivan, collectionneur d'artefacts (Guardians)",
    "Xandar": "Planète / Nova Corps (Guardians)",
    "Kree": "Empire Kree (Captain Marvel)",
    "Dimension Noire": "Dimension mystique (Shang-Chi)",
    "Intelligencia (She-Hulk)": "Groupe de hackers (She-Hulk)",
    "O.X.E.": "Organisation (Agatha)",
    "Sorcière": "Sorcières de Salem (Agents of S.H.I.E.L.D.)",
    "S.W.O.R.D.": "Sentient Weapon Observation Response Division",
    "Ordre des Gardiens": "Ordre des Veilleurs (Moon Knight)",
    "Clandestines (Ms. Marvel)": "Djinns (Ms. Marvel)",
    "Monde Quantique": "Royaume quantique (Ant-Man)",
    "Sorcières": "Coven (Agatha)",
    "W.E.B.": "Worldwide Engineering Brigade",
    "Young Avengers": "Équipe de jeunes héros",
    "Fraternité Aryenne (Gang)": "Gang de prison (Luke Cage)",
    "Fiona's Crew (Gang)": "Gang de Fiona (Daredevil)",
    "Kraven": "Chasseur (Kraven the Hunter)",
    "Cavaliers d'Apocalypse (X-Men)": "Serviteurs d'Apocalypse (X-Men)",
    "Daily Beagle (parodie Daily Bugle)": "Parodie du Daily Bugle (Spider-Verse)",
    "Indépendante": "Sans affiliation",
    "Équipe de Spider-Man (Spider-Verse animé)": "Équipe multiverselle (Spider-Verse)",
}

with open(JSON_PATH, encoding="utf-8") as f:
    data = json.load(f)

affs = Counter(c.get("affiliation", "") for c in data["characters"] if c.get("affiliation"))

lines = [
    "# Glossaire des affiliations (marvel-cineverse.json)",
    "",
    "Liste extraite après consolidation (voir `scripts/replace_affiliations.py`).",
    "",
    "## Par ordre de fréquence",
    "",
    "| Nb | Affiliation | Signification |",
    "|----|-------------|---------------|",
]

for aff, n in affs.most_common():
    aff_esc = aff.replace("|", "\\|")
    sig = SIGNIFICATIONS.get(aff, "-")
    lines.append(f"| {n} | {aff_esc} | {sig} |")

lines.extend(["", f"**Total : {len(affs)} affiliations uniques**"])

OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
print(f"Écrit dans {OUT_PATH}")
