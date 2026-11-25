import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApplicationServer } from '../server.mjs';

const server = createApplicationServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const productionOrigin = 'https://www.turnkeyrecruitment.no';
const request = (route, options = {}) => fetch(origin + route, { redirect: 'manual', ...options });
let checks = 0;

try {
  for (const [route, language] of [['/', 'nb'], ['/en/', 'en']]) {
    const response = await request(route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('Content-Type'), /^text\/html/);
    assert.equal(response.headers.get('X-Robots-Tag'), null);
    const html = await response.text();
    assert.ok(html.includes(`<html lang="${language}"`), route);
    assert.ok(html.includes(`rel="canonical" href="${productionOrigin + route}"`), route);
    assert.ok(!/<meta name="robots" content="[^"]*noindex/.test(html), route);
    checks++;
  }

  for (const [route, expected] of [
    ['/en', '/en/'],
    ['/get-started?utm_source=github&test=1', '/?utm_source=github&test=1#solutions'],
    ['/services/media', 'https://turnkeymedia.no/']
  ]) {
    const response = await request(route);
    assert.equal(response.status, 301, route);
    assert.equal(response.headers.get('Location'), expected, route);
    await response.arrayBuffer();
    checks++;
  }

  const missing = await request('/publication-check-not-a-page');
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('X-Robots-Tag'), /noindex/);
  assert.ok((await missing.text()).includes('Fant ikke siden.'));
  checks++;

  const imagePath = '/assets/turnkey-share-nb-v1.jpg';
  const image = await request(imagePath);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('Content-Type'), 'image/jpeg');
  const bytes = new Uint8Array(await image.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [255, 216, 255]);
  assert.equal(Number(image.headers.get('Content-Length')), bytes.length);
  checks++;

  const head = await request(imagePath, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('Content-Type'), 'image/jpeg');
  assert.equal(Number(head.headers.get('Content-Length')), bytes.length);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  checks++;

  const unsupported = await request('/', { method: 'POST', body: 'ignored' });
  assert.equal(unsupported.status, 405);
  assert.equal(unsupported.headers.get('Allow'), 'GET, HEAD');
  assert.equal(await unsupported.text(), 'Method not allowed');
  checks++;

  console.log(JSON.stringify({ status: 'passed', mode: 'production', checks, coverage: ['HTTP language pages and canonical URLs', 'indexing headers', '301 redirects and query fragments', 'real 404', 'JPEG response bytes', 'HEAD', 'unsupported method'] }));
} finally {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
