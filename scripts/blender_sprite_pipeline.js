#!/usr/bin/env node
/**
 * Gelibolu Revival — Blender sprite pipeline launcher.
 *
 * Usage:
 *   node scripts/blender_sprite_pipeline.js --dry-run
 *   node scripts/blender_sprite_pipeline.js --profile ottoman-infantry
 *
 * Blender is intentionally offline: it renders WebP/PNG atlases before deploy.
 * The web app only consumes the exported atlas + metadata files.
 */

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const profileArgIndex = process.argv.indexOf('--profile');
const wantedProfile = profileArgIndex >= 0 ? process.argv[profileArgIndex + 1] : '';
const dryRun = args.has('--dry-run');
const blender = process.env.BLENDER_BIN || 'blender';
const outputDir = path.join(root, 'assets', 'sprites');
const workFile = path.join(root, 'assets', 'blender', 'gelibolu-unit-sprites.blend');
const scriptFile = path.join(root, 'scripts', 'render_unit_sprites.py');

const profiles = [
    'ottoman-infantry',
    'british-infantry',
    'anzac-infantry',
    'french-infantry',
    'ottoman-artillery'
].filter((id) => !wantedProfile || id === wantedProfile);

if (!profiles.length) {
    console.error(`Unknown profile: ${wantedProfile}`);
    process.exit(1);
}

const command = [
    blender,
    '--background',
    workFile,
    '--python',
    scriptFile,
    '--',
    '--output',
    outputDir,
    '--profiles',
    profiles.join(',')
];

console.log(command.join(' '));

if (dryRun) {
    console.log('Dry run only. Install Blender and create the .blend source file before rendering.');
    process.exit(0);
}

if (!fs.existsSync(workFile)) {
    console.error(`Missing Blender source file: ${workFile}`);
    process.exit(2);
}

if (!fs.existsSync(scriptFile)) {
    console.error(`Missing Blender render script: ${scriptFile}`);
    process.exit(2);
}

fs.mkdirSync(outputDir, { recursive: true });

const result = spawnSync(command[0], command.slice(1), {
    cwd: root,
    stdio: 'inherit',
    env: process.env
});

process.exit(result.status || 0);
