import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copy } from '../src/copy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argument = (name, fallback) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const mode = argument('mode', 'preview');
if (!['preview', 'production'].includes(mode)) throw new Error('Mode must be preview or production.');
const output = path.resolve(argument('output', path.join(root, 'site')));
const config = JSON.parse(await fs.readFile(path.join(root, 'config/publication.json'), 'utf8'));
const origin = config[mode === 'production' ? 'productionOrigin' : 'previewOrigin'];
const parsedOrigin = new URL(origin);
const localPreview = mode === 'preview' && parsedOrigin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsedOrigin.hostname);
if (parsedOrigin.origin !== origin || (parsedOrigin.protocol !== 'https:' && !localPreview)) throw new Error('Use an HTTPS origin, or a loopback HTTP origin for preview.');
const robots = mode === 'production' ? 'index, follow, max-image-preview:large' : 'noindex, nofollow';
const template = await fs.readFile(path.join(root, 'src/index.template.html'), 'utf8');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const languages = {
  nb: { path: '/', locale: 'nb_NO', alternate: 'en_GB', title: 'Turnkey Recruitment | God rekruttering. Gjort enklere.', description: 'Vi gjør god rekruttering enklere. Utforsk Turnkey Core, Turnkey Media og Turnkey Arena.', image: 'turnkey-share-nb-v1.jpg', imageAlt: 'Turnkey Recruitment. God rekruttering. Gjort enklere. Turnkey Core, Turnkey Media og Turnkey Arena.' },
  en: { path: '/en/', locale: 'en_GB', alternate: 'nb_NO', title: 'Turnkey Recruitment | Good recruitment. Made simpler.', description: 'We make good recruitment more accessible. Explore Turnkey Core, Turnkey Media and Turnkey Arena.', image: 'turnkey-share-en-v1.jpg', imageAlt: 'Turnkey Recruitment. Good recruitment. Made simpler. Turnkey Core, Turnkey Media and Turnkey Arena.' }
};

function head(lang) {
  const page = languages[lang];
  const url = origin + page.path;
  const image = `${origin}/assets/${page.image}`;
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${origin}/#organization`, name: config.name, legalName: config.legalName, url: `${origin}/`, email: config.email, logo: { '@type': 'ImageObject', url: `${origin}/assets/organization-logo.png`, width: 512, height: 512 }, sameAs: [config.linkedIn] },
      { '@type': 'WebSite', '@id': `${origin}/#website`, name: config.name, url: `${origin}/`, inLanguage: ['nb', 'en'], publisher: { '@id': `${origin}/#organization` } },
      { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: page.title, description: page.description, inLanguage: lang, isPartOf: { '@id': `${origin}/#website` }, about: { '@id': `${origin}/#organization` }, primaryImageOfPage: { '@type': 'ImageObject', url: image, width: 1200, height: 630 } }
    ]
  };
  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#07111f">
  <title>${escape(page.title)}</title>
  <meta name="description" content="${escape(page.description)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="nb" href="${origin}/">
  <link rel="alternate" hreflang="en" href="${origin}/en/">
  <link rel="alternate" hreflang="x-default" href="${origin}/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${config.name}">
  <meta property="og:locale" content="${page.locale}">
  <meta property="og:locale:alternate" content="${page.alternate}">
  <meta property="og:title" content="${escape(page.title)}">
  <meta property="og:description" content="${escape(page.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escape(page.imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(page.title)}">
  <meta name="twitter:description" content="${escape(page.description)}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="${escape(page.imageAlt)}">
  <link rel="icon" href="/assets/favicon.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" sizes="180x180">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="/styles.css">
  <script src="/app.js" defer></script>
  <script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script>
</head>`;
}

function render(lang) {
  const dictionary = copy[lang];
  let html = template.replace('{{LANG}}', lang).replace('{{HEAD}}', head(lang));
  html = html.replace(/<([a-z][a-z0-9]*)\b([^>]*\bdata-i18n="([^"]+)"[^>]*)>[\s\S]*?<\/\1>/g, (match, tag, attributes, key) => {
    if (dictionary[key] === undefined) throw new Error(`Missing ${lang} translation: ${key}`);
    return `<${tag}${attributes}>${escape(dictionary[key]).replaceAll('\n', '<br>')}</${tag}>`;
  });
  for (const [dataAttribute, targetAttribute] of [['data-i18n-aria', 'aria-label'], ['data-i18n-alt', 'alt']]) {
    const matcher = new RegExp(`<([a-z][a-z0-9]*)\\b([^>]*${dataAttribute}="([^"]+)"[^>]*)>`, 'g');
    html = html.replace(matcher, (match, tag, attributes, key) => {
      if (dictionary[key] === undefined) throw new Error(`Missing ${lang} accessible translation: ${key}`);
      const changed = attributes.replace(new RegExp(`${targetAttribute}="[^"]*"`), `${targetAttribute}="${escape(dictionary[key])}"`);
      return `<${tag}${changed}>`;
    });
  }
  html = html.replace(/(<a\b[^>]*data-language="([^"]+)"[^>]*)(>)/g, (match, start, language, end) => `${start}${language === lang ? ' aria-current="page"' : ''}${end}`);
  return html;
}

