# BATCH 19 — Background Options: Intégration des effets mécaniques

## Ce qui est DÉJÀ FAIT (ne pas refaire)

| Fichier | État |
|---------|------|
| `pwa/data/background_options_v3_patched.json` | ✅ En place (242KB, 335 entrées normalisées) |
| `pwa/js/engine/data-loader.js` | ✅ Réécrit — charge le v3 sous la clé `background_options_merged` |
| `pwa/js/engine/background-effects.js` | ✅ Complet (357 lignes) — 6 fonctions exportées |

### Fonctions disponibles dans `background-effects.js` :
- `getBackgroundBonuses(character)` → objet agrégé de tous les bonus
- `resolveBackgroundChoice(character, optionIndex, resolution)` → stocke un choix joueur
- `resolveStatIncrease(character, optionIndex, mode, statIndices)` → applique +2/+1×3 aux stats brutes
- `getSkillBackgroundBonus(bgBonuses, skillNameFr, skillNameEn)` → bonus Misc pour une compétence
- `generateWealthText(bgBonuses)` → texte richesse pour l'équipement
- `summarizeBackgroundBonuses(bgBonuses, lang)` → résumé lisible de tous les bonus
- `SKILL_EFFECT_MAP` (const exportée) → mapping effectKey → noms de skills FR/EN

## CE QUI RESTE À FAIRE

### Tâche A — Intégrer les bonus dans `character.js` (3 modifications)

Ajouter en haut de `character.js` :
```javascript
import { getBackgroundBonuses } from './background-effects.js';
```

#### A1. Dans `calcPowerPoints()` — après le calcul existant, avant le return :
```javascript
const bgBonuses = getBackgroundBonuses(character);
pp += bgBonuses.ppBonus;
pp += bgBonuses.ppPerLevel * character.level;
pp += bgBonuses.spellAdder;
if (bgBonuses.ppMultiplier !== 1) pp = Math.ceil(pp * bgBonuses.ppMultiplier);
```
Note : `manualBonuses.ppBonus` est déjà additionné séparément — pas de double comptage.

#### A2. Dans `calculateDB()` — après le calcul existant, avant le return :
```javascript
const bgBonuses = getBackgroundBonuses(character);
db += bgBonuses.dbBonus;
```

#### A3. Dans `calcHitPoints()` — après le calcul de `capPdC`, avant le return :
```javascript
const bgBonuses = getBackgroundBonuses(character);
if (bgBonuses.maxHpMultiplier !== 1) capPdC = Math.ceil(capPdC * bgBonuses.maxHpMultiplier);
```

### Tâche B — Intégrer le stat bonus background dans le calcul des compétences (`wizard.js`)

Dans `wizard.js`, ajouter l'import :
```javascript
import { getBackgroundBonuses, getSkillBackgroundBonus, resolveBackgroundChoice, resolveStatIncrease, summarizeBackgroundBonuses, generateWealthText } from '../engine/background-effects.js';
```

Partout où le bonus de stat est utilisé pour calculer le total d'une compétence (colonne "Stat" dans le tableau des skills), ajouter le bonus background :
```javascript
const bgBonuses = getBackgroundBonuses(character);
// Quand on calcule le stat bonus pour une compétence :
const statBonus = /* calcul existant */ + bgBonuses.statBonusMods[statIdx];
```

Pour la colonne "Misc" de chaque compétence, ajouter :
```javascript
const bgSkillBonus = getSkillBackgroundBonus(bgBonuses, skillNameFr, skillNameEn);
// Additionner au misc existant
```

### Tâche C — Afficher les effets sous chaque option choisie (section Historique de `wizard.js`)

Dans la boucle de rendu des options remplies (vers ligne 1282), après la description et les notes, ajouter un indicateur d'effet :

Pour chaque option qui a des `effects` non vides :
- Si l'effet est résolu ou ne nécessite pas de choix : afficher en vert `✓ +15 bonus AG` (utiliser `summarizeBackgroundBonuses` ou formatter manuellement depuis `opt.effects`)
- Si l'effet nécessite un choix non résolu : afficher en ambre `⚠ Choix requis` + un bouton "Choisir" avec classe `bg-opt-resolve` et `data-bg-idx`

