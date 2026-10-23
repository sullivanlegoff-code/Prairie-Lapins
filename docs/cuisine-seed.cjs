// Shared by the Cuisine browser checks: a deterministic starting save that owns the Kitchen and two rabbits.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
exports.SAVE = 'prairie-lapins.save.v1';
/** A fresh v12 game with the Kitchen bought through the real command, on the free spot nearest the first enclosure. */
exports.seededSave = function seededSave() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cuisine-flow-')), 'sim.cjs');
  require('esbuild').buildSync({stdin: {contents: "export {createGame, act, encodeGame} from './src/simulation';", resolveDir: path.join(__dirname, '..'), loader: 'ts'},
    bundle: true, platform: 'node', format: 'cjs', outfile: file, define: {'import.meta.env.BASE_URL': JSON.stringify('/')}});
  const {createGame, act, encodeGame} = require(file), now = Date.now(), start = createGame(now), home = start.buildings.find(b => b.kind === 'enclosure');
  // Two owned rabbits are needed (the new game has one): fund the seed and buy a second through the real command.
  start.pattes = 5000;
  const second = ['neige', 'paille'].map(species => act(start, {type: 'buyRabbit', species, enclosureId: home.id}, now)).find(r => r.ok);
  assert.ok(second, 'a second rabbit can be bought'); const game = second.state;
  let best = null;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const r = act(game, {type: 'buyBuilding', kind: 'kitchen', x, y}, now);
    if (r.ok) { const d = Math.hypot(x - home.x, y - home.y); if (!best || d < best.d) best = {d, state: r.state}; }
  }
  assert.ok(best, 'a valid Kitchen placement exists');
  return {json: encodeGame(best.state), state: best.state};
};
