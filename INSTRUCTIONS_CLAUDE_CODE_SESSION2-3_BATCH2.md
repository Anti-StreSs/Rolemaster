# INSTRUCTIONS CLAUDE CODE — Session 2-3 BATCH 2 : Armes, Compétences, Sorts

> **Prérequis** : Le batch 1 (INSTRUCTIONS_CLAUDE_CODE_SESSION2-3.md) doit être appliqué d'abord.
> Ce fichier couvre les écrans post-assignation des stats.

---

## 1. ÉCRAN CATÉGORIES D'ARMES (CHOIXCAT)

### Position dans le flow
Après l'assignation des stats et le choix de la race, **avant** l'arrivée sur la feuille principale.
C'est une étape **obligatoire** pour toutes les classes.

### Comportement
- Présente 6 types d'armes à gauche et 6 slots de priorité à droite
- L'utilisateur assigne chaque type à un slot par drag & drop ou clic
- Chaque slot a un coût de développement prédéfini par la classe (depuis `couts.json`)
- Après validation (OK), les 6 catégories apparaissent dans l'onglet Combat des compétences

### Les 6 types d'armes (fixes, identiques pour toutes les classes)
```javascript
const WEAPON_CATEGORIES = [
  { id: 'edged_1h',    fr: 'Tranchantes à une main',    en: 'Edged Weapons',        stats: ['FO','FO','AG'] },
  { id: 'blunt_1h',    fr: 'Contondantes à une main',   en: 'Crushing Weapons',      stats: ['FO','FO','AG'] },
  { id: 'two_handed',  fr: 'Armes à deux mains',        en: 'Two-Handed Weapons',    stats: ['FO','FO','AG'] },
  { id: 'polearm',     fr: 'Armes d\'Hast',             en: 'Pole Arms',             stats: ['FO','FO','AG'] },
  { id: 'ranged',      fr: 'Arcs et Arbalètes',         en: 'Missile & Bows',        stats: ['AG','AG','FO'] },
  { id: 'thrown',      fr: 'Armes de jet',               en: 'Thrown Weapons',         stats: ['FO','AG'] }
];
```

### Coûts par priorité (exemple Voleur)
```
1ère Catégorie: 2/7  (meilleur coût)
2ème Catégorie: 3/8
3ème Catégorie: 4
4ème Catégorie: 4
5ème Catégorie: 4
6ème Catégorie: 6    (pire coût)
```
Les coûts exacts par classe et par rang de priorité sont dans `couts.json`.

### Sous-compétences d'armes
Chaque catégorie d'arme contient des sous-catégories qui contiennent des armes spécifiques.
Données dans `categories.json`.

Exemple pour "Tranchantes à une main" :
```
Sous-catégories:
├── Lames courtes → <général>, Dague, Poignard, Épée courte
├── Lames longues à double tranchant → ...
├── Lames d'estoc → ...
├── Lames longues à un tranchant → ...
└── Haches courtes → ...
```

Le joueur choisit une arme spécifique par catégorie, qui apparaît ensuite comme compétence dans l'onglet Combat.

---

## 2. DÉPENSE DE POINTS DE DÉVELOPPEMENT (DP)

### Mécanisme observé (phase apprenti)

- Le titre de la fenêtre Compétences affiche **"X points à répartir"**
- Les boutons **+** et **-** à gauche de chaque compétence permettent d'acheter/retirer des rangs
- Le compteur de DP se décrémente en temps réel

### Coûts de compétences (format X/Y)
- `1/3` = 1 DP pour le 1er rang par niveau, 3 DP pour le 2ème rang par niveau
- `2/5` = 2 DP premier rang, 5 DP deuxième rang
- `4` = 4 DP pour un seul rang possible par niveau
- `1/*` = 1 DP par rang, nombre de rangs illimité (sorts)
- `2/*` = 2 DP par rang, illimité

### Vérification : Filature/Dissimulation, coût 1/3, DM 0→2
- Rang 1 : coût 1 DP
- Rang 2 : coût 3 DP
- Total : 4 DP dépensés
- Observé : 38 - 34 = 4 DP ✅

### Table de bonus Base par DM (partiel, à compléter)
```
DM 0  → Base = -25
DM 1  → Base = ?  (probablement +5 d'après RM2)
DM 2  → Base = +10
DM 3  → Base = ? 
...
```
Cette table est la table standard RM2 "Skill Rank Bonus" — elle devrait être dans `carac_tables.json`.

### Contraintes par phase
- **Adolescent** : budget DP identique au calcul standard, restrictions possibles (coûts doublés ?)
- **Apprenti** : budget DP identique (vérifié = 38 pour ce Voleur dans les 2 phases)
- **Niveau 1+** : budget DP identique, pas de restriction

> Note : le budget DP était **38 en adolescent ET 38 en apprenti** pour le même personnage.
> Cela confirme que le DP ne change pas entre les phases (même formule).

---

## 3. FENÊTRE LISTES DE SORTS

### Pour les non-lanceurs (ex: Voleur)
- La fenêtre "Listes de sorts" s'affiche avec **(0 pts)**
- Le bouton "Ajouter une Liste de Sorts" est **grisé**
- Aucune liste disponible

### Pour les lanceurs (ex: Sorcier)
- Le titre affiche **"Listes de sorts (X pts)"** — le budget de points de sorts
- Bouton "Ajouter une Liste de Sorts" actif
- Colonnes de la table : **Nom, Coût, Palier, Niveau, Référence**

