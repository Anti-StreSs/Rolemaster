# INSTRUCTIONS CLAUDE CODE — BATCH 6 : Auto-fill Historique + Langues

> Quand l'utilisateur choisit une race et un sexe, les champs du panneau Historique
> doivent être pré-remplis automatiquement (mais restent éditables).
> Toutes les mesures en **centimètres et kilogrammes** (pas de pouces/livres en français).

---

## 1. TAILLE & POIDS — Table 04-03 Size Table

La table est dans `rolemaster-classic-character-law-tables-normalized.json` (table id "04-03").
Elle donne hauteur + poids en fonction d'un roll (D100 open-ended) et de la race.

### Colonnes de la table
| Colonne | Race |
|---------|------|
| Common Men | Humains (toutes variantes), Semi-Elfes |
| Elves | Elfes (toutes variantes) |
| Dwarves | Nains, Semi-Nains |
| Halfling | Semi-Hommes, Hobbits |
| Lesser Orcs | Orques, Semi-Orques, Gobelins |
| Trolls | Trolls, Semi-Trolls, Semi-Ogres, Grands Hommes |

### Mapping race → colonne Size Table
```javascript
const RACE_SIZE_COLUMN = {
  // Humains
  'Sans Race': 'Common Men', 'Homme Commun': 'Common Men', 'Surhomme': 'Common Men',
  'Tribus de l\'Ours': 'Common Men', 'Tribus des Ténèbres': 'Common Men',
  'Nordique': 'Common Men', 'Homme Artique': 'Common Men', 'Homme Métis': 'Common Men',
  'Homme des Bois': 'Common Men', 'Dunedain': 'Common Men',
  'Homme urbain': 'Common Men', 'Numénoréen': 'Common Men',
  // Semi-Elfes (taille humaine)
  'Semi-Elfes': 'Common Men', 'Semi-Elfes B': 'Common Men',
  'Semi-Elfes C': 'Common Men', 'Semi-Elfes D': 'Common Men',
  'Semi-Elfes E': 'Common Men', 'Semi-Elfes F': 'Trolls', // Semi-Elfes F = très grands
  // Elfes
  'Elfe des Bois': 'Elves', 'Grand Elfe': 'Elves', 'Elfe Clair': 'Elves',
  'Elfe Gris': 'Elves', 'Elfe des Ténèbres': 'Elves',
  'Elfe Aquatique': 'Elves', 'Elfe Noldor': 'Elves',
  // Démons
  'Homme Demon': 'Common Men', 'Elfe Demon': 'Elves',
  'Azurien (extraplanaire)': 'Elves', 'Draakh': 'Common Men',
  'Voyageur planaire': 'Common Men', 'Hengeyokai renard': 'Common Men',
  // Nains
  'Semi-Nain': 'Dwarves', 'Nain': 'Dwarves',
  // Petits
  'Semi-Homme': 'Halfling', 'Hobbit Pieds velus': 'Halfling', 'Hobbit Fort': 'Halfling',
  // Orques
  'Semi-Orque': 'Lesser Orcs', 'Orque Inférieur': 'Lesser Orcs',
  'Orque Supérieur': 'Lesser Orcs', 'Orque Seigneur': 'Lesser Orcs', 'Gobelin': 'Lesser Orcs',
  // Féeriques (petits → utiliser Halfling comme approximation)
  'Gremlin': 'Halfling', 'Sylphe': 'Halfling', 'Satyre': 'Common Men',
  'Nymphe': 'Common Men', 'Gnome': 'Halfling', 'Fee': 'Halfling',
  // Grands
  'Semi-Ogres': 'Trolls', 'Semi-Trolls': 'Trolls', 'Trolls': 'Trolls',
  'Grands Hommes': 'Trolls', 'Olog-Hai': 'Trolls', 'Semi-Ogres II': 'Trolls',
};
```

### Algorithme de génération
```javascript
function generateSize(raceName, sex) {
  const column = RACE_SIZE_COLUMN[raceName] || 'Common Men';
  const roll = Math.floor(Math.random() * 100) + 1; // ou open-ended
  const {height, weight} = lookupSizeTable(roll, column);
  
  // Ajustement sexe : femmes typiquement -2" à -4" et -15% à -20% poids
  if (sex === 'F') {
    height = adjustHeight(height, -3); // -3 pouces en moyenne
    weight = Math.round(weight * 0.82); // -18% poids
  }
  
  return { height, weight };
}
```

