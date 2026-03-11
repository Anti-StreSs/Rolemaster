"""
dat_parser.py — Universal parser for CPR093 Rolemaster data files.

Parses all .dat files from CPR093.exe's DATA directory into structured JSON.
Files are ISO-8859-1 (Latin-1) encoded with CRLF line endings.

Usage:
    python dat_parser.py [data_dir] [output_dir]
    Defaults: data_dir=../data  output_dir=../data/parsed
"""

import json
import os
import re
import sys
from pathlib import Path


def read_file(path: str) -> list[str]:
    """Read a Latin-1 encoded file, return lines stripped of CRLF."""
    with open(path, "r", encoding="latin-1") as f:
        return [line.rstrip("\r\n") for line in f.readlines()]


def unquote(s: str) -> str:
    """Remove surrounding quotes from a string."""
    s = s.strip()
    if s.startswith('"') and s.endswith('"'):
        return s[1:-1]
    return s


def parse_numbers(s: str, sep=None) -> list:
    """Parse a string of numbers (space or comma separated) into float/int list."""
    if sep is None:
        # Auto-detect: comma or space
        if "," in s:
            parts = s.split(",")
        else:
            parts = s.split()
    else:
        parts = s.split(sep)
    result = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        try:
            v = float(p)
            result.append(int(v) if v == int(v) else v)
        except ValueError:
            result.append(p)
    return result


# ---------------------------------------------------------------------------
# CARAC.DAT parser
# ---------------------------------------------------------------------------
def parse_carac(data_dir: str) -> dict:
    """Parse CARAC.DAT: stat tables, body dev, stat bonuses, spells, armor."""
    lines = read_file(os.path.join(data_dir, "CARAC.DAT"))

    result = {
        "stat_roll_table": [],       # 10 rows: cumulative probability table for stat generation
        "body_development": [],      # Body dev hits per level by race tier
        "stat_bonus_table": [],      # Stat value -> bonus mapping (6 segments)
        "power_points_table": [],    # PP multiplier table
        "spell_cost_by_realm": [],   # Cost patterns per realm type
        "armor_penalties": [],       # Armor penalty table
    }

    section = "stat_roll"
    sorts_section = False
    armor_section = False
    realm_tag = None

    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue

        if line_stripped == "[sorts]":
            sorts_section = True
            armor_section = False
            continue
        if line_stripped == "[armures]":
            armor_section = True
            sorts_section = False
            continue

        if armor_section:
            result["armor_penalties"].append(parse_numbers(line_stripped))
            continue

        if sorts_section:
            if line_stripped.startswith("#"):
                realm_tag = int(line_stripped[1:])
                continue
            result["spell_cost_by_realm"].append({
                "realm_id": realm_tag,
                "costs": parse_numbers(line_stripped)
            })
            continue

        # Main tables — sequential sections based on line content patterns
        nums = parse_numbers(line_stripped)
        if not nums:
            continue

        # Lines 1-10: stat roll table (space-separated, values 00-101)
        if len(result["stat_roll_table"]) < 10 and " " in line_stripped and not "." in line_stripped.replace("0.", "X"):
            # Check if all values are integers (stat roll table)
            if all(isinstance(n, int) for n in nums):
                result["stat_roll_table"].append(nums)
                continue

        # Lines 11-16: body development (space-separated floats)
        if len(result["stat_roll_table"]) == 10 and " " in line_stripped:
            if len(result["body_development"]) < 6:
                result["body_development"].append(nums)
                continue

        # Lines 17-22: stat bonus table
        if len(result["body_development"]) >= 4 and " " in line_stripped:
            if len(result["stat_bonus_table"]) < 6:
                result["stat_bonus_table"].append(nums)
                continue

        # Lines 23-26: power points table (space-separated floats)
        if len(result["stat_bonus_table"]) >= 6 and " " in line_stripped:
            result["power_points_table"].append(nums)
            continue

    # Add metadata
    result["_metadata"] = {
        "stat_roll_table_info": "10 rows for 10 stat rolls. Each row = cumulative probability values (38 columns: scores 25-98+). Row N: probability to get at least score X on roll N.",
        "body_development_info": "6 rows of body development hit points per level. Values are floats (e.g., 1.0 = 1 hp/level). Rows correspond to race size tiers.",
        "stat_bonus_info": "6 segments composing the full stat bonus table. Stat values from 1 to 102 map to bonuses from -25 to +30/+91. Concatenate all 6 segments.",
        "power_points_info": "Power point multiplier table, similar structure to stat bonus.",
        "spell_cost_info": "realm_id: 1=non-caster, 2=channeling, 3=essence, 4=mentalism. Costs as comma-separated progression.",
        "armor_penalties_info": "5 armor types x 4 penalty values per row: [min_penalty, max_penalty, bow_penalty, quickness_penalty]. Plus shield row."
    }

    return result


