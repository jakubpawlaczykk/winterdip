// Ładowanie klatek i rysowanie ich na canvasie.
//
// Klatki są trzymane jako skompresowane bloby. Gotowe do rysowania bitmapy
// powstają w tle tylko dla okna wokół bieżącej pozycji: dekodowanie nie blokuje
// głównego wątku, a pamięć nie rośnie do setek klatek po 8 MB.

const CONCURRENCY = 8;
const PRIORITY_HEAD = 10; // pierwsze klatki, widoczne zaraz po wejściu
const COARSE_STEP = 4; // rzadka siatka klatek: daje całą animację, zanim dojdzie reszta

const WINDOW_AHEAD = 24; // ile klatek dekodować z wyprzedzeniem w kierunku scrolla
const WINDOW_BEHIND = 8;
const EVICT_MARGIN = 6;
const MAX_DECODES = 4;

// Portret/tablet: kadr jest mniejszy niż ekran, żeby kubek zmieścił się w całości.
const MIN_VISIBLE_WIDTH = 0.56;
const MAX_FRAME_HEIGHT = 0.66;
const FRAME_CENTER_Y = 0.58;
const BACKDROP_X = 0.2;
const BACKDROP_W = 0.12;
const BACKDROP_DIM = 'rgba(42, 0, 5, 0.38)';
const MIN_BLEND = 0.02;

export class FrameSequence {
  constructor({ canvas, backdrop, variant, basePath, stackedQuery }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.backdrop = backdrop;
    this.backdropCtx = backdrop.getContext('2d', { alpha: false });
    this.variant = variant;
    this.basePath = basePath;
    this.stackedQuery = stackedQuery;
    this.blobs = new Array(variant.count).fill(null);
    this.bitmaps = new Map();
    this.pending = new Set();
    this.target = 0;
    this.center = 0;
    this.direction = 1;
    this.drawn = -1;
    this.queued = false;
  }

  url(index) {
    return `${this.basePath}/${String(index + 1).padStart(4, '0')}.webp`;
  }

  // Kolejność: początek, potem co 4. klatka, potem reszta.
  loadOrder() {
    const seen = new Set();
    const add = (i) => seen.add(i);
    for (let i = 0; i < Math.min(PRIORITY_HEAD, this.variant.count); i++) add(i);
    add(this.variant.count - 1);
    for (let i = 0; i < this.variant.count; i += COARSE_STEP) add(i);
    this.coarseCount = seen.size;
    for (let i = 0; i < this.variant.count; i++) add(i);
    return [...seen];
  }

  async loadOne(index, retry = true) {
    try {
      const response = await fetch(this.url(index));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.blobs[index] = await response.blob();
    } catch {
      if (retry) await this.loadOne(index, false);
    }
  }

  // onProgress(gotowe, wszystkie, czyRzadkaSiatkaGotowa)
  async load(onProgress) {
    const order = this.loadOrder();
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < order.length) {
        const index = order[next++];
        await this.loadOne(index);
        done++;
        this.pump();
        onProgress(done, order.length, done >= this.coarseCount);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }

  // Dekoduje klatki najbliższe pozycji i zwalnia te poza oknem.
  pump() {
    const ahead = this.direction > 0 ? WINDOW_AHEAD : WINDOW_BEHIND;
    const behind = this.direction > 0 ? WINDOW_BEHIND : WINDOW_AHEAD;
    const low = this.center - behind;
    const high = this.center + ahead;

    for (const [index, bitmap] of this.bitmaps) {
      if (index < low - EVICT_MARGIN || index > high + EVICT_MARGIN) {
        bitmap.close();
        this.bitmaps.delete(index);
      }
    }

    for (let d = 0; d <= Math.max(ahead, behind); d++) {
      if (this.pending.size >= MAX_DECODES) return;
      const forward = this.center + this.direction * d;
      const backward = this.center - this.direction * d;
      if (forward >= low && forward <= high) this.decode(forward);
      if (backward >= low && backward <= high) this.decode(backward);
    }
  }