Exemple de HTML à insérer après la ligne `opt.playerNotes` :
```javascript
// Compute effect summary for this single option
const effKeys = Object.keys(opt.effects || {});
const isResolved = !opt.requires_choice || (opt.resolved && Object.keys(opt.resolved).length > 0);
let effectLine = '';
if (effKeys.length > 0) {
  if (isResolved || !opt.requires_choice) {
    // Format: green checkmark + brief description
    const parts = [];
    if (opt.effects.stat_bonus) {
      const sb = opt.effects.stat_bonus;
      if (typeof sb === 'object') parts.push(Object.entries(sb).map(([k,v]) => `${k} +${v}`).join(', '));
    }
    if (opt.effects.skill_bonus && typeof opt.effects.skill_bonus === 'object')
      parts.push(Object.entries(opt.effects.skill_bonus).map(([k,v]) => `${k} +${v}`).join(', '));
    if (opt.effects.spell_adder) parts.push(`+${opt.effects.spell_adder} Spell Adder`);
    if (opt.effects.pp_bonus) parts.push(`+${opt.effects.pp_bonus} PP`);
    if (opt.effects.gold) parts.push(`${opt.effects.gold} po`);
    if (opt.effects.rr_bonus) parts.push(`RR +${opt.effects.rr_bonus}`);
    if (opt.effects.special_ability) parts.push(opt.effects.special_ability);
    if (parts.length > 0)
      effectLine = `<div class="text-xs text-green-400 mt-1">✓ ${parts.join(' | ')}</div>`;
  } else {
    effectLine = `<div class="text-xs text-amber-400 mt-1">⚠ ${lang === 'en' ? 'Choice required' : 'Choix requis'} <button class="btn-primary text-xs bg-opt-resolve" data-bg-idx="${i}" style="padding:1px 6px;margin-left:4px">${lang === 'en' ? 'Choose' : 'Choisir'}</button></div>`;
  }
}
```

### Tâche D — Dialogues de résolution des choix (event handlers dans `wizard.js`)

Ajouter des event handlers pour les boutons `.bg-opt-resolve`. Quand cliqué :

1. Lire `opt.choice_type` et `opt.effects` pour déterminer le type de dialogue
2. Afficher un `prompt()` ou un petit panel inline selon le type :

**choice_type === "skill"** :
```javascript
const skillName = prompt(lang === 'en'
  ? `Choose a ${opt.effects.skill_type || ''} skill for the +${opt.effects.skill_bonus} bonus:`
  : `Choisissez une compétence ${opt.effects.skill_type === 'secondary' ? 'secondaire' : 'primaire'} pour le bonus de +${opt.effects.skill_bonus}:`);
if (skillName) {
  resolveBackgroundChoice(character, idx, { skill_choice: skillName });
  renderEditor(app);
}
```

**choice_type === "stat"** :
```javascript
const STAT_ABBREVS = ['CO','AG','AD','Mé','RS','FO','RP','PR','EM','IN'];
const choice = prompt((lang === 'en' ? 'Choose stat: ' : 'Choisissez la stat: ') + STAT_ABBREVS.join(', '));
const statKeys = ['CO','AG','AD','ME','RS','FO','RP','PR','EM','IN'];
if (choice && statKeys.includes(choice.toUpperCase())) {
  resolveBackgroundChoice(character, idx, { stat_choice: choice.toUpperCase() });
  renderEditor(app);
}
```

**choice_type === "language"** :
```javascript
const langName = prompt(lang === 'en' ? 'Language name:' : 'Nom de la langue:');
if (langName) {
  resolveBackgroundChoice(character, idx, { language_name: langName });
  renderEditor(app);
}
```