# ---------------------------------------------------------------------------
# CLASSES.DAT + CLASENG.DAT parser
# ---------------------------------------------------------------------------
def parse_classes(data_dir: str) -> dict:
    """Parse CLASSES.DAT (FR names + params) and CLASENG.DAT (EN names)."""
    lines_fr = read_file(os.path.join(data_dir, "CLASSES.DAT"))
    lines_en = read_file(os.path.join(data_dir, "CLASENG.DAT"))

    # Parse EN names
    en_names = []
    for line in lines_en:
        line = line.strip()
        if line:
            en_names.append(unquote(line))

    # Parse FR: first line = count, then mixed inline/multi-line format
    count = int(lines_fr[0].strip())
    classes = []
    i = 1
    class_idx = 0

    while i < len(lines_fr) and class_idx < count:
        line = lines_fr[i].strip()
        if not line:
            i += 1
            continue

        # Check if line starts with a quoted name
        if line.startswith('"'):
            # Try to extract name and inline params
            # Pattern: "Name" param1 param2 ...  OR  "Name" p1,p2,p3,...
            match = re.match(r'"([^"]*)"(.*)', line)
            if match:
                name_fr = match.group(1)
                rest = match.group(2).strip()

                if rest:
                    # Inline params
                    params = parse_numbers(rest)
                else:
                    # Multi-line params — read following lines until next quoted name
                    params = []
                    i += 1
                    while i < len(lines_fr):
                        pline = lines_fr[i].strip()
                        if not pline or pline.startswith('"'):
                            break
                        params.extend(parse_numbers(pline))
                        i += 1
                    # Don't increment i again, the while will handle it
                    i -= 1

                # Interpret params based on known structure:
                # params[0] = type (1=non-caster, 2=semi/pure caster, 3=hybrid)
                # params[1] = realm/spell_type
                # params[2] = prime_stat_1 (1-10)
                # params[3] = num_prime_stats or second prime
                # ... remaining = skill group weights
                en_name = en_names[class_idx] if class_idx < len(en_names) else ""

                cls = {
                    "index": class_idx,
                    "name_fr": name_fr,
                    "name_en": en_name,
                    "raw_params": params,
                }

                if len(params) >= 3:
                    cls["caster_type"] = params[0]  # 1=non, 2=semi/pure, 3=hybrid
                    cls["spell_user_code"] = params[1]
                    cls["realm_code"] = params[2] if len(params) > 2 else None

                classes.append(cls)
                class_idx += 1

        i += 1

    # Decode caster types
    caster_type_map = {1: "Non-Spell User", 2: "Spell User", 3: "Hybrid"}
    realm_map = {
        1: "Arms/No Realm", 2: "Channeling (partial)", 3: "Channeling",
        4: "Essence (partial)", 5: "Essence", 6: "Arms",
        7: "Mentalism/Essence", 8: "Mentalism", 9: "Essence",
        10: "Channeling", 11: "Variable/None"
    }

    for cls in classes:
        ct = cls.get("caster_type")
        if ct in caster_type_map:
            cls["caster_type_name"] = caster_type_map[ct]

    return {
        "total_classes": count,
        "classes": classes,
        "_metadata": {
            "caster_type": "1=Non-Spell User, 2=Spell User (pure/semi), 3=Hybrid",
            "raw_params": "Format varies: [caster_type, spell_code, realm, prime_stats..., skill_groups...]",
            "source": "CLASSES.DAT (FR) + CLASENG.DAT (EN)"
        }
    }