await fs.mkdir(path.join(output, 'en'), { recursive: true });
if (output !== path.join(root, 'site')) {
  await fs.cp(path.join(root, 'site/assets'), path.join(output, 'assets'), { recursive: true });
  await fs.copyFile(path.join(root, 'site/styles.css'), path.join(output, 'styles.css'));
}
await fs.copyFile(path.join(root, 'src/app.js'), path.join(output, 'app.js'));
await fs.writeFile(path.join(output, 'index.html'), render('nb'));
await fs.writeFile(path.join(output, 'en/index.html'), render('en'));

const legacy = [
  ['/get-started', '/#solutions'], ['/investors', '/#contact'], ['/philosophy', '/#about'],
  ['/services/consulting', '/#contact'], ['/services/flow', 'https://www.turnkeycore.no/'],
  ['/services/media', 'https://turnkeymedia.no/'], ['/services/portals', 'https://www.turnkeycore.no/'],
  ['/services/public', 'https://turnkeyarena.no/'], ['/services/verify', 'https://www.turnkeycore.no/']
];
const redirects = ['# Retired company routes and language normalization', '/en /en/ 301', '/index.html / 301', '/en/index.html /en/ 301'];
for (const [source, destination] of legacy) redirects.push(`${source} ${destination} 301`, `${source}/ ${destination} 301`);
await fs.writeFile(path.join(output, '_redirects'), redirects.join('\n') + '\n');
const headers = ['/*', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: strict-origin-when-cross-origin'];
if (mode === 'preview') headers.push('  X-Robots-Tag: noindex, nofollow');
await fs.writeFile(path.join(output, '_headers'), headers.join('\n') + '\n');
await fs.writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\n${mode === 'production' ? `\nSitemap: ${origin}/sitemap.xml\n` : ''}`);
if (mode === 'production') {
  const entries = Object.values(languages).map(page => `  <url>\n    <loc>${origin + page.path}</loc>\n    <xhtml:link rel="alternate" hreflang="nb" href="${origin}/"/>\n    <xhtml:link rel="alternate" hreflang="en" href="${origin}/en/"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}/"/>\n  </url>`);
  await fs.writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`);
} else {
  await fs.rm(path.join(output, 'sitemap.xml'), { force: true });
}
await fs.writeFile(path.join(output, 'site.webmanifest'), JSON.stringify({ name: config.name, short_name: 'Turnkey', id: '/', start_url: '/', scope: '/', display: 'browser', background_color: '#07111f', theme_color: '#07111f', icons: [{ src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' }] }, null, 2) + '\n');

const notFound = `<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><meta name="theme-color" content="#07111f"><title>Fant ikke siden | Turnkey Recruitment</title><link rel="icon" href="/assets/favicon.png" type="image/png"><link rel="stylesheet" href="/styles.css"></head><body><main class="wrap" style="padding-block:96px;max-width:760px"><p class="eyebrow">TURNKEY RECRUITMENT</p><h1 style="font-size:52px;letter-spacing:-2px;margin-block:24px">Fant ikke siden.</h1><p style="color:#a7b4c6;line-height:1.7">Adressen kan ha blitt endret. Du finner løsningene våre på forsiden.</p><p lang="en" style="color:#a7b4c6;line-height:1.7;margin-top:12px">This page could not be found. Explore our solutions on the homepage.</p><a class="text-link" href="/">Til forsiden →</a><br><a class="text-link" href="/en/" lang="en">English homepage →</a></main></body></html>`;
await fs.writeFile(path.join(output, '404.html'), notFound);
console.log(JSON.stringify({ mode, origin, output, pages: ['/', '/en/'], legacyRoutes: legacy.length }));
