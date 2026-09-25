// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Safe placeholder fallbacks for CI build if repository secrets are not yet configured
if (!process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = "https://placeholder.supabase.co";
}
if (!process.env.VITE_SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = "placeholder-anon-key";
}

const isBuild = process.argv.includes("build");
const isProductionBuild = isBuild || process.env.NODE_ENV === "production" || !!process.env.GITHUB_ACTIONS;
const basePath = process.env.BASE_PATH || (isProductionBuild ? "/SkillBridge/" : "/");

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    prerender: {
      enabled: true,
    },
  },
  vite: {
    base: basePath,
  },
});
