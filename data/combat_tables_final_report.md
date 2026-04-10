# combat_tables_final_report

## Résumé exécutif
- Tables d’attaque finales: **36**
- Tables de critiques finales: **34**
- Tables de fumble finales: **7**
- Tables d’attaque exotiques / arts martiaux incluses: **9**
- Sorties générées: `attack_tables.json`, `critical_tables.json`, `fumble_tables.json`

## Sources principales retenues par grande famille
- **Attaques core mêlée / thrust / polearms / distance**: `ICE 5520 - RMSS Arms Law [1994].pdf`
- **Attaques exotiques**: `4E - 5813 - The Armory.pdf`
- **Critiques core physiques**: `ICE 5520 - RMSS Arms Law [1994].pdf`
- **Critiques étendues modernes / énergie / balistique**: `3E - 5705 - 10 Million Ways to Die.pdf`
- **Critiques arts martiaux étendus**: `3E - 5602 - Martial Arts Companion.pdf`
- **Critiques créatures spéciales**: `4E - 5810 - Arms Law (2003).pdf`
- **Critiques magiques RM2 Companion III**: `ICE 1700 - RM2 Companion III [1988] {OCR}.pdf`
- **Fumbles fantasy weapon / non-weapon**: `4E - 5810 - Arms Law (2003).pdf`
- **Fumbles arts martiaux Companion I**: `Rolemaster Classic (RM2) - Companion 1 - ICE #1500.pdf`
- **Fumbles modernes / firearms**: `3E - 5705 - 10 Million Ways to Die.pdf`

## A. Fusion des attaques
### Volume final
- Corpus brut en entrée: **46** tables
- Corpus final dédupliqué: **36** tables
- Déduplication effectuée par table source réelle `(primary_pdf + primary_pages + name_en)`.
- Chaque table finale conserve une provenance détaillée (`provenance.merged_from`) avec les identifiants hérités des lots intermédiaires.

### Contrôles qualité — attaques
- Toutes les tables finales conservent les colonnes d’armure **AT 1-20** dans chaque ligne émise.
- Les tables standards sont marquées `structure_type = standard_at_20`.
- Les tables d’arts martiaux et certaines tables exotiques conservent leur structure bandée d’origine; elles n’ont pas été forcées dans un faux format plus fin.
- Les familles critiques ont été stabilisées dans `crit_types_present`, sans écraser les détails existants quand une variante plus verbale était présente.

### Collisions et fusions détectées — attaques
#### Doublons exacts fusionnés
- Club
- Flail
- Mace
- Morning Star
- Polearm
- Quarterstaff
- War Mattock

#### Collisions de métadonnées fusionnées
- Bola
- War Hammer

#### Collisions de représentation fusionnées
- Whip

### Corrections et points notables — attaques
- `Dagger` : correction conservée de la cellule **132 / AT 3** (`11DB` → `11DP`) issue du lot core melee.
- `Morning Star` : correction conservée de la cellule **150+ / AT 4** (`27K` → `27EK`) issue du lot core melee.
- `War Hammer` : la métadonnée `fumble_range` a été réconciliée vers la forme propre **`01 - 04 UM`**.
- `Whip` : la représentation core melee a été retenue comme canonique parce qu’elle inclut la bande zéro `UM-*`; la variante martial/exotic s’arrêtait à `15-24`.
- `Bola` : le lot ranged a été retenu comme canonique; le lot martial/exotic n’apportait qu’un cadrage de famille atypique.

### Tables exotiques / arts martiaux incluses
- Bola
- Gladiator's Net
- Katana
- Martial Arts Strikes
- Martial Arts Sweeps
- Nunchaku
- Steel Whip
- Wakazashi
- Whip

## B. Fusion des critiques
### Volume final
- Corpus brut en entrée: **34** tables
- Corpus final: **34** tables
- Aucune fusion silencieuse inter-édition n’a été appliquée.
- Les collisions homonymes inter-sources ont été **conservées comme tables distinctes** via des identifiants stables.

### Contrôles qualité — critiques
- Tables critiques standards 100×A-E: **22**
- Tables critiques à colonnes réduites (3 ou 4 colonnes visibles en source): **10**
- Tables critiques non standard à bandes matériaux: **2**
- `raw_text` a été conservé partout où disponible.
- `parsed_effects` n’a pas été inventé quand l’OCR ou la prose ne permettait pas une normalisation certaine.

### Variantes structurelles signalées
- Les critiques `10 Million Ways to Die` conservent leur schéma réellement imprimé: plusieurs tables n’ont que **A-D** et `Cold` n’a que **A-C**.
- `Large Creature` et `Super Large Creature` restent des matrices **row_band_material_critical_matrix** et n’ont pas été artificiellement converties en tables 1-100 A-E.
- Les critiques `Martial Arts Companion` ont été conservées séparément du bloc Arms Law / RMSS.

