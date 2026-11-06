#!/usr/bin/env node
// Tnie film na sekwencje klatek WebP i zapisuje manifest czytany przez stronę.
//
//   npm run frames                      -> tnie assets/video.mp4
//   npm run frames -- sciezka/film.mp4  -> tnie wskazany plik
//
// Strona bierze liczbę klatek i czas trwania z manifestu, więc po podmianie
// filmu nie trzeba zmieniać kodu (ewentualnie tylko czasy w src/content.js).

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'frames');

// Zmień tutaj, jeśli trzeba wyważyć jakość względem wagi strony.
const VARIANTS = {
  desktop: { width: 1920, frames: 180, quality: 72 },
  mobile: { width: 1080, frames: 120, quality: 62 },
};

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

function run(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  if (res.error?.code === 'ENOENT') {
    console.error(`Nie znaleziono "${cmd}". Zainstaluj ffmpeg:`);
    console.error('  Windows: winget install --id Gyan.FFmpeg --exact --source winget');
    console.error('  macOS:   brew install ffmpeg');
    console.error('Potem otwórz nowy terminal albo ustaw FFMPEG_PATH i FFPROBE_PATH.');
    process.exit(1);
  }
  if (res.status !== 0) {
    console.error(res.stderr);
    process.exit(res.status ?? 1);
  }
  return res.stdout;
}

const input = resolve(process.argv[2] ?? join(ROOT, 'assets', 'video.mp4'));
if (!existsSync(input)) {
  console.error(`Brak pliku: ${input}`);
  process.exit(1);
}

const probe = JSON.parse(
  run(FFPROBE, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height:format=duration',
    '-of', 'json',
    input,
  ]),
);
const duration = Number(probe.format.duration);
const { width: srcWidth, height: srcHeight } = probe.streams[0];
console.log(`Film: ${srcWidth}x${srcHeight}, ${duration.toFixed(2)} s`);

const manifest = { duration: Number(duration.toFixed(3)), variants: {} };

for (const [name, { width, frames, quality }] of Object.entries(VARIANTS)) {
  const dir = join(OUT, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  console.log(`Tnę ${name}: ${frames} klatek, szerokość ${width}px...`);
  run(FFMPEG, [
    '-v', 'error', '-y',
    '-i', input,
    '-an',
    '-vf', `fps=${frames}/${duration},scale=${width}:-2:flags=lanczos`,
    '-c:v', 'libwebp',
    '-quality', String(quality),
    '-compression_level', '5',
    join(dir, '%04d.webp'),
  ]);

  const files = readdirSync(dir).filter((f) => f.endsWith('.webp'));
  const bytes = files.reduce((sum, f) => sum + statSync(join(dir, f)).size, 0);
  manifest.variants[name] = {
    count: files.length,
    width,
    height: Math.round(((srcHeight / srcWidth) * width) / 2) * 2,
  };
  console.log(`  ${files.length} klatek, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
}

writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

// Obraz OG: ostatnia klatka, 1200x630.
run(FFMPEG, [
  '-v', 'error', '-y',
  '-sseof', '-0.2',
  '-i', input,
  '-update', '1',
  '-vf', 'scale=1200:-2,crop=1200:630',
  '-q:v', '3',
  join(ROOT, 'public', 'og-image.jpg'),
]);

console.log('Gotowe: public/frames/manifest.json, public/og-image.jpg');