# ---------------------------------------------------------------------------
# COMP.DAT + COMPENGL.DAT parser
# ---------------------------------------------------------------------------
def parse_competences(data_dir: str) -> dict:
    """Parse COMP.DAT (FR skills) and COMPENGL.DAT (EN names)."""
    lines_fr = read_file(os.path.join(data_dir, "COMP.DAT"))
    lines_en = read_file(os.path.join(data_dir, "COMPENGL.DAT"))

    # Parse EN names
    en_names = []
    for line in lines_en:
        line = line.strip()
        if line:
            en_names.append(unquote(line))

    # Category names (from the binary strings analysis)
    category_names = [
        "Academic", "Animal", "Athletic", "Combat", "Deadly",
        "Evaluation", "General", "Gymnastic", "Linguistic",
        "Magical", "Medical", "Perception", "Social", "Subterfuge", "Survival"
    ]

    categories = []
    current_cat_skills = []
    cat_idx = 0
    skill_global_idx = 0

    for line in lines_fr:
        line = line.strip()
        if not line:
            continue

        if line.startswith("*"):
            # End of category
            if current_cat_skills:
                cat_name = category_names[cat_idx] if cat_idx < len(category_names) else f"Category_{cat_idx}"
                categories.append({
                    "index": cat_idx,
                    "name": cat_name,
                    "skills": current_cat_skills
                })
                cat_idx += 1
                current_cat_skills = []
            continue

        if line.startswith('"'):
            match = re.match(r'"([^"]*)"(.*)', line)
            if match:
                name_fr = match.group(1)
                rest = match.group(2).strip()
                params = parse_numbers(rest) if rest else []

                en_name = en_names[skill_global_idx] if skill_global_idx < len(en_names) else ""

                skill = {
                    "index": skill_global_idx,
                    "name_fr": name_fr,
                    "name_en": en_name,
                    "raw_params": params,
                }

                # Decode common param patterns:
                # params[0] = stat_count (0=special, 1=one stat, 2=two stats, 3=three stats)
                # params[1] = primary_stat (1-10 maps to the 10 RM stats)
                # params[2] = secondary_stat (for 2+ stat skills)
                # params[3] = category_code or skill_type
                # params[4] = base_flag
                # Remaining = subskill references
                if len(params) >= 2:
                    skill["stat_count"] = params[0]
                    skill["primary_stat"] = params[1]
                if len(params) >= 3:
                    skill["secondary_stat"] = params[2]
                if len(params) >= 4:
                    skill["skill_type"] = params[3]
                if len(params) >= 5:
                    skill["base_bonus"] = params[4]

                # Subskill references (after base params)
                if len(params) > 5:
                    sub_refs = params[5:]
                    skill["subskill_data"] = sub_refs

                current_cat_skills.append(skill)
                skill_global_idx += 1

    # Don't forget last category if file doesn't end with *
    if current_cat_skills:
        cat_name = category_names[cat_idx] if cat_idx < len(category_names) else f"Category_{cat_idx}"
        categories.append({
            "index": cat_idx,
            "name": cat_name,
            "skills": current_cat_skills
        })

    total_skills = sum(len(c["skills"]) for c in categories)

    # Stat index mapping
    stat_map = {
        1: "Constitution", 2: "Agility", 3: "Self-Discipline",
        4: "Memory", 5: "Reasoning", 6: "Strength",
        7: "Quickness", 8: "Presence", 9: "Empathy",
        10: "Intuition", 11: "Variable/None"
    }

    return {
        "total_skills": total_skills,
        "total_categories": len(categories),
        "categories": categories,
        "_metadata": {
            "stat_map": stat_map,
            "stat_count_meaning": "0=special (weapon/spell/armor), 1=one stat, 2=two stats, 3=three stats",
            "skill_type_meaning": "Category-dependent flag. For combat: weapon type. For magical: spell list type.",
            "source": "COMP.DAT (FR) + COMPENGL.DAT (EN)"
        }
    }


