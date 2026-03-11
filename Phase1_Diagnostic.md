# Phase 1 - Analyse Diagnostic CPR093.exe

## 1. Analyse Initiale

D'après les exports Ghidra disponibles :
- Le fichier semble être un executable problématique pour Ghidra
- Seules 2 fonctions ont été identifiées : `entry` et `Ordinal_100`
- La décompilation montre des "bad instruction data"

## 2. Hypothèses sur le problème

### Possibilité 1 : Executable DOS 16-bit
- Ghidra peut avoir des difficultés avec les vieux executables DOS
- Les segments 16-bit ne sont pas toujours bien gérés

### Possibilité 2 : Compression/Packing
- L'executable pourrait être compressé avec UPX, PKLITE ou autre
- Cela expliquerait le peu de code décompilé

### Possibilité 3 : Format NE/LE (New Executable)
- Windows 3.x utilisait ce format
- La mention "Ordinal_100" suggère une DLL ou un format Windows ancien

## 3. Actions Recommandées

### Étape 1 : Identifier le type d'executable
```batch
REM Créer un script check_exe.bat
@echo off
echo Analyse de CPR093.exe
echo ==================

REM Vérifier avec file (si disponible via WSL/Cygwin)
REM file CPR093.exe

REM Extraire les strings
strings -n 8 CPR093.exe > cpr093_strings.txt

REM Chercher des signatures de packers
findstr /i "UPX PKLITE PKLite" CPR093.exe

REM Vérifier l'entête
debug CPR093.exe < check_header.txt
```

### Étape 2 : Si l'executable est packé
1. Utiliser UPX pour décompresser : `upx -d CPR093.exe -o CPR093_unpacked.exe`
2. Ou utiliser un unpacker générique

### Étape 3 : Configuration Ghidra appropriée
1. Créer un nouveau projet
2. Lors de l'import :
   - Format : x86 16-bit Real Mode
   - Language : x86:LE:16:Real Mode
   - Base Address : 1000:0000 (typique DOS)
3. Activer l'analyse des segments DOS

## 4. Script d'extraction des ressources

```python
# extract_resources.py
import os
import subprocess
import struct

def extract_strings(exe_path, output_path):
    """Extrait toutes les chaînes ASCII du fichier"""
    cmd = f'strings -n 5 "{exe_path}" > "{output_path}"'
    os.system(cmd)
    
def check_exe_format(exe_path):
    """Vérifie le format de l'executable"""
    with open(exe_path, 'rb') as f:
        header = f.read(2)
        if header == b'MZ':
            print("Format DOS MZ détecté")
            # Vérifier si c'est un stub DOS pour Windows
            f.seek(0x3C)
            pe_offset = struct.unpack('<I', f.read(4))[0]
            f.seek(pe_offset)
            pe_sig = f.read(2)
            if pe_sig == b'PE':
                print("Format PE (Windows 32/64 bits)")
            elif pe_sig == b'NE':
                print("Format NE (Windows 16 bits)")
            elif pe_sig == b'LE':
                print("Format LE (DOS Extender)")
        else:
            print(f"Format inconnu : {header}")

def analyze_packing(exe_path):
    """Cherche des signatures de packers connus"""
    signatures = {
        b'UPX': 'UPX',
        b'PKLITE': 'PKLITE',
        b'PKWARE': 'PKWARE',
        b'WWP': 'WWPACK'
    }
    
    with open(exe_path, 'rb') as f:
        data = f.read()
        for sig, name in signatures.items():
            if sig in data:
                print(f"Packer détecté : {name}")
                return name
    return None

# Utilisation
if __name__ == "__main__":
    exe_path = r"B:\Ghidra\CPR093.exe"  # À ajuster
    check_exe_format(exe_path)
    packer = analyze_packing(exe_path)
    if packer:
        print(f"L'executable est compressé avec {packer}")
    extract_strings(exe_path, "cpr093_strings.txt")
```

## 5. Prochaines Étapes

1. Exécuter les analyses ci-dessus
2. Si packé : décompresser avant Ghidra
3. Recharger dans Ghidra avec les bons paramètres
4. Extraire toutes les fonctions et ressources
5. Passer à la Phase 2 avec o3-pro

## Notes pour l'utilisateur

- Localiser d'abord le fichier CPR093.exe original
- Installer les outils nécessaires : strings, UPX, Resource Hacker
- Documenter chaque découverte dans ce dossier
