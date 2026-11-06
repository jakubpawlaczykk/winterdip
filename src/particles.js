// Lekki śnieg i złote drobinki. Rysuje gotowe sprite'y i działa tylko,
// gdy sekcja jest widoczna, a karta przeglądarki aktywna.

function sprite(size, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([offset, color]) => g.addColorStop(offset, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

export function startParticles(canvas, section) {
  const ctx = canvas.getContext('2d');
  const snow = sprite(32, [
    [0, 'rgba(255,255,255,0.95)'],
    [0.45, 'rgba(207,232,255,0.5)'],
    [1, 'rgba(207,232,255,0)'],
  ]);
  const gold = sprite(32, [
    [0, 'rgba(255,240,205,1)'],
    [0.4, 'rgba(226,175,110,0.55)'],
    [1, 'rgba(217,160,127,0)'],
  ]);

  let w = 0;
  let h = 0;
  let items = [];
  let raf = 0;
  let visible = true;
  let last = 0;

  const seed = (scatter) => ({
    x: Math.random() * w,
    y: scatter ? Math.random() * h : -12,
    size: 3 + Math.random() * 5,
    speed: 10 + Math.random() * 22,
    sway: 6 + Math.random() * 14,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.25 + Math.random() * 0.5,
    image: Math.random() < 0.3 ? gold : snow,
  });

  function resize() {
    w = canvas.width = section.clientWidth;
    h = canvas.height = section.clientHeight;
    const count = w < 820 ? 26 : 60;
    items = Array.from({ length: count }, () => seed(true));
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      p.y += p.speed * dt;
      p.phase += dt * 0.7;
      if (p.y > h + 12) {
        items[i] = seed(false);
        continue;
      }
      ctx.globalAlpha = p.alpha;
      ctx.drawImage(p.image, p.x + Math.sin(p.phase) * p.sway, p.y, p.size, p.size);
    }
  }

  function sync() {
    const run = visible && !document.hidden;
    if (run && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(section);
  sync();
}
