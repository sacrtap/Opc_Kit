/**
 * Experiment server for the cost/accuracy comparison.
 *
 * Serves the shared fixture and records the page's own final state, so a run's
 * outcome is verified by the page rather than by the agent's self-report.
 *
 *   GET  /            -> the fixture page
 *   POST /report      -> the page reports { run, status, scrolls }
 *   GET  /reports     -> all recorded reports as JSON
 *   POST /reset?run=  -> clear records for one run id
 *
 * Usage: node tests/e2e/experiment-server.mjs [port]
 */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FIXTURE = readFileSync(
  fileURLToPath(new URL('../fixtures/static-page.html', import.meta.url)),
  'utf8',
);

const reports = [];
const port = Number(process.argv[2] ?? 0);

const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');

  if (request.method === 'POST' && url.pathname === '/report') {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      try {
        const report = JSON.parse(body);
        reports.push({ ...report, at: new Date().toISOString() });
      } catch {
        // ignore malformed reports; a missing record reads as a failed run
      }
      response.writeHead(204).end();
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/reset') {
    const run = url.searchParams.get('run');
    for (let i = reports.length - 1; i >= 0; i -= 1) if (reports[i].run === run) reports.splice(i, 1);
    response.writeHead(204).end();
    return;
  }

  if (url.pathname === '/reports') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(reports, null, 2));
    return;
  }

  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(FIXTURE);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`experiment server listening on http://127.0.0.1:${server.address().port}/`);
});
