import { describe, expect, it } from 'vitest';
import { isAllowedScriptSrc, scriptSrcs, thirdPartyScripts } from '../scripts/prelaunch-rules.mjs';

const HOST = 'inboxteardown.com';

describe('prelaunch: third-party script rule', () => {
  it('allows same-site scripts, including the Vercel insights path', () => {
    for (const src of ['/_astro/page.js', '_astro/page.js', '/_vercel/insights/script.js', 'https://inboxteardown.com/x.js']) {
      expect(isAllowedScriptSrc(src, HOST), src).toBe(true);
    }
  });

  it('rejects other hosts, protocol-relative URLs, and data: sources', () => {
    for (const src of [
      'https://va.vercel-scripts.com/v1/script.js',
      'https://www.googletagmanager.com/gtag/js?id=G-1',
      '//cdn.example.com/x.js',
      'https://inboxteardown.com.evil.io/x.js',
      'data:text/javascript,alert(1)',
    ]) {
      expect(isAllowedScriptSrc(src, HOST), src).toBe(false);
    }
  });

  it('finds src values in any quoting style and ignores inline scripts', () => {
    const html = `<script type="module">inline()</script><script src="/a.js"></script><script defer src='https://x.io/b.js'></script><script src=//y.io/c.js></script>`;
    expect(scriptSrcs(html)).toEqual(['/a.js', 'https://x.io/b.js', '//y.io/c.js']);
    expect(thirdPartyScripts(html, HOST)).toEqual(['https://x.io/b.js', '//y.io/c.js']);
  });

  it('passes a page with only inline and same-site scripts', () => {
    expect(thirdPartyScripts('<script type="module">x</script><script src="/_vercel/insights/script.js"></script>', HOST)).toEqual([]);
  });
});
