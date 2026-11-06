// Buduje DOM z src/content.js.
import logoUrl from '../assets/logo.webp?url';
import { features, footer, gift, links, meta, stages } from './content.js';

const ICONS = {
  flame:
    '<path d="M12 3c.6 3.4-3.8 5.6-3.8 9.8A4.8 4.8 0 0 0 12 17.6a4.8 4.8 0 0 0 3.8-4.8c0-2-1.1-3.1-1.8-4.3-.5 1-1.1 1.6-1.9 1.9.5-2.3.5-4.6-.1-7.4Z"/><path d="M7 21h10"/>',
  cup:
    '<path d="M6 8h10l-.9 11a2 2 0 0 1-2 1.8H8.9a2 2 0 0 1-2-1.8L6 8Z"/><path d="M15.8 10.5H18a2.5 2.5 0 0 1 0 5h-2.6"/><path d="M9 5c0-1 1-1 1-2M13 5c0-1 1-1 1-2"/>',
  glaze:
    '<path d="M12 3c3.5 4.3 6 7.4 6 10.6A6 6 0 0 1 6 13.6C6 10.4 8.500 7.300 12 3Z"/><path d="M9.300 14a2.800 2.800 0 0 0 2.300 2.700"/>',
};

const logoImg = (extra = '') =>
  `<span class="logo-plate ${extra}"><img src="${logoUrl}" alt="${meta.brand}" width="2000" height="667" /></span>`;

const words = (text) =>
  text
    .split(' ')
    .map((w) => `<span class="word">${w}</span>`)
    .join(' ');

function stageHtml(stage, index) {
  const tag = index === 0 ? 'h1' : 'h2';
  const parts = [];
  if (stage.logo) parts.push(`<div class="reveal">${logoImg('logo-plate--stage')}</div>`);
  if (stage.heading) parts.push(`<${tag} class="stage__heading">${words(stage.heading)}</${tag}>`);
  if (stage.cta) {
    const buttons = stage.cta
      .map(
        (c) =>
          `<a class="button ${c.primary ? 'button--primary' : 'button--ghost'}" href="${links[c.href]}">${c.label}</a>`,
      )
      .join('');
    parts.push(`<div class="stage__cta reveal">${buttons}</div>`);
  }
  if (stage.hint) {
    parts.push(`<p class="stage__hint reveal">${stage.hint}<span aria-hidden="true"></span></p>`);
  }
  return `<article class="stage stage--${stage.side}${stage.cta ? ' stage--final' : ''}" data-stage="${stage.id}">
    <div class="stage__scrim"></div>
    <div class="stage__body">${parts.join('')}</div>
  </article>`;
}

export function renderPage(finalFrameUrl) {
  document.getElementById('stages').innerHTML = stages.map(stageHtml).join('');

  document.getElementById('header').innerHTML = `
    <a href="#story" aria-label="${meta.brand}, początek strony">${logoImg('logo-plate--sm')}</a>
    <a class="button button--primary button--sm" href="${links.buy}">Kup teraz</a>`;

  const tiles = features.items
    .map(
      (item) => `<li class="tile">
        <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[item.icon]}</svg>
        <h3>${item.title}</h3>
        <p>${item.text}</p>
      </li>`,
    )
    .join('');

  document.getElementById('sections').innerHTML = `
    <section class="features" id="zalety">
      <h2>${features.heading}</h2>
      <ul class="features__grid">${tiles}</ul>
    </section>
    <section class="gift" id="prezent">
      <img src="${finalFrameUrl}" alt="Kubek z gorącą czekoladą i zapalonym podgrzewaczem" loading="lazy" width="1920" height="1080" />
      <div class="gift__text">
        <h2>${gift.heading}</h2>
        <p>${gift.text}</p>
        <a class="button button--primary" href="${links[gift.cta.href]}">${gift.cta.label}</a>
      </div>
    </section>`;

  document.getElementById('footer').innerHTML = `
    <img src="${logoUrl}" alt="${meta.brand}" width="2000" height="667" loading="lazy" />
    <p>${footer.note}</p>
    <p class="site-footer__legal">© ${new Date().getFullYear()} ${meta.brand}</p>`;
}