## 2. CHEVEUX, YEUX, APPARENCE — Par race

Ces données ne sont pas dans une table formelle du livre mais sont dérivées des
descriptions raciales RM2. Voici une table utilisable pour l'auto-fill :

```javascript
const RACE_APPEARANCE = {
  // Format: { hair: [options], eyes: [options], appearance_mod: number }
  // appearance = roll D100 + appearance_mod (résultat 1-100)
  
  // --- Humains ---
  'Homme Commun':     { hair: ['Bruns','Châtains','Noirs','Blonds'], eyes: ['Bruns','Noisette','Bleus','Verts'], appearance_mod: 0 },
  'Sans Race':        { hair: ['Bruns','Châtains','Noirs','Blonds'], eyes: ['Bruns','Noisette','Bleus','Verts'], appearance_mod: 0 },
  'Surhomme':         { hair: ['Bruns','Noirs','Auburn'], eyes: ['Gris','Bleus','Bruns'], appearance_mod: +5 },
  'Nordique':         { hair: ['Blonds','Roux','Châtain clair'], eyes: ['Bleus','Gris','Verts'], appearance_mod: 0 },
  'Homme Artique':    { hair: ['Noirs','Bruns foncé'], eyes: ['Bruns','Noirs'], appearance_mod: 0 },
  'Tribus de l\'Ours':{ hair: ['Bruns','Roux','Auburn'], eyes: ['Bruns','Verts'], appearance_mod: -5 },
  'Tribus des Ténèbres':{ hair: ['Noirs','Bruns foncé'], eyes: ['Bruns foncé','Noirs'], appearance_mod: -5 },
  'Homme Métis':      { hair: ['Bruns','Châtains','Noirs'], eyes: ['Bruns','Noisette'], appearance_mod: 0 },
  'Homme des Bois':   { hair: ['Bruns','Châtains','Auburn'], eyes: ['Bruns','Verts','Noisette'], appearance_mod: 0 },
  'Dunedain':         { hair: ['Noirs','Bruns foncé'], eyes: ['Gris','Bleus acier'], appearance_mod: +10 },
  'Homme urbain':     { hair: ['Bruns','Châtains','Noirs','Blonds'], eyes: ['Bruns','Bleus','Verts'], appearance_mod: 0 },
  'Numénoréen':       { hair: ['Noirs','Bruns foncé'], eyes: ['Gris','Bleus profond'], appearance_mod: +15 },
  
  // --- Elfes ---
  'Elfe des Bois':    { hair: ['Bruns','Auburn','Châtains'], eyes: ['Verts','Bruns','Noisette'], appearance_mod: +10 },
  'Grand Elfe':       { hair: ['Noirs','Argentés','Blonds platine'], eyes: ['Gris','Bleus','Violets'], appearance_mod: +20 },
  'Elfe Clair':       { hair: ['Blonds','Argentés','Dorés'], eyes: ['Bleus','Gris clair','Violets'], appearance_mod: +25 },
  'Elfe Gris':        { hair: ['Noirs','Gris argenté','Blanc'], eyes: ['Gris','Bleus pâle','Argentés'], appearance_mod: +15 },
  'Elfe des Ténèbres':{ hair: ['Noirs','Blanc','Argenté'], eyes: ['Noirs','Violets','Rouges'], appearance_mod: +10 },
  'Elfe Aquatique':   { hair: ['Verts','Bleus','Argentés'], eyes: ['Verts','Bleus mer','Turquoise'], appearance_mod: +15 },
  'Elfe Noldor':      { hair: ['Noirs','Argentés','Dorés'], eyes: ['Gris étoilé','Bleus','Argentés'], appearance_mod: +25 },
  
  // --- Semi-Elfes ---
  'Semi-Elfes':       { hair: ['Bruns','Noirs','Châtains'], eyes: ['Gris','Bruns','Bleus'], appearance_mod: +5 },
  'Semi-Elfes B':     { hair: ['Bruns','Noirs','Châtains'], eyes: ['Bruns','Noisette'], appearance_mod: +5 },
  'Semi-Elfes C':     { hair: ['Bruns','Auburn','Roux'], eyes: ['Verts','Bruns','Gris'], appearance_mod: +5 },
  'Semi-Elfes D':     { hair: ['Bruns','Châtains','Blonds'], eyes: ['Gris','Bleus','Bruns'], appearance_mod: +5 },
  'Semi-Elfes E':     { hair: ['Bruns','Châtains'], eyes: ['Bruns','Noisette','Verts'], appearance_mod: +5 },
  'Semi-Elfes F':     { hair: ['Noirs','Bruns foncé','Roux'], eyes: ['Bruns','Verts sombres'], appearance_mod: 0 },
  
  // --- Nains ---
  'Semi-Nain':        { hair: ['Bruns','Roux','Noirs'], eyes: ['Bruns','Gris'], appearance_mod: -10 },
  'Nain':             { hair: ['Bruns','Roux','Noirs','Gris'], eyes: ['Bruns foncé','Gris','Noirs'], appearance_mod: -15 },
  
  // --- Petits ---
  'Semi-Homme':       { hair: ['Bruns','Châtains','Blonds'], eyes: ['Bruns','Verts','Noisette'], appearance_mod: -5 },
  'Hobbit Pieds velus':{ hair: ['Bruns','Châtains bouclés'], eyes: ['Bruns','Verts'], appearance_mod: -5 },
  'Hobbit Fort':      { hair: ['Bruns','Roux','Châtains'], eyes: ['Bruns','Gris'], appearance_mod: -10 },
  
  // --- Orques ---
  'Semi-Orque':       { hair: ['Noirs','Bruns foncé'], eyes: ['Jaunes','Bruns','Rouges'], appearance_mod: -20 },
  'Orque Inférieur':  { hair: ['Noirs'], eyes: ['Jaunes','Rouges'], appearance_mod: -35 },
  'Orque Supérieur':  { hair: ['Noirs','Bruns foncé'], eyes: ['Jaunes','Rouges','Noirs'], appearance_mod: -25 },
  'Orque Seigneur':   { hair: ['Noirs'], eyes: ['Rouges','Noirs','Jaunes'], appearance_mod: -20 },
  'Gobelin':          { hair: ['Noirs','Verts sombre'], eyes: ['Jaunes','Oranges','Rouges'], appearance_mod: -30 },
  
  // --- Féeriques ---
  'Gremlin':          { hair: ['Verts','Bruns','Roux'], eyes: ['Dorés','Verts','Bruns'], appearance_mod: -10 },
  'Sylphe':           { hair: ['Argentés','Blonds','Transparents'], eyes: ['Bleus ciel','Argentés','Violets'], appearance_mod: +20 },
  'Satyre':           { hair: ['Bruns','Roux','Noirs'], eyes: ['Bruns','Dorés','Verts'], appearance_mod: -5 },
  'Nymphe':           { hair: ['Dorés','Verts','Argentés'], eyes: ['Verts','Bleus','Dorés'], appearance_mod: +30 },
  'Gnome':            { hair: ['Bruns','Gris','Blancs'], eyes: ['Bruns','Bleus','Gris'], appearance_mod: -5 },
  'Fee':              { hair: ['Argentés','Dorés','Irisés'], eyes: ['Violets','Dorés','Bleus'], appearance_mod: +15 },
  
  // --- Grands ---
  'Semi-Ogres':       { hair: ['Noirs','Bruns foncé'], eyes: ['Bruns','Noirs','Jaunes'], appearance_mod: -20 },
  'Semi-Trolls':      { hair: ['Noirs','Gris'], eyes: ['Noirs','Rouges','Jaunes'], appearance_mod: -25 },
  'Trolls':           { hair: ['Noirs','Gris','Absents'], eyes: ['Rouges','Noirs'], appearance_mod: -35 },
  'Grands Hommes':    { hair: ['Noirs','Bruns foncé'], eyes: ['Bruns','Gris foncé'], appearance_mod: -10 },
  'Olog-Hai':         { hair: ['Noirs','Absents'], eyes: ['Rouges','Noirs'], appearance_mod: -30 },
  'Semi-Ogres II':    { hair: ['Noirs','Bruns foncé'], eyes: ['Bruns','Jaunes'], appearance_mod: -15 },
  
  // --- Démons ---
  'Homme Demon':      { hair: ['Noirs','Rouge sombre','Blancs'], eyes: ['Rouges','Noirs','Dorés'], appearance_mod: 0 },
  'Elfe Demon':       { hair: ['Noirs','Blanc','Argenté'], eyes: ['Rouges','Violets','Noirs'], appearance_mod: +5 },
  'Azurien (extraplanaire)':{ hair: ['Bleus','Argentés','Noirs'], eyes: ['Bleus lumineux','Argentés'], appearance_mod: +10 },
  'Draakh':           { hair: ['Noirs','Bruns écailles'], eyes: ['Dorés','Oranges','Rouges'], appearance_mod: -5 },
  'Voyageur planaire':{ hair: ['Variables','Argentés','Noirs'], eyes: ['Variables','Argentés'], appearance_mod: +5 },
  'Hengeyokai renard':{ hair: ['Roux','Noirs','Bruns'], eyes: ['Dorés','Ambrés','Bruns'], appearance_mod: +10 },
};
```

