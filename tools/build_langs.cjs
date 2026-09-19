/* 校验并合并 ko/ru 译文，生成 i18n_dict.js 追加块 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// 1) 读取现有字典，取键集合（以 en 为准）
const code = fs.readFileSync(path.join(ROOT, 'js', 'i18n_dict.js'), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const keys = Object.keys(sandbox.window.GAME_DICT.en);
console.log('source keys:', keys.length);

// 2) 读取 jsonl
function loadJsonl(file, lang) {
  const txt = fs.readFileSync(file, 'utf8');
  if (txt.charCodeAt(0) === 0xFEFF) throw new Error('BOM detected in ' + file);
  const raw = txt.split('\n');
  if (raw.length && raw[raw.length - 1] === '') raw.pop();
  if (raw.length !== keys.length) {
    throw new Error(`${lang}: expected ${keys.length} lines, got ${raw.length}`);
  }
  const out = [];
  raw.forEach((l, i) => {
    let v;
    try { v = JSON.parse(l); }
    catch (e) { throw new Error(`${lang}: line ${i + 1} invalid JSON: ${l.slice(0, 80)}`); }
    if (typeof v !== 'string') throw new Error(`${lang}: line ${i + 1} not a string`);
    if (!v.trim()) throw new Error(`${lang}: line ${i + 1} empty`);
    out.push(v);
  });
  return out;
}

const ko = loadJsonl(path.join(__dirname, 'tr_ko.jsonl'), 'ko');
const ru = loadJsonl(path.join(__dirname, 'tr_ru.jsonl'), 'ru');

// 3) 质量检查：源 emoji 前缀是否保留、是否残留中文
const EMOJI_RE = /^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]\uFE0F?[\u200D]?)+\s?/u;
const CJK = /[\u4e00-\u9fff]/;

function audit(name, vals, expectScript) {
  const issues = [];
  keys.forEach((k, i) => {
    const v = vals[i];
    // emoji 前缀一致性
    const ke = k.match(EMOJI_RE), ve = v.match(EMOJI_RE);
    const kp = ke ? ke[0].trim() : '', vp = ve ? ve[0].trim() : '';
    if (kp !== vp) issues.push(`EMOJI [${i}] ${JSON.stringify(k.slice(0, 24))} -> ${JSON.stringify(v.slice(0, 24))} (src="${kp}" got="${vp}")`);
    // 残留中文（技术术语白名单除外）
    if (CJK.test(v)) issues.push(`CJK  [${i}] ${JSON.stringify(k.slice(0, 24))} -> ${JSON.stringify(v.slice(0, 40))}`);
    // 与英文完全相同可能是漏译（仅统计，不算错误）
  });
  console.log(`\n--- ${name} audit: ${issues.length} issues ---`);
  issues.slice(0, 40).forEach(s => console.log('  ' + s));
  if (issues.length > 40) console.log(`  ... and ${issues.length - 40} more`);
  return issues;
}

const koIssues = audit('ko', ko);
const ruIssues = audit('ru', ru);

// 4) 首尾空格一致性检查（拼接片段类）
function spaceAudit(name, vals) {
  const bad = [];
  keys.forEach((k, i) => {
    const v = vals[i];
    const kLead = /^\s/.test(k), vLead = /^\s/.test(v);
    const kTrail = /\s$/.test(k), vTrail = /\s$/.test(v);
    if (kLead !== vLead || kTrail !== vTrail) {
      bad.push(`[${i}] ${JSON.stringify(k)} -> ${JSON.stringify(v)}`);
    }
  });
  console.log(`--- ${name} space audit: ${bad.length} ---`);
  bad.slice(0, 20).forEach(s => console.log('  ' + s));
  return bad;
}
spaceAudit('ko', ko);
spaceAudit('ru', ru);

// 5) 生成 JS 块
function esc(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function block(lang, vals) {
  const lines = vals.map((v, i) => `'${esc(keys[i])}':'${esc(v)}',`);
  return `\n/* ===== ${lang} ===== */\nwindow.GAME_DICT.${lang} = Object.assign(window.GAME_DICT.${lang} || {}, {\n` + lines.join('\n') + '\n});\n';
}

if (process.argv.includes('--write')) {
  const add = block('ko', ko) + block('ru', ru);
  fs.appendFileSync(path.join(ROOT, 'js', 'i18n_dict.js'), add, 'utf8');
  console.log('\nappended ko+ru blocks to js/i18n_dict.js');
} else {
  console.log('\n(dry run — pass --write to append)');
}
