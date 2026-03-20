# INSTRUCTIONS CLAUDE CODE — BATCH 4 : Races, Sorts, Progression

> **Prérequis** : Batches 1-3 appliqués.

---

## 1. ÉCRAN CHOIX RACE (CHOIXRACE)

### Position dans le flow
Après l'assignation des stats, **avant** les catégories d'armes :
```
Classe → Stats → Race → Catégories d'armes → Feuille MDI
```

### Structure UI
- 5-6 onglets : Humains, Elfes, Races Souterraines, Races Féériques, Races Géantes, Autres
- Chaque onglet contient une liste de races avec colonnes :
  CO, AG, AD, ME, RS, FO, RP, PR, EM, IT, Type de dé, Max PC
- Les valeurs sont les **bonus/malus raciaux** ajoutés à la stat

### Données races (depuis CPR093 screenshots, onglet Elfes)

```javascript
const RACES_ELFES = [
  { name: "Semi-Elfes",   bonuses: { CO:5, AG:5, AD:10, ME:0, RS:0, FO:5, RP:10, PR:10, EM:0, IT:0 },  hitDie:"1-10", maxHP:150 },
  { name: "Semi-Elfes B", bonuses: { CO:0, AG:10, AD:5, ME:0, RS:0, FO:0, RP:10, PR:10, EM:0, IT:0 },  hitDie:"1-10", maxHP:130 },
  { name: "Semi-Elfes C", bonuses: { CO:10, AG:5, AD:10, ME:0, RS:0, FO:10, RP:10, PR:5, EM:-5, IT:5 }, hitDie:"1-10", maxHP:150 },
  { name: "Semi-Elfes D", bonuses: { CO:5, AG:5, AD:5, ME:0, RS:0, FO:5, RP:10, PR:10, EM:0, IT:0 },   hitDie:"1-10", maxHP:150 },
  { name: "Semi-Elfes E", bonuses: { CO:0, AG:10, AD:5, ME:0, RS:0, FO:5, RP:10, PR:5, EM:0, IT:0 },   hitDie:"1-10", maxHP:120 },
  { name: "Semi-Elfes F", bonuses: { CO:15, AG:5, AD:-10, ME:-5, RS:-5, FO:15, RP:5, PR:-5, EM:-5, IT:-5 }, hitDie:"1-15", maxHP:300 },
  { name: "Elfe des Bois", bonuses: { CO:0, AG:10, AD:-20, ME:5, RS:0, FO:0, RP:5, PR:0, EM:5, IT:0 },  hitDie:"1-8", maxHP:100 },
  { name: "Grand Elfe",    bonuses: { CO:0, AG:5, AD:-20, ME:5, RS:0, FO:0, RP:10, PR:10, EM:10, IT:0 }, hitDie:"1-8", maxHP:110 },
  { name: "Elfe Clair",    bonuses: { CO:0, AG:5, AD:-20, ME:5, RS:0, FO:0, RP:15, PR:15, EM:5, IT:0 },  hitDie:"1-10", maxHP:120 },
  { name: "Elfe Gris",     bonuses: { CO:5, AG:5, AD:-20, ME:5, RS:0, FO:5, RP:10, PR:5, EM:5, IT:0 },   hitDie:"1-8", maxHP:120 },
];
```

### Vérification Sorcier Félicia (Elfe Gris)
Bonus Race observés dans la feuille : CO+5, AG+5, AD-20, ME+5, FO+5, RP+10, PR+5, EM+5 ✅

### Source complète des races
Les races sont dans le fichier `CUSTOM.MND` (ou `DEFAUT.MND`) après le marqueur `&&`.
Le parser monde_defaut.json les a mélangées avec les weapon_categories.
**TODO** : Parser correctement la section races du .MND avec les bonus numériques.
En attendant, la table 04-01 Race Abilities du livre RM2 Classic (images fournies) peut servir de source.

### Table 04-01 Race Abilities (RM2 Classic) — Mapping colonnes

Le livre utilise : ST, QU, PR, IN, EM, CO, AG, SD, ME, RE
CPR093 utilise : CO, AG, AD, ME, RS, FO, RP, PR, EM, IT

Mapping :
```javascript
const BOOK_TO_CPR = {
  ST: 'FO', QU: 'RP', PR: 'PR', IN: 'IT', EM: 'EM',
  CO: 'CO', AG: 'AG', SD: 'AD', ME: 'ME', RE: 'RS'
};
```

---

