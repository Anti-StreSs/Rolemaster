// Background generation — size, appearance, age, languages
// Source: RM2 Classic Table 04-03 (Size), racial descriptions, Batch 6 instructions

// --- Size Table 04-03 ---
// Each entry: [rollMin, rollMax, {race: [heightInches, weightLbs]}]
// Heights in inches, weights in lbs — converted to cm/kg on output
const SIZE_TABLE = [
  [-999, -221, { cm: [147,178,119,74,114,259], kg: [56,59,45,18,37,200] }], // <(-220)
  [-220, -191, { cm: [147,175,119,74,114,259], kg: [57,59,45,18,37,200] }],
  [-190, -181, { cm: [150,175,119,76,114,261], kg: [58,59,45,19,37,202] }],
  [-180, -161, { cm: [152,178,122,79,117,264], kg: [59,61,48,20,39,204] }],
  [-160, -91,  { cm: [155,178,122,81,117,267], kg: [61,61,48,21,40,207] }],
  [-90,  -81,  { cm: [157,180,124,84,119,269], kg: [62,64,50,22,41,209] }],
  [-80,  -66,  { cm: [160,180,124,86,119,272], kg: [64,64,50,23,43,212] }],
  [-65,  -40,  { cm: [163,183,127,89,122,274], kg: [66,66,52,24,44,216] }],
  [-40,  5,    { cm: [165,183,127,91,122,277], kg: [68,66,52,25,45,220] }],
  [6,    8,    { cm: [168,185,130,94,124,279], kg: [69,68,54,26,47,223] }],
  [9,    14,   { cm: [170,188,130,97,127,284], kg: [71,70,54,28,48,231] }],
  [15,   25,   { cm: [173,188,132,99,127,287], kg: [73,70,56,29,50,235] }],
  [26,   40,   { cm: [175,191,132,102,130,292], kg: [75,73,56,30,52,240] }],
  [41,   55,   { cm: [178,191,135,104,132,295], kg: [77,73,59,31,53,244] }],
  [56,   65,   { cm: [180,193,137,107,135,300], kg: [80,75,61,32,55,249] }],
  [66,   70,   { cm: [183,196,137,109,137,305], kg: [82,77,61,34,57,254] }],
  [71,   80,   { cm: [185,198,140,112,140,310], kg: [84,80,63,35,59,258] }],
  [81,   90,   { cm: [188,201,140,114,142,315], kg: [86,82,63,36,61,263] }],
  [91,   120,  { cm: [191,203,142,117,145,320], kg: [89,84,66,37,63,267] }],
  [121,  150,  { cm: [193,206,145,119,147,328], kg: [91,86,68,39,66,276] }],
  [151,  190,  { cm: [196,208,147,122,150,335], kg: [95,89,70,41,68,285] }],
  [191,  220,  { cm: [198,211,150,124,152,343], kg: [98,91,73,43,70,294] }],
  [221,  250,  { cm: [201,213,150,127,155,348], kg: [100,93,75,44,72,303] }],
  [251,  290,  { cm: [206,216,152,130,160,356], kg: [105,98,77,46,75,317] }],
  [291,  320,  { cm: [213,221,152,127,170,366], kg: [113,104,80,45,74,372] }],
  [321,  999,  { cm: [213,221,152,127,170,366], kg: [113,104,80,45,74,372] }],
];
// Column indices: 0=CommonMen, 1=Elves, 2=Dwarves, 3=Halfling, 4=LesserOrcs, 5=Trolls
const SIZE_COLUMNS = ['Common Men', 'Elves', 'Dwarves', 'Halfling', 'Lesser Orcs', 'Trolls'];

