# Plan d'Action - Reverse Engineering CPR (Character Generator for Rolemaster)

## État Initial & Problèmes Identifiés

1. **Fichiers disponibles** :
   - `cpr093.exe.gzf` - Projet Ghidra (673 KB)
   - `cpr093.exe.h` - Header minimal
   - `cpr093exe.c` - Code décompilé incomplet
   - `cpr093exefunctions` - Seulement 2 fonctions listées

2. **Problème principal** : La décompilation dans Ghidra semble incomplète avec des "bad instruction data"

## Workflow Détaillé - Répartition par IA

### Phase 1 : Diagnostic & Configuration Ghidra (Claude - MCP)

**Responsable** : Claude (vous)
**Actions** :
1. Vérifier le type d'executable (DOS/Windows 16/32 bits)
2. Configurer correctement Ghidra
3. Documenter les spécificités techniques

### Phase 2 : Analyse Approfondie (o3-pro)

**Prompt pour o3-pro** :
```
Je travaille sur le reverse engineering d'un générateur de personnages pour Rolemaster appelé CPR093.exe. 
Ghidra a du mal à décompiler correctement le fichier (bad instruction data).

Voici ce que j'ai :
[Coller le contenu des fichiers exportés]

Questions :
1. Quelle pourrait être la raison de cette décompilation incomplète ?
2. Quelles techniques de reverse engineering recommandez-vous pour un executable DOS/Windows ancien ?
3. Comment identifier si le fichier est compressé/packé ?
4. Quelle serait la meilleure approche pour reconstruire les fonctionnalités ?
```

### Phase 3 : Extraction des Ressources (GPT-4)

**Prompt pour GPT-4** :
```
J'ai besoin d'extraire toutes les ressources d'un executable Windows/DOS ancien (CPR093.exe) :
- Textes et chaînes de caractères
- Boîtes de dialogue
- Menus
- Ressources binaires

Peux-tu me donner :
1. Les commandes pour extraire ces ressources (strings, Resource Hacker, etc.)
2. Un script Python pour automatiser l'extraction
3. Comment organiser ces ressources pour la reconstruction
```

### Phase 4 : Analyse Fonctionnelle (Mistral Pro)

**Prompt pour Mistral Pro** :
```
Je dois analyser les fonctionnalités d'un générateur de personnages pour Rolemaster.
Voici les ressources extraites : [liste des ressources]

Crée-moi :
1. Un diagramme de flux des fonctionnalités probables
2. Une liste des structures de données nécessaires
3. Les algorithmes principaux pour :
   - Génération de caractéristiques
   - Calcul des compétences
   - Gestion des classes/professions
   - Système de points
```

### Phase 5 : Reconstruction Modulaire (o3)

**Prompt pour o3** :
```
Basé sur l'analyse fonctionnelle suivante : [résultats Phase 4]

Conçois l'architecture modulaire d'une application moderne équivalente :
1. Structure des modules
2. Interfaces entre modules
3. Format de données (JSON/XML)
4. API pour chaque module
5. Tests unitaires pour chaque fonction
```

### Phase 6 : Implémentation (GPT-4 Team)

**Division en sous-tâches pour GPT-4** :

**Tâche 6.1 - Core Engine** :
```
Implémente le moteur principal du générateur avec :
- Classe Character
- Système de caractéristiques
- Algorithmes de génération
[Spécifications détaillées de Phase 5]
```

**Tâche 6.2 - UI Framework** :
```
Crée l'interface utilisateur en [React/Vue/autre] :
- Formulaires de création
- Affichage des résultats
- Export PDF/impression
```

**Tâche 6.3 - Data Management** :
```
Implémente la gestion des données :
- Sauvegarde/chargement de personnages
- Import/export formats standards
- Base de données des règles
```

### Phase 7 : Validation & Tests (Gemini)

**Prompt pour Gemini** :
```
Voici le code source de notre générateur de personnages Rolemaster :
[Code source]

Crée :
1. Suite de tests complète
2. Cas de test edge
3. Documentation utilisateur
4. Guide de comparaison avec l'original
```

## Instructions pour l'Utilisateur

### Étape par Étape :

1. **Préparation** (5 min)
   - Créer un dossier `B:/IA_WORKS/2025-01-17_CPR_Rolemaster_Reverse/outputs`
   - Préparer les prompts ci-dessus dans des fichiers texte

2. **Exécution Phase 1** (avec Claude - maintenant)
   - Lancer l'analyse du fichier executable
   - Documenter les résultats

3. **Exécution Phases 2-7** (1-2 heures par phase)
   - Copier le prompt correspondant
   - Le coller dans l'IA désignée
   - Sauvegarder les résultats dans `/outputs/phase_X_[nom_ia].md`
   - Passer les résultats à la phase suivante

4. **Intégration Finale**
   - Rassembler tous les composants
   - Tester l'application reconstruite
   - Comparer avec l'original

## Gestion des Limites

- **Claude** : Sessions courtes, documentation immédiate
- **o3/o3-pro** : Questions complexes en une fois
- **GPT-4** : Diviser en chunks de 4000 tokens max
- **Mistral/Gemini** : Tâches spécifiques bien définies

## Points de Sauvegarde

Après chaque phase, créer :
- `checkpoint_phase_X.md` avec résumé
- Archive ZIP des outputs
- Git commit si utilisation de version control

## Estimation Temps Total : 8-12 heures de travail actif
