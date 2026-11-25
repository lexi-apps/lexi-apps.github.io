// Ren'Py translation guide — lightweight page script (menu, dropdowns, lightbox, before/after compare).
import { setupDropdowns, setupMenu } from '/dropdowns.js';

const $$ = (s) => Array.from(document.querySelectorAll(s));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Click-to-zoom lightbox (uses .lb / .lb__close styles from /style.css). */
function setupLightbox() {
  const links = document.querySelectorAll('a[data-lightbox]');
  if (!links.length) return;
  const box = document.createElement('div');
  box.className = 'lb';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const img = document.createElement('img');
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'lb__close';
  const updateCloseLabel = () => {
    x.setAttribute('aria-label', /^tr/i.test(document.documentElement.lang) ? 'Kapat' : 'Close');
  };
  updateCloseLabel();
  x.textContent = '×';
  box.append(img, x);
  document.body.appendChild(box);

  let opener = null;
  let prevOverflow = '';
  const close = () => {
    if (box.hidden) return;
    box.hidden = true;
    img.removeAttribute('src');
    document.body.style.overflow = prevOverflow;
    if (opener) opener.focus({ preventScroll: true });
    opener = null;
  };

  links.forEach((a) => {
    a.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      updateCloseLabel();
      opener = a;
      const thumb = a.querySelector('img');
      img.alt = thumb ? thumb.alt : '';
      img.src = a.getAttribute('href');
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      box.hidden = false;
      x.focus({ preventScroll: true });
    });
  });

  box.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });
  box.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  box.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener(
    'keydown',
    (e) => {
      if (box.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        x.focus({ preventScroll: true });
      } else if (e.key === ' ' || e.key.startsWith('Arrow') || e.key.startsWith('Page') || e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );
}

/* Interactive before / after drag slider ([data-compare]). */
const COMPARE_SCENES = {
  names: {
    before: '/img/compare/once_ad_tr.webp',
    after: '/img/compare/sonra_ad_tr.webp',
    beforeBadge: { en: 'Without protection — "Gül"', tr: 'Korumasız — "Gül"' },
    afterBadge: { en: 'With Lexi — "Rose" kept intact', tr: 'Lexi ile — "Rose" korundu' },
    beforeAlt: 'Dialogue without name protection where character name Rose was translated as Gül',
    afterAlt: 'Dialogue with Lexi name protection keeping character name Rose intact',
    beforeAltTr: 'İsim koruması olmadan karakter adı Rose\'un Gül olarak çevrildiği diyalog',
    afterAltTr: 'Lexi İsim Koruması ile karakter adı Rose\'un olduğu gibi korunduğu diyalog',
    defaultPos: 30,
  },
  ja: {
    before: '/img/compare/once_font_ja.webp',
    after: '/img/compare/diyalog_ja.webp',
    beforeBadge: { en: 'Before — Missing glyphs', tr: 'Önce — Kırık kutular' },
    afterBadge: { en: 'With Lexi — Auto Font Patch', tr: 'Lexi ile — Otomatik Font Yaması' },
    beforeAlt: 'Japanese dialogue showing empty boxes without font patch',
    afterAlt: 'Japanese dialogue rendered cleanly with Lexi Auto Font Patch',
    beforeAltTr: 'Font yaması olmadan boş kutular gösteren Japonca diyalog',
    afterAltTr: 'Lexi Otomatik Font Yaması ile düzgün görünen Japonca diyalog',
    defaultPos: 38,
  },
  ko: {
    before: '/img/compare/once_font_ko.webp',
    after: '/img/compare/diyalog_ko.webp',
    beforeBadge: { en: 'Before — Missing glyphs', tr: 'Önce — Kırık kutular' },
    afterBadge: { en: 'With Lexi — Auto Font Patch', tr: 'Lexi ile — Otomatik Font Yaması' },
    beforeAlt: 'Korean dialogue showing empty boxes without font patch',
    afterAlt: 'Korean dialogue rendered cleanly with Lexi Auto Font Patch',
    beforeAltTr: 'Font yaması olmadan boş kutular gösteren Korece diyalog',
    afterAltTr: 'Lexi Otomatik Font Yaması ile düzgün görünen Korece diyalog',
    defaultPos: 38,
  },
};

function setupCompare() {
  $$('[data-compare]').forEach((wrap) => {
    const stage = wrap.querySelector('[data-cmp-stage]');
    const beforeImg = wrap.querySelector('[data-cmp-before]');
    const afterImg = wrap.querySelector('[data-cmp-after]');
    const beforeBadge = wrap.querySelector('[data-cmp-badge-before]');
    const afterBadge = wrap.querySelector('[data-cmp-badge-after]');
    const tabs = Array.from(wrap.querySelectorAll('[data-cmp-scene]'));
    if (!stage || !beforeImg || !afterImg) return;

    let pos = 30;
    let dragging = false;
    let activePointer = null;
    let hintRaf = 0;
    let userInteracted = false;

    const setPos = (next) => {
      pos = Math.min(100, Math.max(0, next));
      wrap.style.setProperty('--pos', `${pos.toFixed(2)}%`);
      stage.setAttribute('aria-valuenow', String(Math.round(pos)));
    };

    const cancelHint = () => {
      userInteracted = true;
      if (hintRaf) {
        cancelAnimationFrame(hintRaf);
        hintRaf = 0;
      }
    };

    const updateFromClientX = (clientX) => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width) return;
      setPos(((clientX - rect.left) / rect.width) * 100);
    };

    stage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cancelHint();
      dragging = true;
      activePointer = e.pointerId;
      stage.classList.add('is-dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      updateFromClientX(e.clientX);
    });

    stage.addEventListener('pointermove', (e) => {
      if (!dragging || (activePointer !== null && e.pointerId !== activePointer)) return;
      updateFromClientX(e.clientX);
    });

    const endDrag = (e) => {
      if (!dragging || (activePointer !== null && e.pointerId !== activePointer)) return;
      dragging = false;
      activePointer = null;
      stage.classList.remove('is-dragging');
      try {
        if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
      } catch (err) { /* ignore */ }
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    stage.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft') { e.preventDefault(); cancelHint(); setPos(pos - step); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); cancelHint(); setPos(pos + step); }
      else if (e.key === 'Home') { e.preventDefault(); cancelHint(); setPos(0); }
      else if (e.key === 'End') { e.preventDefault(); cancelHint(); setPos(100); }
    });

    const setBadge = (el, textObj) => {
      if (!el || !textObj) return;
      const en = el.querySelector('[data-lang="en"]');
      const tr = el.querySelector('[data-lang="tr"]');
      if (en) en.textContent = textObj.en;
      if (tr) {
        tr.textContent = '';
        textObj.tr.split(/(\bLexi\b)/).forEach((part) => {
          if (!part) return;
          if (part !== 'Lexi') { tr.appendChild(document.createTextNode(part)); return; }
          const s = document.createElement('span');
          s.lang = 'en';
          s.textContent = part;
          tr.appendChild(s);
        });
      }
    };

    const selectScene = (key, focusTab) => {
      const sc = COMPARE_SCENES[key];
      if (!sc) return;
      tabs.forEach((t) => {
        const on = t.getAttribute('data-cmp-scene') === key;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focusTab) t.focus();
      });
      beforeImg.src = sc.before;
      const isTr = /^tr/i.test(document.documentElement.lang);
      beforeImg.alt = isTr ? sc.beforeAltTr : sc.beforeAlt;
      afterImg.src = sc.after;
      afterImg.alt = isTr ? sc.afterAltTr : sc.afterAlt;
      setBadge(beforeBadge, sc.beforeBadge);
      setBadge(afterBadge, sc.afterBadge);
      if (typeof sc.defaultPos === 'number') setPos(sc.defaultPos);
    };

    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        cancelHint();
        selectScene(tab.getAttribute('data-cmp-scene'), false);
      });
      tab.addEventListener('keydown', (e) => {
        let j = -1;
        if (e.key === 'ArrowRight') j = (idx + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') j = (idx - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = tabs.length - 1;
        if (j < 0) return;
        e.preventDefault();
        cancelHint();
        selectScene(tabs[j].getAttribute('data-cmp-scene'), true);
      });
    });

    window.addEventListener('load', () => {
      Object.values(COMPARE_SCENES).forEach((sc) => {
        const a = new Image(); a.src = sc.before;
        const b = new Image(); b.src = sc.after;
      });
    });

    if (!reduced && 'IntersectionObserver' in window) {
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const runHint = () => {
        if (userInteracted) return;
        const start = performance.now();
        const dur = 1550;
        const kf = [
          [0.0, 30],
          [0.32, 16],
          [0.72, 48],
          [1.0, 30],
        ];
        const step = (now) => {
          if (userInteracted) return;
          const u = Math.min(1, (now - start) / dur);
          for (let i = 0; i < kf.length - 1; i++) {
            const [t0k, v0] = kf[i];
            const [t1k, v1] = kf[i + 1];
            if (u >= t0k && u <= t1k) {
              const local = (u - t0k) / (t1k - t0k);
              setPos(v0 + (v1 - v0) * ease(local));
              break;
            }
          }
          if (u < 1) hintRaf = requestAnimationFrame(step);
          else { hintRaf = 0; setPos(30); }
        };
        hintRaf = requestAnimationFrame(step);
      };
      const io = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (en.isIntersecting) {
              io.unobserve(stage);
              setTimeout(runHint, 280);
            }
          }
        },
        { threshold: 0.35 }
      );
      io.observe(stage);
    }

    setPos(30);
  });
}

setupMenu();
setupDropdowns();
setupLightbox();
setupCompare();
