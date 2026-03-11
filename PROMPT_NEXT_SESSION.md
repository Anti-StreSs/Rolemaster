# PROMPT — Prochaine Session CPR093

> **Infrastructure : Ghidra 12.0.4 + GhidrAssistMCP (MCP natif)**

---

## Prérequis utilisateur (AVANT la session)

### 1. Télécharger GhidrAssistMCP
```
Depuis : https://github.com/jtang613/GhidrAssistMCP/releases
   ou  : https://github.com/symgraph/GhidrAssistMCP/releases
Placer le ZIP dans : B:\MCP\ghidra\downloads\
```

### 2. Exécuter le script de setup
```
Double-cliquer : B:\MCP\ghidra\SETUP_GHIDRASSISTMCP_CPR093.bat
```

### 3. Configurer Ghidra
```
1. Lancer B:\Ghidra\ghidra_12.0.4_PUBLIC_20260303\ghidraRun.bat
2. File > Configure > Configure Plugins > cocher GhidrAssistMCP
3. Window > GhidrAssistMCP > Host=localhost, Port=8080 > Enable
4. File > Import > B:\IA_WORKS\2025-01-17_CPR_Rolemaster_Reverse\cpr093.exe
5. Ouvrir dans CodeBrowser, accepter l'auto-analyse
6. Vérifier : http://localhost:8080/sse répond dans un navigateur
```

### 4. Vérification
```
- Ghidra 12.0.4 ouvert avec CPR093.exe ✓
- GhidrAssistMCP actif (Window > GhidrAssistMCP montre "Running") ✓
- http://localhost:8080/sse accessible ✓
```

---

## Mode A : Claude Code (RECOMMANDÉ)

```bash
cd B:\IA_WORKS\2025-01-17_CPR_Rolemaster_Reverse
claude
/ghidra-scan
```

### Commandes disponibles
| Commande | Action |
|----------|--------|
| `/ghidra-scan` | Exploration complète (34 outils) |
| `/extract-strings` | Extraction et catégorisation des chaînes |
| `/map-imports` | Analyse des ordinals VBRUN300 |
| `/checkpoint` | Sauvegarde de l'état |
| `/plan [tâche]` | Planifier avant d'implémenter |
| `/commit` | Git commit |

### Tâches idéales pour Claude Code
- Toute interaction Ghidra MCP
- Scripts Python (reconstruction/)
- Parsing de données, JSON structurés
- Tests unitaires et validation
- Git workflow

---

## Mode B : Claude Desktop (support)

Pour la revue PDF, la planification stratégique, la recherche web approfondie.

---

## Workflow recommandé

```
1. Claude Code : /ghidra-scan → extraction complète
2. Claude Code : /map-imports → analyse VBRUN300
3. Claude Code : /extract-strings → strings catégorisées
4. Claude Code : /checkpoint → sauvegarde
5. Claude Desktop : revue des résultats + décisions
6. Claude Code : /plan [module] → planification
7. Claude Code : implémentation
8. Claude Code : /checkpoint + /commit
```

---

## Note technique : GhidrAssistMCP vs ancien GhidraMCP

| | GhidraMCP 1.4 (ancien) | GhidrAssistMCP v2.0 |
|---|---|---|
| Ghidra | 11.3.2 seulement | 11.4+ / 12.x |
| MCP | Bridge Python externe | Natif dans Ghidra |
| Outils | ~25 | 34 |
| Formats code | Décompilation seule | Décompilation + Disassembly + P-Code |
| Resources | Non | 5 resources MCP |
| Prompts | Non | 5 prompts d'analyse |
| Multi-programme | Non | Oui |
| Async | Non | Oui |
| Caching | Non | Oui |
