# INSTRUCTIONS CLAUDE CODE — Session 2-3 : Stat Generation & Prime Stats

## Résumé des découvertes (vérifiées sur 8 cas CPR093.exe)

### 1. FLOW DE CRÉATION (corrigé)

L'ordre réel dans CPR093 est :
```
Classe (CHOIXCLA) → Tirage stats (CHOIXCAR) → Feuille principale MDI
```
- **PAS de saisie du nom avant** — le nom et la race se saisissent directement dans le panneau "Général" de la feuille principale
- Le bouton "Guide" sur l'écran de choix de classe est un **FILTRE radio** par catégorie de profession (9 catégories : COMBAT, ARTS MARTIAUX, MENTALISME, VOYAGE/NATURE, HABITANT, ESSENCE, SUBTERFUGE, OBJET/SAVOIR, THEURGIE)
- Le bouton "Annuler" en bas à gauche (au lieu de "Guide" quand un filtre est actif) désactive le filtre

### 2. STAT POTENTIALS TABLE (CRITIQUE)

Le mécanisme de tirage des stats dans CPR093 utilise la table **15.1.1 / 05-01 Stats Potential Table** de RM2 Character Law. 

**Fichier fourni** : `stat_potentials.js` — module prêt à intégrer dans `pwa/js/engine/`

#### Algorithme exact :

```javascript
// Pour chaque stat :
// 1. Tirer deux d100 : temp_roll et pot_roll
// 2. temp = temp_roll (c'est la valeur temporaire directe)
// 3. pot = statPotentialLookup(pot_roll, temp) // via la table
// 4. Afficher "temp(pot)"

// Pour les stats PRIMORDIALES de la classe :
// 1. new_temp = max(temp_roll, 90)
// 2. new_pot = statPotentialLookup(pot_roll, new_temp) // recalcul avec la nouvelle temp
// 3. Afficher "new_temp(new_pot)"
```

**IMPORTANT** : Le programme stocke les **rolls bruts** (temp_roll, pot_roll) en interne.
Quand un tirage est assigné à une stat primordiale, le pot est **recalculé** à partir du pot_roll brut, pas du pot affiché. C'est pourquoi le pot peut parfois "régresser" après application du bonus primordial (ex: 80(92) → 90(90)). Ce n'est PAS un bug.

#### Données internes stockées par roll :
```javascript
{
  tempRoll: number,  // d100 brut pour la temp (1-100)
  potRoll: number,   // d100 brut pour le potentiel (1-100)  
  temp: number,      // temp affichée (= tempRoll, ou max(tempRoll, 90) si prime)
  pot: number        // pot affiché (= lookup(potRoll, temp))
}
```

### 3. ÉCRAN CHOIXCAR — Comportement exact

- **Layout** : deux colonnes. Gauche = "Résultat du tirage:" (10 valeurs). Droite = "Caractéristiques:" (10 noms de stats).
- **En haut** : labels "Classe: [nom]" et "Royaume: [valeur]" 
- **Instruction** : "Select a result, and choose a stat." (texte vert)
- **Stats primordiales** : affichées en **gras** dans la liste de droite
- **Assignation** : cliquer un résultat à gauche, puis une stat à droite
- **Résultat assigné** : le texte passe en **gris clair** (grisé) à gauche, la valeur (éventuellement modifiée par prime) apparaît à droite
- **Bouton "Retirer"** : **relance tous les tirages** (nouveau set de 10×2 d100)
- **Bouton "Editer"** : permet l'édition manuelle (cas des tirages sur table physique)
- **Bouton "OK!"** : valide et passe à la feuille principale

### 4. ORDRE DES 10 STATS (confirmé)

```javascript
const STAT_ORDER = [
  'Constitution',     // CO - a Dev
  'Agilité',          // AG - a Dev
  'Auto-discipline',  // AD - a Dev
  'Mémoire',          // ME - a Dev
  'Raisonnement',     // RS - a Dev
  'Force',            // FO - XXX (pas de Dev)
  'Rapidité',         // RP - XXX
  'Présence',         // PR - XXX
  'Empathie',         // EM - XXX
  'Intuition'         // IT - XXX
];

const STAT_ABBREV = {
  'CO': 0, 'AG': 1, 'AD': 2, 'ME': 3, 'RS': 4,
  'FO': 5, 'RP': 6, 'PR': 7, 'EM': 8, 'IT': 9
};
```

