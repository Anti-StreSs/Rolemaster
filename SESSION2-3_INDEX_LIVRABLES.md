# SESSION 2-3 — INDEX DES LIVRABLES

> Tous ces fichiers doivent être copiés dans le dossier du projet.
> Les .js vont dans `pwa/js/engine/`, les .json dans `data/parsed/`, les .md à la racine.

## Instructions Claude Code (à donner séquentiellement)

| # | Fichier | Contenu | Statut |
|---|---------|---------|--------|
| 1 | `INSTRUCTIONS_CLAUDE_CODE_SESSION2-3.md` | Flow, Stat Potentials, assignation, DP, filtres classe | ✅ Appliqué |
| 2 | `INSTRUCTIONS_CLAUDE_CODE_SESSION2-3_BATCH2.md` | Armes (6 catégories), dépense DP, sorts basique, historique | 🔄 En cours |
| 3 | `INSTRUCTIONS_CLAUDE_CODE_SESSION2-3_BATCH3.md` | Fix indexation table[stat], Master Stat Table, PP confirmé | 📋 Prêt |
| 4 | `INSTRUCTIONS_CLAUDE_CODE_SESSION2-3_BATCH4.md` | Races, sorts complet, Stat Gain, Skill Rank Bonus corrigé | 📋 Prêt |

## Modules Engine JS → `pwa/js/engine/`

| Fichier | Contenu | Vérifié |
|---------|---------|---------|
| `stat_potentials.js` | Table 05-01, lookup temp+pot, bonus prime | 8/8 cas ✅ |
| `skill_rank_bonus.js` | Table 07-01 RM Classic (rang 0-30 → -25 à +80) | Rangs 0-2 ✅ |
| `stat_gain.js` | Table 05-02 depuis CARAC.DAT (15×20), progression stats | Structure vérifiée |

## Données JSON → `data/parsed/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `stat_potentials_table.json` | Table brute 05-01 en JSON | Transcrit du livre |
| `races_CUSTOM.json` | 53 races avec bonus stats, hit die, max PC | Parsé de CUSTOM.MND |
| `monde_CUSTOM.json` | Monde complet (armes + catégories) | Parsé de CUSTOM.MND |
| `rolemaster-classic-character-law-tables-normalized.json` | 77 tables RM Classic normalisées | GPT depuis PDF |

## Données source CARAC.DAT déjà dans `carac_tables.json`

| Table | Indexation | Contenu |
|-------|-----------|---------|
| `stat_roll_table` | 10 colonnes × 38 lignes | = Stat Potentials Table |
| `body_development` | table[stat] direct | Dev Points (DP calculation) |
| `stat_bonus_table` | table[stat] direct | Bonus Normal |
| `power_points_table` | table[stat] direct | PP par niveau |
| `spell_cost_by_realm` | realm 1-4 | Coûts sorts par realm |
| `armor_penalties` | 5 types × 16 valeurs | Pénalités armure |

## Formules confirmées

```
Stat Potentials:     pot = lookupTable(pot_roll, temp)
Prime stat:          temp = max(roll, 90), pot = lookupTable(pot_roll, new_temp)
Dev Points:          DP = floor(Σ bodyDevTable[CO,AG,AD,ME,RS]) + 4
Bonus Carac:         floor(avg(bonus_stat1, bonus_stat2, ...))
Power Points (pur):  PP = ppTable[realm_stat] × level
Power Points (hybr): PP = avg(ppTable[stat1], ppTable[stat2]) × level
Skill cost X/Y:      rang1 = X DP, rang2 = Y DP par niveau
Table indexation:    table[stat] (PAS table[stat-1])
```

## Points ouverts

1. Skill Rank Bonus rangs 6+ : RM2 (+27,+29,+31) vs RM Classic (+30,+35,+40) — vérifier CPR093
2. Stat Gain roll ranges pour les 15 lignes du DAT — mapping estimé, pas confirmé
3. Open-ended rolls (01-04) dans Stat Gain — comportement exact inconnu
4. DP écart de 1 point sur un cas (Voleur2: 37 calculé vs 38 observé)
5. Pas de contraintes adolescent confirmées (coûts identiques)