# ---------------------------------------------------------------------------
# SORTS.DAT parser
# ---------------------------------------------------------------------------
def parse_sorts(data_dir: str) -> dict:
    """Parse SORTS.DAT: spell lists organized by realm and type."""
    lines = read_file(os.path.join(data_dir, "SORTS.DAT"))

    # Structure: FR/EN pairs, * = end of group, & = end of realm
    # Realms order: Mentalism Open, Mentalism Closed, Mentalism Evil,
    #   Essence Open, Essence Closed, Essence Evil,
    #   Channeling Open, Channeling Closed, Channeling Evil,
    #   Arcane, Mixed/Other
    realm_names = [
        "Mentalism (Open)", "Mentalism (Closed)", "Mentalism (Evil)",
        "Essence (Open)", "Essence (Closed)", "Essence (Evil)",
        "Channeling (Open)", "Channeling (Closed)", "Channeling (Evil)",
        "Arcane/Other"
    ]

    realms = []
    current_realm_groups = []
    current_group = []
    realm_idx = 0

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        i += 1

        if not line:
            continue

        if line == "&":
            # End of realm — flush current group and realm
            if current_group:
                current_realm_groups.append(current_group)
                current_group = []
            realm_name = realm_names[realm_idx] if realm_idx < len(realm_names) else f"Realm_{realm_idx}"
            realms.append({
                "index": realm_idx,
                "name": realm_name,
                "groups": current_realm_groups
            })
            current_realm_groups = []
            realm_idx += 1
            continue

        if line == "*":
            # End of group within realm
            if current_group:
                current_realm_groups.append(current_group)
                current_group = []
            else:
                # Empty group marker — placeholder for non-existent lists
                current_realm_groups.append([])
            continue

        # Spell list entry: FR name on this line, EN name on next
        name_fr = unquote(line)
        name_en = ""
        if i < len(lines):
            name_en = unquote(lines[i].strip())
            i += 1

        current_group.append({
            "name_fr": name_fr,
            "name_en": name_en
        })

    # Flush final data
    if current_group:
        current_realm_groups.append(current_group)
    if current_realm_groups:
        realm_name = realm_names[realm_idx] if realm_idx < len(realm_names) else f"Realm_{realm_idx}"
        realms.append({
            "index": realm_idx,
            "name": realm_name,
            "groups": current_realm_groups
        })

    total_spells = sum(
        sum(len(g) for g in r["groups"])
        for r in realms
    )

    return {
        "total_spell_lists": total_spells,
        "total_realms": len(realms),
        "realms": realms,
        "_metadata": {
            "structure": "Each realm has groups: [Base Lists, Open Lists, Closed Lists, Evil Lists]. * separates groups, & separates realms.",
            "pair_format": "Each spell list has FR name (odd line) and EN name (even line).",
            "source": "SORTS.DAT"
        }
    }


