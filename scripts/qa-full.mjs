#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toPosix = (filePath) => filePath.split(path.sep).join('/');

function walk(dir, predicate = () => true) {
    const absDir = path.join(root, dir);
    const out = [];
    for (const entry of readdirSync(absDir)) {
        const abs = path.join(absDir, entry);
        const rel = toPosix(path.relative(root, abs));
        const st = statSync(abs);
        if (st.isDirectory()) {
            if (entry === 'node_modules' || entry === '.git' || entry === '.vercel') continue;
            out.push(...walk(rel, predicate));
        } else if (predicate(rel)) {
            out.push(rel);
        }
    }
    return out;
}

function run(label, command, args) {
    console.log(`\n==> ${label}`);
    const result = spawnSync(command, args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    if (result.status !== 0) {
        throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}.`);
    }
}

function checkSyntax() {
    const files = [
        ...walk('src', (rel) => rel.endsWith('.js')),
        ...walk('scripts', (rel) => /\.(mjs|js)$/.test(rel) && !rel.includes('.bak')),
        'book/gallipoli-events.js'
    ];

    for (const file of files) {
        run(`syntax ${file}`, process.execPath, ['--check', file]);
    }
}

const steps = [
    ['JavaScript syntax', checkSyntax],
    ['runtime contracts', () => run('runtime contracts', process.execPath, ['scripts/check-runtime-contracts.mjs'])],
    ['asset contracts', () => run('asset contracts', process.execPath, ['scripts/check-asset-contracts.mjs'])],
    ['historical contracts', () => run('historical contracts', process.execPath, ['scripts/check-historical-contracts.mjs'])],
    ['repo hygiene', () => run('repo hygiene', process.execPath, ['scripts/check-repo-hygiene.mjs'])],
    ['release date matrix', () => run('release date matrix', process.execPath, ['scripts/qa-release-matrix.mjs'])],
    ['map data gates', () => run('map data gates', process.execPath, ['scripts/qa-map-gates.mjs'])],
    ['sector verification', () => run('sector verification', process.execPath, ['scripts/verify-sectors.mjs'])],
    ['HTTP smoke', () => run('HTTP smoke', process.execPath, ['scripts/qa-http-smoke.mjs'])],
    ['git whitespace check', () => run('git diff --check', 'git', ['diff', '--check'])]
];

const startedAt = Date.now();
try {
    for (const [, step] of steps) step();
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`\nQA FULL PASS (${seconds}s)`);
} catch (err) {
    console.error(`\nQA FULL FAIL: ${err.message || err}`);
    process.exit(1);
}
