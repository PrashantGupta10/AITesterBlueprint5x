import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiHandler from './lib/api-handler.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, '..', '..', '..', '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim();
  }
}

const publicDir = path.join(here, 'public');
const contentTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

const server = http.createServer((req, res) => {
  if (new URL(req.url, 'http://localhost').pathname.startsWith('/api/')) return apiHandler(req, res);
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = path.resolve(publicDir, requested);
  if (!file.startsWith(`${publicDir}${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`Test Strategy Builder running on http://localhost:${port}`));