  decode(index) {
    const blob = this.blobs[index];
    if (!blob || this.bitmaps.has(index) || this.pending.has(index)) return;
    if (this.pending.size >= MAX_DECODES) return;
    this.pending.add(index);
    createImageBitmap(blob)
      .then((bitmap) => {
        this.bitmaps.set(index, bitmap);
        if (index === this.center || index === this.center + 1) this.requestDraw(true);
      })
      .catch(() => {})
      .finally(() => {
        this.pending.delete(index);
        this.pump();
      });
  }

  // Najbliższa gotowa klatka, gdy docelowa jeszcze się dekoduje.
  nearest(index) {
    for (let d = 0; d < this.variant.count; d++) {
      const bitmap = this.bitmaps.get(index - d) ?? this.bitmaps.get(index + d);
      if (bitmap) return bitmap;
    }
    return null;
  }

  resize() {
    const vw = this.canvas.parentElement.clientWidth;
    const vh = this.canvas.parentElement.clientHeight;
    const { width, height } = this.variant;
    const stacked = this.stackedQuery.matches;
    const cover = Math.max(vw / width, vh / height);

    // Kadr nigdy nie jest węższy od ekranu, wygaszamy tylko górę i dół.
    const fitted = Math.min(vw / (width * MIN_VISIBLE_WIDTH), (vh * MAX_FRAME_HEIGHT) / height);
    const scale = stacked ? Math.min(cover, Math.max(vw / width, fitted)) : cover;

    const frameW = width * scale;
    const frameH = height * scale;
    const frameX = (vw - frameW) / 2;
    const frameY = stacked ? vh * FRAME_CENTER_Y - frameH / 2 : (vh - frameH) / 2;

    // Canvas zajmuje tylko widoczną część kadru.
    const left = Math.max(0, frameX);
    const top = Math.max(0, frameY);
    const right = Math.min(vw, frameX + frameW);
    const bottom = Math.min(vh, frameY + frameH);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = right - left;
    const cssH = bottom - top;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    Object.assign(this.canvas.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${cssW}px`,
      height: `${cssH}px`,
    });

    this.source = {
      x: (left - frameX) / scale,
      y: (top - frameY) / scale,
      w: cssW / scale,
      h: cssH / scale,
    };
    this.stacked = stacked;
    this.backdropIndex = -1;
    this.requestDraw(true);
  }

  setFrame(value) {
    if (value === this.target) return;
    if (value !== this.target) this.direction = value > this.target ? 1 : -1;
    this.target = value;
    const center = Math.floor(value);
    if (center !== this.center) {
      this.center = center;
      this.pump();
    }
    this.requestDraw();
  }

  requestDraw(force = false) {
    if (force) this.drawn = -1;
    if (this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => {
      this.queued = false;
      this.draw();
    });
  }

  // Pozycja jest ułamkowa: przenikanie dwóch sąsiednich klatek daje ruch
  // przy każdym odświeżeniu ekranu, a nie tylko przy zmianie klatki.
  draw() {
    if (this.target === this.drawn || !this.source) return;
    const index = Math.floor(this.target);
    const blend = this.target - index;
    const base = this.nearest(index);
    if (!base) return;

    const { x, y, w, h } = this.source;
    const { width: cw, height: ch } = this.canvas;
    this.ctx.drawImage(base, x, y, w, h, 0, 0, cw, ch);

    const next = blend > MIN_BLEND ? this.bitmaps.get(index + 1) : null;
    if (next) {
      this.ctx.globalAlpha = blend;
      this.ctx.drawImage(next, x, y, w, h, 0, 0, cw, ch);
      this.ctx.globalAlpha = 1;
    }

    if (this.stacked && index !== this.backdropIndex) this.drawBackdrop(base, index);
    if (this.bitmaps.has(index)) this.drawn = this.target;
  }

  // Tło z pasa obok kubka, żeby nie było widać jego zarysu. Rozmycie daje samo
  // powiększenie małego canvasa, bez kosztownego filtra CSS na każdą klatkę.
  drawBackdrop(bitmap, index) {
    const { width, height } = this.variant;
    const { width: bw, height: bh } = this.backdrop;
    this.backdropCtx.drawImage(bitmap, width * BACKDROP_X, 0, width * BACKDROP_W, height, 0, 0, bw, bh);
    this.backdropCtx.fillStyle = BACKDROP_DIM;
    this.backdropCtx.fillRect(0, 0, bw, bh);
    this.backdropIndex = index;
  }
}
