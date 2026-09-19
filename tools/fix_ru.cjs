/* 修正 tr_ru.jsonl 中残留的中文，并以 en 为基准复核首尾空格 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(ROOT, 'js', 'i18n_dict.js'), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const DICT = sandbox.window.GAME_DICT;
const keys = Object.keys(DICT.en);

const FIX = {
  137: 'напр. 5000',
  244: 'напр. 1000',
  325: 'Мин. ликвидность USD (напр. 1000)',
  329: 'Мин. цена (USD, напр. 0.0001)',
  350: 'напр. Огненный тролль',
  422: 'напр. 10000',
  424: 'напр. 100'
};

const file = path.join(__dirname, 'tr_ru.jsonl');
const lines = fs.readFileSync(file, 'utf8').split('\n');
let trailingNL = lines[lines.length - 1] === '';
if (trailingNL) lines.pop();
Object.entries(FIX).forEach(([i, v]) => {
  const before = lines[i];
  lines[i] = JSON.stringify(v);
  console.log(`fix [${i}] ${keys[i]}\n   was ${before}\n   now ${lines[i]}`);
});
fs.writeFileSync(file, lines.join('\n') + (trailingNL ? '\n' : ''), 'utf8');

// 复核：以 en 译文为基准比较首尾空白
function loadJsonl(f, lang) {
  const raw = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').split('\n');
  if (raw.length && raw[raw.length - 1] === '') raw.pop();
  if (raw.length !== keys.length) throw new Error(`${lang}: ${raw.length} lines`);
  return raw.map((l, i) => {
    const v = JSON.parse(l);
    if (typeof v !== 'string' || !v.trim()) throw new Error(`${lang}: bad line ${i + 1}`);
    return v;
  });
}
const ko = loadJsonl(path.join(__dirname, 'tr_ko.jsonl'), 'ko');
const ru = loadJsonl(path.join(__dirname, 'tr_ru.jsonl'), 'ru');
const CJK = /[\u4e00-\u9fff]/;

[['ko', ko], ['ru', ru]].forEach(([name, vals]) => {
  const sp = [], cjk = [], same = [];
  keys.forEach((k, i) => {
    const v = vals[i], e = String(DICT.en[k] === undefined ? '' : DICT.en[k]);
    if (/^\s/.test(e) !== /^\s/.test(v) || /\s$/.test(e) !== /\s$/.test(v)) {
      sp.push(`[${i}] en=${JSON.stringify(e)} ${name}=${JSON.stringify(v)}`);
    }
    if (CJK.test(v)) cjk.push(`[${i}] ${JSON.stringify(k)} -> ${JSON.stringify(v)}`);
    if (v === e && /[A-Za-z]{4,}/.test(v) && !/^[\s\W]*$/.test(v)) same.push(`[${i}] ${JSON.stringify(v)}`);
  });
  console.log(`\n=== ${name} ===`);
  console.log(`  lines=${vals.length} whitespace-mismatch-vs-en=${sp.length} residual-CJK=${cjk.length}`);
  sp.slice(0, 10).forEach(s => console.log('   SP ' + s));
  cjk.slice(0, 10).forEach(s => console.log('   CJK ' + s));
  console.log(`  identical-to-en count=${same.length} (技术术语，正常)`);
  same.slice(0, 8).forEach(s => console.log('   = ' + s));
});
console.log('\nOK');
