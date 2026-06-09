#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
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
            if (entry === 'node_modules' || entry === '.git') continue;
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

function lineFor(text, index) {
    return text.slice(0, index).split('\n').length;
}

const runtimeFiles = [
    'index.html',
    'assets/calibrate.html',
    ...walk('src', (rel) => rel.endsWith('.js')),
    'scripts/check-historical-contracts.mjs',
    'scripts/qa-map-gates.mjs',
    'scripts/qa-release-matrix.mjs',
    'scripts/verify-sectors.mjs'
];

const visibleRuntimeFiles = [
    'index.html',
    'book/gallipoli-events.js',
    ...walk('src', (rel) => rel.endsWith('.js')),
    ...walk('styles', (rel) => rel.endsWith('.css'))
];

const issues = [];
const versionHits = [];
for (const rel of runtimeFiles) {
    const text = read(rel);
    for (const match of text.matchAll(/\?v=([A-Za-z0-9._-]+)/g)) {
        versionHits.push({ rel, version: match[1], index: match.index || 0 });
    }
}

const versions = [...new Set(versionHits.map((hit) => hit.version))];
if (versions.length !== 1) {
    issues.push(`Expected one runtime ?v= version, found ${versions.length || 0}: ${versions.join(', ') || '(none)'}.`);
}
const runtimeVersion = versions[0] || null;

const importRe = /(?:from\s*['"]|import\(\s*['"])(\.{1,2}\/[^'"]+?\.js)(\?v=([^'"]+))?['"]/g;
for (const rel of runtimeFiles.filter((file) => file.startsWith('src/') || file === 'assets/calibrate.html' || file === 'scripts/check-historical-contracts.mjs' || file === 'scripts/qa-map-gates.mjs' || file === 'scripts/qa-release-matrix.mjs' || file === 'scripts/verify-sectors.mjs')) {
    const text = read(rel);
    for (const match of text.matchAll(importRe)) {
        const specifier = match[1];
        const version = match[3] || '';
        const line = lineFor(text, match.index || 0);
        if (!version) {
            issues.push(`${rel}:${line} imports ${specifier} without the runtime ?v= query.`);
        } else if (runtimeVersion && version !== runtimeVersion) {
            issues.push(`${rel}:${line} imports ${specifier} with ?v=${version}, expected ?v=${runtimeVersion}.`);
        }
    }
}

const leakRules = [
    {
        label: 'old roster debug label',
        pattern: /Pause Roster/g,
        files: visibleRuntimeFiles
    },
    {
        label: 'old source suffix leak',
        pattern: /[·-]\s*Kayd[ıi]\b/g,
        files: visibleRuntimeFiles
    },
    {
        label: 'wrong 5th Army date',
        pattern: /23 Mart'ta 5/g,
        files: visibleRuntimeFiles,
        allow: [/^src\/engine\/phase-engine\.js$/]
    },
    {
        label: 'visible English stamina label',
        pattern: /\bStamina\b/g,
        files: visibleRuntimeFiles,
        allow: [/^src\/data\/casualty-model\.js$/, /^src\/render\/animation-orchestrator\.js$/]
    }
];

for (const rule of leakRules) {
    const allow = rule.allow || [];
    for (const rel of rule.files) {
        if (allow.some((allowed) => allowed.test(rel))) continue;
        const text = read(rel);
        for (const match of text.matchAll(rule.pattern)) {
            issues.push(`${rel}:${lineFor(text, match.index || 0)} contains ${rule.label}: "${match[0]}".`);
        }
    }
}

const index = read('index.html');
const requiredIndexSnippets = [
    ['loading overlay', 'id="loadingOverlay"'],
    ['map container', 'class="map-container"'],
    ['timeline footer', 'class="timeline"'],
    ['module entry', `src="src/app.js?v=${runtimeVersion || ''}"`]
];

for (const [label, snippet] of requiredIndexSnippets) {
    if (!index.includes(snippet)) issues.push(`index.html is missing ${label} (${snippet}).`);
}

const report = {
    ok: issues.length === 0,
    runtimeVersion,
    checkedFiles: {
        runtime: runtimeFiles.length,
        visibleRuntime: visibleRuntimeFiles.length
    },
    issues
};

console.log(JSON.stringify(report, null, 2));
if (issues.length) process.exit(1);
