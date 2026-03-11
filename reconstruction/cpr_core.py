# Structure de Base pour CPR093 Moderne

"""
Reconstruction du générateur de personnages Rolemaster
Basé sur l'analyse de CPR093.exe par Eric Lestrade (1997)
Version moderne Python avec interface web possible
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
import json
import random

# Énumérations pour les types
class Langue(Enum):
    FRANCAIS = "fr"
    ANGLAIS = "en"

class Royaume(Enum):
    ESSENCE = "Essence"
    MENTALISME = "Mentalisme"
    CHANNELING = "Channeling"
    ESSENCE_MENTALISME = "Essence/Mentalisme"
    ESSENCE_CHANNELING = "Essence/Channeling"
    MENTALISME_CHANNELING = "Mentalisme/Channeling"
    VARIABLE = "Variable"

class TypeArmure(Enum):
    SANS_ARMURE = "Sans armure"
    CUIR_SOUPLE = "Cuir souple"
    CUIR_RIGIDE = "Cuir rigide"
    MAILLES = "Mailles"
    PLAQUES = "Plaques"

class TypeBouclier(Enum):
    AUCUN = "Aucun"
    TARGE = "Targe"
    RONDACHE = "Rondache"
    PAVOIS = "Pavois"
    MAIN_GAUCHE = "Main Gauche"

# Caractéristiques
CARACTERISTIQUES = {
    "fr": ["Force", "Constitution", "Agilité", "Auto-discipline", "Mémoire", 
           "Raisonnement", "Présence", "Empathie", "Intuition", "Rapidité"],
    "en": ["Strength", "Constitution", "Agility", "Self-Discipline", "Memory",
           "Reasoning", "Presence", "Empathy", "Intuition", "Quickness"]
}

ABREVIATIONS = ["FOR", "CON", "AGI", "AUT", "MEM", "RAI", "PRE", "EMP", "INT", "RAP"]

@dataclass
class Caracteristique:
    nom: str
    abreviation: str
    valeur: int = 50
    bonus_racial: int = 0
    bonus_temp: int = 0
    
    @property
    def valeur_totale(self) -> int:
        return self.valeur + self.bonus_racial + self.bonus_temp
    
    @property
    def bonus(self) -> int:
        """Calcul du bonus selon les règles Rolemaster"""
        val = self.valeur_totale
        if val >= 101:
            return 30 + (val - 101) * 2
        elif val >= 100:
            return 25
        elif val >= 98:
            return 20
        elif val >= 95:
            return 15
        elif val >= 90:
            return 10
        elif val >= 75:
            return 5
        elif val >= 25:
            return 0
        elif val >= 10:
            return -5
        elif val >= 5:
            return -10
        elif val >= 3:
            return -15
        else:
            return -20

@dataclass
class CompetenceRang:
    rangs: int = 0
    bonus_carac: int = 0
    bonus_objet: int = 0
    bonus_special: int = 0
    
    @property
    def bonus_total(self) -> int:
        # Formule simplifiée, la vraie formule Rolemaster est plus complexe
        bonus_rang = 0
        if self.rangs == 0:
            bonus_rang = -25
        elif self.rangs <= 10:
            bonus_rang = self.rangs * 5
        elif self.rangs <= 20:
            bonus_rang = 50 + (self.rangs - 10) * 2
        else:
            bonus_rang = 70 + (self.rangs - 20)
            
        return bonus_rang + self.bonus_carac + self.bonus_objet + self.bonus_special

@dataclass
class Competence:
    nom: str
    categorie: str
    caracteristiques: List[str]  # Liste des caractéristiques associées
    rangs: CompetenceRang = field(default_factory=CompetenceRang)
    cout_developpement: str = "2/7"  # Format "premier rang/rangs suivants"

@dataclass
class ListeSort:
    nom: str
    royaume: Royaume
    type_liste: str  # "Ouverte", "Fermée", "De Base"
    niveau_max_connu: int = 0
    specialisee: bool = False

@dataclass
class Race:
    nom: str
    bonus_carac: Dict[str, int]
    resistance: Dict[str, int]
    capacites_speciales: List[str]
    taille_base: Tuple[int, int]  # (min, max) en cm
    poids_base: Tuple[int, int]  # (min, max) en kg

@dataclass 
class Profession:
    nom: str
    nom_anglais: str
    royaume: Royaume
    carac_principales: List[str]  # 2 caractéristiques principales
    modificateurs_cout: Dict[str, float]
    listes_base: List[str]
    points_vie_par_niveau: int = 5

@dataclass
class Personnage:
    # Identité
    nom: str = ""
    race: Race = None
    profession: Profession = None
    niveau: int = 1
    experience: int = 0
    
    # Caractéristiques
    caracteristiques: Dict[str, Caracteristique] = field(default_factory=dict)
    
    # Points vitaux
    points_de_coup_base: int = 0
    points_de_coup_actuels: int = 0
    points_de_pouvoir_base: int = 0
    points_de_pouvoir_actuels: int = 0
    
    # Combat
    type_armure: TypeArmure = TypeArmure.SANS_ARMURE
    bouclier: TypeBouclier = TypeBouclier.AUCUN
    
    # Compétences
    competences: Dict[str, Competence] = field(default_factory=dict)
    points_developpement_total: int = 0
    points_developpement_depenses: int = 0
    
    # Sorts
    listes_sorts: List[ListeSort] = field(default_factory=list)
    
    # Physique
    taille: int = 170  # cm
    poids: int = 70   # kg
    apparence: int = 50
    
    # Background
    comportement: str = ""
    historique: str = ""
    notes: str = ""
    
    def __post_init__(self):
        if not self.caracteristiques:
            self.initialiser_caracteristiques()
    
    def initialiser_caracteristiques(self, langue: Langue = Langue.FRANCAIS):
        """Initialise les 10 caractéristiques"""
        noms = CARACTERISTIQUES[langue.value]
        for i, nom in enumerate(noms):
            self.caracteristiques[ABREVIATIONS[i]] = Caracteristique(
                nom=nom,
                abreviation=ABREVIATIONS[i],
                valeur=50
            )
    
    def generer_caracteristiques_aleatoires(self):
        """Génère des caractéristiques aléatoires selon la méthode Rolemaster"""
        for carac in self.caracteristiques.values():
            # Tirage 1d100, avec possibilité de dépasser 100
            tirage = random.randint(1, 100)
            if tirage >= 96:  # 5% de chance d'avoir un tirage ouvert
                tirage += random.randint(1, 100)
            carac.valeur = tirage
    
    def calculer_points_de_coup(self):
        """Calcule les points de coup selon la constitution et la profession"""
        bonus_con = self.caracteristiques["CON"].bonus
        base = 25 + bonus_con
        self.points_de_coup_base = base + (self.niveau - 1) * self.profession.points_vie_par_niveau
        self.points_de_coup_actuels = self.points_de_coup_base
    
    def calculer_points_de_pouvoir(self):
        """Calcule les points de pouvoir selon le royaume et les caractéristiques"""
        if not self.profession:
            return
            
        pp_base = 0
        if self.profession.royaume == Royaume.ESSENCE:
            # Moyenne EMP + INT
            pp_base = (self.caracteristiques["EMP"].bonus + 
                      self.caracteristiques["INT"].bonus) // 2
        elif self.profession.royaume == Royaume.MENTALISME:
            # Moyenne PRE + AUT
            pp_base = (self.caracteristiques["PRE"].bonus + 
                      self.caracteristiques["AUT"].bonus) // 2
        elif self.profession.royaume == Royaume.CHANNELING:
            # Moyenne INT + MEM
            pp_base = (self.caracteristiques["INT"].bonus + 
                      self.caracteristiques["MEM"].bonus) // 2
        
        self.points_de_pouvoir_base = pp_base * self.niveau
        self.points_de_pouvoir_actuels = self.points_de_pouvoir_base
    
    def calculer_bonus_defense(self) -> int:
        """Calcule le bonus de défense"""
        # Bonus de rapidité
        bd = self.caracteristiques["RAP"].bonus
        
        # Malus d'armure
        malus_armure = {
            TypeArmure.SANS_ARMURE: 0,
            TypeArmure.CUIR_SOUPLE: -10,
            TypeArmure.CUIR_RIGIDE: -15,
            TypeArmure.MAILLES: -20,
            TypeArmure.PLAQUES: -25
        }
        bd += malus_armure.get(self.type_armure, 0)
        
        # Bonus de bouclier
        bonus_bouclier = {
            TypeBouclier.AUCUN: 0,
            TypeBouclier.TARGE: 5,
            TypeBouclier.RONDACHE: 15,
            TypeBouclier.PAVOIS: 25,
            TypeBouclier.MAIN_GAUCHE: 5
        }
        bd += bonus_bouclier.get(self.bouclier, 0)
        
        return bd
    
    def sauvegarder(self, fichier: str):
        """Sauvegarde le personnage au format JSON"""
        data = {
            "version": "1.0",
            "nom": self.nom,
            "niveau": self.niveau,
            "experience": self.experience,
            "race": self.race.nom if self.race else "",
            "profession": self.profession.nom if self.profession else "",
            "caracteristiques": {
                abr: {
                    "valeur": c.valeur,
                    "bonus_racial": c.bonus_racial,
                    "bonus_temp": c.bonus_temp
                } for abr, c in self.caracteristiques.items()
            },
            "points_de_coup": {
                "base": self.points_de_coup_base,
                "actuels": self.points_de_coup_actuels
            },
            "points_de_pouvoir": {
                "base": self.points_de_pouvoir_base,
                "actuels": self.points_de_pouvoir_actuels
            },
            "equipement": {
                "armure": self.type_armure.value,
                "bouclier": self.bouclier.value
            },
            "physique": {
                "taille": self.taille,
                "poids": self.poids,
                "apparence": self.apparence
            },
            "background": {
                "comportement": self.comportement,
                "historique": self.historique,
                "notes": self.notes
            }
        }
        
        with open(fichier, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    @classmethod
    def charger(cls, fichier: str) -> 'Personnage':
        """Charge un personnage depuis un fichier JSON"""
        with open(fichier, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        perso = cls()
        perso.nom = data.get("nom", "")
        perso.niveau = data.get("niveau", 1)
        perso.experience = data.get("experience", 0)
        
        # Restaurer les caractéristiques
        for abr, values in data.get("caracteristiques", {}).items():
            if abr in perso.caracteristiques:
                perso.caracteristiques[abr].valeur = values.get("valeur", 50)
                perso.caracteristiques[abr].bonus_racial = values.get("bonus_racial", 0)
                perso.caracteristiques[abr].bonus_temp = values.get("bonus_temp", 0)
        
        # Restaurer les points vitaux
        pv = data.get("points_de_coup", {})
        perso.points_de_coup_base = pv.get("base", 0)
        perso.points_de_coup_actuels = pv.get("actuels", 0)
        
        pp = data.get("points_de_pouvoir", {})
        perso.points_de_pouvoir_base = pp.get("base", 0)
        perso.points_de_pouvoir_actuels = pp.get("actuels", 0)
        
        # Restaurer l'équipement
        equip = data.get("equipement", {})
        perso.type_armure = TypeArmure(equip.get("armure", "Sans armure"))
        perso.bouclier = TypeBouclier(equip.get("bouclier", "Aucun"))
        
        # Restaurer le physique
        phys = data.get("physique", {})
        perso.taille = phys.get("taille", 170)
        perso.poids = phys.get("poids", 70)
        perso.apparence = phys.get("apparence", 50)
        
        # Restaurer le background
        bg = data.get("background", {})
        perso.comportement = bg.get("comportement", "")
        perso.historique = bg.get("historique", "")
        perso.notes = bg.get("notes", "")
        
        return perso

# Exemple d'utilisation
if __name__ == "__main__":
    # Créer un personnage
    perso = Personnage()
    perso.nom = "Aragorn"
    
    # Générer des caractéristiques
    perso.generer_caracteristiques_aleatoires()
    
    # Afficher les caractéristiques
    print(f"Personnage: {perso.nom}")
    print("\nCaractéristiques:")
    for abr, carac in perso.caracteristiques.items():
        print(f"{carac.nom:15} ({abr}): {carac.valeur:3} (Bonus: {carac.bonus:+3})")
    
    # Sauvegarder
    perso.sauvegarder("exemple_personnage.json")