**choice_type === "stat_increase"** (Set Option #5) :
```javascript
const mode = prompt(lang === 'en'
  ? 'Mode: type "2" for +2 to one stat, or "3" for +1 to three stats'
  : 'Mode: tapez "2" pour +2 à une stat, ou "3" pour +1 à trois stats');
if (mode === '2') {
  const stat = prompt('Quelle stat? (CO,AG,AD,ME,RS,FO,RP,PR,EM,IN)');
  const si = ['CO','AG','AD','ME','RS','FO','RP','PR','EM','IN'].indexOf(stat?.toUpperCase());
  if (si >= 0) { resolveStatIncrease(character, idx, '2', [si]); renderEditor(app); }
} else if (mode === '3') {
  const s1 = prompt('Stat 1?'), s2 = prompt('Stat 2?'), s3 = prompt('Stat 3?');
  const keys = ['CO','AG','AD','ME','RS','FO','RP','PR','EM','IN'];
  const indices = [s1,s2,s3].map(s => keys.indexOf(s?.toUpperCase())).filter(i => i >= 0);
  if (indices.length === 3) { resolveStatIncrease(character, idx, '1x3', indices); renderEditor(app); }
}
```

### Tâche E — Résumé des bonus dans l'onglet Infos

Dans la section Infos de `wizard.js`, après le panneau "Bonus manuels" (vers ligne 427), ajouter un panneau collapsible "Bonus d'historique" :

```javascript
const bgBonuses = getBackgroundBonuses(character);
const bgSummaryLines = summarizeBackgroundBonuses(bgBonuses, lang === 'en' ? 'en' : 'fr');
let bgSummaryHtml = '';
if (bgSummaryLines.length > 0) {
  bgSummaryHtml = `<details class="panel" style="cursor:pointer">
    <summary class="panel-title" style="list-style:none">${lang === 'en' ? '▸ Background bonuses' : '▸ Bonus d\'historique'}</summary>
    <div style="margin-top:0.75rem">
      ${bgSummaryLines.map(l => `<div class="text-xs" style="margin-bottom:2px">${l}</div>`).join('')}
      ${bgBonuses.unresolvedChoices.length > 0 ? `<div class="text-xs text-amber-400 mt-2">⚠ ${bgBonuses.unresolvedChoices.length} choix non résolus — allez dans l'onglet Historique</div>` : ''}
    </div>
  </details>`;
}
```

Insert `bgSummaryHtml` after the manual bonuses panel HTML.

### Tâche F — Wealth auto-inject dans équipement

Dans le handler qui store une background option (vers lignes 2635 et 2651), après `character.backgroundOptions.options[idx] = { ... }`, vérifier si l'option a des effets de richesse et les ajouter à l'équipement :

```javascript
// After storing the option, check for wealth effects
const bgBonuses = getBackgroundBonuses(character);
const wealthText = generateWealthText(bgBonuses);
if (wealthText) {
  // Remove old wealth section if present
  const eq = character.equipment || '';
  const cleaned = eq.replace(/--- Richesse d'historique ---[\s\S]*?(?=\n---|$)/, '').trim();
  character.equipment = cleaned + (cleaned ? '\n\n' : '') + wealthText;
}
```

### Tâche G — Mettre à jour le service worker cache version

Dans `sw.js`, incrémenter la version du cache (ex: `v25` → `v26`).

## Résumé des tâches pour CC

| Tâche | Fichier | Complexité |
|-------|---------|-----------|
| A | `character.js` | 3 petits str_replace (import + 3 insertions) |
| B | `wizard.js` | Modifier le calcul stat bonus + misc dans le rendu skills |
| C | `wizard.js` | Ajouter indicateur d'effet sous chaque option choisie |
| D | `wizard.js` | Ajouter handlers pour `.bg-opt-resolve` |
| E | `wizard.js` | Ajouter panneau résumé dans l'onglet Infos |
| F | `wizard.js` | Auto-inject wealth dans equipment |
| G | `sw.js` | Incrémenter cache version |

## Tests de validation

1. Ouvrir la PWA, aller dans l'onglet Historique
2. Sélectionner "Options Fixes" → "+1 Spell Adder" → vérifier PP +1 dans l'onglet Infos
3. Roller "Capacités Spéciales" → obtenir ex. "Infravision" → vérifier flag vert affiché sous l'option
4. Roller "Skill at Arms" (Companion I) → obtenir "+15 AG" → vérifier dans l'onglet Infos que stat bonus AG augmenté
5. Roller "Richesse" → obtenir "25 gp" → vérifier texte ajouté dans l'onglet Équipement
6. Sauvegarder/charger le personnage → vérifier que les effets et choix résolus persistent
