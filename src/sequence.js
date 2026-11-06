// Ładowanie klatek i rysowanie ich na canvasie.

const CONCURRENCY = 6;
const PRIORITY_HEAD = 10; // pierwsze klatki, widoczne zaraz po wejściu
const COARSE_STEP = 4; // rzadka siatka klatek: daje całą animację, zanim dojdzie reszta

// Portret/tablet: kadr jest mniejszy niż ekran, żeby kubek zmieścił się w całości.
const MIN_VISIBLE_WIDTH = 0.56;
const MAX_FRAME_HEIGHT = 0.66;
const FRAME_CENTER_Y = 0.58;
const BACKDROP_X = 0.2;
const BACKDROP_W = 0.12;

export class FrameSequence {
  constructor({ canvas, backdrop, variant, basePath, stackedQuery }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.backdrop = backdrop;
    this.backdropCtx = backdrop.getContext('2d', { alpha: false });
    this.variant = variant;
    this.basePath = basePath;
    this.stackedQuery = stackedQuery;
    this.images = new Array(variant.count).fill(null);
    this.target = 0;
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
    const img = new Image();
    img.src = this.url(index);
    try {
      await img.decode();
      this.images[index] = img;
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
        if (index === 0 || this.drawn === -1) this.requestDraw(true);
        onProgress(done, order.length, done >= this.coarseCount);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }

  // Najbliższa załadowana klatka, gdy docelowa jeszcze nie dotarła.
  nearest(index) {
    for (let d = 0; d < this.images.length; d++) {
      const img = this.images[index - d] ?? this.images[index + d];
      if (img) return img;
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
    this.ctx.imageSmoothingQuality = 'high';
    this.requestDraw(true);
  }

  setFrame(value) {
    const index = Math.round(value);
    if (index === this.target) return;
    this.target = index;
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

  draw() {
    if (this.target === this.drawn || !this.source) return;
    const img = this.nearest(this.target);
    if (!img) return;
    const { x, y, w, h } = this.source;
    this.ctx.drawImage(img, x, y, w, h, 0, 0, this.canvas.width, this.canvas.height);
    if (this.stacked) {
      // Tło z pasa obok kubka, żeby w rozmyciu nie było widać jego zarysu.
      const { width, height } = this.variant;
      this.backdropCtx.drawImage(img, width * BACKDROP_X, 0, width * BACKDROP_W, height, 0, 0, 64, 36);
    }
    if (this.images[this.target]) this.drawn = this.target;
  }
}