// Race → size column mapping
const RACE_SIZE_COLUMN = {
  'Sans Race': 0, 'Homme Commun': 0, 'Surhomme': 0,
  "Tribus de l'Ours": 0, 'Tribus des Ténèbres': 0,
  'Nordique': 0, 'Homme Artique': 0, 'Homme Métis': 0,
  'Homme des Bois': 0, 'Dunedain': 0, 'Homme urbain': 0, 'Numénoréen': 0,
  'Semi-Elfes': 0, 'Semi-Elfes B': 0, 'Semi-Elfes C': 0,
  'Semi-Elfes D': 0, 'Semi-Elfes E': 0, 'Semi-Elfes F': 5,
  'Elfe des Bois': 1, 'Grand Elfe': 1, 'Elfe Clair': 1,
  'Elfe Gris': 1, 'Elfe des Ténèbres': 1, 'Elfe Aquatique': 1, 'Elfe Noldor': 1,
  'Homme Demon': 0, 'Elfe Demon': 1,
  'Azurien (extraplanaire)': 1, 'Draakh': 0,
  'Voyageur planaire': 0, 'Hengeyokai renard': 0,
  'Semi-Nain': 2, 'Nain': 2,
  'Semi-Homme': 3, 'Hobbit Pieds velus': 3, 'Hobbit Fort': 3,
  'Semi-Orque': 4, 'Orque Inférieur': 4, 'Orque Supérieur': 4,
  'Orque Seigneur': 4, 'Gobelin': 4,
  'Gremlin': 3, 'Sylphe': 3, 'Satyre': 0, 'Nymphe': 0, 'Gnome': 3, 'Fee': 3,
  'Semi-Ogres': 5, 'Semi-Trolls': 5, 'Trolls': 5,
  'Grands Hommes': 5, 'Olog-Hai': 5, 'Semi-Ogres II': 5,
};

