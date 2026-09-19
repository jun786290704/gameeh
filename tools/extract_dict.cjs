/* 导出 zh(键) -> en(参考) 的紧凑 TSV，供翻译使用 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.join(__dirname, '..', 'js', 'i18n_dict.js');
const code = fs.readFileSync(file, 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const D = sandbox.window.GAME_DICT;

const keys = Object.keys(D.en);
const rows = keys.map((k, i) => `${i}\t${k.replace(/\t/g, ' ').replace(/\n/g, ' ')}\t${String(D.en[k] === undefined ? '' : D.en[k]).replace(/\t/g, ' ').replace(/\n/g, ' ')}`);
fs.writeFileSync(path.join(__dirname, 'kv.tsv'), rows.join('\n'), 'utf8');
console.log('keys:', keys.length, '-> kv.tsv');

// 校验各语言键集合是否与 en 完全一致
for (const l of ['ja', 'es']) {
  const s = new Set(Object.keys(D[l]));
  const miss = keys.filter(k => !s.has(k));
  const extra = [...s].filter(k => !keys.includes(k));
  console.log(l, 'missing:', miss.length, 'extra:', extra.length);
  if (miss.length) console.log('  miss sample:', miss.slice(0, 5));
}
