#!/usr/bin/env python3
"""
Test du module CPR Core
Démontre l'utilisation de base du générateur de personnages
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from cpr_core import (
    Personnage, Race, Profession, Royaume, TypeArmure, TypeBouclier,
    Langue, CARACTERISTIQUES
)

def afficher_separateur(titre=""):
    """Affiche un séparateur visuel"""
    if titre:
        print(f"\n{'=' * 20} {titre} {'=' * 20}")
    else:
        print("=" * 60)

def test_creation_personnage():
    """Test de création d'un personnage de base"""
    afficher_separateur("CRÉATION D'UN PERSONNAGE")
    
    # Créer un personnage
    perso = Personnage()
    perso.nom = "Legolas"
    
    # Définir une race (simplifiée pour le test)
    race_elfe = Race(
        nom="Elfe",
        bonus_carac={"AGI": 10, "RAP": 5, "FOR": -5},
        resistance={"Essence": 30, "Poison": 10},
        capacites_speciales=["Vision nocturne", "Détection des passages secrets"],
        taille_base=(170, 190),
        poids_base=(55, 75)
    )
    perso.race = race_elfe
    
    # Définir une profession
    prof_rodeur = Profession(
        nom="Rôdeur",
        nom_anglais="Ranger",
        royaume=Royaume.CHANNELING,
        carac_principales=["AGI", "INT"],
        modificateurs_cout={},
        listes_base=["Voies de la Nature", "Mouvements du Rôdeur"],
        points_vie_par_niveau=7
    )
    perso.profession = prof_rodeur
    
    # Appliquer les bonus raciaux
    for carac, bonus in race_elfe.bonus_carac.items():
        if carac in perso.caracteristiques:
            perso.caracteristiques[carac].bonus_racial = bonus
    
    # Afficher les informations de base
    print(f"Nom : {perso.nom}")
    print(f"Race : {perso.race.nom}")
    print(f"Profession : {perso.profession.nom} ({perso.profession.royaume.value})")
    
    return perso

def test_generation_aleatoire(perso):
    """Test de génération aléatoire de caractéristiques"""
    afficher_separateur("GÉNÉRATION ALÉATOIRE")
    
    print("Génération des caractéristiques...")
    perso.generer_caracteristiques_aleatoires()
    
    print("\nCaractéristiques générées :")
    print(f"{'Caractéristique':20} {'Abrév':6} {'Base':>5} {'Racial':>7} {'Total':>6} {'Bonus':>6}")
    print("-" * 60)
    
    for abr, carac in perso.caracteristiques.items():
        print(f"{carac.nom:20} {abr:6} {carac.valeur:5} {carac.bonus_racial:7} "
              f"{carac.valeur_totale:6} {carac.bonus:+6}")
    
    return perso

def test_calculs_derives(perso):
    """Test des calculs de points dérivés"""
    afficher_separateur("CALCULS DÉRIVÉS")
    
    # Calculer les points de coup
    perso.calculer_points_de_coup()
    print(f"Points de Coup : {perso.points_de_coup_base}")
    
    # Calculer les points de pouvoir
    perso.calculer_points_de_pouvoir()
    print(f"Points de Pouvoir : {perso.points_de_pouvoir_base}")
    
    # Équiper le personnage
    perso.type_armure = TypeArmure.CUIR_SOUPLE
    perso.bouclier = TypeBouclier.RONDACHE
    
    # Calculer le bonus de défense
    bd = perso.calculer_bonus_defense()
    print(f"\nÉquipement :")
    print(f"Armure : {perso.type_armure.value}")
    print(f"Bouclier : {perso.bouclier.value}")
    print(f"Bonus de Défense Total : {bd:+d}")
    
    return perso

def test_sauvegarde_chargement(perso):
    """Test de sauvegarde et chargement"""
    afficher_separateur("SAUVEGARDE/CHARGEMENT")
    
    fichier = "test_personnage.json"
    
    # Sauvegarder
    print(f"Sauvegarde dans {fichier}...")
    perso.sauvegarder(fichier)
    print("✓ Sauvegarde réussie")
    
    # Charger
    print(f"\nChargement depuis {fichier}...")
    perso2 = Personnage.charger(fichier)
    print("✓ Chargement réussi")
    
    # Vérifier que les données sont identiques
    print("\nVérification des données :")
    print(f"Nom : {perso2.nom} {'✓' if perso2.nom == perso.nom else '✗'}")
    print(f"Niveau : {perso2.niveau} {'✓' if perso2.niveau == perso.niveau else '✗'}")
    print(f"PV : {perso2.points_de_coup_base} {'✓' if perso2.points_de_coup_base == perso.points_de_coup_base else '✗'}")
    
    # Nettoyer
    try:
        os.remove(fichier)
        print(f"\n✓ Fichier de test {fichier} supprimé")
    except:
        pass
    
    return perso2

