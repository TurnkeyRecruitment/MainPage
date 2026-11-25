const assets = __TURNKEY_ASSETS__;
const redirects = __TURNKEY_REDIRECTS__;
const defaultHeaders = __TURNKEY_HEADERS__;

function respond(asset, status, method) {
  const headers = new Headers(defaultHeaders);
  headers.set('Content-Type', asset.type);
  headers.set('Content-Length', String(asset.length));
  if (status === 404 && !headers.has('X-Robots-Tag')) headers.set('X-Robots-Tag', 'noindex, follow');
  const body = method === 'HEAD' ? null : (asset.encoding === 'base64' ? Uint8Array.from(atob(asset.body), character => character.charCodeAt(0)) : asset.body);
  return new Response(body, { status, headers });
}

export default {
  fetch(request) {
    const url = new URL(request.url);
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', { status: 405, headers: { ...defaultHeaders, Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    const redirect = redirects[url.pathname];
    if (redirect) {
      const target = new URL(redirect.destination, url.origin);
      if (url.search && !target.search) target.search = url.search;
      const location = redirect.destination.startsWith('https://') ? target.href : target.pathname + target.search + target.hash;
      return new Response(null, { status: redirect.status, headers: { ...defaultHeaders, Location: location } });
    }
    if (Object.hasOwn(assets, url.pathname) && url.pathname !== '/404.html') {
      return respond(assets[url.pathname], 200, request.method);
    }
    return respond(assets['/404.html'], 404, request.method);
  }
};