## 2. SYSTÈME DE SORTS — MÉCANISME COMPLET

### Pools séparés
Les **DP** (compétences) et les **points de sorts** sont des **pools séparés**.
- DP titre : "Compétences X points à répartir"
- Sorts titre : "Listes de sorts (X pts)"

### Budget points de sorts
Le nombre de points de sorts disponibles par niveau = DP total (même valeur).
Observé : Barde avec DP=38, sorts=(38 pts) en phase apprenti.

### Mécanisme d'apprentissage des sorts par palier
1. Le joueur **investit des points** dans une liste de sorts (coût par palier)
2. Le **palier** s'accumule (ex: +15 sur Feux Mana)
3. Un **jet de réussite** (D100 ≤ palier accumulé) détermine si on obtient le niveau
4. Si réussi : on gagne les niveaux de la liste (ex: niveaux 1-5 pour le premier palier)
5. Si raté : on continue à investir pour augmenter le palier

### Coûts de listes de sorts (observés pour Barde)
```
Base de la classe:        4/* par palier (Puissance des Chants)
Libre du royaume:         4/* par palier (Soins Personnels)
Réservée du royaume:      8/* par palier (Maîtrise Mentale)
Arcane:                   4/* par palier (Feux Mana)
```

### Structure de la table Listes de sorts
```javascript
{
  name: "Puissance des Chants",
  cost: "4/*",           // coût par point de palier
  palier: 15,            // palier accumulé (points investis)
  niveau: 10,            // niveaux de sorts obtenus après jet réussi
  reference: "Base (MS)" // type + livre source
}
```

### Colonnes : Nom, Coût, Palier (+/-), Niveau, Référence
- Le bouton **+** augmente le palier (investit des points)
- Le bouton **-** retire des points du palier
- Le bouton **Jet Réussi** lance le D100 et vérifie si ≤ palier

---

## 3. TABLE STAT GAIN (05-02) — Progression des stats

Utilisée lors du passage de niveau ("Monter au prochain niveau") pour augmenter les stats.

La table prend en entrée :
- **Roll** : jet D100 (1-100)
- **Différence** : écart entre le Potentiel et la Temporaire (pot - temp)

Et retourne le **gain** à ajouter à la stat temporaire.

```javascript
// Stat Gain Table 05-02 (RM2 Classic)
// Colonnes: diff 0, 1, 2, 3, 4-5, 6-7, 8-9, 10-11, 12-14, 15+
// "*" = special/open-ended roll (re-roll and add)
const STAT_GAIN_TABLE = [
  // [rollMin, rollMax, [gain for each diff column]]
  [1,   4,  ['*','*','*','*','*','*','*','*','*','*']],
  [5,  10,  [0, 0, 0, 0, 0, 0, 0, '+1','+1','+1']],
  [11, 15,  [0, 0, 0, 0, 0, '+1','+1','+1','+2','+2']],
  [16, 20,  [0, 0, 0, 0, 0, '+1','+1','+2','+3','+3']],
  [21, 25,  [0, 0, 0, '+1','+1','+2','+2','+4','+4','+4']],
  [26, 30,  [0, 0, '+1','+1','+1','+2','+2','+3','+5','+5']],
  [31, 35,  [0, 0, '+1','+1','+1','+2','+3','+4','+5','+6']],
  [36, 40,  [0, 0, '+1','+1','+1','+2','+3','+3','+4','+7']],
  [41, 45,  [0, 0, '+1','+1','+2','+3','+3','+4','+6','+8']],
  [46, 50,  [0, 0, '+1','+1','+2','+3','+3','+5','+7','+9']],
  [51, 55,  [0, '+1','+1','+2','+2','+3','+4','+7','+7','+10']],
  [56, 60,  [0, '+1','+1','+2','+2','+4','+4','+6','+8','+11']],
  [61, 65,  [0, '+1','+1','+2','+3','+4','+4','+6','+8','+11']],
  [66, 70,  [0, '+1','+2','+2','+3','+5','+5','+7','+9','+12']],
  [71, 75,  [0, '+1','+2','+2','+3','+5','+5','+7','+9','+12']],
  [76, 80,  [0, '+1','+2','+3','+3','+5','+6','+8','+10','+13']],
  [81, 85,  [0, '+1','+2','+3','+4','+6','+6','+8','+10','+13']],
  [86, 90,  [0, '+1','+2','+3','+4','+6','+7','+9','+11','+14']],
  [91, 95,  [0, '+1','+2','+3','+4','+6','+7','+9','+11','+14']],
  [96, 99,  [0, '+1','+2','+3','+4','+6','+8','+10','+12','+15']],
  [100,100, [0, '+1','+2','+3','+4','+6','+8','+10','+12','+15']],
];
```

