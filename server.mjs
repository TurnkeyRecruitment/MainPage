import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import application from './worker/index.js';

export function createApplicationServer() {
  return createServer(async (incoming, outgoing) => {
    try {
      const method = incoming.method || 'GET';
      const url = new URL(incoming.url || '/', `http://${incoming.headers.host || 'localhost'}`);
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (Array.isArray(value)) value.forEach(item => headers.append(name, item));
        else if (value !== undefined) headers.set(name, value);
      }

      // The application serves GET and HEAD only. Drain any ignored request body.
      incoming.resume();
      const response = await application.fetch(new Request(url, { method, headers }));
      outgoing.statusCode = response.status;
      for (const [name, value] of response.headers) outgoing.setHeader(name, value);

      if (method === 'HEAD' || response.body === null) {
        outgoing.end();
      } else {
        await pipeline(Readable.fromWeb(response.body), outgoing);
      }
    } catch (error) {
      if (outgoing.destroyed) return;
      if (outgoing.headersSent) outgoing.destroy(error);
      else {
        outgoing.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        outgoing.end('Internal server error');
        console.error('Unable to serve request:', error.message);
      }
    }
  });
}

function start() {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer between 1 and 65535.');
    process.exitCode = 1;
    return;
  }

  const server = createApplicationServer();
  server.once('error', error => {
    console.error('Unable to start server:', error.message);
    process.exitCode = 1;
  });
  server.listen(port, '0.0.0.0', () => {
    console.log(`Turnkey is listening on port ${port}.`);
  });

  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    const deadline = setTimeout(() => server.closeAllConnections(), 10_000);
    deadline.unref();
    server.close(error => {
      clearTimeout(deadline);
      if (error) process.exitCode = 1;
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) start();
