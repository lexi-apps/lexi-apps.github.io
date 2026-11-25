// Lexi Download Manager — sayfaya ozel kod. /main.js'den ONCE yuklenir; /main.js bu fonksiyonlari
// eski sirasinda cagirir (setupLightbox -> setupPromoVideo -> boot).
const $$ = (s) => Array.from(document.querySelectorAll(s));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Promo video: oynatici cubugu olmadan ekrana girince otomatik baslar, cikinca durur. */
function setupPromoVideo() {
  const v = document.querySelector('.promo video');
  if (!v) return;
  v.muted = true;
  v.playsInline = true;
  v.controls = false;
  v.removeAttribute('controls');
  if (reduced) {
    v.removeAttribute('autoplay');
    v.pause();
    return;
  }
  let inView = false;
  const sync = () => {
    if (inView && !document.hidden) {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      v.pause();
    }
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          inView = entry.isIntersecting && entry.intersectionRatio >= 0.2;
          sync();
        });
      },
      { threshold: [0, 0.2, 0.5] }
    );
    io.observe(v);
  } else {
    inView = true;
    sync();
  }
  document.addEventListener('visibilitychange', sync);
}

window.__lexiPage = { setupPromoVideo };
