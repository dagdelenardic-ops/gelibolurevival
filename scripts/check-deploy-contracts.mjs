#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const issues = [];

function readJson(rel) {
    try {
        return JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
    } catch (err) {
        issues.push(`${rel} is not valid JSON: ${err.message}`);
        return null;
    }
}

function read(rel) {
    return readFileSync(path.join(root, rel), 'utf8');
}

const requiredRuntimeFiles = [
    'index.html',
    'manifest.json',
    'robots.txt',
    'sitemap.xml',
    'styles/base.css',
    'styles/map.css',
    'styles/timeline.css',
    'styles/panel.css',
    'src/app.js',
    'book/animation-events.json',
    'book/gallipoli-events.js',
    'assets/gallipoli-map.png'
];

for (const rel of requiredRuntimeFiles) {
    if (!existsSync(path.join(root, rel))) issues.push(`Required deploy runtime file is missing: ${rel}.`);
}

const vercel = readJson('vercel.json');
if (vercel) {
    if (vercel.cleanUrls !== true) issues.push('vercel.json should enable cleanUrls.');
    if (vercel.trailingSlash !== false) issues.push('vercel.json should set trailingSlash=false.');
    const headers = Array.isArray(vercel.headers) ? vercel.headers : [];
    for (const source of ['/assets/(.*)', '/book/(.*)', '/src/(.*)', '/styles/(.*)', '/index.html']) {
        if (!headers.some((entry) => entry.source === source)) issues.push(`vercel.json is missing headers for ${source}.`);
    }
}

const vercelIgnore = existsSync(path.join(root, '.vercelignore')) ? read('.vercelignore') : '';
const vercelIgnoreLines = vercelIgnore
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
for (const pattern of ['archive/', 'docs/', 'scripts/', 'book/*.epub', 'assets/reference-console.html', 'suvla-fix-check*.png', 'aug-1915-*.png']) {
    if (!vercelIgnoreLines.includes(pattern)) issues.push(`.vercelignore should exclude ${pattern}.`);
}
for (const pattern of ['src/', 'styles/', 'assets/', 'book/animation-events.json', 'book/gallipoli-events.js']) {
    if (vercelIgnoreLines.includes(pattern)) issues.push(`.vercelignore must not broadly exclude runtime path ${pattern}.`);
}

const pkg = readJson('package.json');
if (pkg) {
    if (pkg.scripts?.predeploy !== 'npm run qa && npm run qa:deploy') {
        issues.push('package.json should expose predeploy as "npm run qa && npm run qa:deploy".');
    }
    if (pkg.scripts?.['qa:deploy'] !== 'node scripts/check-deploy-contracts.mjs') {
        issues.push('package.json should expose qa:deploy.');
    }
}

const index = read('index.html');
if (!index.includes('/_vercel/insights/script.js')) {
    issues.push('index.html should keep Vercel Analytics script guard.');
}
if (index.includes('localhost') && !index.includes("location.hostname !== 'localhost'")) {
    issues.push('index.html contains an unexpected localhost reference.');
}

console.log(JSON.stringify({
    ok: issues.length === 0,
    checked: {
        runtimeFiles: requiredRuntimeFiles.length,
        vercel: Boolean(vercel),
        vercelIgnore: Boolean(vercelIgnore)
    },
    issues
}, null, 2));

if (issues.length) process.exit(1);