### Popup "Nouvelle Liste de Sort"
4 onglets par royaume de magie : **MENTALISME, ESSENCE, THEURGIE, ARCANE**
Chaque onglet a 4 sous-onglets : **Base, Libres, Réservées, Autres Classes**

- **Base** : listes propres à la classe (coût le plus bas, ex: 1/*)
- **Libres** : listes accessibles à toutes les classes du royaume
- **Réservées** : listes d'autres classes du même royaume (coût plus élevé)
- **Autres Classes** : listes de classes hors du royaume

### Structure d'une liste de sorts dans la table
```javascript
{
  name: "Destruction de la Chair",
  cost: "1/*",          // coût en DP par palier
  palier: "+",           // indicateur de palier
  niveau: 10,            // nombre de sorts maîtrisés dans la liste
  reference: "Base (MS)" // type + source (MS = livre source)
}
```

### Coûts par palier
Les sorts s'apprennent par palier de 5 (niveaux 1-5, 6-10, 11-15, 16-20, 21-25, 26-30, 31-35, 36-40, 41-45, 46-50).
Le coût par palier dépend du type de liste et de la classe :
- Listes de Base de la classe : typiquement 1/* (très bon marché)
- Autres listes : coût plus élevé (2/*, 3/*, etc.)

Les coûts par palier sont **éditables** par l'utilisateur (adaptation aux règles maison).

---

## 4. DONNÉES D'UN PERSONNAGE AVANCÉ (Sorcier niv.5, Félicia)

### Paramètres classe Sorcier observés
```
PC de Base: 30 (au niveau 5)
Cap. de PC: 36
Dés de vie: 1-8
PC maximaux: 120
BD Mélée: 27
BD Projectiles: 27
Pts de Pouvoir: 17.5
Pts de dével: 48
```

### Bonus raciaux Elfe Gris (partiels)
```
Plusieurs stats: +5
Une stat (Rapidité?): +10
Une stat (Auto-discipline?): -20
```
Les bonus raciaux s'affichent dans la colonne "Race" de la table Caractéristiques.

### Stat à 101
La valeur **101** est possible pour temp et pot (confirmé sur Empathie et Intuition).
C'est le résultat de la Stat Potentials Table : roll 100, colonne 100 → 101.

### Panneau Historique
Champs : Taille, Age, Poids, Sexe, Cheveux, Yeux, Apparence (1-100), Comportement, Historique (texte libre).

---

## 5. CALCUL DU BONUS CARAC (formule précisée)

### Stats à 2 abréviations (ex: RS/IT)
```javascript
bonus_carac = floor((bonus[stat1] + bonus[stat2]) / 2)
```

### Stats à 3 abréviations (ex: FO/FO/AG)
```javascript
bonus_carac = floor((bonus[stat1] + bonus[stat2] + bonus[stat3]) / 3)
// Quand une stat apparaît 2 fois, elle compte double
// Ex: FO/FO/AG = (bonus_FO + bonus_FO + bonus_AG) / 3
```

### Vérifications
- Désarmement de Pièges (IT/AG) : floor((bonus_IT + bonus_AG) / 2) = floor((4+12)/2) = floor(8) = 8 ✅
- Crochetage (IT/RS/AG) : floor((4+6+12)/3) = floor(22/3) = floor(7.33) = 7 ✅
- Filature (AG/AD) : floor((12+6)/2) = floor(9) = 9 ✅
- Falsification (AD/RS) : floor((6+6)/2) = 6 ✅

**Formule confirmée : floor(moyenne des bonus)**.

### Stats éditables
Les abréviations entre parenthèses sont **cliquables** par l'utilisateur pour changer les stats associées.
La PWA doit permettre cette modification avec recalcul en temps réel du bonus Carac.

### Compétences à double mode
Certaines compétences comme "Filature/Dissimulation (AG/AD) / (AD)" ont **deux sets de stats**.
Elles affichent deux bonus Carac et deux totaux séparés (ex: +9/6 et -16/-19).

---

## 6. ACTIONS À IMPLÉMENTER (BATCH 2)

### Priorité 5 — Écran Catégories d'armes
- Nouvel écran wizard entre assignation stats et feuille principale
- 6 types d'armes fixes, 6 slots de priorité
- Coûts depuis `couts.json` (lignes weapon_cat_1 à weapon_cat_6 ou équivalent)
- Après validation, injecter les catégories dans la section Combat des compétences

### Priorité 6 — Dépense de DP
- Afficher "X points à répartir" dans le titre de la fenêtre compétences
- Boutons +/- par compétence pour acheter/retirer des rangs
- Décrémenter le compteur DP en temps réel
- Appliquer les coûts X/Y (1er rang = X, 2ème rang = Y par niveau)
- Mettre à jour Base, Total en temps réel selon la table de rang bonus

### Priorité 7 — Fenêtre Listes de sorts
- Afficher pour les lanceurs de sorts uniquement (bouton grisé sinon)
- Popup de sélection avec 4 onglets royaume × 4 sous-onglets type
- Listes depuis `sorts.json`
- Coûts par palier depuis `couts.json`

### Priorité 8 — Panneau Historique
- Champs : Taille, Age, Poids, Sexe, Cheveux, Yeux, Apparence, Comportement
- Zone Historique texte libre
- Accessible via l'onglet "Historique" en bas de l'écran

### Priorité 9 — Progression de niveau
- Menu Editer → "Monter au prochain niveau" (Ctrl+F1)
- Incrémente le niveau (adolescent → apprenti → 1 → 2 → ...)
- Alloue un nouveau budget DP (même formule)
- Le titre du panneau Général se met à jour
