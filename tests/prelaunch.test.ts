import { describe, expect, it } from 'vitest';
import {
  checkFixtureBrands,
  checkFooterContact,
  checkOgImages,
  checkPlaceholders,
  checkPrivacyPage,
  checkRobots,
  checkScriptHosts,
  checkSignupEndpoint,
  checkTodos,
  isAllowedScriptSrc,
  scriptSrcs,
  thirdPartyScripts,
} from '../scripts/prelaunch-rules.ts';
import { SITE } from '../src/config/site.ts';

const HOST = 'www.inboxteardown.com';
const SITE_URL = `https://${HOST}`;
// The footer rule checks the configured contact address.
const EMAIL = SITE.contactEmail;
const page = (path: string, html: string) => ({ path, html });

describe('script hosts', () => {
  it('allows same-site scripts, including the Vercel insights path', () => {
    for (const src of ['/_astro/page.js', '_astro/page.js', '/_vercel/insights/script.js', `${SITE_URL}/x.js`]) {
      expect(isAllowedScriptSrc(src, HOST), src).toBe(true);
    }
  });
  it('rejects other hosts, the apex domain, protocol-relative URLs, and data: sources', () => {
    for (const src of [
      'https://va.vercel-scripts.com/v1/script.js',
      'https://inboxteardown.com/x.js',
      '//cdn.example.com/x.js',
      'https://www.inboxteardown.com.evil.io/x.js',
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
  it('passes and fails whole pages', () => {
    expect(checkScriptHosts([page('a.html', '<script src="/_vercel/insights/script.js"></script>')], HOST)).toEqual([]);
    expect(checkScriptHosts([page('a.html', '<script src="https://evil.io/x.js"></script>')], HOST)).toHaveLength(1);
  });
});

describe('TODO(andrew) markers', () => {
  it('passes clean source', () => {
    expect(checkTodos([{ path: 'src/a.ts', text: 'const a = 1; // TODO: generic note' }])).toEqual([]);
  });
  it('reports every marker with file and line', () => {
    const f = checkTodos([{ path: 'src/a.md', text: 'ok\n<!-- TODO(andrew): set the date. -->\n// TODO(andrew): price' }]);
    expect(f.map((x) => x.detail)).toEqual(['src/a.md:2  TODO(andrew): set the date.', 'src/a.md:3  TODO(andrew): price']);
  });
});

describe('bracketed placeholders', () => {
  it('passes real copy, links, and placeholders hidden in scripts or comments', () => {
    const html = '<p>Scores [1 to 5] and [a lowercase note]</p><script>x="[PRICE]"</script><!-- [EMAIL PROVIDER] -->';
    expect(checkPlaceholders([page('a.html', html)])).toEqual([]);
  });
  it('reports each placeholder once with the pages it appears on', () => {
    const f = checkPlaceholders([
      page('a.html', '<p>[PRICE]/mo and [Scale anchors to be written]</p>'),
      page('b.html', '<p>[PRICE]</p>'),
    ]);
    expect(f.map((x) => x.detail)).toEqual(['[PRICE] on a.html, b.html', '[Scale anchors to be written] on a.html']);
  });
});

describe('fixture brands', () => {
  it('passes content without fixture brands', () => {
    expect(checkFixtureBrands([{ path: 'src/content/x.md', text: 'brand: Real Brand Co.' }])).toEqual([]);
  });
  it('reports each file and the brands in it', () => {
    const f = checkFixtureBrands([{ path: 'src/content/x.md', text: 'brand: Marlow & Pike\nbrand: Ledgerly' }]);
    expect(f.map((x) => x.detail)).toEqual(['src/content/x.md: Marlow & Pike, Ledgerly']);
  });
});

describe('privacy page', () => {
  it('passes when /privacy/ is built', () => {
    expect(checkPrivacyPage([page('privacy/index.html', '')])).toEqual([]);
  });
  it('fails when it is missing', () => {
    expect(checkPrivacyPage([page('index.html', '')])).toHaveLength(1);
  });
});

describe('signup endpoint', () => {
  it('passes when forms were built with an endpoint', () => {
    expect(checkSignupEndpoint([page('a.html', '<form class="signup" action="https://x" data-signup data-live="true">')])).toEqual([]);
  });
  it('fails, once, listing pages whose forms were built without one', () => {
    const f = checkSignupEndpoint([
      page('a.html', '<form class="signup" action="/signups-soon/" data-signup data-live="false">'),
      page('b.html', '<form data-signup data-live="false">'),
      page('c.html', '<p>no form</p>'),
    ]);
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toContain('2 pages');
  });
});

describe('robots.txt', () => {
  it('passes when crawling is allowed', () => {
    expect(checkRobots('User-agent: *\nAllow: /\n\nSitemap: https://www.inboxteardown.com/sitemap-index.xml\n')).toEqual([]);
    expect(checkRobots('User-agent: BadBot\nDisallow: /\n\nUser-agent: *\nDisallow: /private/\n')).toEqual([]);
  });
  it('fails when everything is disallowed for every agent, or the file is missing', () => {
    expect(checkRobots('# pre-launch\nUser-agent: *\nDisallow: /\n')).toHaveLength(1);
    expect(checkRobots(undefined)).toHaveLength(1);
  });
});

describe('og:image', () => {
  const og = (url: string) => `<meta property="og:image" content="${url}">`;
  const files = new Set(['og/default.png']);
  it('passes when indexable pages point at a built image; noindex pages are skipped', () => {
    expect(checkOgImages([page('a.html', og(`${SITE_URL}/og/default.png`)), page('404.html', '<meta name="robots" content="noindex, nofollow">')], files, SITE_URL)).toEqual([]);
  });
  it('fails on a missing tag, a missing file, or an off-site image', () => {
    const f = checkOgImages(
      [page('a.html', '<title>x</title>'), page('b.html', og(`${SITE_URL}/og/nope.png`)), page('c.html', og('https://cdn.example.com/og.png'))],
      files,
      SITE_URL,
    );
    expect(f.map((x) => x.detail)).toEqual(['a.html: no og:image', 'b.html: og:image /og/nope.png is not in dist/', 'c.html: og:image points off-site (cdn.example.com)']);
  });
});

describe('footer contact', () => {
  it('checks for support@inboxteardown.com', () => {
    expect(EMAIL).toBe('support@inboxteardown.com');
  });
  it('fails a footer that still shows the old address', () => {
    expect(checkFooterContact([page('a.html', '<footer><a href="mailto:hello@inboxteardown.com">hello@inboxteardown.com</a></footer>')], EMAIL)).toHaveLength(1);
  });
  it('passes when the footer links the contact address', () => {
    expect(checkFooterContact([page('a.html', `<footer><a href="mailto:${EMAIL}">${EMAIL}</a></footer>`)], EMAIL)).toEqual([]);
  });
  it('fails when the footer lacks it or there is no footer', () => {
    const f = checkFooterContact([page('a.html', '<footer>Contact: [CONTACT EMAIL]</footer>'), page('b.html', `<main>${EMAIL}</main>`)], EMAIL);
    expect(f.map((x) => x.detail)).toEqual([`a.html: footer lacks ${EMAIL}`, 'b.html: no <footer>']);
  });
});
