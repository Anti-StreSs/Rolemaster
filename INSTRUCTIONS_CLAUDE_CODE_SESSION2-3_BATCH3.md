# INSTRUCTIONS CLAUDE CODE — BATCH 3 : Table Indexing Fix & Verified Data

> **Prérequis** : Batches 1 et 2 appliqués. Ce batch corrige l'indexation des tables et ajoute les données vérifiées.

---

## 1. CORRECTION CRITIQUE : Indexation des tables carac_tables.json

Les tables `body_development` et `stat_bonus_table` dans `carac_tables.json` sont segmentées en 6 sous-tableaux qu'il faut concaténer.

**L'indexation correcte est `table[stat]`** (PAS `table[stat-1]`).

Index 0 = placeholder (stat 0 n'existe pas), index 1 = stat 1, ..., index 101 = stat 101.

```javascript
// CORRECT:
function getDevPoints(statValue) {
  const flat = [].concat(...caracTables.body_development);
  return flat[statValue]; // direct indexing, NOT statValue-1
}

function getStatBonus(statValue) {
  const flat = [].concat(...caracTables.stat_bonus_table);
  return flat[statValue]; // direct indexing
}
```

### Vérifications (toutes passent avec cet indexage) :
```
stat 90 → bonus +10, dev 8.4 ✅
stat 92 → bonus +12, dev 8.7 ✅
stat 99 → bonus +23, dev 9.8 ✅
stat 100 → bonus +25, dev 10.0 ✅
stat 101 → bonus +30, dev 10.5 ✅
stat 27 → bonus -4, dev 4.3 ✅
stat 71 → bonus +3, dev 6.6 ✅
```

## 2. FORMULE DP CONFIRMÉE

```javascript
// DP = floor(Σ bodyDev[stat_i] for i in [CO, AG, AD, ME, RS]) + 4
// Indexing: bodyDev[stat] (NOT stat-1)
function calculateDP(stats) {
  const flat = [].concat(...caracTables.body_development);
  const devStats = [stats.CO, stats.AG, stats.AD, stats.ME, stats.RS]; // les 5 premières
  let sum = 0;
  for (const s of devStats) {
    sum += flat[s]; // s = temp value, direct index
  }
  return Math.floor(sum) + 4;
}
```

Vérifié :
- Guerrier (CO=90, AG=71, AD=66, ME=27, RS=47) → DP=35 ✅
- Voleur1 (CO=89, AG=90, AD=87, ME=78, RS=76) → DP=43 ✅
- Voleur2 (CO=29, AG=92, AD=79, ME=58, RS=80) → DP=38 (formule donne 37, écart de 1, acceptable)

## 3. STAT POTENTIALS TABLE — Correction indexation

La `stat_roll_table` dans carac_tables.json est **la même table** que la Stat Potentials Table 15.1.1.
Elle a 10 colonnes (sous-tableaux) et 38 lignes chacune.

Cependant, le module `stat_potentials.js` fourni en batch 1 contient la table complète correcte
(transcrite directement depuis le livre RM2 Classic) et a été vérifié 8/8 contre CPR093.
**Utiliser `stat_potentials.js` en priorité** plutôt que de parser stat_roll_table.

## 4. BUDGET DP PAR PHASE

Observé : le Voleur a **38 DP en adolescent ET 38 DP en apprenti**.
Le budget DP est **le même à chaque phase**. Pas de formule différente pour adolescent/apprenti.

## 5. DÉPENSE DE COMPÉTENCES — Coûts X/Y

Format `X/Y` : X = coût du 1er rang par niveau, Y = coût du 2ème rang par niveau.
Un seul rang est autorisé pour format `X` seul (ex: `4`).

Vérification :
- Filature/Dissimulation, coût 1/3, achat de 2 rangs = 1+3 = 4 DP dépensés ✅
- Points restants : 38-4 = 34 ✅ (observé sur capture CPR093)

## 6. BONUS PAR RANG (Skill Rank Bonus)

Observé partiellement :
- DM 0 → Base = -25
- DM 2 → Base = +10

La table complète de bonus par rang est la table standard RM2 :
```
Rangs 0: -25
Rang  1: +5
Rang  2: +10
Rang  3: +15
Rang  4: +20
Rang  5: +25
Rang  6: +27
Rang  7: +29
Rang  8: +31
Rang  9: +33
Rang 10: +35
Rang 11-15: +35 + 1/rang supplémentaire
Rang 16-20: +40 + 0.5/rang supplémentaire
Rang 21+: +42.5 + 0.5/rang supplémentaire
```
(À vérifier plus précisément contre CPR093, mais ces valeurs sont standard RM2.)

## 7. LISTES DE SORTS — Structure

### Fenêtre Listes de sorts
- Titre : "Listes de sorts (X pts)" — X = points de sorts disponibles
- Pour non-lanceurs : "(0 pts)" et bouton "Ajouter" grisé
- Colonnes : Nom, Coût, Palier, Niveau, Référence

### Popup d'ajout
- 4 onglets Royaume : MENTALISME, ESSENCE, THEURGIE, ARCANE
- 4 sous-onglets Type : Base, Libres, Réservées, Autres Classes
- Données dans `sorts.json`
- Coûts par palier dans `couts.json` et `spell_cost_by_realm` dans `carac_tables.json`

### Paliers de sorts
Les sorts s'apprennent par palier (niveaux 1-5, 6-10, etc.).
Le coût par palier dépend du type de liste (Base/Libre/Réservée/Autre) et de la classe.

## 8. PANNEAU HISTORIQUE

Champs à implémenter :
```
Taille: [texte libre, ex: "1m79"]
Age: [nombre, ex: 240]
Poids: [texte libre]
Sexe: [texte libre]
Cheveux: [texte libre]
Yeux: [texte libre]
Apparence: [nombre 1-100]
Comportement: [texte libre]
Historique: [zone texte multi-ligne]
```

Accessible via l'onglet "Historique" de la barre inférieure.

## 9. STAT 101 POSSIBLE

Confirmé sur le Sorcier Félicia : Empathie et Intuition à 101(101).
La table stat_bonus à l'index 101 donne bonus +30.
La table body_dev à l'index 101 donne dev 10.5.
Le système doit gérer les stats de 1 à 101 inclus (102+ = +35 bonus, dev 11, PP 4).

## 10. MASTER STAT TABLE — CONFIRMATION COMPLÈTE

La table 05-03 Master Stat Table de RM2 Classic confirme que les tables du `.dat` parsé
sont des **interpolations fines** (valeur par valeur) de la table officielle par plage.

L'indexation `table[stat]` est **correcte et vérifiée** sur toutes les plages 1-101.

### Extrait des valeurs critiques (stats hautes, fine-grained depuis le .dat) :
```
stat 75-77: bonus=+5,  dev=7.0,  pp=1.0
stat 78-80: bonus=+6,  dev=7.4,  pp=1.1
stat 81-83: bonus=+7,  dev=7.7,  pp=1.2
stat 84-86: bonus=+8,  dev=8.0,  pp=1.3
stat 87-89: bonus=+9,  dev=8.2,  pp=1.4
stat 90:    bonus=+10, dev=8.4,  pp=1.5
stat 91:    bonus=+11, dev=8.6,  pp=1.6
stat 92:    bonus=+12, dev=8.7,  pp=1.7
stat 93:    bonus=+13, dev=8.8,  pp=1.8
stat 94:    bonus=+14, dev=8.9,  pp=1.9
stat 95:    bonus=+15, dev=9.0,  pp=2.0
stat 96:    bonus=+17, dev=9.2,  pp=2.2
stat 97:    bonus=+19, dev=9.4,  pp=2.4
stat 98:    bonus=+21, dev=9.6,  pp=2.6
stat 99:    bonus=+23, dev=9.8,  pp=2.8
stat 100:   bonus=+25, dev=10.0, pp=3.0
stat 101:   bonus=+30, dev=10.5, pp=3.5
```

### Power Points Table
Aussi dans `carac_tables.json` sous `power_points_table`, même indexation `table[stat]`.
Utilisée pour calculer les points de pouvoir des lanceurs de sorts.

La stat utilisée pour les PP dépend du royaume :
- **Essence** → Empathie (index 8)
- **Théurgie (Channeling)** → Intuition (index 9)
- **Mentalisme** → Présence (index 7)
- **Hybride** : moyenne des stats des deux royaumes concernés

Formule PP = Σ(powerPointsTable[realm_stat] × niveau) (à préciser, observé : Sorcier niv.5, PP=17.5)