# ---------------------------------------------------------------------------
# CATEG.DAT + CATEGENG.DAT parser
# ---------------------------------------------------------------------------
def parse_categories(data_dir: str) -> dict:
    """Parse CATEG.DAT (FR) + CATEGENG.DAT (EN): sub-specialty categories."""
    lines_fr = read_file(os.path.join(data_dir, "CATEG.DAT"))
    lines_en = read_file(os.path.join(data_dir, "CATEGENG.DAT"))

    categories = []
    idx = 0

    for line_fr, line_en in zip(lines_fr, lines_en):
        fr = line_fr.strip()
        en = line_en.strip()
        if not fr:
            continue
        if fr == "&" or en == "&":
            break

        # Some entries have * suffix indicating "list-based" subspecialties
        is_list = fr.endswith("*") or en.endswith("*")
        fr = unquote(fr.rstrip("* "))
        en = unquote(en.rstrip("* "))

        categories.append({
            "index": idx,
            "name_fr": fr,
            "name_en": en,
            "is_list_type": is_list
        })
        idx += 1

    return {
        "total_categories": len(categories),
        "categories": categories,
        "_metadata": {
            "is_list_type": "True = subspecialties are chosen from a predefined list (weapons, languages, etc.)",
            "source": "CATEG.DAT (FR) + CATEGENG.DAT (EN)"
        }
    }


# ---------------------------------------------------------------------------
# COUTS.DAT parser
# ---------------------------------------------------------------------------
def parse_couts(data_dir: str) -> dict:
    """Parse COUTS.DAT: development cost matrix per class."""
    lines = read_file(os.path.join(data_dir, "COUTS.DAT"))
    pathclas = read_file(os.path.join(data_dir, "PATHCLAS.DAT"))

    # PATHCLAS.DAT = list of class filenames, one per line
    class_files = [l.strip() for l in pathclas if l.strip()]

    classes_costs = []
    current_class = None
    current_costs = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line.startswith('"[') and line.endswith(']"'):
            # New class header: "[filename.dat]"
            if current_class:
                classes_costs.append({
                    "class_file": current_class,
                    "cost_values": current_costs
                })
            current_class = line[2:-2]  # Remove "[ and ]"
            current_costs = []
            continue

        # Cost values — each line is a single number or comma-separated
        nums = parse_numbers(line)
        current_costs.extend(nums)

    # Flush last class
    if current_class:
        classes_costs.append({
            "class_file": current_class,
            "cost_values": current_costs
        })

    return {
        "total_classes": len(classes_costs),
        "class_files": class_files,
        "classes": classes_costs,
        "_metadata": {
            "structure": "Each class has a [filename.dat] header followed by cost values. Cost values correspond to skills in COMP.DAT order.",
            "cost_encoding": "Values represent development point costs. Pattern varies by skill type: single values for most skills, multi-value for progression costs (e.g., 2/5 = 2 pts for rank 1, 5 for rank 2+).",
            "source": "COUTS.DAT + PATHCLAS.DAT"
        }
    }


# ---------------------------------------------------------------------------
# SIMIL.DAT parser
# ---------------------------------------------------------------------------
def parse_simil(data_dir: str) -> dict:
    """Parse SIMIL.DAT: skill similarity matrix."""
    lines = read_file(os.path.join(data_dir, "SIMIL.DAT"))

    matrix = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        row = parse_numbers(line)
        if row:
            matrix.append(row)

    return {
        "total_rows": len(matrix),
        "matrix": matrix,
        "_metadata": {
            "structure": "Similarity matrix between skill categories. Non-zero values indicate similar skills. Value = similarity weight (higher = more similar). Used for 'similar skill' bonus calculations.",
            "source": "SIMIL.DAT"
        }
    }


