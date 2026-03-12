// Equipment engine — armor types and penalties

import { getData } from './data-loader.js';

// Armor types (indices match armor_penalties rows)
export const ARMOR_TYPES = [
  { id: 0, key: 'none' },
  { id: 1, key: 'leather' },
  { id: 2, key: 'rigid' },
  { id: 3, key: 'chain' },
  { id: 4, key: 'plate' },
];

/**
 * Get armor penalties for a given armor type.
 * Returns an array of penalty values.
 */
export function getArmorPenalties(armorTypeId) {
  const penalties = getData().carac_tables.armor_penalties;
  if (armorTypeId >= 0 && armorTypeId < penalties.length) {
    return penalties[armorTypeId];
  }
  return penalties[0]; // Default: no armor
}

/**
 * Get shield penalties (last row of armor_penalties).
 */
export function getShieldPenalties() {
  const penalties = getData().carac_tables.armor_penalties;
  return penalties[penalties.length - 1];
}
