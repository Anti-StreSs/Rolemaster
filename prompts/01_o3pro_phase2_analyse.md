# Prompt pour o3-pro - Phase 2 : Analyse Approfondie

Je travaille sur le reverse engineering d'un générateur de personnages pour le jeu de rôle Rolemaster, appelé CPR093.exe. C'est un logiciel DOS/Windows ancien datant probablement des années 90.

## Contexte
Ghidra a eu des difficultés à décompiler correctement le fichier, ne trouvant que 2 fonctions et affichant des erreurs "bad instruction data". 

## Exports Ghidra disponibles

### Fichier cpr093exe.c (décompilation partielle) :
```c
typedef unsigned char   undefined;

// WARNING: Control flow encountered bad instruction data
void entry(void)
{
  uint *puVar1;
  uint uVar2;
  uint uVar3;
  char extraout_DL;
  int in_BX;
  int unaff_SI;
  
  uVar3 = Ordinal_100();
  puVar1 = (uint *)(in_BX + unaff_SI);
  uVar2 = *puVar1;
  *puVar1 = *puVar1 + uVar3;
  *(char *)(in_BX + unaff_SI) = *(char *)(in_BX + unaff_SI) + extraout_DL + CARRY2(uVar2,uVar3);
  // WARNING: Bad instruction - Truncating control flow here
  halt_baddata();
}
```

### Liste des fonctions (cpr093exefunctions) :
- entry (1000:0010) - 9 bytes
- Ordinal_100 (1310:0000) - 4 bytes

## Questions nécessitant votre expertise

1. **Diagnostic du problème de décompilation** :
   - Quelles sont les causes possibles de cette décompilation incomplète ?
   - Le code suggère-t-il un executable 16-bit DOS, Windows 3.x NE, ou autre ?
   - La présence de "Ordinal_100" indique-t-elle une DLL ou un format spécifique ?

2. **Analyse du code partiel** :
   - Que nous révèle le peu de code décompilé sur la structure du programme ?
   - Les registres utilisés (BX, SI, DL) suggèrent-ils une architecture spécifique ?
   - Y a-t-il des indices de compression/obfuscation ?

3. **Stratégie de reverse engineering** :
   - Quelle serait la meilleure approche pour un executable de cette époque ?
   - Faut-il utiliser des outils spécifiques pour les formats 16-bit ?
   - Comment identifier et traiter un éventuel packer (UPX, PKLITE, etc.) ?

4. **Reconstruction fonctionnelle** :
   - Sachant que c'est un générateur de personnages RPG, quelles structures de données devrait-on s'attendre à trouver ?
   - Quels patterns de code seraient typiques pour ce type d'application ?
   - Comment extraire la logique métier même avec une décompilation partielle ?

5. **Plan d'action technique** :
   - Proposez une séquence d'étapes pour :
     a) Identifier précisément le format de l'executable
     b) Le décompresser/dépacker si nécessaire
     c) L'analyser avec les bons outils/paramètres
     d) Extraire les algorithmes et structures de données
     e) Documenter les fonctionnalités pour reconstruction

Merci de fournir une analyse détaillée avec des recommandations concrètes et des exemples de commandes/outils à utiliser.
