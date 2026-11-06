# Winter Dip

Świąteczny landing page kubków do gorącej czekolady. Film jest przewijany scrollem: klatki rysuje canvas, a steruje nimi GSAP ScrollTrigger z Lenis. Stack to Vite i czysty JS.

## Uruchomienie

Potrzebny jest Node.js, a do cięcia filmu także ffmpeg.

```bash
npm install
npm run dev
```

Strona działa pod `http://localhost:5173`.

## Teksty i ustawienia

Wszystko jest w [`src/content.js`](src/content.js): teksty, linki przycisków, meta tagi, adres strony (`siteUrl`), długość scrolla oraz czasy pojawiania się tekstów podane w sekundach filmu.

Przed publikacją uzupełnij:

- `links.collection` i `links.buy`: adresy ze sklepu (teraz prowadzą do sekcji na stronie),
- `meta.siteUrl`: adres strony, potrzebny do obrazu OG.

## Podmiana filmu

1. Zapisz nowy film jako `assets/video.mp4`.
2. Potnij go na klatki:

   ```bash
   npm run frames
   ```

   Można też wskazać inny plik: `npm run frames -- sciezka/do/filmu.mp4`.
3. Jeśli momenty w filmie się zmieniły, popraw `from` i `to` w `stages` w `src/content.js`.
4. Sprawdź stronę i zrób commit.

Skrypt usuwa stare klatki, tworzy nowe w `public/frames/`, aktualizuje `manifest.json` (strona czyta z niego liczbę klatek i czas trwania) oraz `public/og-image.jpg`. Liczbę klatek, szerokość i jakość ustawisz w `VARIANTS` w `scripts/cut-frames.mjs`.

Film powinien mieć kubek na środku kadru i statyczną kamerę. Na ekranach pionowych widać środek kadru.

## Publikacja

```bash
npm run build
```

Wrzuć zawartość katalogu `dist/` na dowolny hosting statyczny. Ścieżki są względne, więc strona działa także w podkatalogu.

## Testowanie

Gdy system ma wyłączone animacje (`prefers-reduced-motion`), strona pokazuje statyczną klatkę finałową z tekstami. Dodaj `?motion=on` do adresu, żeby mimo to zobaczyć animację.
