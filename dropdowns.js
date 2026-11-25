// Header behaviour shared by every page: dropdowns (.dd) and the compact (mobile) menu.
// Keep MENU_MQ equal to the compact-menu breakpoint in style.css.
const MENU_MQ = '(max-width: 1100px)';

// Header dropdowns (.dd): keyboard + click support. Hover/focus-within still open them in CSS (wide screens).
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
      // inside the open compact menu the list unfolds in place: bring all of it into view
      if (open && dd.closest('.top.is-open')) menu.scrollIntoView({ block: 'nearest' });
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
      else if (e.key === 'Escape') {
        // closed dropdown inside the open compact menu: let Escape close the whole menu instead
        if (!dd.classList.contains('is-open') && dd.closest('.top.is-open')) return;
        e.preventDefault();
        dismiss();
      }
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

// Compact menu (narrow screens): a full-height sheet under the header bar.
// Opens/closes with the MENU button; closes with Escape, a tap on any link inside, or when the screen
// becomes wide. While open: page scroll is locked, the rest of the page is inert, Tab stays inside the header.
// `lock(on)` lets the page pause its own smooth scroller (Lenis) while the sheet is open.
export function setupMenu(opts = {}) {
  const top = document.querySelector('.top');
  const btn = top && top.querySelector('.menu-btn');
  const panel = btn && document.getElementById(btn.getAttribute('aria-controls'));
  const noop = { close() {} };
  if (!panel) return noop;
  const root = document.documentElement;
  const mq = window.matchMedia(MENU_MQ);
  setupHeaderFit(top, panel, mq);
  const lock =typeof opts.lock === 'function' ? opts.lock : () => {};
  panel.setAttribute('data-lenis-prevent', ''); // the sheet scrolls natively even while Lenis is stopped
  let inerted = [];
  const isOpen = () => top.classList.contains('is-open');
  const focusables = () => Array.from(top.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');

  const set = (open, returnFocus) => {
    if (open === isOpen()) return;
    top.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open) {
      panel.scrollTop = 0;
      inerted = Array.from(document.body.children).filter((el) => el !== top && !el.contains(top) && !el.inert
        && !/^(SCRIPT|STYLE|TEMPLATE)$/.test(el.tagName));
      inerted.forEach((el) => { el.inert = true; });
      lock(true);
      const first = Array.from(panel.querySelectorAll('a[href], button:not([disabled])')).find((el) => el.getClientRects().length);
      if (first) first.focus({ preventScroll: true });
    } else {
      inerted.forEach((el) => { el.inert = false; });
      inerted = [];
      // close any dropdown that was unfolded inside the sheet
      top.querySelectorAll('.dd.is-open').forEach((dd) => {
        dd.classList.remove('is-open');
        const b = dd.querySelector('.dd__btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      lock(false);
      if (returnFocus) btn.focus({ preventScroll: true });
    }
  };

  btn.addEventListener('click', () => set(!isOpen(), true));
  // any link in the sheet (in-page anchor, other page, new tab) closes it; the link itself still works
  panel.addEventListener('click', (e) => {
    if (isOpen() && e.target.closest('a[href]')) set(false, false);
  });
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      if (e.defaultPrevented) return; // an unfolded dropdown handled it first
      e.preventDefault();
      set(false, true);
    } else if (e.key === 'Tab') {
      const list = focusables();
      if (!list.length) return;
      const i = list.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); list[list.length - 1].focus(); }
      else if (!e.shiftKey && (i === -1 || i === list.length - 1)) { e.preventDefault(); list[0].focus(); }
    }
  });
  const onWide = () => { if (!mq.matches) set(false, false); };
  if (mq.addEventListener) mq.addEventListener('change', onWide);
  else if (mq.addListener) mq.addListener(onWide);
  return { close: () => set(false, false) };
}

// Wide screens (above MENU_MQ): the header row must fit on one line. Long product names and the
// longer Turkish labels can make it too wide, so it is compacted step by step, only as much as needed:
// data-fit="1|2|3" on .top (see style.css). Level 0 = the normal header. A level is good when nothing
// sticks out on the right and the brand name needs at most two lines (as before); if no level manages
// that, the first level where everything fits is used.
function setupHeaderFit(top, panel, mq) {
  const brandText = top.querySelector('.brand > span');
  const apply = (lv) => { if (lv) top.setAttribute('data-fit', String(lv)); else top.removeAttribute('data-fit'); };
  const fits = () => {
    const limit = top.getBoundingClientRect().right - parseFloat(getComputedStyle(top).paddingRight) + 0.5;
    return [panel, ...panel.children].every((el) => el.getBoundingClientRect().right <= limit);
  };
  // the brand text is a flex item (a block), so count its lines by height
  const brandOk = () => {
    if (!brandText) return true;
    const cs = getComputedStyle(brandText);
    if (cs.display === 'inline') return brandText.getClientRects().length <= 2;
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    return brandText.getBoundingClientRect().height < lh * 2.5;
  };
  const fit = () => {
    apply(0);
    if (mq.matches) return;
    let firstFit = -1;
    for (let lv = 0; lv <= 3; lv += 1) {
      apply(lv);
      if (!fits()) continue;
      if (brandOk()) return;
      if (firstFit < 0) firstFit = lv;
    }
    apply(firstFit < 0 ? 3 : firstFit);
  };
  let queued = false;
  const later = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fit(); });
  };
  fit();
  window.addEventListener('resize', later);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  // text changes (accent name, language) can change the width
  new MutationObserver(later).observe(top, { subtree: true, childList: true, characterData: true });
  new MutationObserver(later).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}