### Algorithme d'auto-fill complet
```javascript
function autoFillHistorique(raceName, sex) {
  const appearance = RACE_APPEARANCE[raceName] || RACE_APPEARANCE['Sans Race'];
  const size = generateSize(raceName, sex);
  
  return {
    taille: size.height,          // ex: "1m79" ou "5'10\""
    poids: size.weight + ' kg',   // convertir si besoin
    sexe: sex === 'M' ? 'Masculin' : 'Féminin',
    cheveux: randomPick(appearance.hair),
    yeux: randomPick(appearance.eyes),
    apparence: Math.min(100, Math.max(1, rollD100() + appearance.appearance_mod)),
    age: generateAge(raceName),   // voir section 3
  };
}

function randomPick(array) {
  return array[Math.floor(Math.random() * array.length)];
}
```

## 3. ÂGE PAR RACE

L'âge de départ dépend de la race. Valeurs typiques RM2 :

```javascript
const RACE_AGE = {
  // { base: âge minimum adulte, range: variation aléatoire }
  'Homme Commun':      { base: 16, range: 8 },   // 16-24
  'Sans Race':         { base: 16, range: 8 },
  'Surhomme':          { base: 18, range: 7 },
  'Nordique':          { base: 16, range: 8 },
  'Dunedain':          { base: 20, range: 15 },   // 20-35, longévité
  'Numénoréen':        { base: 25, range: 20 },   // 25-45, très longue vie
  'Semi-Elfes':        { base: 20, range: 10 },   // 20-30
  'Semi-Elfes B':      { base: 20, range: 10 },
  'Semi-Elfes C':      { base: 20, range: 10 },
  'Semi-Elfes D':      { base: 20, range: 10 },
  'Semi-Elfes E':      { base: 20, range: 10 },
  'Semi-Elfes F':      { base: 20, range: 15 },
  'Elfe des Bois':     { base: 50, range: 150 },  // 50-200, immortels
  'Grand Elfe':        { base: 100, range: 200 },
  'Elfe Clair':        { base: 100, range: 300 },
  'Elfe Gris':         { base: 80, range: 200 },  // Félicia = 240 ans ✓
  'Elfe des Ténèbres': { base: 80, range: 200 },
  'Elfe Aquatique':    { base: 80, range: 200 },
  'Elfe Noldor':       { base: 150, range: 500 },
  'Nain':              { base: 30, range: 100 },   // 30-130
  'Semi-Nain':         { base: 25, range: 50 },
  'Semi-Homme':        { base: 20, range: 15 },
  'Hobbit Pieds velus':{ base: 22, range: 20 },
  'Hobbit Fort':       { base: 22, range: 15 },
  'Semi-Orque':        { base: 14, range: 6 },
  'Orque Inférieur':   { base: 12, range: 4 },
  'Orque Supérieur':   { base: 13, range: 5 },
  'Troll':             { base: 15, range: 10 },
  'Semi-Trolls':       { base: 16, range: 10 },
  'Grands Hommes':     { base: 18, range: 10 },
};
// Défaut pour races non listées: { base: 18, range: 10 }
```