### Processus de progression des stats (à chaque montée de niveau)
1. Pour chaque stat : jet D100
2. Calculer diff = pot - temp
3. Lookup dans la table → gain
4. temp = min(temp + gain, pot)  // la temp ne peut pas dépasser le pot

---

## 4. POWER POINTS — FORMULE CONFIRMÉE

```javascript
// Pour un lanceur pur (un seul royaume) :
PP = ppTable[realm_stat] × level

// Pour un semi-lanceur :
PP = ppTable[realm_stat] × level  // (même formule, stat selon le royaume)

// Pour un hybride (deux royaumes) :
PP = ((ppTable[stat_realm1] + ppTable[stat_realm2]) / 2) × level
```

### Vérifications
- Sorcier niv.5, Essence/Théurgie, EM=101, IT=101 → PP = ((3.5+3.5)/2)×5 = 17.5 ✅
- Barde niv.1, Mentalisme, PR=90 → PP = 1.5×1 = 1.5 ✅

### Stat par royaume (rappel)
```javascript
const REALM_STATS = {
  'Essence': 'EM',     // Empathie (index 8)
  'Mentalisme': 'PR',  // Présence (index 7)
  'Théurgie': 'IT',    // Intuition (index 9)
};
```

---

## 5. BONUS PAR RANG (Skill Rank Bonus) — TABLE CONFIRMÉE

Observé sur le Barde :
- Mystification DM=2, Base=+10 ✅
- Eclair de feu DM=1, Base=+5 ✅
- Projection du Pouvoir DM=1, Base=+5 ✅

Table standard RM2 (par rang) :
```javascript
const RANK_BONUS = [
  -25,  // rang 0
  5,    // rang 1: +5
  10,   // rang 2: +10
  15,   // rang 3: +15
  20,   // rang 4: +20
  25,   // rang 5: +25
  27,   // rang 6
  29,   // rang 7
  31,   // rang 8
  33,   // rang 9
  35,   // rang 10
  // rang 11+: +35 + 1 par rang au-delà de 10
  // rang 16+: +40 + 0.5 par rang
  // rang 21+: +42.5 + 0.5 par rang
];
// Pour rang > 10: RANK_BONUS[10] + (rang - 10) pour 11-15
// Pour rang > 15: RANK_BONUS[10] + 5 + (rang - 15) * 0.5 pour 16-20
```

---

## 6. PARAMÈTRES CLASSES — DONNÉES OBSERVÉES

### Barde Semi-Elfes (observé)
```
PC de Base: 8
Cap. de PC: 9
Dés de vie: 1-10    // dé racial (Semi-Elfes)
PC maximaux: 150     // racial (Semi-Elfes)
BD Mélée: 35
BD Projectiles: 35
Pts de Pouvoir: 1.5  // à niveau 1
Pts de dével: 38
Royaume: Mentalisme
```

### Remarque PC de Base vs Cap PC
PC de Base et Cap de PC semblent être des paramètres de classe, pas de race.
Le dé de vie (1-10, 1-8, 1-15) et Max PC sont raciaux.

---

## 7. ACTIONS À IMPLÉMENTER (BATCH 4)

### Priorité 10 — Écran Choix Race
- Nouvel écran wizard entre assignation stats et catégories d'armes
- Onglets par famille de race
- Afficher les bonus/malus par stat + type de dé + max PC
- Après sélection, appliquer les bonus dans la colonne Race des caractéristiques
- Source de données : à parser depuis CUSTOM.MND ou à coder en dur depuis les captures

### Priorité 11 — Système de sorts complet
- Pool de points séparé des DP
- Popup d'ajout de liste (4 onglets × 4 sous-onglets)
- Mécanisme de palier : investir des points, jet de réussite, gain de niveaux
- Coûts depuis couts.json + spell_cost_by_realm dans carac_tables.json

### Priorité 12 — Progression de stats (Stat Gain)
- À chaque montée de niveau, jet D100 par stat
- Lookup dans la Stat Gain Table (05-02)
- Gain appliqué à la temp (cappé au pot)

### Priorité 13 — Table de taille (04-03)
- Hauteur et poids par race (roll-based)
- À implémenter dans le panneau Historique