### 5. POINTS DE DÉVELOPPEMENT (formule confirmée sur 2 cas)

```javascript
// Seules les 5 premières stats (CO, AG, AD, ME, RS) ont une valeur de Dev
// Les 5 dernières (FO, RP, PR, EM, IT) affichent "XXX"
// 
// Dev = table de conversion temp → dev_points (décimal)
// DP total = floor(somme des 5 Dev) + 4
//
// Guerrier: floor(8.4+6.6+6.3+4.3+5.5) + 4 = floor(31.1) + 4 = 35 ✓
// Voleur:   floor(8.2+8.4+8.2+7.4+7.0) + 4 = floor(39.2) + 4 = 43 ✓
```

La table temp → dev est dans `carac_tables.json` (à extraire). Correspondances observées :

| Temp | Dev  |
|------|------|
| 20   | ?    |
| 24   | ?    |
| 25   | ?    |
| 27   | 4.3  |
| 31   | ?    |
| 47   | 5.5  |
| 49   | ?    |
| 66   | 6.3  |
| 71   | 6.6  |
| 76   | 7.0  |
| 78   | 7.4  |
| 87   | 8.2  |
| 89   | 8.2  |
| 90   | 8.4  |
| 100  | ?    |

### 6. CARACTÉRISTIQUES PRIMORDIALES PAR CLASSE (observées)

Format dans les données : `CO/FO` = les 2 stats primordiales (ou 3 pour hybrides comme `PR/EM/IT`).

Abréviations :
- CO=Constitution, AG=Agilité, AD=Auto-discipline, ME=Mémoire, RS=Raisonnement
- FO=Force, RP=Rapidité, PR=Présence, EM=Empathie, IT=Intuition

### 7. PANNEAU GÉNÉRAL — Valeurs initiales observées

| Champ | Guerrier | Voleur |
|-------|----------|--------|
| Pts de dével. | 35 | 43 |
| Niveau | adolescent | adolescent |
| PC de Base | 9 | 9 |
| Dés de vie | 1-10 | 1-10 |
| Cap. de PC | 10 | 10 |
| PC maximaux | 150 | 150 |
| Type d'Armure | 1 | 1 |
| Bouclier | Sans | Sans |
| BD Mélée | 9 | 10 |
| BD Projectiles | 9 | 10 |
| Pts de Pouvoir | 0 | 0 |

BD Mélée et BD Projectiles varient entre classes → probablement dans classes.json.

### 8. ACTIONS À IMPLÉMENTER DANS LA PWA

#### Priorité 1 — Intégrer `stat_potentials.js`
- Copier `stat_potentials.js` dans `pwa/js/engine/`
- Modifier `stats.js` pour utiliser `generateStatRolls()` et `getStatValues()`
- Stocker les raw rolls (tempRoll, potRoll) dans l'état du personnage, pas juste les valeurs affichées

#### Priorité 2 — Corriger le flow de création
- Supprimer l'étape "nom" au début
- Flow : Choix classe (avec filtre catégorie) → Tirage stats → Assignation → Feuille MDI
- Nom et race éditables dans la feuille principale

#### Priorité 3 — Corriger l'écran d'assignation des stats
- Afficher les stats primordiales en **gras**
- Implémenter l'assignation par clic (résultat gauche → stat droite)
- Griser les résultats assignés
- Recalculer pot via table quand assigné à une stat primordiale
- Bouton "Retirer" = relancer les tirages
- Bouton "Editer" = mode saisie manuelle

#### Priorité 4 — Formule DP
- Implémenter `DP = floor(Σ dev_5_stats) + 4`
- Besoin de la table temp→dev complète (à extraire de carac_tables.json)
