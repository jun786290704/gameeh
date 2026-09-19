const fs = require('fs');
const L = fs.readFileSync('tools/tr_ko.jsonl', 'utf8').split('\n').filter((x, i, a) => !(i === a.length - 1 && x === ''));
console.log('lines', L.length);
let bad = 0;
L.forEach((l, i) => {
  try {
    const v = JSON.parse(l);
    if (typeof v !== 'string' || !v.trim()) throw 0;
  } catch (e) {
    bad++;
    if (bad < 6) console.log('BAD', i + 1, JSON.stringify(l));
  }
});
console.log('bad', bad);
