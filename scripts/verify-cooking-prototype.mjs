import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, resolve} from 'node:path';
const root = resolve(process.argv[2]), base = process.argv[3];
const html = readFileSync(join(root, 'index.html'), 'utf8');
assert.ok(html.includes('id="cooking-app"'), 'Missing isolated cooking entry');
assert.ok(!html.includes('id="app"'), 'Must not mount Prairie Lapins');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = match[1];
  if (url === 'data:,') continue;
  const relative = url.startsWith(base) ? url.slice(base.length) : url.replace(/^\.\//, '');
  assert.ok(!relative.startsWith('/') && !relative.includes('..') && !relative.includes(':'), `External resource: ${url}`);
  assert.ok(statSync(join(root, relative)).isFile(), `Missing prototype resource: ${relative}`);
}
assert.ok(readFileSync(join(root, 'NOTICE.txt'), 'utf8').includes('2d853495b03f837ef86bf20a591547bc1161a88f'));
assert.ok(readFileSync(join(root, 'MIT.txt'), 'utf8').includes('Permission is hereby granted'));
const js = readdirSync(join(root, 'assets')).filter(name => name.endsWith('.js')).map(name => readFileSync(join(root, 'assets', name), 'utf8')).join('');
for (const marker of ['localStorage', 'sessionStorage', 'indexedDB', 'AudioContext', 'new Audio(', 'prairie-lapins.save', 'Phaser']) assert.ok(!js.includes(marker), `Unexpected game/storage/audio coupling: ${marker}`);
console.log('Cooking prototype checked: separate entry, local resources, notices, no game/storage/audio imports.');
