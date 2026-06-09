#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = Number(process.env.GELIBOLU_QA_PORT || 4174);
const baseUrl = `http://${host}:${port}`;

function runtimeVersion() {
    const index = readFileSync(path.join(root, 'index.html'), 'utf8');
    const match = index.match(/src="src\/app\.js\?v=([A-Za-z0-9._-]+)"/);
    if (!match) throw new Error('Cannot find runtime version in index.html module entry.');
    return match[1];
}

async function canFetchIndex() {
    try {
        const res = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(600) });
        return res.ok;
    } catch {
        return false;
    }
}

async function waitForServer() {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 8000) {
        if (await canFetchIndex()) return;
        await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error(`Server did not become ready at ${baseUrl}.`);
}

async function fetchText(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const text = await res.text();
    if (!res.ok) throw new Error(`${url} returned ${res.status}.`);
    if (!text.trim()) throw new Error(`${url} returned an empty body.`);
    return { res, text };
}

async function fetchBytes(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const buf = await res.arrayBuffer();
    if (!res.ok) throw new Error(`${url} returned ${res.status}.`);
    if (!buf.byteLength) throw new Error(`${url} returned an empty body.`);
    return { res, bytes: buf.byteLength };
}

let server = null;
const hadServer = await canFetchIndex();
if (!hadServer) {
    server = spawn('python3', ['-m', 'http.server', String(port), '--bind', host], {
        cwd: root,
        stdio: ['ignore', 'ignore', 'pipe']
    });
    server.stderr.on('data', (chunk) => process.stderr.write(chunk));
    await waitForServer();
}

const version = runtimeVersion();
const checks = [];
const issues = [];

try {
    const importantDates = [
        '1914-11-03',
        '1915-03-08',
        '1915-03-18',
        '1915-04-25',
        '1915-08-06',
        '1915-12-20',
        '1916-01-09'
    ];

    for (const iso of importantDates) {
        const { text } = await fetchText(`${baseUrl}/?date=${iso}`);
        const required = [
            '<main class="map-container">',
            '<footer class="timeline">',
            `src="src/app.js?v=${version}"`
        ];
        for (const snippet of required) {
            if (!text.includes(snippet)) issues.push(`/?date=${iso} is missing ${snippet}.`);
        }
        checks.push({ path: `/?date=${iso}`, bytes: text.length });
    }

    const app = await fetchText(`${baseUrl}/src/app.js?v=${version}`);
    if (!app.text.includes('hydrateTimelineData')) issues.push('/src/app.js did not look like the app entry module.');
    checks.push({ path: `/src/app.js?v=${version}`, bytes: app.text.length });

    const calibrate = await fetchText(`${baseUrl}/assets/calibrate.html`);
    if (!calibrate.text.includes(`?v=${version}`)) issues.push('/assets/calibrate.html is not using the current runtime version.');
    checks.push({ path: '/assets/calibrate.html', bytes: calibrate.text.length });

    const animation = await fetchText(`${baseUrl}/book/animation-events.json`);
    const parsed = JSON.parse(animation.text);
    if (!Array.isArray(parsed) || parsed.length < 100) issues.push('/book/animation-events.json did not contain the expected event array.');
    checks.push({ path: '/book/animation-events.json', items: Array.isArray(parsed) ? parsed.length : 0 });

    const book = await fetchText(`${baseUrl}/book/gallipoli-events.js?v=${version}`);
    if (!book.text.includes('BOOK_PHASE_EVENTS')) issues.push('/book/gallipoli-events.js did not export BOOK_PHASE_EVENTS.');
    checks.push({ path: `/book/gallipoli-events.js?v=${version}`, bytes: book.text.length });

    const map = await fetchBytes(`${baseUrl}/assets/gallipoli-map.png`);
    checks.push({ path: '/assets/gallipoli-map.png', bytes: map.bytes });
} catch (err) {
    issues.push(err.message || String(err));
} finally {
    if (server) server.kill('SIGTERM');
}

console.log(JSON.stringify({
    ok: issues.length === 0,
    baseUrl,
    server: hadServer ? 'existing' : 'spawned',
    runtimeVersion: version,
    checks,
    issues
}, null, 2));

if (issues.length) process.exit(1);