// --- Appearance data by race ---
const RACE_APPEARANCE = {
  'Homme Commun':     { hair: ['Bruns','Châtains','Noirs','Blonds'], eyes: ['Bruns','Noisette','Bleus','Verts'], mod: 0 },
  'Sans Race':        { hair: ['Bruns','Châtains','Noirs','Blonds'], eyes: ['Bruns','Noisette','Bleus','Verts'], mod: 0 },
  'Surhomme':         { hair: ['Bruns','Noirs','Auburn'], eyes: ['Gris','Bleus','Bruns'], mod: 5 },
  'Nordique':         { hair: ['Blonds','Roux','Châtain clair'], eyes: ['Bleus','Gris','Verts'], mod: 0 },
  'Homme Artique':    { hair: ['Noirs','Bruns foncé'], eyes: ['Bruns','Noirs'], mod: 0 },
  "Tribus de l'Ours": { hair: ['Bruns','Roux','Auburn'], eyes: ['Bruns','Verts'], mod: -5 },
  'Tribus des Ténèbres': { hair: ['Noirs','Bruns foncé'], eyes: ['Bruns foncé','Noirs'], mod: -5 },
  'Homme Métis':      { hair: ['Bruns','Châtains','Noirs'], eyes: ['Bruns','Noisette'], mod: 0 },
  'Homme des Bois':   { hair: ['Bruns','Châtains','Auburn'], eyes: ['Bruns','Verts','Noisette'], mod: 0 },
  'Dunedain':         { hair: ['Noirs','Bruns foncé'], eyes: ['Gris','Bleus acier'], mod: 10 },
  'Homme urbain':     { hair: ['Bruns','Châtains','Noirs','Blonds'], eyes: ['Bruns','Bleus','Verts'], mod: 0 },
  'Numénoréen':       { hair: ['Noirs','Bruns foncé'], eyes: ['Gris','Bleus profond'], mod: 15 },
  'Elfe des Bois':    { hair: ['Bruns','Auburn','Châtains'], eyes: ['Verts','Bruns','Noisette'], mod: 10 },
  'Grand Elfe':       { hair: ['Noirs','Argentés','Blonds platine'], eyes: ['Gris','Bleus','Violets'], mod: 20 },
  'Elfe Clair':       { hair: ['Blonds','Argentés','Dorés'], eyes: ['Bleus','Gris clair','Violets'], mod: 25 },
  'Elfe Gris':        { hair: ['Noirs','Gris argenté','Blanc'], eyes: ['Gris','Bleus pâle','Argentés'], mod: 15 },
  'Elfe des Ténèbres': { hair: ['Noirs','Blanc','Argenté'], eyes: ['Noirs','Violets','Rouges'], mod: 10 },
  'Elfe Aquatique':   { hair: ['Verts','Bleus','Argentés'], eyes: ['Verts','Bleus mer','Turquoise'], mod: 15 },
  'Elfe Noldor':      { hair: ['Noirs','Argentés','Dorés'], eyes: ['Gris étoilé','Bleus','Argentés'], mod: 25 },
  'Semi-Elfes':       { hair: ['Bruns','Noirs','Châtains'], eyes: ['Gris','Bruns','Bleus'], mod: 5 },
  'Semi-Elfes B':     { hair: ['Bruns','Noirs','Châtains'], eyes: ['Bruns','Noisette'], mod: 5 },
  'Semi-Elfes C':     { hair: ['Bruns','Auburn','Roux'], eyes: ['Verts','Bruns','Gris'], mod: 5 },
  'Semi-Elfes D':     { hair: ['Bruns','Châtains','Blonds'], eyes: ['Gris','Bleus','Bruns'], mod: 5 },
  'Semi-Elfes E':     { hair: ['Bruns','Châtains'], eyes: ['Bruns','Noisette','Verts'], mod: 5 },
  'Semi-Elfes F':     { hair: ['Noirs','Bruns foncé','Roux'], eyes: ['Bruns','Verts sombres'], mod: 0 },
  'Semi-Nain':        { hair: ['Bruns','Roux','Noirs'], eyes: ['Bruns','Gris'], mod: -10 },
  'Nain':             { hair: ['Bruns','Roux','Noirs','Gris'], eyes: ['Bruns foncé','Gris','Noirs'], mod: -15 },
  'Semi-Homme':       { hair: ['Bruns','Châtains','Blonds'], eyes: ['Bruns','Verts','Noisette'], mod: -5 },
  'Hobbit Pieds velus': { hair: ['Bruns','Châtains bouclés'], eyes: ['Bruns','Verts'], mod: -5 },
  'Hobbit Fort':      { hair: ['Bruns','Roux','Châtains'], eyes: ['Bruns','Gris'], mod: -10 },
  'Semi-Orque':       { hair: ['Noirs','Bruns foncé'], eyes: ['Jaunes','Bruns','Rouges'], mod: -20 },
  'Orque Inférieur':  { hair: ['Noirs'], eyes: ['Jaunes','Rouges'], mod: -35 },
  'Orque Supérieur':  { hair: ['Noirs','Bruns foncé'], eyes: ['Jaunes','Rouges','Noirs'], mod: -25 },
  'Orque Seigneur':   { hair: ['Noirs'], eyes: ['Rouges','Noirs','Jaunes'], mod: -20 },
  'Gobelin':          { hair: ['Noirs','Verts sombre'], eyes: ['Jaunes','Oranges','Rouges'], mod: -30 },
  'Gremlin':          { hair: ['Verts','Bruns','Roux'], eyes: ['Dorés','Verts','Bruns'], mod: -10 },
  'Sylphe':           { hair: ['Argentés','Blonds','Transparents'], eyes: ['Bleus ciel','Argentés','Violets'], mod: 20 },
  'Satyre':           { hair: ['Bruns','Roux','Noirs'], eyes: ['Bruns','Dorés','Verts'], mod: -5 },
  'Nymphe':           { hair: ['Dorés','Verts','Argentés'], eyes: ['Verts','Bleus','Dorés'], mod: 30 },
  'Gnome':            { hair: ['Bruns','Gris','Blancs'], eyes: ['Bruns','Bleus','Gris'], mod: -5 },
  'Fee':              { hair: ['Argentés','Dorés','Irisés'], eyes: ['Violets','Dorés','Bleus'], mod: 15 },
  'Semi-Ogres':       { hair: ['Noirs','Bruns foncé'], eyes: ['Bruns','Noirs','Jaunes'], mod: -20 },
  'Semi-Trolls':      { hair: ['Noirs','Gris'], eyes: ['Noirs','Rouges','Jaunes'], mod: -25 },
  'Trolls':           { hair: ['Noirs','Gris','Absents'], eyes: ['Rouges','Noirs'], mod: -35 },
  'Grands Hommes':    { hair: ['Noirs','Bruns foncé'], eyes: ['Bruns','Gris foncé'], mod: -10 },
  'Olog-Hai':         { hair: ['Noirs','Absents'], eyes: ['Rouges','Noirs'], mod: -30 },
  'Semi-Ogres II':    { hair: ['Noirs','Bruns foncé'], eyes: ['Bruns','Jaunes'], mod: -15 },
  'Homme Demon':      { hair: ['Noirs','Rouge sombre','Blancs'], eyes: ['Rouges','Noirs','Dorés'], mod: 0 },
  'Elfe Demon':       { hair: ['Noirs','Blanc','Argenté'], eyes: ['Rouges','Violets','Noirs'], mod: 5 },
  'Azurien (extraplanaire)': { hair: ['Bleus','Argentés','Noirs'], eyes: ['Bleus lumineux','Argentés'], mod: 10 },
  'Draakh':           { hair: ['Noirs','Bruns écailles'], eyes: ['Dorés','Oranges','Rouges'], mod: -5 },
  'Voyageur planaire': { hair: ['Variables','Argentés','Noirs'], eyes: ['Variables','Argentés'], mod: 5 },
  'Hengeyokai renard': { hair: ['Roux','Noirs','Bruns'], eyes: ['Dorés','Ambrés','Bruns'], mod: 10 },
};

