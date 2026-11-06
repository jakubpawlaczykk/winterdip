import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

import { motionPrompt, scroll, stages } from './content.js';
import { startParticles } from './particles.js';
import { renderPage } from './render.js';
import { FrameSequence } from './sequence.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const LOADER_PATIENCE_MS = 8000; // później wpuszczamy, gdy jest już rzadka siatka klatek

const story = document.getElementById('story');
const header = document.getElementById('header');
const isSmall = window.matchMedia('(max-width: 820px)').matches;
const stackedQuery = window.matchMedia('(max-aspect-ratio: 3/2)');
// ?motion=on wymusza animację przy testach na systemie z wyłączonymi animacjami.
const forceMotion = new URLSearchParams(location.search).get('motion') === 'on';
const reducedMotion =
  !forceMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setLoader(percent) {
  document.getElementById('loader-fill').style.transform = `scaleX(${percent / 100})`;
  document.getElementById('loader-value').textContent = `${percent}%`;
  document.getElementById('loader').setAttribute('aria-valuenow', percent);
}

function hideLoader() {
  document.body.classList.remove('is-loading');
  document.getElementById('loader').classList.add('is-done');
}

function setupSmoothScroll() {
  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

function setupAnchors(lenis) {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    lenis.scrollTo(target === story ? 0 : target);
  });
}

// Oś czasu liczona w sekundach filmu, więc czasy z content.js działają wprost.
function buildTimeline(sequence, duration) {
  const proxy = { frame: 0 };
  const scrollVh = isSmall ? scroll.mobileVh : scroll.desktopVh;
  const first = stages[0];
  const final = stages[stages.length - 1];

  const updateHeader = (time, progress) => {
    const showingLogo = time < first.to || (time >= final.from && progress < 1);
    header.classList.toggle('is-hidden', showingLogo);
  };

  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: story,
      pin: true,
      start: 'top top',
      end: () => `+=${(window.innerHeight * scrollVh) / 100}`,
      scrub: 0.35,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
    onUpdate() {
      updateHeader(timeline.time(), timeline.progress());
    },
  });

  timeline.to(
    proxy,
    {
      frame: sequence.variant.count - 1,
      duration,
      onUpdate: () => sequence.setFrame(proxy.frame),
    },
    0,
  );
  timeline.to({}, { duration: scroll.holdEnd }, duration);

  for (const stage of stages) {
    const el = document.querySelector(`[data-stage="${stage.id}"]`);
    const items = el.querySelectorAll('.word, .reveal');
    const isFirst = stage === first;

    if (isFirst) {
      gsap.set(el, { autoAlpha: 1 });
    } else {
      gsap.set(el, { autoAlpha: 0 });
      gsap.set(items, { autoAlpha: 0, y: 26 });
      timeline.to(el, { autoAlpha: 1, duration: 0.3 }, stage.from);
      timeline.to(
        items,
        { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.09 },
        stage.from + 0.05,
      );
    }

    if (stage.to !== undefined) {
      timeline.to(
        items,
        { autoAlpha: 0, y: -18, duration: 0.45, ease: 'power1.in', stagger: 0.03 },
        stage.to - 0.5,
      );
      timeline.to(el, { autoAlpha: 0, duration: 0.2 }, stage.to - 0.05);
    }
  }
}

async function startAnimated(manifest) {
  const name = isSmall || navigator.connection?.saveData ? 'mobile' : 'desktop';
  const sequence = new FrameSequence({
    canvas: document.getElementById('frames'),
    backdrop: document.getElementById('backdrop'),
    variant: manifest.variants[name],
    basePath: `${BASE}/frames/${name}`,
    stackedQuery,
  });

  story.classList.toggle('is-stacked', stackedQuery.matches);
  sequence.resize();

  const lenis = setupSmoothScroll();
  lenis.stop();
  setupAnchors(lenis);

  buildTimeline(sequence, manifest.duration);

  const applyLayout = () => {
    story.classList.toggle('is-stacked', stackedQuery.matches);
    sequence.resize();
  };
  window.addEventListener('resize', applyLayout);
  ScrollTrigger.addEventListener('refresh', applyLayout);

  const begin = () => {
    if (!document.body.classList.contains('is-loading')) return;
    hideLoader();
    lenis.start();
    ScrollTrigger.refresh();
    startParticles(document.getElementById('particles'), story);
  };

  const startedAt = performance.now();
  await sequence.load((done, total, coarseReady) => {
    setLoader(Math.round((done / total) * 100));
    if (coarseReady && performance.now() - startedAt > LOADER_PATIENCE_MS) begin();
  });
  begin();
}

function startStatic(finalFrameUrl) {
  story.classList.add('story--static');
  const img = new Image();
  img.src = finalFrameUrl;
  img.alt = 'Kubek z gorącą czekoladą i zapalonym podgrzewaczem';
  img.className = 'story__still';

  // Wybór obowiązuje tylko dla tego adresu, przy kolejnej wizycie wraca ustawienie systemu.
  const prompt = document.createElement('div');
  prompt.className = 'motion-prompt';
  prompt.innerHTML = `<p>${motionPrompt.text}</p>
    <a class="button button--primary button--sm" href="?motion=on">${motionPrompt.button}</a>`;

  const hero = document.createElement('div');
  hero.className = 'story__hero';
  hero.append(img, prompt);
  story.prepend(hero);
  header.classList.remove('is-hidden');
  hideLoader();
}

async function init() {
  const manifest = await fetch(`${BASE}/frames/manifest.json`).then((r) => r.json());
  const { count } = manifest.variants.desktop;
  const finalFrameUrl = `${BASE}/frames/desktop/${String(count).padStart(4, '0')}.webp`;

  renderPage(finalFrameUrl);

  if (reducedMotion) startStatic(finalFrameUrl);
  else await startAnimated(manifest);
}

init().catch((error) => {
  console.error(error);
  hideLoader();
  header.classList.remove('is-hidden');
});
