// Lazy loader for skill_static_tables.json (SoHK condition modifiers + applicable modifiers)
let _data = null;
let _loading = null;

export function loadSkillTables() {
  if (_data) return Promise.resolve(_data);
  if (_loading) return _loading;
  _loading = fetch('./data/skill_static_tables.json')
    .then(r => r.ok ? r.json() : null)
    .then(d => { _data = d; _loading = null; return d; })
    .catch(() => { _loading = null; return null; });
  return _loading;
}

export function getStaticTable(globalIndex) {
  return _data?.tables?.[String(globalIndex)] ?? null;
}