// --- Age by race ---
const RACE_AGE = {
  'Homme Commun': { base: 16, range: 8 }, 'Sans Race': { base: 16, range: 8 },
  'Surhomme': { base: 18, range: 7 }, 'Nordique': { base: 16, range: 8 },
  'Homme Artique': { base: 16, range: 6 }, 'Homme Métis': { base: 16, range: 8 },
  'Homme des Bois': { base: 16, range: 8 }, 'Homme urbain': { base: 16, range: 8 },
  "Tribus de l'Ours": { base: 16, range: 8 }, 'Tribus des Ténèbres': { base: 16, range: 8 },
  'Dunedain': { base: 20, range: 15 }, 'Numénoréen': { base: 25, range: 20 },
  'Semi-Elfes': { base: 20, range: 10 }, 'Semi-Elfes B': { base: 20, range: 10 },
  'Semi-Elfes C': { base: 20, range: 10 }, 'Semi-Elfes D': { base: 20, range: 10 },
  'Semi-Elfes E': { base: 20, range: 10 }, 'Semi-Elfes F': { base: 20, range: 15 },
  'Elfe des Bois': { base: 50, range: 150 }, 'Grand Elfe': { base: 100, range: 200 },
  'Elfe Clair': { base: 100, range: 300 }, 'Elfe Gris': { base: 80, range: 200 },
  'Elfe des Ténèbres': { base: 80, range: 200 }, 'Elfe Aquatique': { base: 80, range: 200 },
  'Elfe Noldor': { base: 150, range: 500 },
  'Nain': { base: 30, range: 100 }, 'Semi-Nain': { base: 25, range: 50 },
  'Semi-Homme': { base: 20, range: 15 }, 'Hobbit Pieds velus': { base: 22, range: 20 },
  'Hobbit Fort': { base: 22, range: 15 },
  'Semi-Orque': { base: 14, range: 6 }, 'Orque Inférieur': { base: 12, range: 4 },
  'Orque Supérieur': { base: 13, range: 5 }, 'Orque Seigneur': { base: 14, range: 6 },
  'Gobelin': { base: 10, range: 5 },
  'Trolls': { base: 15, range: 10 }, 'Semi-Trolls': { base: 16, range: 10 },
  'Grands Hommes': { base: 18, range: 10 }, 'Olog-Hai': { base: 15, range: 10 },
  'Semi-Ogres': { base: 16, range: 10 }, 'Semi-Ogres II': { base: 16, range: 10 },
};

