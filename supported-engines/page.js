// Supported engines — tiny filter for the engine list (no dependencies, no inline handlers).
(function () {
  var tools = document.querySelector('[data-eng-tools]');
  var input = document.getElementById('eng-filter');
  var rows = Array.prototype.slice.call(document.querySelectorAll('.eng'));
  var empty = document.querySelector('[data-eng-empty]');
  var counts = Array.prototype.slice.call(document.querySelectorAll('[data-eng-n]'));
  if (!tools || !input || !rows.length) return;

  var norm = function (s) {
    var t = String(s || '').toLowerCase().replace(new RegExp(String.fromCharCode(0x131), 'g'), 'i');
    return t.normalize('NFD').replace(new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g'), '');
  };
  var hay = rows.map(function (r) { return norm(r.textContent + ' ' + (r.getAttribute('data-k') || '')); });

  function apply() {
    var words = norm(input.value).split(/\s+/).filter(Boolean);
    var shown = 0;
    rows.forEach(function (r, i) {
      var ok = words.every(function (w) { return hay[i].indexOf(w) !== -1; });
      r.hidden = !ok;
      if (ok) shown += 1;
    });
    counts.forEach(function (c) { c.textContent = String(shown); });
    if (empty) empty.hidden = shown !== 0;
  }

  tools.hidden = false;
  input.addEventListener('input', apply);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && input.value) { input.value = ''; apply(); }
  });
  apply();
})();
