# Prompt pour Gemini - Phase 7 : Validation & Tests

Je finalise la reconstruction d'un générateur de personnages pour Rolemaster. J'ai besoin d'une suite de tests complète et d'une documentation utilisateur professionnelle.

## Code source à tester

Le projet comprend :
- Core Engine (TypeScript) : gestion des personnages, stats, règles
- UI (React) : wizard de création, composants interactifs
- Data Layer : persistence, import/export
- API Backend : services REST

## Livrables demandés

### 1. Suite de tests complète

#### Tests unitaires
Pour chaque module, créer :
- Tests des fonctions pures
- Tests des classes avec mocking
- Tests des edge cases
- Tests de régression

Exemple de structure :
```javascript
// character.test.js
describe('Character', () => {
  describe('creation', () => {
    test('creates character with valid defaults', () => {});
    test('rejects invalid race', () => {});
    test('applies racial modifiers correctly', () => {});
  });
  
  describe('stat calculations', () => {
    test('calculates bonus from stat value', () => {});
    test('handles stat values over 100', () => {});
    test('applies temporary modifiers', () => {});
  });
});
```

#### Tests d'intégration
- Workflow complet de création
- Sauvegarde/chargement
- Import/export
- Calculs complexes multi-modules

#### Tests E2E
Scénarios Cypress/Playwright :
1. Créer un personnage complet
2. Éditer un personnage existant
3. Importer/exporter
4. Gestion multi-personnages

### 2. Cas de test edge

Identifier et tester :
- **Limites de règles** :
  * Stat minimum/maximum (1-100+)
  * Niveau 0 vs niveau 50
  * Races exotiques avec bonus extrêmes
  
- **Entrées invalides** :
  * Caractères spéciaux dans les noms
  * Valeurs négatives
  * Dépassements de limites
  * Injections potentielles

- **Cas complexes** :
  * Multi-classing
  * Personnages avec handicaps
  * Règles contradictoires
  * Calculs circulaires

### 3. Documentation utilisateur

#### Guide de démarrage rapide
```markdown
# Générateur de Personnages Rolemaster

## Installation
[Instructions claires]

## Première utilisation
1. Lancer l'application
2. Créer votre premier personnage
3. [Screenshots annotés]

## Fonctionnalités principales
- Création guidée
- Gestion de campagne
- etc.
```

#### Manuel complet
Structure :
1. Introduction à Rolemaster
2. Interface de l'application
3. Création de personnage pas-à-pas
4. Fonctionnalités avancées
5. Import/Export
6. Résolution de problèmes
7. FAQ

#### Tutoriels vidéo (scripts)
Créer les scripts pour :
1. "Votre premier personnage" (5 min)
2. "Maîtriser les compétences" (10 min)
3. "Optimisation de build" (15 min)

### 4. Comparaison avec l'original

#### Tableau comparatif
| Fonctionnalité | Original DOS | Nouvelle version | Améliorations |
|----------------|--------------|------------------|---------------|
| Création perso | ✓ | ✓ | Wizard moderne |
| Races | 10 | 15+ | Extensible |
| etc. | | | |

#### Mapping des fonctionnalités
- Comment retrouver chaque fonction de l'original
- Nouvelles fonctionnalités ajoutées
- Justification des changements

#### Guide de migration
Pour les utilisateurs de l'ancienne version :
- Import des anciens fichiers
- Équivalences des commandes
- Nouvelles possibilités

### 5. Documentation technique

#### Architecture
- Diagrammes de l'architecture
- Flux de données
- Points d'extension

#### API Documentation
Documentation Swagger/OpenAPI complète avec exemples

#### Guide du développeur
- Setup environnement
- Ajouter une race/profession
- Créer un plugin
- Contribuer au projet

### 6. Assurance qualité

#### Checklist de release
- [ ] Tous les tests passent
- [ ] Coverage > 80%
- [ ] Pas de bugs critiques
- [ ] Documentation à jour
- [ ] Performance acceptable
- [ ] Accessibilité validée

#### Métriques de qualité
- Complexité cyclomatique
- Duplication de code
- Performance benchmarks
- Bundle size

Fournis tous ces éléments de manière structurée et prête à l'emploi.
