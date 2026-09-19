'use strict';
// 校验前端 ABI（按合约分组）与链上新部署实现是否一致 —— 修正版
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const FRONTEND_DIR = 'M:/ElementHeroes_Contracts/indexfrontend';
const CONTRACTS_DIR = 'M:/ElementHeroes_Contracts/contracts';

const IMPL = {
  gameToken:   '0x07ecdc0BfD063f6f1af21e149379846089ef5bCE',
  characters:  '0xF211B11a4012f87fb2061DF1D272A81E2B534eab',
  weapons:     '0x63BA744180895F4D2458c69e1275295b4146C513',
  shards:      '0xdD02A1882204052EE31746EB304727f3cfDA78b0',
  essence:     '0xF2DA70b371d92197be0F581A89506eA31279bef4',
  randomOracle:'0xf401BB5482A28040165E2B491D9BdB9d6Fd6b7cb',
  oracle:      '0x975bade20D9690E8eF5b5Ec82739F13aA9B3C200',
  vault:       '0x5E25717AFF2A4C3C60a752Cf9c1e5222247f3Df3',
  v3:          '0xDE8B47AbEce8b3CB396CcbeD8f80c818e8e714ac',
  forgeShop:   '0xFf4b5B20F2c45ac396130bDC612FF003463986b2',
  enhanceShop: '0x3A129898cE6e83b4f30d38386aCC8d847a140cB4',
  boss:        '0xcC4E1adb04FC9D55d7830D510FB8Ca754aa8B022',
  marketplace: '0xBBdB58E827604c9F2AB97E89a5D63083A0950a75'
};
const KEY_FILE = {
  gameToken: 'GameToken.sol', characters: 'Characters.sol', weapons: 'Weapons.sol',
  shards: 'Shards.sol', essence: 'Essence.sol', randomOracle: 'RandomOracleV2.sol',
  oracle: 'PriceOracle.sol', vault: 'Vault.sol', v3: 'ElementHeroesV3.sol',
  forgeShop: 'ForgeShop.sol', enhanceShop: 'EnhanceShop.sol',
  boss: 'WorldBossV2.sol', marketplace: 'Marketplace.sol'
};

function extractAbisPerKey(file) {
  const s = fs.readFileSync(file, 'utf8');
  const out = {};
  const re = /const\s+(?:ABIs|ADMIN_ABIS)\s*=\s*\{/g;
  let m;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length;
    const endMatch = s.indexOf('\n};', start);
    if (endMatch < 0) continue;
    const block = s.slice(start, endMatch);
    let curKey = null;
    const addSig = (k, sigRaw) => {
      const sig = sigRaw.trim();
      if (sig.startsWith('function')) out[k].funcs.push(sig.replace(/^function\s+/, ''));
      else if (sig.startsWith('event')) out[k].events.push(sig.replace(/^event\s+/, ''));
    };
    for (const line of block.split('\n')) {
      // 兼容多行块与单行数组（如 shards: ["...","..."]）
      const km = line.match(/^ {2}(\w+):\s*\[(.*)$/);
      if (km) {
        curKey = km[1];
        out[curKey] = out[curKey] || { funcs: [], events: [] };
        if (km[2] && km[2].trim()) {
          const im = km[2].matchAll(/"((?:function|event)\s+[^"]+)"/g);
          for (const it of im) addSig(curKey, it[1]);
        }
        continue;
      }
      if (!curKey) continue;
      const fm = line.matchAll(/"((?:function|event)\s+[^"]+)"/g);
      for (const it of fm) addSig(curKey, it[1]);
    }
  }
  return out;
}

