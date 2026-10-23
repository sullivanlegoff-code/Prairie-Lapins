import {execFileSync} from 'node:child_process';
import {writeFileSync, readdirSync, readFileSync, unlinkSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {tmpdir} from 'node:os';

// Usage: build-pages.mjs [outDir] [--base=/path/] [--git-revision]
// Without options the output is unchanged: GitHub Pages base /Project-L/, revision from VITE_BUILD_REVISION.
const args = process.argv.slice(2), positional = args.filter(arg => !arg.startsWith('--'));
const option = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const root = resolve(positional[0] || join(tmpdir(), 'prairie-pages'));
const base = option('base') ?? process.env.PRAIRIE_BASE ?? '/Project-L/';
if (!base.startsWith('/') || !base.endsWith('/')) throw new Error(`Base must start and end with "/": ${base}`);
const run = (command, args) => execFileSync(command, args, {stdio: 'inherit'});
// Manual deployments label the build with the local commit, marked when uncommitted changes exist.
if (args.includes('--git-revision') && !process.env.VITE_BUILD_REVISION) {
  const git = gitArgs => execFileSync('git', gitArgs, {encoding: 'utf8'}).trim();
  process.env.VITE_BUILD_REVISION = git(['rev-parse', 'HEAD']) + (git(['status', '--porcelain']) ? '-modifie' : '');
}
const revision = process.env.VITE_BUILD_REVISION || 'local';
// On Windows npm is a .cmd shim that execFileSync cannot start without a shell (ENOENT/EINVAL):
// run npm's own CLI with this Node instead. Other platforms keep calling `npm` unchanged.
const npm = args => process.platform === 'win32' && process.env.npm_execpath ? run(process.execPath, [process.env.npm_execpath, ...args]) : run('npm', args);
// A single artifact replaces BOTH routes atomically. No independent Pages deployment.
// Both bundles use the parent site's music directory, including builds under /Project-L/.
process.env.VITE_SHARED_MUSIC_BASE = base;
npm(['run', 'build', '--', '--base=' + base, '--outDir', root, '--emptyOutDir']);
writeFileSync(join(root, 'build-revision.txt'), revision + '\n');
writeFileSync(join(root, '.nojekyll'), '');
npm(['run', 'build:lab', '--', '--base=' + base + 'dev/', '--outDir', join(root, 'dev'), '--emptyOutDir']);
writeFileSync(join(root, 'dev', 'build-revision.txt'), revision + '\n');
// Vite copies public/ into both outputs. Remove only byte-identical music copies from the lab.
for (const name of readdirSync(join(root, 'assets/audio/music'))) {
  const shared = join(root, 'assets/audio/music', name), duplicate = join(root, 'dev/assets/audio/music', name);
  if (!name.endsWith('.mp3') || !readFileSync(shared).equals(readFileSync(duplicate))) throw new Error(`Unexpected music copy: ${name}`);
  unlinkSync(duplicate);
}
run('node', ['scripts/verify-production.mjs', root, base]);
run('node', ['scripts/verify-production.mjs', join(root, 'dev'), base + 'dev/', 'laboratory']);
// Dedicated standalone entry/public directory; the game reuses the mount without its bootstrap.
npm(['run', 'build', '--', '--mode=cooking-prototype', '--base=' + base + 'cooktap-prototype/', '--outDir', join(root, 'cooktap-prototype'), '--emptyOutDir']);
run('node', ['scripts/verify-cooking-prototype.mjs', join(root, 'cooktap-prototype'), base + 'cooktap-prototype/']);
run('node', ['scripts/verify-shared-music.mjs', root]);
