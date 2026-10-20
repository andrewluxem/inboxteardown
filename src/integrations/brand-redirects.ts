// Writes the active part of the brand redirect plan into the Vercel Build
// Output (.vercel/output/config.json) as 308 routes, so each build decides
// which redirects exist and none are listed in vercel.json.
//
// Astro's own `redirects` option is not used: @astrojs/vercel emits those as
// `^/brand/x$` behind its trailing-slash redirect, so with
// trailingSlash: 'always' the old URL would 404 instead of redirecting.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import {
  builtPagePaths,
  describePlan,
  planRedirects,
  readBoards,
  readRedirectMap,
  vercelRedirectRoutes,
  type RedirectPlan,
} from '../lib/redirects';

export function brandRedirects(): AstroIntegration {
  let plan: RedirectPlan | undefined;
  let root: URL;
  return {
    name: 'brand-redirects',
    hooks: {
      'astro:config:setup': ({ config, logger }) => {
        root = config.root;
        const path = (p: string) => fileURLToPath(new URL(p, root));
        const built = builtPagePaths(readBoards(path('./src/content/scoreboard/')));
        plan = planRedirects(readRedirectMap(path('./src/data/brand-redirects.json')), built);
        for (const line of describePlan(plan)) logger.info(line);
      },
      // Runs after the adapter's build:done (Astro puts the adapter first),
      // so config.json is already written.
      'astro:build:done': ({ dir, logger }) => {
        if (!plan) return;
        // The plan was made from the boards before the build. Check it against
        // what the build wrote, and fail rather than ship a redirect that hides
        // a page or lands on a 404.
        const page = (p: string) => existsSync(fileURLToPath(new URL(`.${p}index.html`, dir)));
        const wrong = [
          ...plan.active.filter((r) => page(r.source)).map((r) => `${r.source} is redirected but was built`),
          ...plan.active.filter((r) => !page(r.destination)).map((r) => `${r.source} redirects to ${r.destination}, which was not built`),
          ...plan.skipped
            .filter((s) => s.reasons.includes('source page is still built') && !page(s.redirect.source))
            .map((s) => `${s.redirect.source} was skipped as still built, but the build did not write it`),
        ];
        if (wrong.length) throw new Error(`Brand redirect plan disagrees with the build:\n${wrong.join('\n')}`);

        const configJson = fileURLToPath(new URL('./.vercel/output/config.json', root));
        if (!existsSync(configJson)) throw new Error(`${configJson} is missing; the Vercel adapter must run before brand-redirects.`);
        const config = JSON.parse(readFileSync(configJson, 'utf8')) as { routes?: unknown[] };
        config.routes = [...vercelRedirectRoutes(plan.active), ...(config.routes ?? [])];
        writeFileSync(configJson, `${JSON.stringify(config, null, '\t')}\n`);
        logger.info(`${plan.active.length} redirect route(s) written to .vercel/output/config.json`);
      },
    },
  };
}
