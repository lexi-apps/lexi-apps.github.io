// Header dropdowns (.dd): keyboard + click support. Hover/focus-within still open them in CSS.
export function setupDropdowns() {
  Array.from(document.querySelectorAll('.dd')).forEach((dd) => {
    const btn = dd.querySelector('.dd__btn');
    const menu = dd.querySelector('.dd__menu');
    if (!btn || !menu) return;
    const items = () => Array.from(menu.querySelectorAll('.dd__item'));
    const set = (open) => {
      dd.classList.toggle('is-open', open);
      if (open) dd.classList.remove('is-dismissed');
      btn.setAttribute('aria-expanded', String(open));
    };
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    const openAndFocus = (last) => {
      set(true);
      const list = items();
      if (list.length) list[last ? list.length - 1 : 0].focus();
    };
    const dismiss = () => {
      set(false);
      dd.classList.add('is-dismissed');
      btn.focus();
    };
    btn.addEventListener('click', () => set(!dd.classList.contains('is-open')));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAndFocus(false); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); openAndFocus(true); }
      else if (e.key === 'Escape') dismiss();
    });
    btn.addEventListener('keyup', (e) => { if (e.key === ' ') e.preventDefault(); });
    menu.addEventListener('keydown', (e) => {
      const list = items();
      const i = list.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); dismiss(); return; }
      let j = -1;
      if (e.key === 'ArrowDown') j = (i + 1) % list.length;
      else if (e.key === 'ArrowUp') j = (i - 1 + list.length) % list.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = list.length - 1;
      if (j < 0) return;
      e.preventDefault();
      list[j].focus();
    });
    dd.addEventListener('focusout', (e) => {
      if (e.relatedTarget && dd.contains(e.relatedTarget)) return;
      set(false);
      dd.classList.remove('is-dismissed');
    });
    dd.addEventListener('mouseleave', () => {
      dd.classList.remove('is-dismissed');
      if (!dd.contains(document.activeElement)) set(false);
    });
    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) set(false); });
  });
}