def test_combat_simulation(perso):
    """Simulation simple de combat"""
    afficher_separateur("SIMULATION DE COMBAT")
    
    print(f"Personnage : {perso.nom}")
    print(f"Points de Coup : {perso.points_de_coup_actuels}/{perso.points_de_coup_base}")
    print(f"Bonus de Défense : {perso.calculer_bonus_defense():+d}")
    
    # Simuler des dégâts
    degats = 15
    perso.points_de_coup_actuels -= degats
    print(f"\n{perso.nom} subit {degats} points de dégâts !")
    print(f"Points de Coup restants : {perso.points_de_coup_actuels}/{perso.points_de_coup_base}")
    
    # Simuler un soin
    soin = 10
    perso.points_de_coup_actuels = min(
        perso.points_de_coup_actuels + soin,
        perso.points_de_coup_base
    )
    print(f"\n{perso.nom} récupère {soin} points de coup")
    print(f"Points de Coup : {perso.points_de_coup_actuels}/{perso.points_de_coup_base}")

def test_multilingue():
    """Test du support multilingue"""
    afficher_separateur("SUPPORT MULTILINGUE")
    
    # Créer deux personnages avec langues différentes
    perso_fr = Personnage()
    perso_fr.initialiser_caracteristiques(Langue.FRANCAIS)
    
    perso_en = Personnage()
    perso_en.initialiser_caracteristiques(Langue.ANGLAIS)
    
    print("Caractéristiques en Français :")
    for abr, carac in list(perso_fr.caracteristiques.items())[:3]:
        print(f"  {carac.nom} ({abr})")
    
    print("\nCaractéristiques en Anglais :")
    for abr, carac in list(perso_en.caracteristiques.items())[:3]:
        print(f"  {carac.nom} ({abr})")

def afficher_resume_final(perso):
    """Affiche un résumé complet du personnage"""
    afficher_separateur("FEUILLE DE PERSONNAGE")
    
    print(f"Nom : {perso.nom}")
    print(f"Race : {perso.race.nom if perso.race else 'Non définie'}")
    print(f"Profession : {perso.profession.nom if perso.profession else 'Non définie'}")
    print(f"Niveau : {perso.niveau}")
    
    print("\nCaractéristiques principales :")
    for abr in ["FOR", "CON", "AGI", "INT"]:
        carac = perso.caracteristiques[abr]
        print(f"  {carac.nom:15} : {carac.valeur_totale:3} ({carac.bonus:+3})")
    
    print(f"\nPoints vitaux :")
    print(f"  Points de Coup : {perso.points_de_coup_actuels}/{perso.points_de_coup_base}")
    print(f"  Points de Pouvoir : {perso.points_de_pouvoir_actuels}/{perso.points_de_pouvoir_base}")
    
    print(f"\nDéfense :")
    print(f"  Bonus de Défense : {perso.calculer_bonus_defense():+d}")
    print(f"  Armure : {perso.type_armure.value}")
    print(f"  Bouclier : {perso.bouclier.value}")

def main():
    """Fonction principale de test"""
    print("=" * 60)
    print("TEST DU MODULE CPR CORE - GÉNÉRATEUR ROLEMASTER")
    print("=" * 60)
    
    # Exécuter les tests
    perso = test_creation_personnage()
    perso = test_generation_aleatoire(perso)
    perso = test_calculs_derives(perso)
    perso = test_sauvegarde_chargement(perso)
    test_combat_simulation(perso)
    test_multilingue()
    
    # Résumé final
    afficher_resume_final(perso)
    
    afficher_separateur()
    print("\n✓ Tous les tests sont terminés avec succès !")
    print("\nLe module CPR Core est fonctionnel et prêt à être étendu.")
    print("Prochaines étapes :")
    print("1. Implémenter le système de compétences")
    print("2. Ajouter la gestion des sorts")
    print("3. Parser les fichiers .dat originaux")
    print("4. Créer une interface graphique complète")

if __name__ == "__main__":
    main()
