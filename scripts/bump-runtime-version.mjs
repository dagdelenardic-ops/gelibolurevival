#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nextVersion = process.argv[2];

if (!nextVersion || !/^[A-Za-z0-9._-]+$/.test(nextVersion)) {
    console.error('Usage: node scripts/bump-runtime-version.mjs 20260523-logic-r3');
    process.exit(2);
}

const toPosix = (filePath) => filePath.split(path.sep).join('/');

function walk(dir, predicate = () => true) {
    const out = [];
    for (const entry of readdirSync(path.join(root, dir))) {
        const abs = path.join(root, dir, entry);
        const rel = toPosix(path.relative(root, abs));
        const st = statSync(abs);
        if (st.isDirectory()) {
            if (entry === 'node_modules' || entry === '.git') continue;
            out.push(...walk(rel, predicate));
        } else if (predicate(rel)) {
            out.push(rel);
        }
    }
    return out;
}

const files = [
    'index.html',
    'assets/calibrate.html',
    ...walk('src', (rel) => rel.endsWith('.js')),
    'scripts/check-historical-contracts.mjs',
    'scripts/qa-map-gates.mjs',
    'scripts/qa-release-matrix.mjs',
    'scripts/verify-sectors.mjs'
];

let changed = 0;
for (const rel of files) {
    const abs = path.join(root, rel);
    const before = readFileSync(abs, 'utf8');
    const after = before.replace(/\?v=[A-Za-z0-9._-]+/g, `?v=${nextVersion}`);
    if (after !== before) {
        writeFileSync(abs, after);
        changed += 1;
    }
}

console.log(JSON.stringify({ ok: true, version: nextVersion, changedFiles: changed }, null, 2));
