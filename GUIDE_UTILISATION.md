# Guide d'Utilisation - Reverse Engineering CPR avec Multiple IA

## Vue d'ensemble

Ce projet vise à reconstruire le générateur de personnages Rolemaster (CPR093.exe) en utilisant une approche orchestrée avec plusieurs IA. Chaque IA a été assignée à des tâches spécifiques selon ses forces.

## Répartition des tâches par IA

| Phase | IA | Durée estimée | Tâche |
|-------|-----|--------------|--------|
| 1 | Claude (fait) | ✓ | Diagnostic initial et setup |
| 2 | o3-pro | 30-45 min | Analyse approfondie du reverse engineering |
| 3 | GPT-4 | 30 min | Extraction des ressources |
| 4 | Mistral Pro | 45 min | Analyse fonctionnelle Rolemaster |
| 5 | o3 | 45-60 min | Architecture moderne |
| 6.1 | GPT-4 | 60 min | Implémentation Core Engine |
| 6.2 | GPT-4 | 60 min | Implémentation UI |
| 6.3 | GPT-4 | 45 min | Implémentation Data Layer |
| 7 | Gemini | 30 min | Tests et documentation |

## Instructions pas à pas

### Avant de commencer

1. **Localiser CPR093.exe** original et le copier dans `B:/IA_WORKS/2025-01-17_CPR_Rolemaster_Reverse/`
2. **Installer les outils** :
   - Ghidra (déjà fait)
   - UPX : https://upx.github.io/
   - Python 3.x avec pip
   - Node.js pour le développement

### Phase 2 : Analyse avec o3-pro

1. Ouvrir o3-pro
2. Copier le contenu de `prompts/01_o3pro_phase2_analyse.md`
3. Ajouter toute information supplémentaire sur CPR093.exe si disponible
4. Sauvegarder la réponse dans `outputs/phase2_o3pro_analysis.md`
5. **Points clés à extraire** :
   - Type exact d'executable
   - Méthode de décompression si nécessaire
   - Stratégie Ghidra optimale

### Phase 3 : Extraction avec GPT-4

1. Si l'analyse o3-pro indique que le fichier est packé :
   ```bash
   upx -d CPR093.exe -o CPR093_unpacked.exe
   ```

2. Copier le prompt de `prompts/02_gpt4_phase3_extraction.md`
3. Ajouter les résultats de la Phase 2
4. Exécuter le script Python fourni par GPT-4
5. Sauvegarder dans `outputs/phase3_extraction/`

### Phase 4 : Analyse fonctionnelle avec Mistral Pro

1. Préparer un résumé des ressources extraites
2. Utiliser le prompt de `prompts/03_mistral_phase4_analyse_fonctionnelle.md`
3. Si vous connaissez Rolemaster, ajouter des précisions
4. Sauvegarder dans `outputs/phase4_mistral_functional.md`

### Phase 5 : Architecture avec o3

1. Compiler les résultats des phases 3 et 4
2. Utiliser le prompt de `prompts/04_o3_phase5_architecture.md`
3. Demander les diagrammes en format Mermaid
4. Sauvegarder dans `outputs/phase5_o3_architecture.md`

### Phase 6 : Implémentation avec GPT-4

**Important** : Diviser en 3 sessions séparées pour éviter la surcharge

#### Session 6.1 - Core Engine
1. Utiliser la première partie de `prompts/05_gpt4_phase6_implementation.md`
2. Fournir l'architecture de la Phase 5
3. Sauvegarder le code dans `src/core/`

#### Session 6.2 - UI (nouvelle conversation)
1. Utiliser la deuxième partie du prompt
2. Référencer les interfaces du Core
3. Sauvegarder dans `src/ui/`

#### Session 6.3 - Data Layer (nouvelle conversation)
1. Utiliser la troisième partie
2. Sauvegarder dans `src/data/`

### Phase 7 : Tests avec Gemini

1. Créer un ZIP avec tout le code source
2. Utiliser le prompt de `prompts/06_gemini_phase7_validation.md`
3. Si Gemini a des limites de taille, diviser en :
   - Tests Core
   - Tests UI  
   - Documentation

### Post-traitement avec Claude

Quand toutes les phases sont complètes, revenir me voir avec :
- Un résumé de chaque phase
- Les problèmes rencontrés
- Le code source final

Je pourrai alors :
- Intégrer tous les composants
- Résoudre les conflits
- Créer le build final
- Générer un rapport complet

## Gestion des problèmes courants

### Si une IA atteint ses limites
- Sauvegarder immédiatement le travail
- Diviser la tâche en sous-tâches
- Commencer une nouvelle conversation
- Fournir un contexte minimal

### Si les résultats sont incohérents
- Vérifier que le contexte des phases précédentes est bien transmis
- Demander des clarifications spécifiques
- Utiliser Claude pour arbitrer

### Si le code ne compile pas
- Isoler le module problématique
- Demander à GPT-4 de déboguer spécifiquement
- Documenter l'erreur pour apprentissage

## Structure finale attendue

```
B:/IA_WORKS/2025-01-17_CPR_Rolemaster_Reverse/
├── CPR093.exe (original)
├── CPR093_unpacked.exe (si applicable)
├── prompts/ (✓ créés)
├── outputs/
│   ├── phase2_o3pro_analysis.md
│   ├── phase3_extraction/
│   ├── phase4_mistral_functional.md
│   ├── phase5_o3_architecture.md
│   └── phase7_tests/
├── src/
│   ├── core/
│   ├── ui/
│   └── data/
├── docs/
├── tests/
└── build/
```

## Checklist finale

- [ ] Executable original analysé
- [ ] Ressources extraites
- [ ] Architecture définie
- [ ] Core implémenté
- [ ] UI implémentée
- [ ] Persistance implémentée
- [ ] Tests écrits
- [ ] Documentation complète
- [ ] Build fonctionnel

Bonne chance ! Revenez me voir avec les résultats pour l'intégration finale.
