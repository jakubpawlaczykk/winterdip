import { defineConfig } from 'vite';
import { meta } from './src/content.js';

// Wstawia tytuł, opis i obraz OG z src/content.js do index.html.
const metaTags = {
  name: 'winterdip-meta',
  transformIndexHtml(html) {
    return html
      .replaceAll('{{title}}', meta.title)
      .replaceAll('{{description}}', meta.description)
      .replaceAll('{{brand}}', meta.brand)
      .replaceAll('{{ogImage}}', `${meta.siteUrl}/og-image.jpg`);
  },
};

export default defineConfig({
  base: './', // pozwala wrzucić stronę do dowolnego katalogu na hostingu
  plugins: [metaTags],
});
