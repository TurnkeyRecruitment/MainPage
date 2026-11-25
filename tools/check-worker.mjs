import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argument = (name, fallback) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const mode = argument('mode', 'preview');
const config = JSON.parse(await fs.readFile(path.join(root, 'config/publication.json'), 'utf8'));
const origin = config[mode === 'production' ? 'productionOrigin' : 'previewOrigin'];
const source = await fs.readFile(argument('artifact', path.join(root, 'worker/index.js')), 'utf8');
const worker = (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
const fetch = (route, method = 'GET') => worker.fetch(new Request(origin + route, { method }));
const resources = new Set(['/robots.txt', '/site.webmanifest', '/assets/organization-logo.png', '/assets/icon-192.png']);

for (const [route, language] of [['/', 'nb'], ['/en/', 'en']]) {
  const response = await fetch(route);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Content-Type'), /^text\/html/);
  assert.equal(Boolean(response.headers.get('X-Robots-Tag')?.includes('noindex')), mode === 'preview');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  const html = await response.text();
  assert.ok(html.includes(`<html lang="${language}"`));
  assert.ok(html.includes(`rel="canonical" href="${origin + route}"`));
  for (const match of html.matchAll(/(?:src|href)="(\/[^"#]*)"/g)) resources.add(match[1]);
  resources.add(`/assets/turnkey-share-${language}-v1.jpg`);
}
for (const resource of resources) {
  const response = await fetch(resource);
  assert.equal(response.status, 200, resource);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(Number(response.headers.get('Content-Length')), bytes.length, resource);
  if (resource.endsWith('.jpg')) {
    assert.equal(response.headers.get('Content-Type'), 'image/jpeg');
    assert.deepEqual([...bytes.slice(0, 3)], [255, 216, 255]);
  }
}
for (const [route, location] of [['/en', '/en/'], ['/index.html', '/'], ['/get-started', '/#solutions'], ['/get-started?utm_source=test', '/?utm_source=test#solutions'], ['/services/flow', 'https://www.turnkeycore.no/'], ['/services/public/', 'https://turnkeyarena.no/']]) {
  const response = await fetch(route);
  assert.equal(response.status, 301, route);
  assert.equal(response.headers.get('Location'), location, route);
}
const missing = await fetch('/publication-check-not-a-page');
assert.equal(missing.status, 404);
assert.ok((await missing.text()).includes('Fant ikke siden.'));
const head = await fetch('/assets/turnkey-share-nb-v1.jpg', 'HEAD');
assert.equal(head.status, 200);
assert.equal((await head.arrayBuffer()).byteLength, 0);
assert.ok(Number(head.headers.get('Content-Length')) > 0);
const post = await fetch('/', 'POST');
assert.equal(post.status, 405);
assert.equal(post.headers.get('Allow'), 'GET, HEAD');
const sitemap = await fetch('/sitemap.xml');
assert.equal(sitemap.status, mode === 'production' ? 200 : 404);
console.log(JSON.stringify({ status: 'passed', mode, origin, resources: resources.size, checks: ['real handler routes', 'embedded assets', 'indexing headers', '301 redirects and query fragments', '404 status', 'HEAD and method handling', 'sitemap profile'] }));