### Collisions / divergences d’édition — critiques
- Plasma: crit-tmwtd-plasma, crit-comp3-plasma
- Le nom `Plasma` existe dans deux familles différentes et a été conservé en double: une critique moderne `tmwtd` et une critique magique `comp3`.
- Les critiques core RMSS 1994 n’ont pas été remplacées par Arms Law 2003; ce dernier n’a joué qu’un rôle de témoin quand le lot le prévoyait.

### Tables encore incertaines — critiques
- Acid (crit-comp3-acid) — 1 cellule(s) vide(s) conservée(s) dans la source extraite
- Depression (crit-comp3-depression) — 1 cellule(s) vide(s) conservée(s) dans la source extraite
- Disruption (crit-comp3-disruption) — 2 cellule(s) vide(s) conservée(s) dans la source extraite
- Plasma (crit-comp3-plasma) — 1 cellule(s) vide(s) conservée(s) dans la source extraite
- Shock (crit-comp3-shock) — 2 cellule(s) vide(s) conservée(s) dans la source extraite
- Sparring / Practice (crit-comp7-sparring-practice) — 1 cellule(s) vide(s) conservée(s) dans la source extraite
- Stress (crit-comp3-stress) — 3 cellule(s) vide(s) conservée(s) dans la source extraite
- Les symboles abrégés sans numéral explicite dans les critiques core RMSS (`π`, `∏`, `∑`, `∫`) ont été volontairement laissés dans `raw_text` quand leur normalisation n’était pas certaine.
- Les critiques `10 Million Ways to Die` restent les plus bruitées textuellement, même quand le comptage des colonnes est sûr.

## C. Stabilisation des fumbles
### Volume final
- Corpus brut en entrée: **7** tables
- Corpus final: **7** tables
- Les tables homonymes mais différentes ont été conservées séparément.

### Contrôles qualité — fumbles
- Les matrices à bandes conservent leur structure d’origine.
- Les tables prose à colonne unique de Companion I restent en `single_column_roll_table`.
- Le texte brut a été préservé; `parsed_effects` n’a été renseigné que lorsqu’un effet explicite était suffisamment clair.
- La colonne `polearms_and_spear` / `polearms_and_spears` a été **stabilisée** dans le corpus final vers `polearms_and_spears`, avec conservation des libellés source dans `source_column_labels` quand nécessaire.

### Collisions / variantes — fumbles
- Non-Weapon Fumble Table: fumble-al2003-non-weapon-fumble-table, fumble-tmwtd-non-weapon-fumble-table
- `Non-Weapon Fumble Table` apparaît dans Arms Law 2003 et dans `10 Million Ways to Die`; ces tables ne sont pas identiques et n’ont donc pas été fusionnées.
- Les deux fumbles Companion I ont été laissées dans leur forme prose bandée, sans fausse matrice.

## D. Répartition finale par source
### Attaques
- 4E - 5813 - The Armory.pdf: 5
- ICE 5520 - RMSS Arms Law [1994].pdf: 31

### Critiques
- 3E - 5602 - Martial Arts Companion.pdf: 2
- 3E - 5705 - 10 Million Ways to Die.pdf: 12
- 4E - 5810 - Arms Law (2003).pdf: 5
- ICE 1700 - RM2 Companion III [1988] {OCR}.pdf: 7
- ICE 1902 - RM2 Companion VII [1993] {OCR}.pdf: 1
- ICE 5520 - RMSS Arms Law [1994].pdf: 7

### Fumbles
- 3E - 5705 - 10 Million Ways to Die.pdf: 3
- 4E - 5810 - Arms Law (2003).pdf: 2
- Rolemaster Classic (RM2) - Companion 1 - ICE #1500.pdf: 2

## Points à revérifier avant intégration moteur
1. **Hypothèses du moteur sur les critiques**: si le moteur suppose systématiquement `A-E`, il faudra gérer les tables `10 Million Ways to Die` à 3 ou 4 colonnes, ainsi que `Large Creature` / `Super Large Creature`.
2. **Tables critiques OCR moyennes**: Companion III (`Plasma`, `Acid`, `Depression`, `Stress`, `Shock`, `Disruption`) et Companion VII (`Sparring / Practice`) méritent une revérification visuelle ciblée si ces tables deviennent critiques en jeu.
3. **Tables d’attaque non uniformes**: `Martial Arts Strikes`, `Martial Arts Sweeps`, et les tables Armory 45 lignes sont structurellement cohérentes mais non isomorphes aux tables RMSS 100 lignes; le moteur devra respecter `structure_type`.
4. **Nommage métier**: `Wakazashi` est conservé tel quel car c’est l’orthographe de la page source Armory; ne pas “corriger” silencieusement côté moteur si la traçabilité prime.
5. **Fumbles**: si le moteur attend une seule famille `Non-Weapon Fumble Table`, il devra discriminer par `id` ou `source` pour éviter de confondre Arms Law et TMWTD.

## Verdict
Le corpus final est **cohérent, auditable et traçable**. Les collisions ont été documentées et non écrasées silencieusement. Les variantes structurelles réelles ont été conservées comme telles au lieu d’être artificiellement homogénéisées au prix d’une perte d’information.
