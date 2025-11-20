import { defineConfig } from "vite";
import { resolve } from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

// Configurações do Supabase (serão injetadas via variáveis de ambiente no Easypanel)
const supabaseUrl = process.env.SUPABASE_URL || 'https://qwlghfwnfryxedlgipax.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3bGdoZnduZnJ5eGVkbGdpcGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDA4OTUsImV4cCI6MjA3MzUxNjg5NX0.mCaMSiTfUqarSeyi3Y-YajTMJYVuYMpf_j-X52wDP7s';

// Plugin para injetar as configurações
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
    port: 3000,
    host: true,
    open: true,
  },
  preview: {
    port: 3000,
    host: true,
    open: true,
  },
});
