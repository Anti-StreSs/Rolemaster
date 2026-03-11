# PROMPT CLAUDE CODE — Phase 3 : Parser les fichiers .dat

> Lancer dans : `cd B:\IA_WORKS\2025-01-17_CPR_Rolemaster_Reverse && claude`

## Contexte

Les fichiers de données originaux de CPR093.exe ont été retrouvés dans :
`B:\Ghidra\Projects\CPR\DATA\`

Ces fichiers contiennent TOUTE la mécanique Rolemaster du jeu. Copier d'abord dans le projet puis parser.

## Commande à exécuter

```
Copie tous les fichiers de B:\Ghidra\Projects\CPR\DATA\ vers ./data/ dans notre projet, 
puis parse systématiquement chaque fichier .dat pour en extraire les structures de données 
en JSON exploitable. Voici ce que contient chaque fichier :

FICHIERS DE DONNÉES DISPONIBLES (B:\Ghidra\Projects\CPR\DATA\) :
- CARAC.DAT (3.6KB) — Tables de bonus stats, tables de dév. corporel, table d'armures, table de sorts
- CLASSES.DAT (2.3KB) — 68 classes/professions avec paramètres (realm, stats primaires, groupes)
- CLASENG.DAT (854B) — Noms anglais des classes
- COMP.DAT (6.5KB) — ~170 compétences avec stats associées, catégories, sous-spécialités
- COMPENGL.DAT (3KB) — Noms anglais des compétences
- CATEG.DAT (1.2KB) — 60 catégories de sous-spécialités (FR)
- CATEGENG.DAT (1.1KB) — Catégories (EN)
- SORTS.DAT (4.2KB) — Listes de sorts (FR/EN en alternance), séparées par * et &
- COUTS.DAT (109KB) — Matrice des coûts de développement par classe (réf. PATHCLAS.DAT)
- PATHCLAS.DAT (866B) — 69 fichiers .dat individuels par classe
- SIMIL.DAT (4.4KB) — Matrice de similarité inter-compétences
- OPTIONS.DAT (4.7KB) — Options de règles optionnelles (FR)
- OPTIONSE.DAT (3.2KB) — Options (EN)
- DEFAUT.OPT (341B) — Valeurs par défaut des options
- DEFAUT.MND (7.8KB) — Monde par défaut (FR)
- DEFAUTEN.MND (5.8KB) — Monde par défaut (EN)
- RCP.INI (144B) — Config utilisateur (police, langue, email, chemin monde)

FORMAT DES FICHIERS :
- CARAC.DAT : Lignes de nombres séparés par espaces/virgules. Sections : 
  lignes 1-9 = table de tirage stats (10 tirages), 
  lignes 10-18 = table de dév. corporel par race,
  lignes 19-21 = table bonus stats (segments -25 à +91),
  [sorts] = coûts sorts par realm,
  [armures] = pénalités armures
- CLASSES.DAT : Ligne 1 = nombre de classes (68), puis "Nom" suivi de paramètres numériques
- COMP.DAT : "Nom compétence" suivi de params, sections séparées par *
- SORTS.DAT : Paires FR/EN, * = fin de groupe, & = fin de section (realms)

OBJECTIF :
1. Copier les fichiers dans ./data/
2. Créer reconstruction/dat_parser.py — parser universel pour chaque format
3. Produire des JSON structurés dans ./data/parsed/ :
   - carac_tables.json (bonus, dev corporel, armures)
   - classes.json (68 classes avec noms FR/EN et params)
   - competences.json (toutes compétences avec catégories)
   - sorts.json (listes de sorts par realm)
   - couts.json (matrice coûts dev par classe)
   - options.json (règles optionnelles)
   - monde_defaut.json (monde par défaut)
4. Mettre à jour CHECKPOINT.md
5. /checkpoint + /commit
```

## Note importante

Les fichiers .dat individuels par classe (guerrier.dat, magicien.dat, etc.) référencés dans 
PATHCLAS.DAT ne sont PAS présents dans le dossier DATA. Ils contiennent les tables de coûts 
spécifiques par classe. COUTS.DAT contient probablement ces données de façon consolidée 
(109KB = suffisamment grand pour 68 classes). À vérifier lors du parsing.
