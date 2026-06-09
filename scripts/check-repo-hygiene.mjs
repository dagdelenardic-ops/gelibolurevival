#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toPosix = (filePath) => filePath.split(path.sep).join('/');

function walk(dir, predicate = () => true) {
    const out = [];
    for (const entry of readdirSync(path.join(root, dir))) {
        const abs = path.join(root, dir, entry);
        const rel = toPosix(path.relative(root, abs));
        const st = statSync(abs);
        if (st.isDirectory()) {
            if (['.git', 'node_modules', '.vercel', '.playwright-mcp'].includes(entry)) continue;
            out.push(...walk(rel, predicate));
        } else if (predicate(rel)) {
            out.push(rel);
        }
    }
    return out;
}

function read(rel) {
    return readFileSync(path.join(root, rel), 'utf8');
}

function gitLsFiles() {
    const result = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || 'git ls-files failed');
    return result.stdout.split('\n').filter(Boolean);
}

function lineFor(text, index) {
    return text.slice(0, index).split('\n').length;
}

const issues = [];
const tracked = gitLsFiles();
const trackedForbidden = [
    /(^|\/)\.DS_Store$/,
    /\.bak(?:\.|$)/,
    /(?:^|\/)(?:suvla-fix-check|aug-1915-|weird-sea-anim-|map-check-|local-run|verification-overlay).*\.png$/,
    /(?:^|\/)(?:test-results|playwright-report)\//
];

for (const rel of tracked) {
    if (trackedForbidden.some((pattern) => pattern.test(rel))) {
        issues.push(`Tracked release hygiene violation: ${rel}.`);
    }
}

const staleScanFiles = [
    'index.html',
    'package.json',
    ...walk('src', (rel) => rel.endsWith('.js')),
    ...walk('scripts', (rel) => /\.(mjs|js)$/.test(rel) && !rel.includes('.bak') && rel !== 'scripts/check-repo-hygiene.mjs'),
    ...walk('styles', (rel) => rel.endsWith('.css')),
    ...walk('docs', (rel) => rel.endsWith('.md')),
    'assets/calibrate.html'
];

const staleRules = [
    { label: 'old local server port', pattern: /\b(?:4173|8915)\b/g },
    { label: 'old runtime version', pattern: /\b20260407-manual-r1\b/g },
    { label: 'old affine runtime version', pattern: /\b20260416-affine\b/g },
    { label: 'old editor storage key', pattern: /\bgelibolu-overlay-editor-v3-manual-r1\b/g },
    { label: 'old serve command', pattern: /\bnpx serve -l 8915\b/g }
];

for (const rel of staleScanFiles) {
    const text = read(rel);
    for (const rule of staleRules) {
        for (const match of text.matchAll(rule.pattern)) {
            issues.push(`${rel}:${lineFor(text, match.index || 0)} contains ${rule.label}: "${match[0]}".`);
        }
    }
}

console.log(JSON.stringify({
    ok: issues.length === 0,
    trackedFiles: tracked.length,
    scannedFiles: staleScanFiles.length,
    ignoredLocalArtifacts: walk('.', (rel) => /(^|\/)\.DS_Store$|\.bak(?:\.|$)|(?:^|\/)(?:suvla-fix-check|aug-1915-|weird-sea-anim-|map-check-|local-run|verification-overlay).*\.png$/.test(rel)).length,
    issues
}, null, 2));

if (issues.length) process.exit(1);
