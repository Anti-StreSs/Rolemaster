# Prompt pour o3 - Phase 5 : Architecture Modulaire Moderne

Je dois concevoir l'architecture complète d'un générateur de personnages moderne pour Rolemaster, en me basant sur l'analyse fonctionnelle d'un logiciel DOS des années 90. L'objectif est une architecture moderne, maintenable et extensible.

## Analyse fonctionnelle de base

### Fonctionnalités principales identifiées
1. Génération/édition de personnages
2. Système de caractéristiques avec tirages aléatoires ou allocation de points
3. Sélection race/profession avec modificateurs
4. Système de compétences avec points de développement
5. Calculs complexes de bonus et progressions
6. Sauvegarde/chargement de personnages
7. Export/impression de feuilles de personnage

### Contraintes techniques
- Doit supporter les règles complexes de Rolemaster
- Extensible pour différentes éditions des règles
- Performance pour calculs en temps réel
- Multi-plateforme (Web + Desktop possible)

## Livrables demandés

### 1. Architecture modulaire complète

Concevez une architecture avec :
- Séparation claire des responsabilités
- Modules indépendants et réutilisables
- Communication via interfaces bien définies
- Patterns de conception appropriés

Modules suggérés :
- Core (entités et logique métier)
- Rules Engine (moteur de règles)
- Character Manager
- Data Store
- UI Layer
- Import/Export
- Reporting

### 2. Interfaces détaillées pour chaque module

Pour chaque module, définir :
```typescript
interface ICharacterManager {
  createCharacter(options: CharacterCreationOptions): Character;
  updateCharacter(id: string, updates: Partial<Character>): Character;
  calculateDerivedStats(character: Character): DerivedStats;
  validateCharacter(character: Character): ValidationResult;
}
```

### 3. Format de données (JSON Schema)

Créez des schémas JSON complets pour :
- Character
- Race
- Profession
- Skill
- Item
- Rules Configuration

Exemple attendu :
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "character": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "format": "uuid" },
        "name": { "type": "string" },
        "race": { "$ref": "#/definitions/race" },
        // etc...
      }
    }
  }
}
```

### 4. API RESTful complète

Concevez l'API avec :
- Endpoints logiques
- Méthodes HTTP appropriées
- Gestion des erreurs
- Versioning
- Documentation OpenAPI/Swagger

Exemples :
- `GET /api/v1/characters`
- `POST /api/v1/characters`
- `GET /api/v1/rules/races`
- `POST /api/v1/characters/{id}/level-up`

### 5. Architecture de plugins

Système permettant :
- Ajout de nouvelles races/professions
- Règles maison
- Modules optionnels (magie, psionique, etc.)
- Thèmes d'interface

### 6. Tests unitaires et d'intégration

Pour chaque module, fournir :
- Structure des tests unitaires
- Cas de test critiques
- Stratégie de mocking
- Tests d'intégration

Exemple :
```javascript
describe('CharacterManager', () => {
  describe('createCharacter', () => {
    it('should create a valid character with random stats', () => {
      // Test implementation
    });
    
    it('should apply racial modifiers correctly', () => {
      // Test implementation  
    });
  });
});
```

### 7. Diagrammes d'architecture

Fournir (en Mermaid ou description textuelle) :
- Diagramme de composants
- Diagramme de séquence pour création de personnage
- Diagramme de classes pour le domaine métier
- Flux de données

### 8. Considérations techniques

Adressez :
- Gestion d'état (Redux, MobX, etc.)
- Persistance des données
- Performance (calculs lourds)
- Sécurité (validation des entrées)
- Internationalisation
- Accessibilité

### 9. Stack technologique recommandée

Proposez et justifiez :
- Backend (Node.js, Python, .NET, etc.)
- Frontend (React, Vue, Angular, etc.)
- Base de données
- Cache
- Outils de build/deploy

Livrez une architecture complète, moderne et professionnelle prête pour implémentation.
