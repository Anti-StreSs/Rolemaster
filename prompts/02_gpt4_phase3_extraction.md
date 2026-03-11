# Prompt pour GPT-4 - Phase 3 : Extraction des Ressources

Je dois extraire toutes les ressources d'un executable Windows/DOS ancien (CPR093.exe) qui est un générateur de personnages pour le jeu de rôle Rolemaster. L'objectif est de récupérer tout le contenu nécessaire pour reconstruire l'application.

## Contexte
- Executable probablement des années 90
- Peut être au format DOS (MZ), Windows 3.x (NE), ou Win32 (PE)
- Potentiellement compressé avec un packer d'époque

## Besoins spécifiques

### 1. Extraction des chaînes de caractères
J'ai besoin :
- Commandes pour extraire TOUTES les chaînes (ASCII et Unicode si présent)
- Filtrage intelligent pour identifier :
  * Messages d'interface utilisateur
  * Noms de stats/compétences/classes
  * Messages d'erreur
  * Textes d'aide
- Organisation des chaînes par catégorie probable

### 2. Extraction des ressources Windows (si applicable)
- Boîtes de dialogue (DIALOG resources)
- Menus (MENU resources)  
- Icônes et bitmaps
- Accelerators (raccourcis clavier)
- Tables de chaînes (STRING TABLE)
- Version info

### 3. Script Python complet
Créez un script Python robuste qui :
- Détecte automatiquement le format de l'executable
- Extrait toutes les ressources selon le format
- Organise les résultats dans une structure claire
- Génère un rapport HTML visualisable
- Gère les erreurs gracieusement

Le script devrait produire une structure comme :
```
extracted_resources/
├── strings/
│   ├── ui_strings.txt
│   ├── game_data.txt
│   └── error_messages.txt
├── dialogs/
│   ├── dialog_001.rc
│   └── dialog_001.png (preview)
├── menus/
│   └── main_menu.rc
├── images/
├── data/
│   └── binary_resources.bin
└── report.html
```

### 4. Outils recommandés
Listez et expliquez l'utilisation de :
- Outils en ligne de commande (strings, objdump, etc.)
- Outils GUI (Resource Hacker, PE Explorer alternatives gratuites)
- Bibliothèques Python (pefile, pythoncom, etc.)

### 5. Analyse des données extraites
Comment identifier dans les ressources extraites :
- Le système de règles (formules de calcul)
- Les tables de données (races, classes, compétences)
- La structure des personnages
- Les algorithmes de génération

### 6. Cas particuliers
Comment gérer :
- Les ressources dans des formats propriétaires
- Les données compressées/chiffrées
- Les ressources dans des overlays DOS
- Les fichiers de données externes (.DAT, .DB, etc.)

Merci de fournir un code complet, documenté et prêt à l'emploi, avec des exemples de commandes pour chaque outil mentionné.
