import { defineConfig } from 'astro/config';

// https://junseongshene.github.io/YYYY/
export default defineConfig({
  output: 'static',
  site: 'https://junseongshene.github.io',
  base: '/YYYY/',
  vite: {
    // supabase-js is only dynamically imported; pre-bundle it so dev doesn't 504 ("Outdated Optimize Dep").
    optimizeDeps: { include: ['@supabase/supabase-js'] },
  },
});
