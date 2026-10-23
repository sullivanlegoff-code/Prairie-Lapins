// Validate a future four-route artifact. This script never deploys or accesses player storage.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve(process.argv[2]),revision=process.argv[3];
assert.match(revision||'',/^[a-f0-9]{40}$/);
for(const [route,format,sha]of [['',5,revision],['dev',5,revision],['preview/decorations',5,process.argv[4] || revision],['preview/accounts',4,'3e70d9e8cbe9228c63c73db007fff199199d6470']]){
 const dir=join(root,route),html=readFileSync(join(dir,'index.html'),'utf8');assert.equal(readFileSync(join(dir,'build-revision.txt'),'utf8').trim(),sha);
 const scripts=readdirSync(join(dir,'assets')).filter(f=>f.endsWith('.js')).map(f=>readFileSync(join(dir,'assets',f),'utf8')).join('\n');
 assert.ok(scripts.includes(sha));assert.ok(scripts.includes(`version:${format}`));assert.ok(html.includes(`/Project-L/${route?route+'/':''}assets/`));
 if(route==='')for(const marker of ['dev-scenario-','dev-time-','prairie-lapins.development.','signInWithOtp'])assert.ok(!scripts.includes(marker),marker);
 if(route==='dev')for(const marker of ['prairie-lapins.development.','islandStart','islandExpanded','islandFull','decorationStart','decorationDense','Collection — quinze espèces et recettes'])assert.ok(scripts.includes(marker),marker);
 if(route==='preview/decorations'){assert.ok(scripts.includes('prairie-lapins.preview.decorations.'));assert.ok(!scripts.includes('signInWithOtp'))}
 console.log(`${route||'/'}: ${sha} / v${format}`);
}
console.log('Future v5 artifact validated; no publication performed.');
