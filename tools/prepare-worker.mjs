import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argument = (name, fallback) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const mode = argument('mode', 'preview');
if (!['preview', 'production'].includes(mode)) throw new Error('Mode must be preview or production.');
const directory = path.resolve(argument('directory', path.join(root, 'site')));
const output = path.resolve(argument('output', path.join(root, 'worker/index.js')));
const config = JSON.parse(await fs.readFile(path.join(root, 'config/publication.json'), 'utf8'));
const origin = config[mode === 'production' ? 'productionOrigin' : 'previewOrigin'];
for (const filename of ['index.html', 'en/index.html']) {
  const html = await fs.readFile(path.join(directory, filename), 'utf8');
  if (!html.includes(`rel="canonical" href="${origin}/`)) throw new Error(`Wrong publication origin in ${filename}`);
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  if (noindex !== (mode === 'preview')) throw new Error(`Wrong indexing profile in ${filename}`);
}

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png' };
const files = [
  'index.html', 'en/index.html', '404.html', 'styles.css', 'app.js', 'robots.txt', 'site.webmanifest',
  'assets/company-logo.png', 'assets/core-illustration.webp', 'assets/arena-hero.webp',
  'assets/erlend.webp', 'assets/ida.webp', 'assets/william.webp',
  'assets/turnkey-share-nb-v1.jpg', 'assets/turnkey-share-en-v1.jpg',
  'assets/favicon.png', 'assets/apple-touch-icon.png', 'assets/icon-192.png', 'assets/organization-logo.png'
];
if (mode === 'production') files.push('sitemap.xml');
const assets = {};
for (const filename of files) {
  const bytes = await fs.readFile(path.join(directory, filename));
  const extension = path.extname(filename);
  const binary = ['.jpg', '.png', '.webp'].includes(extension);
  const route = filename === 'index.html' ? '/' : filename === 'en/index.html' ? '/en/' : '/' + filename;
  assets[route] = { type: types[extension], length: bytes.length, encoding: binary ? 'base64' : 'utf8', body: bytes.toString(binary ? 'base64' : 'utf8') };
}
const redirects = {};
for (const line of (await fs.readFile(path.join(directory, '_redirects'), 'utf8')).split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue;
  const [route, destination, status] = line.trim().split(/\s+/);
  if (!route.startsWith('/') || !['/', 'https://'].some(prefix => destination.startsWith(prefix)) || status !== '301') throw new Error('Unexpected redirect rule');
  redirects[route] = { destination, status: Number(status) };
}
const headers = { 'Cache-Control': mode === 'preview' ? 'private, no-store' : 'public, max-age=0, must-revalidate' };
for (const line of (await fs.readFile(path.join(directory, '_headers'), 'utf8')).split('\n')) {
  if (!line.trim() || line.trim() === '/*') continue;
  const separator = line.indexOf(':');
  if (separator < 1) throw new Error('Unexpected response header');
  headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
}
if (Boolean(headers['X-Robots-Tag']?.includes('noindex')) !== (mode === 'preview')) throw new Error('Wrong response indexing profile');
let worker = await fs.readFile(path.join(root, 'src/worker.template.js'), 'utf8');
worker = worker.replace('__TURNKEY_ASSETS__', () => JSON.stringify(assets)).replace('__TURNKEY_REDIRECTS__', () => JSON.stringify(redirects)).replace('__TURNKEY_HEADERS__', () => JSON.stringify(headers));
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, '// Generated from site content by tools/prepare-worker.mjs. Edit src/worker.template.js or site sources.\n' + worker);
console.log(JSON.stringify({ mode, origin, output, assets: files.length, redirects: Object.keys(redirects).length, workerBytes: Buffer.byteLength(worker) }));
