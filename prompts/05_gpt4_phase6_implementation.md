# Prompts GPT-4 - Phase 6 : Implémentation

## Prompt 6.1 - Core Engine

Je dois implémenter le moteur principal d'un générateur de personnages pour Rolemaster. Voici les spécifications basées sur l'architecture définie.

### Contexte
Rolemaster est un jeu de rôle avec :
- 10 caractéristiques principales (scores de 1-100+)
- Système de bonus basé sur les caractéristiques
- Races avec modificateurs
- Professions avec coûts de développement différents
- Compétences organisées en catégories

### Structure de données principale

```typescript
interface Character {
  id: string;
  name: string;
  level: number;
  race: Race;
  profession: Profession;
  stats: Statistics;
  skills: SkillSet;
  developmentPoints: DevelopmentPoints;
}

interface Statistics {
  strength: Stat;
  quickness: Stat;
  presence: Stat;
  intuition: Stat;
  empathy: Stat;
  constitution: Stat;
  agility: Stat;
  self_discipline: Stat;
  reasoning: Stat;
  memory: Stat;
}

interface Stat {
  base: number;
  racial: number;
  total: number;
  bonus: number;
}
```

### Implémentation demandée

1. **Classe Character complète** avec :
   - Constructeur avec options
   - Méthodes de calcul des bonus
   - Validation des règles
   - Sérialisation/désérialisation

2. **Système de caractéristiques** :
   - Génération aléatoire (plusieurs méthodes)
   - Calcul des bonus (table Rolemaster)
   - Application des modificateurs raciaux
   - Gestion des stats temporaires/permanentes

3. **Algorithmes de génération** :
   ```javascript
   class StatGenerator {
     // Méthode 1: 1-100 straight
     generateRandom(): number
     
     // Méthode 2: Point buy
     generatePointBuy(points: number): Statistics
     
     // Méthode 3: Arrays prédéfinis
     generateFromArray(array: number[]): Statistics
   }
   ```

4. **Calculateur de bonus** :
   - Table de conversion stat → bonus
   - Bonus raciaux
   - Bonus professionnels
   - Bonus d'objets (extensible)

5. **Gestionnaire de règles** :
   ```javascript
   class RulesEngine {
     validateCharacter(character: Character): ValidationResult
     calculateDerivedStats(character: Character): DerivedStats
     applyRacialModifiers(stats: Statistics, race: Race): Statistics
   }
   ```

6. **Tests unitaires complets** pour chaque composant

Fournis le code TypeScript/JavaScript complet, documenté, avec gestion d'erreurs et prêt pour production.

---

## Prompt 6.2 - UI Framework

Implémente l'interface utilisateur pour le générateur de personnages Rolemaster en React (ou framework de ton choix).

### Fonctionnalités UI requises

1. **Wizard de création** multi-étapes :
   - Étape 1: Sélection race
   - Étape 2: Sélection profession  
   - Étape 3: Génération/allocation des stats
   - Étape 4: Développement des compétences
   - Étape 5: Détails du personnage
   - Étape 6: Révision et finalisation

2. **Composants nécessaires** :
   ```jsx
   <CharacterWizard />
   <RaceSelector />
   <ProfessionSelector />
   <StatRoller />
   <SkillDevelopment />
   <CharacterSheet />
   <CharacterList />
   ```

3. **Features spécifiques** :
   - Drag & drop pour allocation de points
   - Calculs en temps réel
   - Validation instantanée
   - Preview de la feuille de personnage
   - Mode édition pour personnages existants

4. **Design system** :
   - Thème fantasy mais moderne
   - Responsive (mobile → desktop)
   - Accessibilité WCAG 2.1 AA
   - Support thème clair/sombre

5. **État global** (Redux/Context) :
   - Character en cours
   - Liste des personnages
   - Règles et données de référence
   - Préférences utilisateur

6. **Interactions complexes** :
   - Tooltips explicatifs
   - Animations de transition
   - Feedback visuel des actions
   - Undo/Redo

Fournis les composants React complets avec hooks, styled-components/CSS modules, et storybook stories.

---

## Prompt 6.3 - Data Management

Implémente la couche de gestion des données pour le générateur Rolemaster.

### Besoins

1. **Persistence locale** :
   ```javascript
   class CharacterRepository {
     save(character: Character): Promise<void>
     load(id: string): Promise<Character>
     list(): Promise<CharacterSummary[]>
     delete(id: string): Promise<void>
     search(criteria: SearchCriteria): Promise<Character[]>
   }
   ```

2. **Import/Export** :
   - Format JSON natif
   - Export PDF (feuille de personnage)
   - Import depuis anciens formats
   - Export pour VTT (Roll20, FoundryVTT)

3. **Synchronisation cloud** (optionnel) :
   - Compte utilisateur
   - Sync multi-appareils
   - Partage de personnages
   - Backup automatique

4. **Base de données des règles** :
   ```javascript
   class RulesDatabase {
     getRaces(): Promise<Race[]>
     getProfessions(): Promise<Profession[]>
     getSkills(): Promise<Skill[]>
     getSpells(realm: string): Promise<Spell[]>
     getEquipment(): Promise<Equipment[]>
   }
   ```

5. **Migration de données** :
   - Versions de schéma
   - Migration automatique
   - Compatibilité ascendante

6. **Optimisations** :
   - Lazy loading des données
   - Cache intelligent
   - Compression des sauvegardes
   - Indexation pour recherche rapide

Fournis l'implémentation complète avec IndexedDB/LocalStorage, workers pour opérations lourdes, et intégration avec le backend si nécessaire.
