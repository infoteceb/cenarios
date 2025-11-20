import { defineConfig } from "vite";
import { resolve } from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Read Supabase config from config.js
const configContent = fs.readFileSync('config.js', 'utf-8');
const supabaseUrl = configContent.match(/SUPABASE_URL:\s*"([^"]+)"/)[1];
const supabaseKey = configContent.match(/SUPABASE_ANON_KEY:\s*"([^"]+)"/)[1];

// Create a simple plugin to inject the config
const injectConfig = {
  name: 'inject-config',
  transformIndexHtml(html) {
    const configScript = `
      <script>
        window.APP_CONFIG = {
          SUPABASE_URL: "${supabaseUrl}",
          SUPABASE_ANON_KEY: "${supabaseKey}",
          SCHEMA: "public"
        };
      </script>
    `;
    return html.replace('</head>', `${configScript}</head>`);
  }
};

export default defineConfig({
  root: __dirname,
  base: './',
  publicDir: 'public',
  plugins: [injectConfig],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(
        glob.sync('*.html').map(file => [
          file.replace(/\.html$/, ''),
          fileURLToPath(new URL(file, import.meta.url))
        ])
      ),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    port: 8000,
    open: true,
  },
  preview: {
    port: 8000,
    open: true,
  },
});
