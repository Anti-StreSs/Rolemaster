# INSTRUCTIONS CLAUDE CODE — BATCH 5 : Races & Données consolidées

> Court batch. Claude Code travaille déjà sur les sous-catégories d'armes.

---

## 1. FICHIER RACES — `data/parsed/races_monde_CUSTOM.json`

Fichier prêt à intégrer : **53 races** en **6 groupes**, avec bonus stats, hit die et max PC.
Parsé depuis CUSTOM.MND (bonus numériques) et catégorisé depuis monde_CUSTOM-revise-races.json (labels de groupes).

### Structure
```javascript
{
  "_stat_order": ["CO","AG","AD","ME","RS","FO","RP","PR","EM","IT"],
  "groups": [
    {
      "group_id": "&&",               // identifiant brut
      "group_label": "Variantes humaines",  // label UI pour l'onglet
      "races": [
        {
          "name": "Sans Race",
          "bonuses": {"CO":0,"AG":0,"AD":0,"ME":0,"RS":0,"FO":0,"RP":0,"PR":0,"EM":0,"IT":0},
          "hit_die": "1-10",
          "max_pc": 150
        },
        // ...
      ]
    },
    // 5 autres groupes...
  ]
}
```

### Les 6 groupes (onglets UI)
| group_id | group_label | Nb races |
|----------|------------|----------|
| && | Variantes humaines | 12 |
| Semi-Elfes | Sous-types elfes / semi-elfes | 13 |
| Homme Demon | Races extraplanaires ou démoniaques | 6 |
| Semi-Nain | Races naines / petites / orquines | 10 |
| Gremlin | Petites races féeriques | 6 |
| Semi-Ogres | Races ogres / trolls / géantes | 6 |

### Écran Choix Race — UI
- Position dans le flow : après assignation stats, **avant** catégories d'armes
- 6 onglets (un par groupe), chaque onglet affiche la liste de races du groupe
- Colonnes : Nom, CO, AG, AD, ME, RS, FO, RP, PR, EM, IT, Dé de vie, Max PC
- Sélection → OK → les bonus Race s'appliquent dans la colonne "Race" des Caractéristiques
- Le `hit_die` et `max_pc` de la race sélectionnée remplacent les valeurs par défaut du panneau Général

### Application des bonus raciaux
```javascript
// Après sélection de la race :
for (const stat of STAT_ORDER) {
  character.raceBonuses[stat] = selectedRace.bonuses[stat];
  // Le bonus total de la stat = bonus_normal + bonus_race + bonus_special
}
character.hitDie = selectedRace.hit_die;
character.maxPC = selectedRace.max_pc;
```

## 2. MODULES JS SUPPLÉMENTAIRES

Deux modules engine prêts à copier dans `pwa/js/engine/` :

- **`skill_rank_bonus.js`** — Table 07-01 RM Classic : rang 0→-25, rang 1→+5, ... rang 10→+50, rang 30→+80
- **`stat_gain.js`** — Table 05-02 depuis CARAC.DAT : 15 lignes × 20 colonnes, progression stats au level-up

## 3. TABLE NORMALISÉE RM CLASSIC

Le fichier `rolemaster-classic-character-law-tables-normalized.json` (752KB, 77 tables) est disponible comme référence croisée pour toute table manquante. Utiliser avec précaution — les données du CARAC.DAT priment pour la fidélité CPR093.
