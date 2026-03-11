# Mise à Jour Projet CPR093 Rolemaster Reverse Engineering
## Audit & Plan d'Action — 11 mars 2026

---

## 1. ÉTAT DES LIEUX (Audit complet)

### 1.1 Ce qui existe

**Analyse Ghidra (Jan 2025) :**
- CPR093.exe identifié comme **NE 16-bit (Windows 3.x) / Visual Basic 3.0 P-Code**
- Projet Ghidra existant : `ghidra_project/CPR093_Analysis.gpr`
- Seulement **2 fonctions** détectées (`entry` + `Ordinal_100`) → P-Code non décompilable
- **1380 chaînes extraites** (`outputs/strings_found.txt`) — c'est le cœur de l'intel

**Reconstruction démarrée :**
- `reconstruction/cpr_core.py` — module Python de base (caractéristiques, races, professions)
- `reconstruction/cpr_web.html` — interface web prototype
- `reconstruction/test_cpr_core.py` — tests unitaires
- `reconstruction/ANALYSE_FONCTIONNELLE.md` — doc complète

**Fichiers de données critiques identifiés mais NON récupérés :**
- `carac.dat`, `classes.dat`, `claseng.dat`, `comp.dat`, `compengl.dat`
- `sorts.dat`, `couts.dat`, `simil.dat`, `pathclas.dat`, `categ.dat`, `categeng.dat`
- `defaut.mnd`, `defauten.mnd`

### 1.2 Infrastructure Ghidra & MCP

