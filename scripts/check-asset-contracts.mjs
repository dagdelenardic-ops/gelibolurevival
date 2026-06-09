#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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

function stripRuntimeSuffix(value) {
    return String(value || '').replace(/[?#].*$/, '');
}

function isLocalRuntimePath(value) {
    const clean = stripRuntimeSuffix(value);
    if (!clean || clean.startsWith('#')) return false;
    if (/^(?:https?:)?\/\//i.test(clean)) return false;
    if (/^(?:data|mailto|tel):/i.test(clean)) return false;
    return /^(?:assets|styles|book|src|manifest\.json|robots\.txt|sitemap\.xml)\//.test(clean) || clean === 'manifest.json';
}

const required = new Map();
const optional = new Map();
const issues = [];

function add(map, rel, source) {
    const clean = stripRuntimeSuffix(rel).replace(/^\.\//, '');
    if (!isLocalRuntimePath(clean)) return;
    const list = map.get(clean) || [];
    list.push(source);
    map.set(clean, list);
}

function addRequired(rel, source) {
    add(required, rel, source);
}

function addOptional(rel, source) {
    add(optional, rel, source);
}

function checkExists(rel, sources, severity) {
    const abs = path.join(root, rel);
    if (!existsSync(abs)) {
        issues.push(`${severity}: ${rel} is missing. Referenced by ${sources.slice(0, 3).join(', ')}.`);
        return;
    }
    if (statSync(abs).isFile() && statSync(abs).size === 0) {
        issues.push(`${severity}: ${rel} is empty. Referenced by ${sources.slice(0, 3).join(', ')}.`);
    }
}

const index = read('index.html');
for (const match of index.matchAll(/\b(?:href|src|content)=["']([^"']+)["']/g)) {
    addRequired(match[1], `index.html:${match.index}`);
}
for (const match of index.matchAll(/fetch\(["']([^"']+)["']\)/g)) {
    addRequired(match[1], `index.html:${match.index}`);
}

const manifest = JSON.parse(read('manifest.json'));
for (const icon of manifest.icons || []) {
    addRequired(icon.src, 'manifest.json icons');
}

for (const cssFile of walk('styles', (rel) => rel.endsWith('.css'))) {
    const css = read(cssFile);
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
        addRequired(match[1], `${cssFile}:${match.index}`);
    }
}

const sourceFiles = walk('src', (rel) => rel.endsWith('.js'));
for (const rel of sourceFiles) {
    const text = read(rel);
    for (const match of text.matchAll(/['"`](assets\/[^'"`]+?\.(?:png|jpe?g|webp|mp3|mp4|json|html))['"`]/g)) {
        if (match[1].includes('${')) continue;
        if (match[1].startsWith('assets/sprites/')) continue;
        addRequired(match[1], `${rel}:${match.index}`);
    }
    for (const match of text.matchAll(/\$\{P\}\/([^`'"}]+?\.(?:png|jpe?g|webp|mp4|mp3))/g)) {
        const base = /const\s+P\s*=\s*['"]([^'"]+)['"]/.exec(text)?.[1];
        if (base) addRequired(`${base}/${match[1]}`, `${rel}:${match.index}`);
    }
    for (const match of text.matchAll(/icon:\s*['"]([A-Za-z0-9_-]+)['"]/g)) {
        addRequired(`assets/icons/${match[1]}.png`, `${rel}:${match.index}`);
    }
    for (const match of text.matchAll(/\b(?:bombardment|naval|attack|recon|evacuation|landing|default):\s*['"]([A-Za-z0-9_-]+)['"]/g)) {
        addRequired(`assets/icons/${match[1]}.png`, `${rel}:${match.index}`);
    }
    for (const match of text.matchAll(/spriteAtlas:\s*['"]([^'"]+)['"][\s\S]*?atlasReady:\s*true/g)) {
        addRequired(match[1], `${rel}:${match.index}`);
    }
    for (const match of text.matchAll(/spriteAtlas:\s*['"]([^'"]+)['"][\s\S]*?atlasReady:\s*false/g)) {
        addOptional(match[1], `${rel}:${match.index}`);
    }
}

addRequired('assets/gallipoli-map.png', 'base raster map');
addRequired('book/animation-events.json', 'animation loader');
addRequired('book/gallipoli-events.js', 'book data loader');

for (const [rel, sources] of required) checkExists(rel, sources, 'required');
const optionalMissing = [];
for (const [rel, sources] of optional) {
    if (!existsSync(path.join(root, rel))) optionalMissing.push({ rel, sources: sources.slice(0, 3) });
    else checkExists(rel, sources, 'optional');
}

console.log(JSON.stringify({
    ok: issues.length === 0,
    requiredAssets: required.size,
    optionalAssets: optional.size,
    optionalMissing,
    issues
}, null, 2));

if (issues.length) process.exit(1);