## 4. IMPLÉMENTATION

### Quand déclencher l'auto-fill
- Après la sélection de la race ET la sélection du sexe (ajouter un sélecteur Masculin/Féminin)
- Pré-remplir tous les champs Historique
- Afficher un bouton "Relancer" pour re-générer aléatoirement
- Chaque champ reste éditable manuellement

### Champs auto-remplis
| Champ | Source | Editable |
|-------|--------|----------|
| Taille | Size Table + race + sexe | Oui |
| Poids | Size Table + race + sexe | Oui |
| Sexe | Choix utilisateur | Oui |
| Cheveux | Table RACE_APPEARANCE | Oui |
| Yeux | Table RACE_APPEARANCE | Oui |
| Apparence | D100 + race_mod | Oui |
| Âge | Table RACE_AGE | Oui |

### Sélecteur de sexe
Ajouter un champ "Sexe" dans le panneau Historique ou dans l'écran de choix de race.
Options : Masculin / Féminin (ou M/F).
Déclenche le recalcul de la taille/poids si changé.

### Conversion unités
La Size Table du livre est en pieds/pouces et livres. Convertir systématiquement :
```javascript
function inchesToCm(feet, inches) { return Math.round((feet * 12 + inches) * 2.54); }
function lbsToKg(lbs) { return Math.round(lbs * 0.4536); }
// Afficher: "178 cm" et "72 kg"
```