# ---------------------------------------------------------------------------
# OPTIONS.DAT + OPTIONSE.DAT + DEFAUT.OPT parser
# ---------------------------------------------------------------------------
def parse_options(data_dir: str) -> dict:
    """Parse OPTIONS.DAT (FR descriptions), OPTIONSE.DAT (EN), DEFAUT.OPT (defaults)."""
    lines_fr = read_file(os.path.join(data_dir, "OPTIONS.DAT"))
    lines_en = read_file(os.path.join(data_dir, "OPTIONSE.DAT"))
    lines_def = read_file(os.path.join(data_dir, "DEFAUT.OPT"))

    # Parse defaults
    defaults = []
    for line in lines_def:
        line = line.strip()
        if line:
            try:
                defaults.append(int(line))
            except ValueError:
                defaults.append(line)

    # Parse FR options: "reference","description",type
    options = []
    for idx, line in enumerate(lines_fr):
        line = line.strip()
        if not line:
            continue

        # Format: "ref","description",type_code
        parts = []
        in_quote = False
        current = ""
        for ch in line:
            if ch == '"':
                in_quote = not in_quote
            elif ch == ',' and not in_quote:
                parts.append(current.strip().strip('"'))
                current = ""
                continue
            current += ch
        parts.append(current.strip().strip('"'))

        if len(parts) >= 3:
            ref = parts[0]
            desc_fr = parts[1]
            try:
                opt_type = int(parts[2])
            except ValueError:
                opt_type = parts[2]
        elif len(parts) == 2:
            ref = parts[0]
            desc_fr = parts[1]
            opt_type = 0
        else:
            continue

        # Get EN description
        en_line = lines_en[idx].strip() if idx < len(lines_en) else ""
        desc_en = unquote(en_line.strip("<>"))

        default_val = defaults[idx] if idx < len(defaults) else None

        options.append({
            "index": idx,
            "reference": ref,
            "description_fr": desc_fr,
            "description_en": desc_en,
            "type": opt_type,
            "default_value": default_val
        })

    # Type meanings (from analysis):
    # 1 = checkbox (simple on/off)
    # 2 = radio button option (sub-option of a group)
    # 3 = special select
    # 4 = group header (parent of sub-options)
    # 6 = disabled/not implemented
    # 8 = numeric input
    # 9 = special value

    return {
        "total_options": len(options),
        "options": options,
        "_metadata": {
            "type_codes": {
                "1": "Checkbox (on/off)",
                "2": "Radio option (child of group header)",
                "3": "Special selection",
                "4": "Group header (parent)",
                "6": "Disabled / not implemented",
                "8": "Numeric input bonus",
                "9": "Special numeric value"
            },
            "default_values": "-1=disabled, 0+=selected option index, -N=special",
            "source": "OPTIONS.DAT (FR) + OPTIONSE.DAT (EN) + DEFAUT.OPT (defaults)"
        }
    }


# ---------------------------------------------------------------------------
# DEFAUT.MND / DEFAUTEN.MND parser
# ---------------------------------------------------------------------------
def parse_monde(data_dir: str) -> dict:
    """Parse DEFAUT.MND (FR) and DEFAUTEN.MND (EN): default world configuration."""
    result = {}

    for lang, filename in [("fr", "DEFAUT.MND"), ("en", "DEFAUTEN.MND")]:
        lines = read_file(os.path.join(data_dir, filename))

        # World file structure: weapon categories with individual weapons
        # "Category Name"
        # weapon_type_code
        # "Weapon 1"
        # "Weapon 2"
        # "*" = end of category
        # Then race data, etc.

        weapon_categories = []
        current_cat = None
        current_weapons = []
        i = 0

        while i < len(lines):
            line = lines[i].strip()
            i += 1

            if not line:
                continue

            if line == '"*"' or line == "*":
                # End of current weapon category
                if current_cat:
                    weapon_categories.append({
                        "name": current_cat["name"],
                        "type_code": current_cat.get("type_code"),
                        "weapons": current_weapons
                    })
                current_cat = None
                current_weapons = []
                continue

            if line.startswith('"') and current_cat is None:
                # New category or weapon name
                name = unquote(line)
                # Next line should be type code (integer)
                if i < len(lines):
                    next_line = lines[i].strip()
                    try:
                        type_code = int(next_line)
                        i += 1
                        current_cat = {"name": name, "type_code": type_code}
                        continue
                    except ValueError:
                        pass

                # If we have a current category, this is a weapon
                if current_cat is None:
                    current_cat = {"name": name}
                continue

            if current_cat and line.startswith('"'):
                weapon_name = unquote(line)
                current_weapons.append(weapon_name)
                continue

            # Non-quoted line while in a category = could be data
            if current_cat is None and not line.startswith('"'):
                # This might be race/other data after weapons section
                break

        # Store remaining lines as "extra_data"
        remaining = [l.strip() for l in lines[i-1:] if l.strip()]

        result[lang] = {
            "weapon_categories": weapon_categories,
            "remaining_lines_count": len(remaining),
        }

    return {
        "fr": result["fr"],
        "en": result["en"],
        "_metadata": {
            "structure": "Weapon categories with type codes and individual weapon lists. '*' terminates each category. After weapons: race data, special abilities, etc.",
            "type_codes": "1=One-Handed Edged, 2=One-Handed Concussion, 3=Two-Handed, 4=Pole Arms, 5=Missile, 6=Thrown",
            "source": "DEFAUT.MND (FR) + DEFAUTEN.MND (EN)"
        }
    }


