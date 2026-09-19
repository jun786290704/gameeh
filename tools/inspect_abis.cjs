'use strict';
const fs = require('fs');
const s = fs.readFileSync('M:/ElementHeroes_Contracts/indexfrontend/js/core.js', 'utf8');
const m = /const\s+ABIs\s*=\s*\{/.exec(s);
const start = m.index + m[0].length;
const end = s.indexOf('\n};', start);
const block = s.slice(start, end);
const lines = block.split('\n');
let cur = null;
const counts = {};
for (const line of lines) {
  const km = line.match(/^\s{2}(\w+):\s*\[/);
  if (km) { cur = km[1]; counts[cur] = { f: 0, e: 0 }; continue; }
  if (!cur) continue;
  if (/"(function|event)\s/.test(line)) {
    if (/"function\s/.test(line)) counts[cur].f++;
    else counts[cur].e++;
  }
}
console.log(JSON.stringify(counts, null, 1));
for (const key of ['essence', 'forgeShop', 'v3', 'randomOracle']) {
  const km = new RegExp('^\\s{2}' + key + ':\\s*\\[', 'm');
  const km2 = km.exec(block);
  if (!km2) { console.log('---', key, 'NOT FOUND'); continue; }
  const lineStart = block.lastIndexOf('\n', km2.index) + 1;
  const rest = block.slice(km2.index + km2[0].length);
  const nextKey = /^\s{2}\w+:\s*\[/m.exec(rest);
  const lineEnd = nextKey ? block.lastIndexOf('\n', km2.index + km2[0].length + nextKey.index) : block.length;
  console.log('===== ' + key + ' =====');
  console.log(block.slice(lineStart, lineEnd).trim().split('\n').map(x => x.trim()).join('\n'));
}
