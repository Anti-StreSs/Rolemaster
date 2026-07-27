# RM2 Druid spell-list integration — Companion I + Companion IV

## Scope

This bundle supersedes the earlier six-list patch. It contains:

- the six Druid Base lists from *Rolemaster Companion I*, sections 3.21-3.26;
- **Enrichment**, from *Rolemaster Companion IV*, section 8.4.4, printed page 66;
- bilingual list and spell labels;
- full structured spell parameters and bilingual effect descriptions;
- regenerated global and Channeling effect corpora.

## Added in this revision

- List ID: `list-550`
- English name: `Enrichment`
- CPR093-compatible French name: `Enrichissements`
- Classification: `Animist and/or Druid Base`
- Realm used by the application: `Channeling`
- Source: *Rolemaster Companion IV* (ICE 1800), section 8.4.4, page 66
- Spell IDs: `sp-10918` through `sp-10936`
- Number of spells: 19

## Source verification

The spell table and prose were read directly from the page image. The index on printed page 86 independently identifies `Enrichment` at `IV66`.

### Recorded source anomalies

1. **Cultivation True**, level 7: the printed table gives `1 season`, while the prose says the spell differs from *Cultivation* only in area and range. The printed table value was retained.
2. **Sowing True**, level 8: the printed table gives `1 season`, while the prose says the spell differs from *Sowing* only in area and range. The printed table value was retained.
3. The final words of **Enrichment Mastery**, level 50, are clipped by the supplied scan. The completion `each round` was confirmed against a second transcription witness and the standard Mastery-list construction.

## Final corpus counts

- Detailed lists: 527
- Detailed spells: 10936
- Described spells: 8683
- Channeling described spells: 2753
- `sorts.json` selectable list entries: 143

## Files changed

- `sorts.json`
- `spell_lists_index.json`
- `spells_detail.json`
- `spell_effects.json`
- `spell_effects.channeling.json`
- `spell_effects.manifest.json`

The other effect shards are included unchanged in the complete bundle.
