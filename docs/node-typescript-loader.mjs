import {registerHooks} from 'node:module';
import {readFileSync, existsSync} from 'node:fs';
import ts from 'typescript';
// Node-only loader for the actual game rules, without a Vite server or browser.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL);
      if (!/\.[a-z]+$/i.test(url.pathname) && existsSync(new URL(url.href + '.ts'))) return next(url.href + '.ts', context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.json')) return {format:'module', shortCircuit:true, source:'export default '+readFileSync(new URL(url),'utf8')};
    if (url.endsWith('.ts')) return {format:'module', shortCircuit:true, source:ts.transpileModule(readFileSync(new URL(url),'utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2022}}).outputText.replaceAll('import.meta.env', '({BASE_URL: "/", MODE: "test"})')};
    return next(url, context);
  }
});