| Composant | Version | Chemin | État |
|-----------|---------|--------|------|
| Ghidra (ancienne) | 11.3.1 | `B:\Ghidra\ghidra_11.3.1_PUBLIC_20250219` | ✅ Installée, projets existants |
| Ghidra (nouvelle) | 11.4 | `B:\Ghidra\ghidra_11.4_PUBLIC` | ✅ Installée, SANS plugin MCP |
| GhidraMCP Plugin | 1.4 (pour Ghidra 11.3.2) | `B:\MCP\ghidra\GhidraMCP-release-1-4` | ⚠️ Incompatibilité version |
| Bridge MCP | bridge_mcp_ghidra.py | `B:\MCP\ghidra\` | ✅ Présent, port 8080 |
| Claude Desktop Config | — | Config JSON | ❌ GhidraMCP **NON déclaré** dans mcpServers |

### 1.3 Problèmes identifiés

1. **GhidraMCP 1.4 compilé pour Ghidra 11.3.2** — incompatible avec Ghidra 11.4 (et marginalement avec 11.3.1)
2. **GhidraMCP n'est PAS dans la config Claude Desktop** — le bridge ne sera pas appelé
3. **Ancienne conclusion "P-Code = impasse"** potentiellement révisable :
   - GhidraMCP donne accès à des outils que l'analyse manuelle n'a pas exploités
   - Les xrefs, data items, segments, imports/exports peuvent révéler bien plus
   - Un décompileur VB3 spécialisé (VB Decompiler Pro, P32Dasm) n'a jamais été essayé
4. **GhydraMCP (fork starsong-consulting) v2.0** est nettement supérieur :
   - Multi-instance, HATEOAS API, lecture mémoire directe, CLI tool
   - Compatibilité Ghidra 11+

---

## 2. PLAN DE MISE À JOUR

### Phase A — Mise à niveau infrastructure (Prérequis)

**A1. Choix de version Ghidra :**
- RECOMMANDATION : Utiliser **Ghidra 11.4** (dernière version) avec GhydraMCP v2.x
- Alternative : Rester sur Ghidra 11.3.1 avec GhidraMCP 1.4 (mais limitation des fonctionnalités)

**A2. Installation GhydraMCP v2.x (recommandé) :**
1. Télécharger le release "Complete" depuis https://github.com/starsong-consulting/GhydraMCP/releases
2. Extraire le ZIP plugin et l'installer dans Ghidra 11.4 (File > Install Extensions)
3. Activer GhydraMCPPlugin dans File > Configure > Developer
4. Le serveur HTTP démarre automatiquement sur port 8192

**A3. Configurer Claude Desktop :**
Ajouter dans `claude_desktop_config.json` :
```json
"ghidra": {
  "command": "python",
  "args": [
    "B:/MCP/ghidra/bridge_mcp_ghidra.py",
    "--ghidra-server", "http://127.0.0.1:8192/"
  ]
}
```
OU pour GhydraMCP v2 :
```json
"ghydra": {
  "command": "uv",
  "args": ["run", "B:/MCP/ghidra/bridge_mcp_hydra.py"],
  "env": { "GHIDRA_HYDRA_HOST": "localhost" }
}
```

**A4. Ré-importer CPR093.exe dans Ghidra 11.4 :**
1. Nouveau projet dans `B:\Ghidra\Projects\CPR093_v2`
2. Import avec loader NE / x86:LE:16:Real Mode
3. Lancer l'auto-analyse complète

### Phase B — Exploration approfondie via MCP

**B1. Extraction systématique :**
- Lister tous les segments mémoire (list_segments)
- Extraire toutes les strings avec adresses (list_strings)
- Mapper les imports VB runtime (list_imports) — identifier les API VB3
- Explorer les exports (Ordinal_100 = point d'entrée VB)
- Analyser les xrefs pour tracer les appels

**B2. Analyse VB3 spécialisée :**
- Les imports VBRUN300.DLL révèlent les fonctions VB utilisées
- Chaque Ordinal correspond à une fonction VB3 documentée
- Croiser avec la table des ordinals VBRUN300 pour reconstruire le flow

**B3. Extraction binaire des fichiers .dat :**
- Chercher les patterns de noms de fichiers dans le binaire
- Les chemins d'accès aux .dat sont dans les strings
- Tenter de localiser/reconstruire les structures de données

### Phase C — Reconstruction intelligente

**C1. Enrichir le prototype existant avec les données Ghidra**
**C2. Valider les calculs Rolemaster avec les PDFs fournis**
**C3. Implémenter les .dat manquants depuis les règles officielles**

---

## 3. INCOMPATIBILITÉS & DÉCISIONS REQUISES

| Décision | Options | Recommandation |
|----------|---------|----------------|
| Version Ghidra | 11.3.1 (existant) vs 11.4 (nouveau) | **11.4** — plus récente, meilleur support |
| Plugin MCP | GhidraMCP 1.4 vs GhydraMCP 2.x | **GhydraMCP 2.x** — bien supérieur |
| Approche RE | P-Code impossible vs exploration approfondie | **Explorer d'abord** via MCP avant de conclure |
| Architecture cible | Web / Desktop / Hybride | À décider selon résultats Phase B |

---

## 4. FICHIERS CRITIQUES DU PROJET

```
B:\IA_WORKS\2025-01-17_CPR_Rolemaster_Reverse\
├── cpr093.exe                          ← L'exécutable original
├── Etat Final.pdf                      ← Documentation
├── exampleCHARACTERS.pdf               ← Exemples pour validation
├── outputs/
│   ├── strings_found.txt               ← 1380 chaînes (GOLD)
│   ├── decompiled_code.c               ← Quasi-vide (P-Code)
│   └── functions_list.txt              ← 2 fonctions seulement
├── reconstruction/
│   ├── cpr_core.py                     ← Prototype Python
│   ├── cpr_web.html                    ← Prototype Web
│   └── ANALYSE_FONCTIONNELLE.md        ← Doc complète
├── ghidra_project/
│   └── CPR093_Analysis.gpr            ← Projet Ghidra 11.3.1
├── prompts/                            ← Prompts multi-IA (obsolètes?)
└── *.md                                ← Documentation diverse
```

---

## 5. ESTIMATION EFFORT RESTANT

| Phase | Effort | Dépend de |
|-------|--------|-----------|
| A. Infrastructure | 1-2h (utilisateur) | Téléchargements + config |
| B. Exploration MCP | 2-4h (IA + utilisateur) | Phase A terminée |
| C. Reconstruction core | 10-20h | Résultats Phase B |
| D. Interface complète | 15-30h | Phase C |
| E. Validation | 5-10h | Phases C+D |

**Total estimé : 35-65h** (dont ~30h IA-assisté)
