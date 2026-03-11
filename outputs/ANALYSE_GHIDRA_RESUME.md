# Analyse CPR093.exe avec Ghidra - Résumé

## Ce qui a été découvert

### 1. Format du fichier
- **Type** : New Executable (NE) - Format Windows 3.x 16-bit
- **Taille** : 829,313 octets
- **Date de modification** : 10 novembre 1997

### 2. Dépendances
- **VBRUN300** : Runtime Visual Basic 3.0 (non trouvé dans le projet)
- Cela confirme que l'application a été développée avec Visual Basic 3.0

### 3. Analyse limitée
- Seulement 2 fonctions trouvées : `entry` et `Ordinal_100`
- Décompilation échouée avec "bad instruction data"
- Problème probable : Le code VB3 est principalement du P-Code interprété

### 4. Ressources extraites (1380 strings)

#### Interface bilingue français/anglais :
- Menus, boîtes de dialogue, messages
- "CREATION DE PERSONNAGE V" par Eric Lestrade
- Options d'impression, sauvegarde, chargement

#### Éléments de jeu Rolemaster :
- **Caractéristiques** : Force, Constitution, Agilité, Auto-discipline, Mémoire, Raisonnement, Présence, Empathie, Intuition, Rapidité
- **Royaumes de magie** : Essence, Mentalisme, Channeling (et combinaisons)
- **Armures** : Cuir souple, Cuir rigide, Mailles, Plaques
- **Boucliers** : Targe, Rondache, Pavois, Main Gauche
- **Catégories d'armes** : Une main, Deux mains, Armes d'Hast, Arcs et Arbalettes, Armes de jet

#### Fichiers de données :
- `carac.dat` - Caractéristiques
- `classes.dat` / `claseng.dat` - Classes/Professions
- `comp.dat` / `compengl.dat` - Compétences
- `sorts.dat` - Sorts
- `couts.dat` - Coûts de développement
- `simil.dat` - Similarités
- `defaut.mnd` / `defauten.mnd` - Monde par défaut
- `pathclas.dat` - Chemins de classes
- `categ.dat` / `categeng.dat` - Catégories

#### Images :
- `blank.bmp`
- `fondvert.bmp`

### 5. Limitations de Ghidra

Le problème principal est que Visual Basic 3.0 compile en P-Code (pseudo-code) qui est interprété par VBRUN300.DLL. Ghidra ne peut pas décompiler ce P-Code car :
1. Ce n'est pas du code machine x86 natif
2. Le format P-Code de VB3 est propriétaire et peu documenté
3. La logique est dans les ressources et le runtime VB

## Options pour continuer

### 1. Utiliser le MCP Ghidra existant
- Un serveur HTTP Ghidra est disponible (port 8765)
- Scripts Python pour interaction disponibles dans `B:/MCP/ghidra`
- Mais limité par les mêmes problèmes de P-Code

### 2. Approche alternative recommandée
Au lieu du reverse engineering du code :
1. **Extraire toutes les ressources** (fait ✓)
2. **Analyser les fichiers .DAT** pour comprendre les structures de données
3. **Reconstruire la logique** basée sur :
   - Les chaînes de caractères (menus, messages)
   - La connaissance du système Rolemaster
   - Les fichiers de configuration
4. **Créer une nouvelle implémentation** moderne

### 3. Outils spécifiques VB3
Pour une analyse plus poussée, il faudrait :
- Un décompileur VB3 spécialisé (VB Decompiler, etc.)
- L'environnement VB3 original pour comprendre les structures
- Documentation sur le format P-Code VB3

## Prochaines étapes recommandées

1. **Analyser les fichiers .DAT** pour comprendre les formats de données
2. **Documenter l'interface utilisateur** basée sur les strings
3. **Mapper les fonctionnalités** à partir des menus et messages
4. **Passer directement à la Phase 4** (Analyse fonctionnelle) avec les informations collectées
5. **Créer une spécification** complète pour la reconstruction

L'approche par reverse engineering pur n'est pas optimale pour ce type d'application VB3. Une reconstruction basée sur l'analyse des ressources et la compréhension du domaine sera plus efficace.
