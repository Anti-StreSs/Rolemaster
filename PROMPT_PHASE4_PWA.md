# PROMPT CLAUDE CODE — Phase 4 : Construction de la PWA Rolemaster

> Lancer dans : `cd B:\IA_WORKS\2025-01-17_CPR_Rolemaster_Reverse && claude`

## Objectif

Construire une Progressive Web App (PWA) de création de personnages Rolemaster, hébergeable sur GitHub Pages, basée sur les données JSON extraites de CPR093.exe original.

## Contraintes techniques

- **Stack** : HTML + CSS + JavaScript vanilla (pas de framework lourd — pas de React/Vue/build step)
  - Raison : déployable directement sur GitHub Pages sans build, maintenable, léger
  - Tailwind CSS via CDN pour le styling
  - Les modules ES6 natifs pour la structuration du code
- **PWA** : manifest.json + Service Worker pour installation et offline
- **Données** : Charger les JSON de `data/parsed/` au runtime via fetch()
- **Bilingue** : FR/EN avec switch dynamique (données déjà bilingues dans les JSON)
- **Responsive** : Mobile-first, utilisable sur tablette autour d'une table de JDR
- **Impression** : Feuille de personnage imprimable via CSS @media print
- **Persistence** : Sauvegarde personnages en JSON (download/upload + localStorage fallback)

## Architecture cible

```
pwa/
├── index.html                  ← Point d'entrée unique (SPA)
├── manifest.json               ← PWA manifest
├── sw.js                       ← Service Worker (cache offline)
├── css/
│   └── styles.css              ← Styles principaux + @media print
├── js/
│   ├── app.js                  ← Point d'entrée JS, routeur, état global
│   ├── engine/                 ← Moteur de jeu (pur calcul, AUCUNE UI)
│   │   ├── data-loader.js      ← Charge les JSON de data/parsed/
│   │   ├── character.js        ← Classe Character (état complet d'un personnage)
│   │   ├── stats.js            ← Tirage stats, calcul bonus (utilise carac_tables.json)
│   │   ├── classes.js          ← Gestion professions (utilise classes.json)
│   │   ├── skills.js           ← Compétences + développement (utilise competences.json + couts.json)
│   │   ├── spells.js           ← Sorts (utilise sorts.json)
│   │   ├── equipment.js        ← Armures, boucliers, armes
│   │   └── export.js           ← Sérialisation JSON, génération feuille imprimable
│   ├── ui/                     ← Composants d'interface
│   │   ├── wizard.js           ← Création pas-à-pas (flow principal)
│   │   ├── sheet.js            ← Affichage feuille de personnage complète
│   │   ├── components.js       ← Composants réutilisables (selectors, tables, modals)
│   │   └── settings.js         ← Paramètres (langue, options de règles)
│   └── i18n/
│       ├── fr.js               ← Labels UI en français
│       └── en.js               ← Labels UI en anglais
├── data/                       ← Lien symbolique ou copie de data/parsed/
│   ├── carac_tables.json
│   ├── classes.json
│   ├── competences.json
│   ├── sorts.json
│   ├── couts.json
│   ├── categories.json
│   ├── simil.json
│   └── options.json
└── assets/
    ├── icon-192.png            ← Icône PWA
    ├── icon-512.png            ← Icône PWA grande
    └── fondvert.bmp            ← Background original (optionnel, nostalgie)
```

## Données disponibles (data/parsed/)

| Fichier | Contenu | Taille |
|---------|---------|--------|
| carac_tables.json | Table tirage stats (9 lignes × 38 cols), bonus stats (-25→+91), dev corporel, armures, sorts | 13KB |
| classes.json | 68 professions avec noms FR/EN, realm, params | 23KB |
| competences.json | 206 compétences en 16 catégories, stats associées | 100KB |
| sorts.json | 112 listes de sorts, 10 realms, noms FR/EN | 14KB |
| couts.json | Matrice 65 classes × ~490 coûts de développement | 422KB |
| categories.json | 60 catégories de sous-spécialités FR/EN | 8.5KB |
| simil.json | Matrice similarité inter-compétences | 24KB |
| options.json | Règles optionnelles FR/EN avec valeurs par défaut | 22KB |

## Flow de création de personnage (reproduire CPR093)

Le programme original avait 26 formulaires VB3. Le flow de création est :

1. **CHOIXNOM** → Saisie du nom du personnage
2. **CHOIXCAR** → Tirage/assignation des 10 caractéristiques (avec bonus raciaux)
3. **CHOIXCLA** → Choix de la profession (68 classes)
4. **CHOIXROY** → Choix du royaume de magie (si applicable)
5. **CHOIXPRI** → Choix des caractéristiques primaires
6. **CHOIXCAT** → Choix des catégories d'armes
7. **CHOIXARM** → Choix de l'armure
8. **COMPETEN** → Développement des compétences (points de dev)
9. **CHOIXSOR** → Choix des sorts (si lanceur de sorts)
10. **FEUILLE** → Feuille de personnage finale (la plus grosse vue)

## Fonctionnalités MVP (Phase 4a)

1. **Chargement des données** — tous les JSON au démarrage
2. **Création pas-à-pas** — wizard avec les 10 étapes ci-dessus
3. **Calcul automatique** — bonus stats, points de dev, coûts compétences
4. **Feuille de personnage** — affichage complet, imprimable
5. **Sauvegarde/Chargement** — JSON download/upload
6. **Bilingue FR/EN** — switch dynamique
7. **PWA** — installable, fonctionne offline

## Fonctionnalités Phase 4b (après MVP)

- Options de règles (options.json)
- Mondes personnalisés (.mnd)
- Export PDF
- Progression par niveau (levelup)
- Gestion multi-personnages

## Références visuelles

L'original CPR093 avait une interface Windows 3.1 avec THREED.VBX (boutons 3D en relief).
On ne cherche PAS à reproduire ce look. On veut une interface **moderne, élégante, thème fantasy** :
- Palette sombre (parchemin/cuir/or) pour l'ambiance Rolemaster
- Typographie lisible pour les tables de nombres
- Tables compactes mais aérées
- Responsive pour tablettes (usage principal : autour d'une table de JDR)

## Exécution

Mode continu. Construire le squelette complet avec :
1. Structure de fichiers
2. PWA (manifest + service worker)
3. Data loader fonctionnel
4. Engine complet (stats, classes, skills, spells)
5. UI wizard (au moins étapes 1-4 fonctionnelles)
6. Feuille de personnage basique
7. Sauvegarde/chargement
8. i18n FR/EN

Tester dans le navigateur à chaque étape clé.
Commit réguliers sur le repo GitHub.
/checkpoint en fin de session.
