const CACHE_NAME = 'rolemaster-v82';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './css/theme.css',
  './css/print.css',
  './css/rolemaster-ui-additions.css',
  './js/app.js',
  './js/engine/data-loader.js',
  './js/engine/character.js',
  './js/engine/stats.js',
  './js/engine/stat_potentials.js',
  './js/engine/stat_gain.js',
  './js/engine/background.js',
  './js/engine/background-effects.js',
  './js/engine/classes.js',
  './js/engine/skills.js',
  './js/engine/spells.js',
  './js/engine/equipment.js',
  './js/engine/export.js',
  './js/engine/db.js',
  './js/engine/event-log.js',
  './js/engine/tools-api.js',
  './js/engine/pdf-export.js',
  './js/engine/npc-generator.js',
  './js/engine/build-compare.js',
  './js/engine/optional-rules.js',
  './js/engine/maneuvers.js',
  './js/engine/bestiary-translations.js',
  './js/engine/combat.js',
  './js/engine/text-format.js',
  './data/attack_tables.json',
  './data/critical_tables.json',
  './data/fumble_tables.json',
  './data/maneuver_tables.json',
  './data/encounter_tables.json',
  './js/ui/wizard.js',
  './js/ui/sheet.js',
  './js/ui/print-sheet.js',
  './js/ui/components.js',
  './js/ui/settings.js',
  './js/i18n/fr.js',
  './js/i18n/en.js',
  './data/carac_tables.json',
  './data/classes.json',
  './data/competences.json',
  './data/sorts.json',
  './data/couts.json',
  './data/categories.json',
  './data/simil.json',
  './data/options.json',
  './data/monde.json',
  './manifest.json',
  './assets/ui/icons/session_attack_crossed_swords.webp',
  './assets/ui/icons/session_comparator_scales.webp',
  './assets/ui/icons/session_critical_starburst.webp',
  './assets/ui/icons/session_export_scroll.webp',
  './assets/ui/icons/session_fumble_broken_die.webp',
  './assets/ui/icons/session_maneuver_scroll.webp',
  './assets/ui/icons/session_projection_chart.webp',
  './assets/ui/icons/session_quick_d100.webp',
  './assets/ui/icons/session_rr_shield_rune.webp',
  './assets/ui/icons/session_state_failure.webp',
  './assets/ui/icons/session_state_partial.webp',
  './assets/ui/icons/session_state_success.webp',
  './assets/ui/icons/session_toolbox_satchel.webp',
  './assets/ui/buttons/webp/btn_create_character.webp',
  './assets/ui/buttons/webp/btn_generate_npc.webp',
  './assets/ui/buttons/webp/btn_load_file.webp',
  './assets/ui/buttons/webp/btn_download_json.webp',
  './assets/ui/buttons/webp/btn_save_local.webp',
  './assets/ui/buttons/webp/btn_print.webp',
  './assets/ui/buttons/webp/btn_export_pdf.webp',
  './assets/ui/buttons/webp/btn_roll_dice.webp',
  './assets/ui/buttons/webp/btn_auto_assign.webp',
  './assets/ui/buttons/webp/btn_validate.webp',
  './assets/ui/buttons/webp/btn_edit_mode.webp',
  './assets/ui/buttons/webp/btn_end_dev_phase.webp',
  './assets/ui/buttons/webp/btn_next_level.webp',
  './assets/ui/buttons/webp/btn_auto_assign_dp.webp',
  './assets/ui/buttons/webp/btn_spell_rank.webp',
  './assets/ui/buttons/webp/btn_spell_sgr.webp',
  './assets/ui/buttons/webp/btn_wpn_auto.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
