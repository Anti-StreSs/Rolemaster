// text-format.js — Format combat result text for display
// Replaces OCR artifacts and symbols from Arms Law critical/fumble tables

const CRIT_SYMBOL_MAP_FR = {
  '∑':  ' sonné ',
  '∏':  ' (pas de parade)',
  '∫':  ' saignement/',
  'π':  ' (doit parer)',
  '+H': ' PdC sup.',
  'rnd':  ' round',
  'rnds': ' rounds',
  'foe':  'adversaire',
  'Foe':  'Adversaire',
};

/**
 * Format a critical or fumble raw text for display.
 * Replaces OCR symbols, translates common English terms, appends structured effects.
 * @param {string} rawText - Raw text from combat table entry
 * @param {object|null} parsedEffects - Parsed effect object (bonus_hits, stun_rounds, etc.)
 * @param {string} lang - 'fr' or 'en'
 * @returns {string} formatted text
 */
export function formatCriticalText(rawText, parsedEffects, lang) {
  if (!rawText) return '';
  let text = rawText;

  if (lang === 'fr') {
    for (const [sym, replacement] of Object.entries(CRIT_SYMBOL_MAP_FR)) {
      text = text.replaceAll(sym, replacement);
    }
  }

  // Build structured effect summary
  const parts = [];
  if (parsedEffects) {
    if (parsedEffects.bonus_hits)
      parts.push(lang === 'fr' ? `+${parsedEffects.bonus_hits} PdC` : `+${parsedEffects.bonus_hits} hits`);
    if (parsedEffects.stun_rounds)
      parts.push(lang === 'fr' ? `Sonné ${parsedEffects.stun_rounds} round${parsedEffects.stun_rounds > 1 ? 's' : ''}` : `Stunned ${parsedEffects.stun_rounds} rnd${parsedEffects.stun_rounds > 1 ? 's' : ''}`);
    if (parsedEffects.bleed_per_round)
      parts.push(lang === 'fr' ? `Saigne ${parsedEffects.bleed_per_round}/round` : `Bleed ${parsedEffects.bleed_per_round}/rnd`);
    if (parsedEffects.unconscious)
      parts.push(lang === 'fr' ? 'Inconscient' : 'Unconscious');
    if (parsedEffects.dead)
      parts.push(lang === 'fr' ? '☠ MORT' : '☠ DEAD');
    if (parsedEffects.notes && parsedEffects.notes.length)
      parts.push(parsedEffects.notes.join(', '));
  }

  const effectLine = parts.length > 0 ? ` → ${parts.join(' | ')}` : '';
  return text.trim() + effectLine;
}