---

## 5. LANGUES — Système linguistique

### Langues disponibles (depuis CUSTOM.MND)
Chaque langue existe en deux formes : **parlé** et **écrit**.

```javascript
const LANGUAGES = [
  { id: 'elfique',          fr: 'Elfique',          en: 'Elvish' },
  { id: 'nain',             fr: 'Nain',             en: 'Dwarvish' },
  { id: 'hobbit',           fr: 'Hobbit',           en: 'Hobbitish' },
  { id: 'orque',            fr: 'Orque',            en: 'Orcish' },
  { id: 'elfique_antique',  fr: 'Elfique antique',  en: 'Ancient Elvish' },
  { id: 'noir_parler',      fr: 'Noir parler',      en: 'Black Speech' },
  { id: 'sudiste',          fr: 'Sudiste',          en: 'Southron' },
  { id: 'nordiste',         fr: 'Nordiste',         en: 'Northern' },
  { id: 'patois_local',     fr: 'Patois local',     en: 'Local Dialect' },
  { id: 'parler_demonique', fr: 'Parler Démonique', en: 'Demonic Speech' },
  { id: 'jargon_voleurs',   fr: 'Jargon des voleurs', en: 'Thieves\' Cant' },
];
// L'utilisateur peut en AJOUTER ou ÉDITER les noms (règles maison, autres mondes)
```

### Formes parlée et écrite
Chaque langue est une compétence avec deux sous-compétences :
- **Parlé** (conversational) — coût de développement standard linguistique
- **Écrit** (reading/writing) — coût séparé, typiquement plus cher

Dans l'onglet Linguistiques, afficher pour chaque langue :
```
Elfique (parlé)     coût: X/Y   DM: 0   Base: -25   ...
Elfique (écrit)     coût: X/Y   DM: 0   Base: -25   ...
```

### Langues maternelles par race — Bonus gratuits
Chaque race confère des rangs gratuits dans certaines langues à la création.
C'est un ajout par rapport à CPR093 (qui ne le faisait pas), mais fidèle aux règles RM2.