// --- Racial languages (free ranks at creation) ---
export const RACIAL_LANGUAGES = {
  'Homme Commun':      { 'Patois local': { parle: 6, ecrit: 0 } },
  'Sans Race':         { 'Patois local': { parle: 5, ecrit: 0 } },
  'Nordique':          { 'Nordiste': { parle: 6, ecrit: 0 }, 'Patois local': { parle: 4, ecrit: 0 } },
  'Dunedain':          { 'Patois local': { parle: 6, ecrit: 3 }, 'Elfique': { parle: 3, ecrit: 0 } },
  'Numénoréen':        { 'Patois local': { parle: 6, ecrit: 4 }, 'Elfique': { parle: 4, ecrit: 2 } },
  'Surhomme':          { 'Patois local': { parle: 6, ecrit: 2 } },
  'Elfe des Bois':     { 'Elfique': { parle: 6, ecrit: 3 }, 'Patois local': { parle: 3, ecrit: 0 } },
  'Grand Elfe':        { 'Elfique': { parle: 7, ecrit: 5 }, 'Elfique antique': { parle: 3, ecrit: 2 } },
  'Elfe Clair':        { 'Elfique': { parle: 7, ecrit: 5 }, 'Elfique antique': { parle: 4, ecrit: 3 } },
  'Elfe Gris':         { 'Elfique': { parle: 7, ecrit: 4 }, 'Patois local': { parle: 4, ecrit: 0 } },
  'Elfe des Ténèbres': { 'Elfique': { parle: 6, ecrit: 4 }, 'Noir parler': { parle: 3, ecrit: 0 } },
  'Elfe Aquatique':    { 'Elfique': { parle: 6, ecrit: 3 } },
  'Elfe Noldor':       { 'Elfique': { parle: 8, ecrit: 6 }, 'Elfique antique': { parle: 5, ecrit: 4 } },
  'Semi-Elfes':        { 'Elfique': { parle: 4, ecrit: 1 }, 'Patois local': { parle: 5, ecrit: 0 } },
  'Semi-Elfes B':      { 'Elfique': { parle: 3, ecrit: 0 }, 'Patois local': { parle: 5, ecrit: 0 } },
  'Semi-Elfes C':      { 'Elfique': { parle: 4, ecrit: 1 }, 'Patois local': { parle: 5, ecrit: 0 } },
  'Semi-Elfes D':      { 'Elfique': { parle: 4, ecrit: 1 }, 'Patois local': { parle: 5, ecrit: 0 } },
  'Semi-Elfes E':      { 'Elfique': { parle: 3, ecrit: 0 }, 'Patois local': { parle: 5, ecrit: 0 } },
  'Semi-Elfes F':      { 'Patois local': { parle: 5, ecrit: 0 } },
  'Nain':              { 'Nain': { parle: 7, ecrit: 4 }, 'Patois local': { parle: 3, ecrit: 0 } },
  'Semi-Nain':         { 'Nain': { parle: 5, ecrit: 2 }, 'Patois local': { parle: 4, ecrit: 0 } },
  'Semi-Homme':        { 'Hobbit': { parle: 6, ecrit: 2 }, 'Patois local': { parle: 4, ecrit: 0 } },
  'Hobbit Pieds velus': { 'Hobbit': { parle: 6, ecrit: 1 }, 'Patois local': { parle: 3, ecrit: 0 } },
  'Hobbit Fort':       { 'Hobbit': { parle: 6, ecrit: 2 }, 'Patois local': { parle: 4, ecrit: 0 } },
  'Semi-Orque':        { 'Orque': { parle: 5, ecrit: 0 }, 'Patois local': { parle: 3, ecrit: 0 } },
  'Orque Inférieur':   { 'Orque': { parle: 5, ecrit: 0 } },
  'Orque Supérieur':   { 'Orque': { parle: 6, ecrit: 0 }, 'Noir parler': { parle: 2, ecrit: 0 } },
  'Trolls':            { 'Orque': { parle: 3, ecrit: 0 } },
  'Semi-Trolls':       { 'Orque': { parle: 4, ecrit: 0 }, 'Patois local': { parle: 3, ecrit: 0 } },
  'Grands Hommes':     { 'Patois local': { parle: 5, ecrit: 0 } },
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rollD100() { return Math.floor(Math.random() * 100) + 1; }

/**
 * Generate size (height in cm, weight in kg) for a race and sex.
 */
export function generateSize(raceName, sex) {
  const col = RACE_SIZE_COLUMN[raceName] ?? 0;
  // Open-ended D100: roll, if ≤5 subtract another roll, if ≥96 add another roll
  let roll = rollD100();
  if (roll >= 96) roll += rollD100();
  else if (roll <= 5) roll -= rollD100();

  let heightCm = 170, weightKg = 70; // defaults
  for (const row of SIZE_TABLE) {
    if (roll >= row[0] && roll <= row[1]) {
      heightCm = row[2].cm[col];
      weightKg = row[2].kg[col];
      break;
    }
  }

  // Add small random variation (±2cm, ±3kg)
  heightCm += Math.floor(Math.random() * 5) - 2;
  weightKg += Math.floor(Math.random() * 7) - 3;

  // Sex adjustment: female typically -7cm, -18% weight
  if (sex === 'F') {
    heightCm -= 7 + Math.floor(Math.random() * 4);
    weightKg = Math.round(weightKg * 0.82);
  }

  return { heightCm, weightKg };
}

/**
 * Generate full background data for auto-fill.
 */
export function generateBackground(raceName, sex) {
  const app = RACE_APPEARANCE[raceName] || RACE_APPEARANCE['Sans Race'];
  const ageData = RACE_AGE[raceName] || { base: 18, range: 10 };
  const size = generateSize(raceName, sex);

  return {
    height: size.heightCm + ' cm',
    weight: size.weightKg + ' kg',
    sex: sex === 'M' ? 'Masculin' : 'Féminin',
    hair: pick(app.hair),
    eyes: pick(app.eyes),
    appearance: Math.min(100, Math.max(1, rollD100() + app.mod)),
    age: String(ageData.base + Math.floor(Math.random() * ageData.range)),
  };
}

/**
 * Get racial language bonuses for a race.
 * Returns array of {name, spoken, written} with free ranks.
 */
export function getRacialLanguages(raceName) {
  const langs = RACIAL_LANGUAGES[raceName] || { 'Patois local': { parle: 5, ecrit: 0 } };
  return Object.entries(langs).map(([name, ranks]) => ({
    name,
    spoken: ranks.parle || 0,
    written: ranks.ecrit || 0,
  }));
}
