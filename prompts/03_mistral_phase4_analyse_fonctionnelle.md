# Prompt pour Mistral Pro - Phase 4 : Analyse Fonctionnelle

Je reconstruis un générateur de personnages pour Rolemaster (jeu de rôle papier) à partir d'un logiciel DOS/Windows des années 90. J'ai besoin de votre expertise pour analyser et concevoir l'architecture fonctionnelle.

## Contexte : Rolemaster
Rolemaster est un système de jeu de rôle connu pour :
- Sa complexité et son réalisme
- Des tables détaillées pour tout
- Un système de compétences très granulaire
- Des calculs basés sur des pourcentages
- Des classes/professions variées
- Un système de développement par niveaux

## Ressources extraites (exemples typiques)
Voici ce qu'on trouve généralement dans ce type de logiciel :

### Éléments d'interface
- "Roll Stats" / "Tirer les caractéristiques"
- "Select Race" / "Choisir la race"
- "Select Profession" / "Choisir la profession"
- "Assign Points" / "Assigner les points"
- "Calculate Bonuses" / "Calculer les bonus"
- "Save Character" / "Sauvegarder le personnage"

### Données de jeu probables
- Races : Humain, Elfe, Nain, Hobbit, etc.
- Professions : Guerrier, Voleur, Mage, Clerc, Ranger, etc.
- Caractéristiques : Force, Agilité, Constitution, Intelligence, Intuition, Présence, etc.
- Compétences : Combat, Magie, Subterfuge, Athlétisme, Perception, etc.

## Livrables demandés

### 1. Diagramme de flux fonctionnel
Créez un diagramme détaillé (en Mermaid ou description textuelle) montrant :
- Le flux de création de personnage étape par étape
- Les points de décision
- Les calculs intermédiaires
- Les validations nécessaires

### 2. Structures de données
Définissez précisément :
```
Character {
  // Attributs de base
  // Caractéristiques
  // Compétences
  // Équipement
  // etc.
}

Race {
  // Modificateurs de caractéristiques
  // Capacités spéciales
  // Restrictions
}

Profession {
  // Coûts de développement
  // Compétences primaires
  // Restrictions
}
```

### 3. Algorithmes principaux

#### 3.1 Génération des caractéristiques
- Méthodes de tirage (3d6, 4d6 drop lowest, point buy, etc.)
- Application des modificateurs raciaux
- Validation des minimums/maximums

#### 3.2 Calcul des bonus
- Formules de conversion caractéristique → bonus
- Bonus raciaux
- Bonus de niveau

#### 3.3 Système de compétences
- Catégories de compétences
- Calcul du coût en points de développement
- Progression par niveau
- Calcul des bonus totaux

#### 3.4 Points de développement
- Attribution par niveau
- Modificateurs selon Intelligence
- Règles de dépense

### 4. Tables de référence
Identifiez les tables nécessaires :
- Table de bonus de caractéristiques
- Table de progression des compétences
- Table des coûts par profession
- Tables de combat (optionnel)

### 5. Règles métier
Listez toutes les règles comme :
- "Un personnage ne peut dépenser plus de X points dans une compétence par niveau"
- "Les bonus raciaux s'appliquent avant/après les tirages"
- "Certaines professions ont des prérequis de caractéristiques"

### 6. Interface utilisateur logique
Proposez l'organisation des écrans :
1. Écran de démarrage
2. Sélection race/profession
3. Génération/allocation des stats
4. Développement des compétences
5. Finalisation/sauvegarde

Merci de fournir une analyse complète et structurée qui servira de base à la reconstruction moderne du logiciel.
