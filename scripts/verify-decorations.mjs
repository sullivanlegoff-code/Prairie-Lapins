import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const root = resolve(process.argv[2]), base = '/Project-L/preview/decorations/';
// Existing asset/local-URL checks plus the explicit experimental storage/service boundaries.
execFileSync('node', ['scripts/verify-production.mjs', root, base, 'laboratory'], {stdio: 'inherit'});
let scripts = '';
function walk(dir) {for (const name of readdirSync(dir)) {const file = join(dir, name); if (statSync(file).isDirectory()) walk(file); else if (name.endsWith('.js')) scripts += readFileSync(file, 'utf8');}}
walk(root);
for (const marker of ['prairie-lapins.preview.decorations.', 'PRÉVISUALISATION DÉCORATIONS v5', 'decorationStart', 'decorationDemo', 'decoratedHabitat', 'decorationDense']) assert.ok(scripts.includes(marker), `Missing preview boundary/tool: ${marker}`);
for (const marker of ['supabase.co', 'signInWithOtp', 'cloud_save']) assert.ok(!scripts.includes(marker), `Unexpected account code: ${marker}`);
console.log('Decorations v5 preview checked: dedicated prefix, prepared tools, no account client.');