```javascript
const RACIAL_LANGUAGES = {
  // Format: { langue_id: { parlé: rangs, écrit: rangs } }
  
  // Humains — parlent le Patois local et éventuellement une langue régionale
  'Homme Commun':      { 'patois_local': { parle: 6, ecrit: 0 } },
  'Sans Race':         { 'patois_local': { parle: 5, ecrit: 0 } },
  'Nordique':          { 'nordiste': { parle: 6, ecrit: 0 }, 'patois_local': { parle: 4, ecrit: 0 } },
  'Dunedain':          { 'patois_local': { parle: 6, ecrit: 3 }, 'elfique': { parle: 3, ecrit: 0 } },
  'Numénoréen':        { 'patois_local': { parle: 6, ecrit: 4 }, 'elfique': { parle: 4, ecrit: 2 } },
  'Surhomme':          { 'patois_local': { parle: 6, ecrit: 2 } },
  
  // Elfes — parlent Elfique couramment + écrit
  'Elfe des Bois':     { 'elfique': { parle: 6, ecrit: 3 }, 'patois_local': { parle: 3, ecrit: 0 } },
  'Grand Elfe':        { 'elfique': { parle: 7, ecrit: 5 }, 'elfique_antique': { parle: 3, ecrit: 2 } },
  'Elfe Clair':        { 'elfique': { parle: 7, ecrit: 5 }, 'elfique_antique': { parle: 4, ecrit: 3 } },
  'Elfe Gris':         { 'elfique': { parle: 7, ecrit: 4 }, 'patois_local': { parle: 4, ecrit: 0 } },
  'Elfe des Ténèbres': { 'elfique': { parle: 6, ecrit: 4 }, 'noir_parler': { parle: 3, ecrit: 0 } },
  'Elfe Aquatique':    { 'elfique': { parle: 6, ecrit: 3 } },
  'Elfe Noldor':       { 'elfique': { parle: 8, ecrit: 6 }, 'elfique_antique': { parle: 5, ecrit: 4 } },
  
  // Semi-Elfes — mélange humain/elfe
  'Semi-Elfes':        { 'elfique': { parle: 4, ecrit: 1 }, 'patois_local': { parle: 5, ecrit: 0 } },
  'Semi-Elfes B':      { 'elfique': { parle: 3, ecrit: 0 }, 'patois_local': { parle: 5, ecrit: 0 } },
  'Semi-Elfes C':      { 'elfique': { parle: 4, ecrit: 1 }, 'patois_local': { parle: 5, ecrit: 0 } },
  'Semi-Elfes D':      { 'elfique': { parle: 4, ecrit: 1 }, 'patois_local': { parle: 5, ecrit: 0 } },
  'Semi-Elfes E':      { 'elfique': { parle: 3, ecrit: 0 }, 'patois_local': { parle: 5, ecrit: 0 } },
  'Semi-Elfes F':      { 'patois_local': { parle: 5, ecrit: 0 } },
  
  // Nains
  'Nain':              { 'nain': { parle: 7, ecrit: 4 }, 'patois_local': { parle: 3, ecrit: 0 } },
  'Semi-Nain':         { 'nain': { parle: 5, ecrit: 2 }, 'patois_local': { parle: 4, ecrit: 0 } },
  
  // Petits
  'Semi-Homme':        { 'hobbit': { parle: 6, ecrit: 2 }, 'patois_local': { parle: 4, ecrit: 0 } },
  'Hobbit Pieds velus':{ 'hobbit': { parle: 6, ecrit: 1 }, 'patois_local': { parle: 3, ecrit: 0 } },
  'Hobbit Fort':       { 'hobbit': { parle: 6, ecrit: 2 }, 'patois_local': { parle: 4, ecrit: 0 } },
  
  // Orques
  'Semi-Orque':        { 'orque': { parle: 5, ecrit: 0 }, 'patois_local': { parle: 3, ecrit: 0 } },
  'Orque Inférieur':   { 'orque': { parle: 5, ecrit: 0 } },
  'Orque Supérieur':   { 'orque': { parle: 6, ecrit: 0 }, 'noir_parler': { parle: 2, ecrit: 0 } },
  
  // Trolls/Géants
  'Trolls':            { 'orque': { parle: 3, ecrit: 0 } },
  'Semi-Trolls':       { 'orque': { parle: 4, ecrit: 0 }, 'patois_local': { parle: 3, ecrit: 0 } },
  'Grands Hommes':     { 'patois_local': { parle: 5, ecrit: 0 } },
};
// Défaut pour races non listées: { 'patois_local': { parle: 5, ecrit: 0 } }
```

### Implémentation langues
1. Dans l'onglet **Linguistiques**, afficher toutes les langues disponibles (parlé + écrit)
2. À la sélection de la race, pré-remplir les DM des langues maternelles avec les rangs gratuits
3. Ces rangs gratuits ne coûtent **pas** de DP — ils viennent en plus
4. Le joueur peut acheter des rangs supplémentaires normalement avec ses DP
5. Un bouton **"Ajouter une langue"** permet d'ajouter des langues custom
6. Les noms des langues sont **éditables** (clic sur le nom pour modifier)

### Niveaux de maîtrise linguistique (rappel table 04-02)
| Rang | Parlé | Écrit |
|------|-------|-------|
| 1 | Reconnaissance de la langue | - |
| 2 | Mots isolés, phrases très courtes | - |
| 3 | Phrases basiques, dialectes majeurs | Déchiffrage basique |
| 4 | Conversations simples | Lecture lente |
| 5 | Conversation courante (marché, etc.) | Lecture/écriture basique |
| 6 | Niveau natif commun | Lecture/écriture courante |
| 7 | Vraie fluence | Littérature simple |
| 8 | + identification des origines régionales | Textes complexes |
| 9 | Fluence absolue + dialectes proches | Maîtrise stylistique |
| 10 | Maîtrise totale y compris dialectes | Maîtrise totale |