# ---------------------------------------------------------------------------
# RCP.INI parser
# ---------------------------------------------------------------------------
def parse_ini(data_dir: str) -> dict:
    """Parse RCP.INI: user configuration."""
    lines = read_file(os.path.join(data_dir, "RCP.INI"))

    # Known fields based on analysis:
    field_names = [
        "language",         # 0=FR, 1=EN
        "font_name",
        "font_bold",        # 0/1
        "background_type",  # 0=none, 1=bmp
        "font_size_small",
        "font_size_large",
        "auto_draw",        # 0/1
        "spell_acquisition", # 0/1
        "user_name",
        "user_email",
        "body_dev_option",
        "bonus_dev_option",
        "default_world_idx",
        "world_path",
        "print_option1",
        "print_option2",
        "print_option3",
        "print_option4",
        "print_option5",
    ]

    config = {}
    for idx, line in enumerate(lines):
        val = line.strip()
        val = unquote(val) if val.startswith('"') else val
        key = field_names[idx] if idx < len(field_names) else f"field_{idx}"
        config[key] = val

    return config


# ---------------------------------------------------------------------------
# Main: run all parsers and save JSON
# ---------------------------------------------------------------------------
def main():
    # Resolve paths
    script_dir = Path(__file__).parent
    default_data = script_dir.parent / "data"
    default_output = script_dir.parent / "data" / "parsed"

    data_dir = sys.argv[1] if len(sys.argv) > 1 else str(default_data)
    output_dir = sys.argv[2] if len(sys.argv) > 2 else str(default_output)

    os.makedirs(output_dir, exist_ok=True)

    parsers = {
        "carac_tables.json": ("CARAC.DAT", parse_carac),
        "classes.json": ("CLASSES.DAT + CLASENG.DAT", parse_classes),
        "competences.json": ("COMP.DAT + COMPENGL.DAT", parse_competences),
        "sorts.json": ("SORTS.DAT", parse_sorts),
        "categories.json": ("CATEG.DAT + CATEGENG.DAT", parse_categories),
        "couts.json": ("COUTS.DAT + PATHCLAS.DAT", parse_couts),
        "simil.json": ("SIMIL.DAT", parse_simil),
        "options.json": ("OPTIONS.DAT + OPTIONSE.DAT + DEFAUT.OPT", parse_options),
        "monde_defaut.json": ("DEFAUT.MND + DEFAUTEN.MND", parse_monde),
        "config.json": ("RCP.INI", parse_ini),
    }

    print(f"Data directory: {data_dir}")
    print(f"Output directory: {output_dir}")
    print()

    for output_file, (source, parser_fn) in parsers.items():
        try:
            print(f"Parsing {source}...", end=" ")
            result = parser_fn(data_dir)
            output_path = os.path.join(output_dir, output_file)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"OK -> {output_file}")
        except FileNotFoundError as e:
            print(f"SKIP (file not found: {e})")
        except Exception as e:
            print(f"ERROR: {e}")

    print(f"\nDone! {len(parsers)} files processed.")


if __name__ == "__main__":
    main()
