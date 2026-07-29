import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  // chemins relatifs : le site doit fonctionner servi depuis un sous-dossier (GitHub Pages de projet)
  base: './',
  build: {
    rollupOptions: {
      input: {
        home: 'index.html',
        listing: 'fiche.html',
        confirmation: 'confirmation.html',
        traveler: 'espace.html',
        host: 'hote.html'
      }
    }
  }
});
