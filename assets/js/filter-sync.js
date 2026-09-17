// shared filter state between index.html's table filters and carte.html's
// map filter — both read/write the same localStorage key, so picking
// "Allemagne" in one place is reflected in the other. Keys mirror the
// index table's filter columns: auteur, lieu (country), typologie
// (Catégorie d'ouvrage), type (Type de mandat) — each '' means "Tous".
// showEglises (boolean) is separate: it toggles the whole "Nouvelles
// églises" master's-thesis selection (project.master / row
// data-master="true") on/off as a block, not a value within a column —
// defaults to hidden (false/absent), shown once explicitly turned on.
window.ArchivirFilters = (function(){
  const KEY = 'archivir-filters';
  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }
  function save(filters){
    try { localStorage.setItem(KEY, JSON.stringify(filters)); }
    catch { /* private browsing / storage disabled — filters just stay per-page */ }
  }
  return { KEY, load, save };
})();