function normalizeParams(p) {
  if (!p || !p.trim()) return '';
  const parts = []; let depth = 0, cur = '';
  for (const ch of p) {
    if (ch === '(' || ch === '<') depth++;
    else if (ch === ')' || ch === '>') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts.map(pt => {
    let t = pt.trim().replace(/\bcalldata\b/g,'').replace(/\bmemory\b/g,'').replace(/\bpayable\b/g,'').replace(/\bindexed\b/g,'').trim();
    const sp = t.lastIndexOf(' ');
    if (sp > 0) t = t.slice(0, sp).trim();
    return t.replace(/\s+/g,'');
  }).join(',');
}
function collectSourceAbis() {
  const out = {};
  for (const key of Object.keys(KEY_FILE)) {
    const s = fs.readFileSync(path.join(CONTRACTS_DIR, KEY_FILE[key]), 'utf8');
    out[key] = { funcs: new Set(), events: new Set() };
    const fre = /function\s+(\w+)\s*\(([^)]*)\)\s*(?:external|public)/g;
    let m;
    while ((m = fre.exec(s))) out[key].funcs.add(m[1] + '(' + normalizeParams(m[2]) + ')');
    const vre = /(?:mapping\s*\([^)]*\)\s*|address\[\]\s*|uint\d*\s*|address\s*|bool\s*|string\s*|bytes32\s*|IERC20\s*)(\w+)\s+public\s*;/g;
    let v;
    while ((v = vre.exec(s))) out[key].funcs.add(v[1] + '()');
    const ere = /event\s+(\w+)\s*\(([^)]*)\)/g;
    let e;
    while ((e = ere.exec(s))) {
      out[key].events.add(e[1] + '(' + normalizeParams(e[2]) + ')');
    }
  }
  return out;
}

function canonFrontendSig(sig) {
  const name = sig.split('(')[0];
  const open = sig.indexOf('('), close = sig.indexOf(')');
  return name + '(' + normalizeParams(sig.slice(open + 1, close)) + ')';
}

(async () => {
  const src = collectSourceAbis();
  const coreAbis = extractAbisPerKey(FRONTEND_DIR + '/js/core.js');
  const adminAbis = extractAbisPerKey(FRONTEND_DIR + '/js/admin.js');
  const provider = new ethers.providers.JsonRpcProvider('https://bsc-testnet.publicnode.com');
  const missing = [], evMismatch = [], fetchFail = [];

  for (const key of Object.keys(IMPL)) {
    let code;
    try { code = await provider.getCode(IMPL[key]); } catch (e) { fetchFail.push(`${key}: 获取字节码失败 ${String(e.message).slice(0,60)}`); continue; }
    if (!code || code === '0x') { fetchFail.push(`${key}: 空字节码`); continue; }
    const codeLower = code.toLowerCase();
    const fe = { funcs: new Map(), events: new Map() };
    for (const src2 of [coreAbis[key], adminAbis[key]]) {
      if (!src2) continue;
      for (const f of src2.funcs) fe.funcs.set(canonFrontendSig(f), f);
      for (const e of src2.events) fe.events.set(canonFrontendSig(e), e);
    }
    for (const [canon, raw] of fe.funcs) {
      const sel = ethers.utils.id(canon).slice(0, 10);
      // PUSH4 会去掉前导零（0x00fdd58e 在字节码里可能是 63fdd58e），两种形态都查
      const selFull = sel.slice(2), selStripped = selFull.replace(/^0+/, '');
      const found = codeLower.includes(selFull) || (selStripped !== selFull && codeLower.includes(selStripped));
      if (!found) missing.push(`${key}: ${canon} (${sel}) 前端有、链上无 <- "${raw}"`);
    }
    // 标准代币事件定义在 OZ import（ERC721/ERC1155 基类），单文件扫描看不到，视为已知一致
    const STD_EVENTS = new Set([
      'Transfer(address,address,uint256)','Approval(address,address,uint256)',
      'ApprovalForAll(address,address,bool)','TransferSingle(address,address,address,uint256,uint256)',
      'TransferBatch(address,address,address,uint256[],uint256[])','URI(string,uint256)'
    ]);
    for (const [canon, raw] of fe.events) {
      if (STD_EVENTS.has(canon)) continue;
      if (!src[key].events.has(canon)) evMismatch.push(`${key}: 事件 ${canon} ≠ 源码 <- "${raw}"`);
    }
  }
  console.log('== 函数缺失（前端有、链上无）==');
  console.log(missing.length ? missing.join('\n') : '(无)');
  console.log('\n== 事件与源码不一致 ==');
  console.log(evMismatch.length ? evMismatch.join('\n') : '(无)');
  console.log('\n== 字节码获取失败（需重试）==');
  console.log(fetchFail.length ? fetchFail.join('\n') : '(无)');
})();
