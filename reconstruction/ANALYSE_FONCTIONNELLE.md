# Analyse Fonctionnelle de CPR093.exe

## 1. Informations Générales
- **Nom** : Création de Personnage pour Rolemaster V
- **Créateur** : Eric Lestrade
- **Date** : 10 novembre 1997
- **Type** : Application bilingue (Français/Anglais)
- **Framework** : Visual Basic 3.0 avec VBRUN300.DLL

## 2. Caractéristiques du Système Rolemaster

### Caractéristiques Principales (10)
| Français | Anglais | Abréviation probable |
|----------|---------|---------------------|
| Force | Strength | FOR/ST |
| Constitution | Constitution | CON/CO |
| Agilité | Agility | AGI/AG |
| Auto-discipline | Self-Discipline | AUT/SD |
| Mémoire | Memory | MEM/ME |
| Raisonnement | Reasoning | RAI/RE |
| Présence | Presence | PRE/PR |
| Empathie | Empathy | EMP/EM |
| Intuition | Intuition | INT/IN |
| Rapidité | Quickness | RAP/QU |

### Royaumes de Magie
1. **Essence** - Magie arcanique
2. **Mentalisme** - Pouvoirs psychiques  
3. **Channeling** - Magie divine
4. **Hybrides** :
   - Essence/Mentalisme
   - Essence/Channeling
   - Mentalisme/Channeling
   - Variable

### Types de Professions
- Pur ou hybride
- Semi hybride
- Hybride
- Variable

### Armures (6 types)
1. Peau et vêtements (Skin and clothes)
2. Cuir souple (Soft Leather)
3. Cuir rigide (Rigid Leather)
4. Mailles (Chain)
5. Plaques (Plate)
6. Sans armure

### Boucliers
- Targe (Target)
- Rondache (Normal)
- Pavois (Full)
- Main Gauche (Left Hand)

### Catégories d'Armes
1. Armes à une main (One Handed Edged)
2. Armes de mêlée à une main (One Handed Concussion)
3. Armes à deux mains (Two Handed)
4. Armes d'Hast (Pole Arms)
5. Arcs et Arbalettes (Bows and Crossbows)
6. Armes de jet (Thrown)

## 3. Fonctionnalités Principales

### Gestion des Personnages
- Nouveau personnage (New Character)
- Charger personnage (Load Character)
- Sauvegarder personnage (Save Character)
- Fermer personnage (Close Character)
- Imprimer personnage (Print Character)
- Aperçu avant impression (Print Preview)

### Phases de Création
1. **Identité** : Nom, Race, Taille, Poids
2. **Caractéristiques** : Tirage ou saisie manuelle
3. **Profession/Classe** : Choix avec caractéristiques primaires
4. **Compétences** (Skills) : Attribution de points
5. **Listes de Sorts** (Spell Lists) : Sélection selon profession
6. **Background** : Apparence, Comportement, Historique

### Système de Développement
- Points de développement (Development points)
- Niveaux (Levels)
- Points de Coup (Hit Points)
- Points de Pouvoir (Power Points)
- Bonus de Défense (DB)
- Catégories de compétences

### Fichiers de Données
| Fichier | Contenu |
|---------|---------|
| carac.dat | Caractéristiques |
| classes.dat / claseng.dat | Classes/Professions (FR/EN) |
| comp.dat / compengl.dat | Compétences (FR/EN) |
| sorts.dat | Listes de sorts |
| couts.dat | Coûts de développement |
| simil.dat | Similarités entre compétences |
| defaut.mnd / defauten.mnd | Monde par défaut (FR/EN) |
| pathclas.dat | Chemins de classes |
| categ.dat / categeng.dat | Catégories (FR/EN) |

### Images
- blank.bmp : Image vide
- fondvert.bmp : Fond vert (background)

## 4. Interface Utilisateur

### Fenêtres Principales
- Stats (Caractéristiques)
- Skills (Compétences)
- General (Général)
- Spell List (Listes de sorts)
- Identity (Identité)
- Background (Historique)

### Options
- Règles optionnelles (Optional Rules)
- Paramètres (Parameters)
- Édition du monde (World Edition)
- Options d'impression (Print Options)

### Langues Supportées
- Français
- Anglais
- Changement dynamique de langue

## 5. Formats de Fichiers
- **Personnages** : *.psg (Personnage Sauvegardé)
- **Mondes** : *.mnd (Monde)
- **Options** : options.dat / optionse.dat

## 6. Algorithmes Probables

### Génération de Caractéristiques
- Tirage aléatoire (1-101)
- Répartition manuelle
- Validation des totaux

### Calcul des Bonus
- Basé sur les valeurs de caractéristiques
- Modificateurs raciaux
- Bonus de profession

### Points de Développement
- Base selon la profession
- Bonus selon les caractéristiques
- Coûts variables selon les catégories

### Listes de Sorts
- Ouvertes (Open)
- Fermées (Closed)
- Libres
- De profession
- Arcanes

## 7. Structure de Données Probable

```python
class Personnage:
    # Identité
    nom: str
    race: str
    profession: str
    niveau: int
    
    # Caractéristiques (10)
    caracteristiques: dict[str, int]
    bonus_carac: dict[str, int]
    
    # Vital
    points_de_coup: int
    points_de_pouvoir: int
    
    # Combat
    type_armure: str
    bouclier: str
    bonus_defense: int
    
    # Compétences
    competences: dict[str, CompetenceData]
    
    # Sorts
    listes_sorts: list[ListeSort]
    
    # Background
    taille: str
    poids: str
    apparence: str
    comportement: str
    historique: str
```

## 8. Prochaines Étapes

1. **Créer des parsers** pour les fichiers .dat (s'ils sont disponibles)
2. **Reconstruire l'interface** en HTML5/JavaScript ou Python/Tkinter
3. **Implémenter les algorithmes** de génération et calcul
4. **Tester** avec des exemples du jeu Rolemaster
5. **Documenter** pour les utilisateurs
