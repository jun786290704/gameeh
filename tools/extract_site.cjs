/* 提取 index.html 中 zh 块定义的全部 i18n 键，输出 TSV: key<TAB>en */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// 抓出 I18N 对象字面量（从 "const I18N = {" 到其后第一个独立行 "};"）
const start = html.indexOf('const I18N = {');
if (start < 0) throw new Error('I18N not found');
const endMarker = '\n};\n';
const end = html.indexOf(endMarker, start);
if (end < 0) throw new Error('I18N end not found');
const src = html.slice(start + 'const '.length, end + 3); // 到 "};" 结束
const I18N = eval('(' + src.slice('I18N = '.length, src.length - 1) + ')');

const langs = Object.keys(I18N);
console.log('langs:', langs.join(','), '| zh keys:', Object.keys(I18N.zh).length);
for (const l of langs) {
  const s = new Set(Object.keys(I18N[l]));
  const ref = Object.keys(I18N.zh);
  console.log(' ', l, Object.keys(I18N[l]).length, 'miss:', ref.filter(k => !s.has(k)).length);
}

// HTML 中实际使用的键
const used = new Set();
for (const m of html.matchAll(/data-i18n(-alt)?="([^"]+)"/g)) used.add(m[2]);
const defined = new Set(Object.keys(I18N.zh));
console.log('used in HTML:', used.size);
console.log('used but undefined:', [...used].filter(k => !defined.has(k)));
console.log('defined but unused:', [...defined].filter(k => !used.has(k)));

const clean = v => String(v === undefined ? '' : v).replace(/\t/g, ' ').replace(/\n/g, ' ');
const rows = Object.keys(I18N.zh).map(k => `${k}\t${clean(I18N.zh[k])}\t${clean(I18N.en[k])}`);
fs.writeFileSync(path.join(__dirname, 'site_kv.tsv'), rows.join('\n') + '\n', 'utf8');
console.log('written -> tools/site_kv.tsv');
