'use strict';

/* =================================================================
   管理后台 —— 完整管理控制台
   分区：概览 / 价格预言机 / 金库 / 市场 / 世界BOSS / 核心玩法V3 /
        锻造厂 / 强化铺 / 随机预言机 / NFT与代币 / 我的授权
   非管理员：只读查看全部配置；管理员：全部操作
   ================================================================= */
const ADMIN_CONTRACTS = [
  { key:'gameToken',   name:'GameToken', icon:'🪙' },
  { key:'characters',  name:'Characters', icon:'🧙' },
  { key:'weapons',     name:'Weapons', icon:'🗡️' },
  { key:'shards',      name:'Shards', icon:'💎' },
  { key:'essence',     name:'Essence', icon:'🧪' },
  { key:'v3',          name:'ElementHeroesV3', icon:'⚔️' },
  { key:'forgeShop',   name:'ForgeShop', icon:'🔨' },
  { key:'enhanceShop', name:'EnhanceShop', icon:'✨' },
  { key:'randomOracle',name:'RandomOracleV2', icon:'🎲' },
  { key:'oracle',      name:'PriceOracle', icon:'💰' },
  { key:'vault',       name:'Vault', icon:'🏦' },
  { key:'marketplace', name:'Marketplace', icon:'🏪' },
  { key:'boss',        name:'WorldBossV2', icon:'🐉' }
];

const ADMIN_ABIS = {
  gameToken: [
    "function owner() view returns (address)","function totalSupply() view returns (uint256)",
    "function minters(address) view returns (bool)","function setMinter(address,bool)",
    "function mint(address,uint256)","function burn(uint256)"
  ],
  characters: [
    "function owner() view returns (address)","function paused() view returns (bool)","function pause()","function unpause()",
    "function minters(address) view returns (bool)","function setMinter(address,bool)",
    "function game() view returns (address)","function setGame(address)",
    "function registry() view returns (address)","function setRegistry(address)",
    "function staminaRegen() view returns (uint256)","function maxStamina() view returns (uint8)",
    "function setStaminaRegen(uint256)","function setMaxStamina(uint8)"
  ],
  weapons: [
    "function owner() view returns (address)","function paused() view returns (bool)","function pause()","function unpause()",
    "function minters(address) view returns (bool)","function setMinter(address,bool)",
    "function game() view returns (address)","function setGame(address)",
    "function blacksmith() view returns (address)","function setBlacksmith(address)",
    "function registry() view returns (address)","function setRegistry(address)"
  ],
  shards: [
    "function owner() view returns (address)","function paused() view returns (bool)","function pause()","function unpause()",
    "function minters(address) view returns (bool)","function setMinter(address,bool)"
  ],
  essence: [
    "function owner() view returns (address)","function paused() view returns (bool)","function pause()","function unpause()",
    "function minters(address) view returns (bool)","function setMinter(address,bool)"
  ],
  v3: [
    "function owner() view returns (address)","function paused() view returns (bool)","function pause()","function unpause()",
    "function pendingExpiryBlocks() view returns (uint256)","function maxPendingPerPlayer() view returns (uint256)",
    "function setPendingExpiryBlocks(uint256)","function setMaxPendingPerPlayer(uint256)",
    "function setVault(address)","function setRandomOracle(address)","function setPriceOracle(address)",
    "function setGameToken(address)","function setCharacterContract(address)","function setWeaponContract(address)",
    "function setBoss(address)","function setRegistry(address)","function setExcludedFromRegistry(address,bool)",
    "function addMonster(string,uint8,uint32,uint32,uint32)","function updateMonster(uint256,string,uint8,uint32,uint32,uint32)",
    "function cleanupExpiredAction(uint256)","function playerCount() view returns (uint256)",
    "function monstersCount() view returns (uint256)",
    "function monsters(uint256) view returns (string name,uint8 element,uint32 power,uint32 reward,uint32 xp)"
  ],
  forgeShop: [
    "function owner() view returns (address)","function paused() view returns (bool)","function pause()","function unpause()",
    "function maxPendingPerPlayer() view returns (uint256)","function commitExpiryBlocks() view returns (uint256)",
    "function setMaxPendingPerPlayer(uint256)","function setCommitExpiryBlocks(uint256)",
    "function cum1w() view returns (uint256)","function cum2w() view returns (uint256)","function cum3w() view returns (uint256)",
    "function cum4w() view returns (uint256)","function cum5w() view returns (uint256)",
    "function cum1s() view returns (uint256)","function cum2s() view returns (uint256)","function cum3s() view returns (uint256)",
    "function cum4s() view returns (uint256)","function cum5s() view returns (uint256)",
    "function setForgeRates(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
    "function setRandomOracle(address)","function setVault(address)","function setPriceOracle(address)",
    "function cleanupAllExpiredCommits()","function cleanupAllExpiredSynthesizes()",
    "function cleanupExpiredCommit(uint256)","function cleanupExpiredSynthesize(uint256)"
  ],
  enhanceShop: [
    "function owner() view returns (address)","function paused() view returns (bool)","function pause()","function unpause()",
    "function maxPendingPerPlayer() view returns (uint256)","function commitExpiryBlocks() view returns (uint256)",
    "function setMaxPendingPerPlayer(uint256)","function setCommitExpiryBlocks(uint256)",
    "function setRandomOracle(address)","function setVault(address)","function setPriceOracle(address)",
    "function cleanupAllExpiredEnhances()","function cleanupExpiredEnhance(uint256)"
  ],
  marketplace: [
    "function owner() view returns (address)","function paused() view returns (bool)","function pause()","function unpause()",
    "function marketFeeBp() view returns (uint256)","function setMarketFee(uint256)",
    "function listingExpirySeconds() view returns (uint256)","function setListingExpiry(uint256)",
    "function vault() view returns (address)","function setVault(address)","function setContracts(address,address,address,address)",
    "function listingsCount() view returns (uint256)","function activeListingsCount() view returns (uint256)"
  ],
  vault: [
    "function hasRole(bytes32,address) view returns (bool)","function paused() view returns (bool)","function pause()","function unpause()",
    "function token() view returns (address)","function isTokenSet() view returns (bool)","function setToken(address)",
    "function usdt() view returns (address)","function rewardMode() view returns (uint8)",
    "function setRewardMode(uint8,address)","function emergencySetRewardMode(uint8,address)",
    "function clearDelay() view returns (uint256)","function setClearDelay(uint256)",
    "function totalPending() view returns (uint256)","function totalPendingUSDT() view returns (uint256)",
    "function totalDistributed() view returns (uint256)","function totalDistributedUSDT() view returns (uint256)",
    "function vaultBalance() view returns (uint256)","function getPendingReward(address) view returns (uint256)",
    "function authorizedGames(address) view returns (bool)","function authorizedGameCount() view returns (uint256)","function setAuthorizedGame(address,bool)",
    "function adminClearPlayerPending(address)","function deposit(uint256)","function depositUSDT(uint256)"
  ],
  boss: [
    "function owner() view returns (address)","function paused() view returns (bool)","function pause()","function unpause()",
    "function startRound(uint32)","function roundCount() view returns (uint256)","function currentRoundId() view returns (uint256)",
    "function rounds(uint256) view returns (uint64 start,uint64 end,uint32 maxHp,uint32 hp,bool dead,bool weaponGiven,address weaponWinner,uint128 rewardPool,uint128 totalDamage)",
    "function pendingExpiryBlocks() view returns (uint256)","function maxPendingPerPlayer() view returns (uint256)",
    "function setPendingExpiryBlocks(uint256)","function setMaxPendingPerPlayer(uint256)",
    "function setRandomOracle(address)","function setVault(address)","function setPriceOracle(address)",
    "function depositPool(uint256)","function cleanupAllExpiredAttacks()","function pendingReward(uint256,address) view returns (uint256)"
  ],
  oracle: [
    "function owner() view returns (address)","function paused() view returns (bool)","function pause()","function unpause()",
    "function heroPriceUSD() view returns (uint256)","function weaponPriceUSD() view returns (uint256)",
    "function weapon10PriceUSD() view returns (uint256)","function weapon100PriceUSD() view returns (uint256)",
    "function setPricing(uint256,uint256,uint256,uint256)",
    "function minLiquidityUSD() view returns (uint256)","function stalePriceThreshold() view returns (uint256)",
    "function setThresholds(uint256,uint256)","function fallbackTokenPrice() view returns (uint256)","function setFallbackPrice(uint256)",
    "function twapPrice() view returns (uint256)","function lastPrice() view returns (uint256)","function updateTwap()",
    "function getPriceStatus() view returns (uint256 tokenPrice,uint256 liquidityUSD,bool valid,uint256 heroCost,uint256 weaponCost,uint256 weapon10Cost,uint256 weapon100Cost)",
    "function setPairs(address,address,address)"
  ],
  randomOracle: [
    "function owner() view returns (address)","function paused() view returns (bool)","function pause()","function unpause()",
    "function minDelayBlocks() view returns (uint256)","function maxDelayBlocks() view returns (uint256)",
    "function updateDelayConfig(uint256,uint256)","function nextCommitId() view returns (uint256)"
  ]
};

const ADMIN_SECTIONS = [
  { key:'overview',  label:'概览', icon:'fa-gauge-high', desc:'全部合约状态与常用入口', render: secOverview },
  { key:'oracle',    label:'价格预言机', icon:'fa-coins', desc:'游戏价格 / 代币报价 / TWAP / 阈值', render: secOracle },
  { key:'vault',     label:'金库', icon:'fa-vault', desc:'资金托管 / 奖励模式 / 授权游戏 / 存入', render: secVault },
  { key:'market',    label:'市场', icon:'fa-store', desc:'手续费 / 挂单过期 / 关联设置', render: secMarket },
  { key:'boss',      label:'世界BOSS', icon:'fa-dragon', desc:'开轮 / 奖池 / 攻击待处理配置', render: secBoss },
  { key:'v3',        label:'核心玩法', icon:'fa-gamepad', desc:'怪物配置 / commit 配置 / 关联合约', render: secV3 },
  { key:'forge',     label:'锻造厂', icon:'fa-hammer', desc:'掉落概率 / 过期块数 / 清理', render: secForge },
  { key:'enhance',   label:'强化铺', icon:'fa-wand-magic-sparkles', desc:'强化过期块数 / 清理', render: secEnhance },
  { key:'rng',       label:'随机预言机', icon:'fa-dice', desc:'commit 延迟区间', render: secRandomOracle },
  { key:'nft',       label:'NFT与代币', icon:'fa-id-card', desc:'铸造权限 / 关联 / 代币增发', render: secNft },
  { key:'approvals', label:'我的授权', icon:'fa-shield-halved', desc:'NFT / 代币授权查看与撤销', render: secApprovals }
];

/* ============ 通用工具 ============ */
function adminCt(key, withSigner){
  const a = addrOf(key); if(!a) throw new Error('未配置 '+key);
  const abi = ADMIN_ABIS[key] || ABIs[key];
  if(!abi || !abi.length) throw new Error(key+' 缺少管理 ABI');
  return new ethers.Contract(a, abi, withSigner ? S.signer : (S.signer || getReadProvider()));
}
async function adminExec(label, fn, needOwner){
  if(needOwner!==false && !S.admin.isOwner){ toast('无管理权限','warn'); return; }
  if(!S.signer){ needWallet(); return; }
  try{
    showGlobalLoading(label+'…');
    await fn();
    toast(label+' 成功','success');
    await renderAdminPanel();
  }catch(e){ toast(errMsg(e),'error'); }
  finally{ hideGlobalLoading(); }
}
function aRow(label, value){
  return `<div class="flex items-center justify-between gap-3 px-3 py-2 bg-[#0d1526] rounded-lg border border-[#24304a]"><span class="text-[12px] text-muted shrink-0">${label}</span><span class="text-[12px] font-bold text-right break-all">${value}</span></div>`;
}
function aCard(title, icon, bodyHtml, actionsHtml){
  return `<div class="game-card p-4 mb-4">
    <div class="font-bold mb-3 flex items-center gap-2"><i class="fa-solid ${icon} text-gold"></i>${title}</div>
    <div class="space-y-1.5">${bodyHtml}</div>
    ${actionsHtml?`<div class="flex flex-wrap gap-2 mt-3">${actionsHtml}</div>`:''}
  </div>`;
}
function aAct(label, fn, icon){
  return `<button class="btn btn-ghost" onclick="${fn}"><i class="fa-solid ${icon||'fa-circle-play'} mr-1"></i>${label}</button>`;
}
function aPauseBtn(key, paused){
  return paused
    ? aAct('恢复运行', `adminTogglePause('${key}')`, 'fa-play')
    : aAct('暂停合约', `adminTogglePause('${key}')`, 'fa-pause');
}
async function adminTogglePause(key){
  await adminExec('切换暂停状态', async()=>{
    const ct = adminCt(key, true);
    const p = await ct.paused();
    if(p) await (await ct.unpause()).wait(); else await (await ct.pause()).wait();
  });
}
async function adminPromptAddr(key, fnName, label, needOwner){
  const v = prompt(label); if(v===null) return;
  if(!/^0x[a-fA-F0-9]{40}$/.test(v.trim())){ toast('地址格式不正确','warn'); return; }
  await adminExec(label.replace(/[：:].*$/,'')||'设置地址', async()=>{
    await (await adminCt(key,true)[fnName](v.trim())).wait();
  }, needOwner);
}
async function adminPromptUint(key, fnName, label, opts){
  const def = opts&&opts.def!==undefined ? opts.def : '';
  const min = opts&&opts.min; const max = opts&&opts.max;
  const v = prompt(label+(def!==''?`（当前 ${def}）`:'')+(min!==undefined?`，范围 ${min}~${max}`:''));
  if(v===null) return;
  let n = Math.round(Number(v));
  if(!Number.isFinite(n)){ toast('请输入数字','warn'); return; }
  if(min!==undefined && n<min) n=min;
  if(max!==undefined && n>max) n=max;
  await adminExec(label.replace(/[：:].*$/,'')||'设置数值', async()=>{
    await (await adminCt(key,true)[fnName](BigInt(n))).wait();
  });
}
async function adminPromptUint18(key, fnName, label){
  const v = prompt(label); if(v===null) return;
  if(Number(v)<0 || !Number.isFinite(Number(v))){ toast('请输入有效数量','warn'); return; }
  await adminExec(label.replace(/[：:].*$/,'')||'设置数量', async()=>{
    await (await adminCt(key,true)[fnName](ethers.parseUnits(String(v), 18))).wait();
  });
}
function adminFormModal(title, fields, submitFn){
  openModal({html:`
    <div class="py-2 w-full">
      <div class="text-lg font-black mb-3"><i class="fa-solid fa-sliders text-gold mr-1"></i>${title}</div>
      ${fields.map((f,i)=>`
        <label class="block mb-2">
          <span class="lbl">${f.label}</span>
          ${f.type==='select'
            ? `<select id="af_${i}" class="input">${(f.options||[]).map(o=>`<option value="${o.v}" ${String(o.v)===String(f.value??'')?'selected':''}>${o.t}</option>`).join('')}</select>`
            : `<input id="af_${i}" class="input" type="${f.type||'text'}" value="${escapeHtml(String(f.value??''))}" placeholder="${escapeHtml(f.placeholder||'')}">`}
        </label>`).join('')}
      <div class="flex gap-2 mt-4">
        <button onclick="closeModal()" class="btn btn-ghost flex-1">取消</button>
        <button onclick="${submitFn};closeModal()" class="btn btn-gold flex-1">确认提交</button>
      </div>
    </div>`});
}
function adminFormVals(n){
  const a = [];
  for(let i=0;i<n;i++) a.push(document.getElementById('af_'+i)?.value ?? '');
  return a;
}

/* ============ 入口 ============ */
async function renderAdmin(){
  const body = $('#adminBody'); if(!body) return;
  if(!S.account){
    body.innerHTML = '<div class="game-card p-5 text-center max-w-lg mx-auto"><i class="fa-solid fa-wallet text-3xl text-gold block mb-2"></i><div class="font-bold mb-2">连接钱包后检测</div><button onclick="connectWallet()" class="btn btn-gold"><i class="fa-solid fa-link"></i>连接钱包</button></div>';
    return;
  }
  if(S.admin.status!=='loaded' || S.admin.forAccount!==S.account){ await checkAdminAccess(); return; }
  renderAdminBody();
}
async function checkAdminAccess(){
  const body = $('#adminBody');
  S.admin.status='checking'; S.admin.forAccount=S.account;
  body.innerHTML = skeletonBlock(4,'h-16');
  const rows = await Promise.all(ADMIN_CONTRACTS.map(async cfg=>{
    const addr = addrOf(cfg.key);
    if(!addr) return {...cfg, state:'unset', owner:null, paused:null};
    const abi = ADMIN_ABIS[cfg.key]||[];
    if(!abi.length) return {...cfg, state:'unknown', owner:null, paused:null};
    try{
      const ct = new ethers.Contract(addr, abi, getReadProvider());
      // Vault 采用 AccessControl 角色制管理（无 owner()）
      if(cfg.key === 'vault'){
        const [roleOk, paused] = await Promise.all([
          ct.hasRole(ethers.ZeroHash, S.account).catch(()=>null),
          ct.paused().catch(()=>null)
        ]);
        return {...cfg, state:'ok', owner: roleOk ? S.account : null, paused, roleBased:true};
      }
      if(!abi.some(x=>typeof x==='string' && /^function\s+owner\s*\(/i.test(x.trim()))) return {...cfg, state:'unknown', owner:null, paused:null};
      const [owner, paused] = await Promise.all([
        ct.owner().catch(()=>null),
        abi.some(x=>/^function\s+paused\s*\(/i.test(x.trim())) ? ct.paused().catch(()=>null) : null
      ]);
      return {...cfg, state:'ok', owner, paused, roleBased:false};
    }catch(e){ return {...cfg, state:'err', owner:null, paused:null}; }
  }));
  const owned = rows.filter(r=>r.owner && S.account && String(r.owner).toLowerCase()===S.account.toLowerCase());
  S.admin = { status:'loaded', forAccount:S.account, isOwner:owned.length>0, rows, panel: S.admin.panel || 'overview' };
  renderAdminBody();
}
function renderAdminBody(){
  const body = $('#adminBody'); if(!body) return;
  const isOwner = S.admin.isOwner;
  $('#adminBadge').textContent = isOwner ? '👑 管理员' : '🔒 只读';
  const nav = ADMIN_SECTIONS.map(s=>`<button class="btn ${S.admin.panel===s.key?'btn-gold':'btn-ghost'}" onclick="adminSection('${s.key}')"><i class="fa-solid ${s.icon} mr-1"></i>${s.label}</button>`).join('');
  const hint = isOwner ? '' : `<div class="text-[12px] text-muted bg-[#0d1526] rounded-lg px-3 py-2 border border-[#24304a] mb-3"><i class="fa-solid fa-lock mr-1 text-gold"></i>只读模式：可查看全部合约配置。连接拥有管理权限的钱包后即可执行操作。</div>`;
  body.innerHTML = `
    <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
      <div class="text-[12px] text-muted">当前账户：<b class="num-mono text-gold">${S.account?shortAddr(S.account):'-'}</b></div>
      <div class="flex gap-2">
        <button class="btn btn-ghost" onclick="checkAdminAccess()"><i class="fa-solid fa-arrows-rotate mr-1"></i>重新检测</button>
        <button class="btn btn-ghost" onclick="renderAdminPanel()"><i class="fa-solid fa-rotate mr-1"></i>刷新</button>
      </div>
    </div>
    ${hint}
    <div class="flex flex-wrap gap-1.5 mb-4">${nav}</div>
    <div id="adminPanel">${skeletonBlock(3,'h-24')}</div>`;
  renderAdminPanel();
}
function adminSection(key){ S.admin.panel = key; renderAdminBody(); }
async function renderAdminPanel(){
  const el = $('#adminPanel'); if(!el) return;
  const sec = ADMIN_SECTIONS.find(x=>x.key===S.admin.panel) || ADMIN_SECTIONS[0];
  el.innerHTML = `<div class="text-[13px] text-muted mb-3"><i class="fa-solid ${sec.icon} mr-1 text-gold"></i>${sec.desc}</div>` + skeletonBlock(3,'h-24');
  try{ await sec.render(el, S.admin.isOwner); }
  catch(e){ el.innerHTML = `<div class="text-red-400 text-[13px]">加载失败：${errMsg(e)}</div>`; }
}

/* ============ 概览 ============ */
async function secOverview(el, isOwner){
  const rows = S.admin.rows||[];
  const ownedSet = new Set(rows.filter(r=>r.owner && S.account && String(r.owner).toLowerCase()===S.account.toLowerCase()).map(r=>r.key));
  const [fee, mode, heroCost, bossRounds] = await Promise.all([
    readCall('marketplace', c=>c.marketFeeBp()).catch(()=>null),
    readCall('vault', c=>c.rewardMode()).catch(()=>null),
    readCall('oracle', c=>c.getHeroCost()).catch(()=>null),
    readCall('boss', c=>c.roundCount()).catch(()=>null)
  ]);
  const chips = [
    {t:'市场费率', v: fee!==null ? (Number(fee)/100).toFixed(2)+'%' : '-'},
    {t:'金库奖励模式', v: mode!==null ? (Number(mode)===1?'USDT':'GAME') : '-'},
    {t:'英雄成本', v: heroCost!==null ? fmtUnits(heroCost, S.tokenDecimals, 2) : '-'},
    {t:'BOSS 轮次', v: bossRounds!==null ? String(bossRounds) : '-'}
  ];
  const quick = isOwner ? aCard('快捷管理','fa-bolt',
    `<div class="text-[12px] text-muted">常用操作一键直达对应分区：</div>`,
    `<button class="btn btn-ghost" onclick="adminSection('oracle')"><i class="fa-solid fa-coins mr-1 text-gold"></i>设置价格</button>
     <button class="btn btn-ghost" onclick="adminSection('boss')"><i class="fa-solid fa-dragon mr-1 text-gold"></i>开启 BOSS</button>
     <button class="btn btn-ghost" onclick="adminSection('market')"><i class="fa-solid fa-percent mr-1 text-gold"></i>市场费率</button>
     <button class="btn btn-ghost" onclick="adminSection('forge')"><i class="fa-solid fa-hammer mr-1 text-gold"></i>锻造概率</button>
     <button class="btn btn-ghost" onclick="adminSection('vault')"><i class="fa-solid fa-vault mr-1 text-gold"></i>金库管理</button>
     <button class="btn btn-ghost" onclick="adminSection('approvals')"><i class="fa-solid fa-shield-halved mr-1 text-gold"></i>授权管理</button>`) : '';
  const ownerTable = aCard('合约 Owner 一览','fa-list-check',
    rows.map(r=>`
      <div class="flex items-center gap-3 bg-[#0d1526] rounded-xl px-3 py-2.5 border ${ownedSet.has(r.key)?'border-green-500/40':'border-[#24304a]'}">
        <span class="text-xl">${r.icon}</span>
        <div class="flex-1 min-w-0">
          <div class="text-[13px] font-bold flex items-center gap-1.5 flex-wrap">${r.name}
            ${r.paused===true?'<span class="badge bg-red-500/20 text-red-400">已暂停</span>':''}
            ${r.paused===false?'<span class="badge bg-green-500/20 text-green-400">运行中</span>':''}
          </div>
          <div class="text-[11px] text-muted num-mono truncate">${r.owner?shortAddr(r.owner):(r.roleBased?'角色制(DEFAULT_ADMIN)':(r.state==='unset'?'未配置':(r.state==='unknown'?'无 owner()':'读取失败')))}</div>
        </div>
      </div>`).join(''));
  el.innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">${chips.map(ch=>`<div class="game-card p-3 text-center"><div class="text-[10px] text-muted">${ch.t}</div><div class="font-black text-gold num-mono mt-0.5">${ch.v}</div></div>`).join('')}</div>` + quick + ownerTable;
}

/* ============ 价格预言机 ============ */
async function secOracle(el, isOwner){
  const o = adminCt('oracle');
  const [st, heroU, wpnU, w10U, w100U, twap, fb, minLiq, stale, last] = await Promise.all([
    o.getPriceStatus().catch(()=>null),
    o.heroPriceUSD().catch(()=>null), o.weaponPriceUSD().catch(()=>null),
    o.weapon10PriceUSD().catch(()=>null), o.weapon100PriceUSD().catch(()=>null),
    o.twapPrice().catch(()=>null), o.fallbackTokenPrice().catch(()=>null),
    o.minLiquidityUSD().catch(()=>null), o.stalePriceThreshold().catch(()=>null),
    o.lastPrice().catch(()=>null)
  ]);
  const usd = x => x!==null ? '$'+fmtUnits(x,18,2) : '-';
  const usd6 = x => x!==null ? '$'+fmtUnits(x,18,6) : '-';
  const tok = x => x!==null ? fmtUnits(x,18,4)+' '+S.tokenSymbol : '-';
  const body = aCard('价格配置（USD）','fa-coins',
    aRow('英雄价格', usd(heroU)) + aRow('武器价格', usd(wpnU)) + aRow('10连锻造价格', usd(w10U)) + aRow('100连锻造价格', usd(w100U)),
    isOwner ? aAct('修改价格', 'adminOpenSetPricing()', 'fa-pen') : '')
    + aCard('市场报价','fa-chart-line',
      aRow('当前代币价', st?usd6(st.tokenPrice):'-') + aRow('TWAP 价格', usd6(twap)) + aRow('最近成交价', usd6(last)) +
      aRow('保底价', usd6(fb)) + aRow('流动性 USD', st?fmtUnits(st.liquidityUSD,18,0):'-') +
      aRow('价格有效性', st?(st.valid?'<span class="text-green-400">有效</span>':'<span class="text-red-400">失效</span>'):'-'),
      isOwner ? aAct('更新 TWAP', 'adminDoUpdateTwap()', 'fa-rotate') : '')
    + aCard('实际成本（按当前报价换算）','fa-calculator',
      aRow('召唤英雄', st?tok(st.heroCost):'-') + aRow('锻造武器', st?tok(st.weaponCost):'-') +
      aRow('10连锻造', st?tok(st.weapon10Cost):'-') + aRow('100连锻造', st?tok(st.weapon100Cost):'-'))
    + aCard('风控阈值','fa-shield',
      aRow('最低流动性门槛', minLiq!==null?fmtUnits(minLiq,18,0):'-') + aRow('报价过期阈值（秒）', stale!==null?String(stale):'-'),
      isOwner ? aAct('修改阈值', 'adminOpenSetThresholds()', 'fa-pen') + aAct('修改保底价', 'adminOpenSetFallback()', 'fa-pen') : '')
    + aCard('交易对（Pancake）','fa-link',
      `<div class="text-[12px] text-muted">交易对更新后需重新调用 updateTwap 生效。` + (isOwner?`在管理账户下配置。`:'') + `</div>`,
      isOwner ? aAct('设置交易对', 'adminOpenSetPairs()', 'fa-pen') : '');
  el.innerHTML = body;
}
async function adminOpenSetPricing(){
  const o = adminCt('oracle');
  const [h,w,w10,w100] = await Promise.all([o.heroPriceUSD(),o.weaponPriceUSD(),o.weapon10PriceUSD(),o.weapon100PriceUSD()]);
  adminFormModal('设置游戏价格（USD）',[
    {label:'英雄价格（USD）', value: fmtUnits(h,18,4)},
    {label:'武器价格（USD）', value: fmtUnits(w,18,4)},
    {label:'10连锻造价格（USD）', value: fmtUnits(w10,18,4)},
    {label:'100连锻造价格（USD）', value: fmtUnits(w100,18,4)}
  ], 'adminDoSetPricing()');
}
async function adminDoSetPricing(){
  const v = adminFormVals(4);
  await adminExec('设置游戏价格', async()=>{
    await (await adminCt('oracle',true).setPricing(
      ethers.parseUnits(v[0]||'0',18), ethers.parseUnits(v[1]||'0',18),
      ethers.parseUnits(v[2]||'0',18), ethers.parseUnits(v[3]||'0',18))).wait();
  });
}
async function adminOpenSetThresholds(){
  const o = adminCt('oracle');
  const [l, s] = await Promise.all([o.minLiquidityUSD(), o.stalePriceThreshold()]);
  adminFormModal('设置预言机风控阈值',[
    {label:'最低流动性 USD（如 1000）', value: fmtUnits(l,18,0)},
    {label:'报价过期阈值（秒，60~3600）', value: String(s)}
  ], 'adminDoSetThresholds()');
}
async function adminDoSetThresholds(){
  const v = adminFormVals(2);
  await adminExec('设置风控阈值', async()=>{
    await (await adminCt('oracle',true).setThresholds(ethers.parseUnits(v[0]||'0',18), BigInt(Math.round(Number(v[1])||300)))).wait();
  });
}
async function adminOpenSetFallback(){
  const o = adminCt('oracle');
  const fb = await o.fallbackTokenPrice().catch(()=>0n);
  adminFormModal('设置保底代币价（USD）',[
    {label:'保底价（USD，如 0.0001）', value: fmtUnits(fb,18,6)}
  ], 'adminDoSetFallback()');
}
async function adminDoSetFallback(){
  const v = adminFormVals(1);
  await adminExec('设置保底价', async()=>{
    await (await adminCt('oracle',true).setFallbackPrice(ethers.parseUnits(v[0]||'0',18))).wait();
  });
}
async function adminDoUpdateTwap(){
  await adminExec('更新 TWAP', async()=>{
    await (await adminCt('oracle',true).updateTwap()).wait();
  });
}
async function adminOpenSetPairs(){
  adminFormModal('设置 Pancake 交易对',[
    {label:'代币/USDT 交易对地址', placeholder:'0x…'},
    {label:'代币/WBNB 交易对地址', placeholder:'0x…'},
    {label:'WBNB/USDT 交易对地址', placeholder:'0x…'}
  ], 'adminDoSetPairs()');
}
async function adminDoSetPairs(){
  const v = adminFormVals(3);
  await adminExec('设置交易对', async()=>{
    await (await adminCt('oracle',true).setPairs(v[0].trim(), v[1].trim(), v[2].trim())).wait();
  });
}

/* ============ 金库 ============ */
async function secVault(el, isOwner){
  const vt = adminCt('vault');
  const [tk, set, usdt, mode, delay, tp, tpu, td, tdu, bal, cnt, mine, paused] = await Promise.all([
    vt.token().catch(()=>null), vt.isTokenSet().catch(()=>null), vt.usdt().catch(()=>null),
    vt.rewardMode().catch(()=>null), vt.clearDelay().catch(()=>null),
    vt.totalPending().catch(()=>null), vt.totalPendingUSDT().catch(()=>null),
    vt.totalDistributed().catch(()=>null), vt.totalDistributedUSDT().catch(()=>null),
    vt.vaultBalance().catch(()=>null), vt.authorizedGameCount().catch(()=>null),
    S.account ? vt.getPendingReward(S.account).catch(()=>null) : Promise.resolve(null),
    vt.paused().catch(()=>false)
  ]);
  const games = ['v3','boss','marketplace','forgeShop','enhanceShop'];
  const authRows = [];
  for(const g of games){
    const a = addrOf(g); if(!a) continue;
    const ok = await vt.authorizedGames(a).catch(()=>null);
    authRows.push(`<div class="flex items-center justify-between px-3 py-1.5 bg-[#0d1526] rounded-lg border border-[#24304a]"><span class="text-[12px] num-mono">${shortAddr(a)}（${g}）</span><span class="text-[12px] font-bold ${ok?'text-green-400':'text-red-400'}">${ok?'✓ 已授权':'✗ 未授权'}</span></div>`);
  }
  const tokFmt = x => x!==null ? fmtUnits(x,18,2) : '-';
  const modeTxt = mode!==null ? (Number(mode)===1?'USDT 模式':'GAME 模式') : '-';
  const body = aCard('金库状态','fa-vault',
    aRow('奖励代币', tk?shortAddr(tk):'-') + aRow('奖励模式', modeTxt) +
    aRow('USDT 地址', usdt?shortAddr(usdt):'-') + aRow('清理间隔', delay!==null?(Number(delay)/86400).toFixed(1)+' 天':'-') +
    aRow('金库余额', bal!==null?(Number(mode)===1?tokFmt(bal)+' USDT':tokFmt(bal)+' '+S.tokenSymbol):'-') +
    aRow('待发放总额(GAME)', tokFmt(tp)) + aRow('待发放总额(USDT)', tokFmt(tpu)) +
    aRow('累计发放(GAME)', tokFmt(td)) + aRow('累计发放(USDT)', tokFmt(tdu)) +
    aRow('授权游戏数', cnt!==null?String(cnt):'-') +
    aRow('我的待领取', mine!==null?(Number(mode)===1?tokFmt(mine)+' USDT':tokFmt(mine)+' '+S.tokenSymbol):'-'),
    isOwner ? aAct('设置奖励代币', 'adminOpenSetToken()', 'fa-pen') + aAct('切换奖励模式', 'adminOpenSetVaultMode()', 'fa-repeat') +
             aAct('紧急切换模式', 'adminOpenEmergencyMode()', 'fa-triangle-exclamation') + aAct('设置清理间隔', 'adminOpenSetClearDelay()', 'fa-clock') : '')
    + aCard('授权游戏（负责发放奖励）','fa-gamepad', authRows.join(''),
      isOwner ? aAct('添加/移除授权', 'adminOpenSetAuthorizedGame()', 'fa-pen') : '')
    + aCard('存入资金','fa-circle-plus',
      `<div class="text-[12px] text-muted">向金库注入 ${S.tokenSymbol} / USDT 作为奖励池。</div>`,
      isOwner ? aAct('存入 GAME', 'adminOpenDeposit()', 'fa-circle-plus') + aAct('存入 USDT', 'adminOpenDepositUSDT()', 'fa-circle-plus') : '')
    + aCard('应急管理','fa-toolbox',
      `<div class="text-[12px] text-muted">清理玩家待领取记录（每 ${delay!==null?(Number(delay)/86400).toFixed(1):'-'} 天限一次）。</div>`,
      isOwner ? aAct('清理玩家待领取', 'adminOpenClearPlayer()', 'fa-broom') : '')
    + aCard('暂停控制','fa-pause',
      `<div class="text-[12px] text-muted">暂停后金库存入/领取全部冻结。</div>`);
  el.innerHTML = body + (isOwner ? aCard('暂停控制','fa-toggle-on','', aPauseBtn('vault', paused)) : '');
}
async function adminOpenSetToken(){
  adminFormModal('设置金库奖励代币（仅一次）',[
    {label:'代币合约地址（GameToken）', value: addrOf('gameToken')||'', placeholder:'0x…'}
  ], 'adminDoSetToken()');
}
async function adminDoSetToken(){
  const v = adminFormVals(1);
  await adminExec('设置奖励代币', async()=>{
    await (await adminCt('vault',true).setToken(v[0].trim())).wait();
  });
}
async function adminOpenSetVaultMode(){
  const vt = adminCt('vault');
  const [mode, usdt] = await Promise.all([vt.rewardMode().catch(()=>0n), vt.usdt().catch(()=>null)]);
  adminFormModal('切换金库奖励模式',[
    {label:'奖励模式', type:'select', options:[{v:'0',t:'GAME 代币模式'},{v:'1',t:'USDT 模式'}], value: String(Number(mode))},
    {label:'USDT 合约地址（模式=1 时必填）', value: usdt||''}
  ], 'adminDoSetVaultMode()');
}
async function adminDoSetVaultMode(){
  const v = adminFormVals(2);
  const mode = Number(v[0]||0);
  let usdtAddr = '';
  if(mode===1){
    usdtAddr = (v[1]&&v[1].trim()) ? v[1].trim() : await readCall('vault', c=>c.usdt()).catch(()=>null);
    if(!usdtAddr || usdtAddr==='0x0000000000000000000000000000000000000000'){ toast('USDT 模式需填写 USDT 合约地址','warn'); return; }
  }
  await adminExec('切换奖励模式', async()=>{
    await (await adminCt('vault',true).setRewardMode(BigInt(mode), mode===1?usdtAddr:'0x0000000000000000000000000000000000000000')).wait();
  });
}
async function adminOpenEmergencyMode(){
  if(!confirm('紧急切换模式会跳过“待发放资金需先转换”的检查，确定继续？')) return;
  const vt = adminCt('vault');
  const [mode, usdt] = await Promise.all([vt.rewardMode().catch(()=>0n), vt.usdt().catch(()=>null)]);
  adminFormModal('紧急切换奖励模式（跳过检查）',[
    {label:'奖励模式', type:'select', options:[{v:'0',t:'GAME 代币模式'},{v:'1',t:'USDT 模式'}], value: String(Number(mode))},
    {label:'USDT 合约地址（模式=1 时必填）', value: usdt||''}
  ], 'adminDoEmergencyMode()');
}
async function adminDoEmergencyMode(){
  const v = adminFormVals(2);
  const mode = Number(v[0]||0);
  let usdtAddr = '';
  if(mode===1){
    usdtAddr = (v[1]&&v[1].trim()) ? v[1].trim() : await readCall('vault', c=>c.usdt()).catch(()=>null);
    if(!usdtAddr || usdtAddr==='0x0000000000000000000000000000000000000000'){ toast('USDT 模式需填写 USDT 合约地址','warn'); return; }
  }
  await adminExec('紧急切换模式', async()=>{
    await (await adminCt('vault',true).emergencySetRewardMode(BigInt(mode), mode===1?usdtAddr:'0x0000000000000000000000000000000000000000')).wait();
  });
}
async function adminOpenSetClearDelay(){
  const vt = adminCt('vault');
  const d = await vt.clearDelay().catch(()=>86400n*7n);
  adminFormModal('设置应急清理间隔',[
    {label:'间隔天数（1~30）', value: String(Number(d)/86400)}
  ], 'adminDoSetClearDelay()');
}
async function adminDoSetClearDelay(){
  const v = adminFormVals(1);
  const days = Math.max(1, Math.min(30, Number(v[0])||7));
  await adminExec('设置清理间隔', async()=>{
    await (await adminCt('vault',true).setClearDelay(BigInt(Math.round(days*86400)))).wait();
  });
}
async function adminOpenSetAuthorizedGame(){
  adminFormModal('设置授权游戏',[
    {label:'游戏合约地址', value: '', placeholder:'0x…'},
    {label:'状态', type:'select', options:[{v:'true',t:'授权'},{v:'false',t:'移除授权'}], value:'true'}
  ], 'adminDoSetAuthorizedGame()');
}
async function adminDoSetAuthorizedGame(){
  const v = adminFormVals(2);
  const status = String(v[1]).toLowerCase()==='true';
  await adminExec(status?'添加授权游戏':'移除授权游戏', async()=>{
    await (await adminCt('vault',true).setAuthorizedGame(v[0].trim(), status)).wait();
  });
}
async function adminOpenClearPlayer(){
  adminFormModal('清理玩家待领取',[
    {label:'玩家地址', placeholder:'0x…'}
  ], 'adminDoClearPlayer()');
}
async function adminDoClearPlayer(){
  const v = adminFormVals(1);
  await adminExec('清理玩家待领取', async()=>{
    await (await adminCt('vault',true).adminClearPlayerPending(v[0].trim())).wait();
  });
}
async function adminOpenDeposit(){
  adminFormModal('存入 '+S.tokenSymbol, [
    {label:'存入数量', placeholder:'如 1000'}
  ], 'adminDoDeposit()');
}
async function adminDoDeposit(){
  const v = adminFormVals(1);
  await adminExec('存入 '+S.tokenSymbol, async()=>{
    await (await adminCt('vault',true).deposit(ethers.parseUnits(v[0]||'0',18))).wait();
  });
}
async function adminOpenDepositUSDT(){
  adminFormModal('存入 USDT', [
    {label:'存入数量', placeholder:'如 1000'}
  ], 'adminDoDepositUSDT()');
}
async function adminDoDepositUSDT(){
  const v = adminFormVals(1);
  await adminExec('存入 USDT', async()=>{
    await (await adminCt('vault',true).depositUSDT(ethers.parseUnits(v[0]||'0',18))).wait();
  });
}

/* ============ 市场 ============ */
async function secMarket(el, isOwner){
  const mk = adminCt('marketplace');
  const [fee, exp, cnt, act, vault, paused] = await Promise.all([
    mk.marketFeeBp().catch(()=>null), mk.listingExpirySeconds().catch(()=>null),
    mk.listingsCount().catch(()=>null), mk.activeListingsCount().catch(()=>null),
    mk.vault().catch(()=>null), mk.paused().catch(()=>false)
  ]);
  const body = aCard('市场状态','fa-store',
    aRow('手续费率', fee!==null?(Number(fee)/100).toFixed(2)+'%（'+String(fee)+' bp）':'-') +
    aRow('挂单过期时间', exp!==null?(Number(exp)/86400).toFixed(1)+' 天':'-') +
    aRow('挂单总数', cnt!==null?String(cnt):'-') +
    aRow('在售挂单', act!==null?String(act):'-') +
    aRow('分成金库', vault?shortAddr(vault):'-'),
    isOwner ? aAct('设置手续费', 'adminOpenSetMarketFee()', 'fa-pen') + aAct('设置挂单过期', 'adminOpenSetListingExpiry()', 'fa-clock') : '')
    + aCard('关联设置','fa-link',
      `<div class="text-[12px] text-muted">金库用于接收交易手续费分成；四个 NFT 合约用于校验挂单。</div>`,
      isOwner ? aAct('设置金库', 'adminPromptAddr(\'marketplace\',\'setVault\',\'请输入金库地址：\')', 'fa-pen') +
               aAct('设置 NFT 合约', 'adminOpenSetMarketContracts()', 'fa-pen') : '');
  el.innerHTML = body + (isOwner ? aCard('暂停控制','fa-toggle-on','', aPauseBtn('marketplace', paused)) : '');
}
async function adminOpenSetMarketFee(){
  const mk = adminCt('marketplace');
  const fee = await mk.marketFeeBp().catch(()=>200n);
  adminFormModal('设置市场手续费',[
    {label:'手续费基点（0~1000，100=1%）', value: String(Number(fee))}
  ], 'adminDoSetMarketFee()');
}
async function adminDoSetMarketFee(){
  const v = adminFormVals(1);
  const bp = Math.max(0, Math.min(1000, Math.round(Number(v[0])||0)));
  await adminExec('设置手续费', async()=>{
    await (await adminCt('marketplace',true).setMarketFee(BigInt(bp))).wait();
  });
}
async function adminOpenSetListingExpiry(){
  const mk = adminCt('marketplace');
  const exp = await mk.listingExpirySeconds().catch(()=>604800n);
  adminFormModal('设置挂单过期时间',[
    {label:'过期天数（默认 7）', value: String(Number(exp)/86400)}
  ], 'adminDoSetListingExpiry()');
}
async function adminDoSetListingExpiry(){
  const v = adminFormVals(1);
  const days = Math.max(1, Math.round(Number(v[0])||7));
  await adminExec('设置挂单过期', async()=>{
    await (await adminCt('marketplace',true).setListingExpiry(BigInt(days*86400))).wait();
  });
}
async function adminOpenSetMarketContracts(){
  adminFormModal('设置市场 NFT 合约',[
    {label:'Characters 地址', value: addrOf('characters')||''},
    {label:'Weapons 地址', value: addrOf('weapons')||''},
    {label:'Shards 地址', value: addrOf('shards')||''},
    {label:'Essence 地址', value: addrOf('essence')||''}
  ], 'adminDoSetMarketContracts()');
}
async function adminDoSetMarketContracts(){
  const v = adminFormVals(4);
  await adminExec('设置 NFT 合约', async()=>{
    await (await adminCt('marketplace',true).setContracts(v[0].trim(), v[1].trim(), v[2].trim(), v[3].trim())).wait();
  });
}

/* ============ 世界BOSS ============ */
async function secBoss(el, isOwner){
  const bs = adminCt('boss');
  const cnt = await bs.roundCount().catch(()=>0n);
  const [exp, maxp, rw, paused] = await Promise.all([
    bs.pendingExpiryBlocks().catch(()=>null),
    bs.maxPendingPerPlayer().catch(()=>null),
    S.account ? bs.pendingReward(cnt>0n?cnt-1n:0n, S.account).catch(()=>null) : Promise.resolve(null),
    bs.paused().catch(()=>false)
  ]);
  const n = Number(cnt);
  let roundHtml = '<div class="text-[12px] text-muted">BOSS 尚未开启</div>';
  if(n>0){
    const r = await bs.rounds(BigInt(n-1)).catch(()=>null);
    if(r){
      const pct = r.maxHp>0 ? Math.max(0,Math.min(100,(Number(r.hp)/Number(r.maxHp))*100)) : 0;
      roundHtml = aRow('当前轮次', '第 '+(n-1)+' 轮') +
        aRow('BOSS 血量', fmt(Number(r.hp),0)+' / '+fmt(Number(r.maxHp),0)) +
        aRow('状态', r.dead?'<span class="text-green-400">已讨伐</span>':'<span class="text-red-400">讨伐中</span>') +
        aRow('进度', `<div class="bar h-2 w-32"><div class="bar-fill boss" style="width:${pct}%"></div></div>`) +
        aRow('奖池', fmtUnits(BigInt(r.rewardPool), S.tokenDecimals, 0)) +
        aRow('总伤害', fmt(Number(r.totalDamage),0)) +
        aRow('武器得主', r.weaponWinner?shortAddr(r.weaponWinner):'-') +
        aRow('本轮我的可领', rw!==null?fmt(Number(rw),0):'-');
    }
  }
  const body = aCard('BOSS 轮次','fa-dragon', roundHtml,
    isOwner ? aAct('开启新一轮', 'adminOpenStartRound()', 'fa-play') : '')
    + aCard('攻击待处理配置','fa-hourglass-half',
      aRow('过期块数', exp!==null?String(exp):'-') + aRow('每人上限', maxp!==null?String(maxp):'-'),
      isOwner ? aAct('修改过期块数', 'adminPromptUint(\'boss\',\'setPendingExpiryBlocks\',\'过期块数（100~1000）：\',{min:100,max:1000})', 'fa-pen') +
               aAct('修改每人上限', 'adminPromptUint(\'boss\',\'setMaxPendingPerPlayer\',\'每人待处理上限：\',{min:1,max:10})', 'fa-pen') : '')
    + aCard('奖池管理','fa-coins',
      `<div class="text-[12px] text-muted">向 BOSS 合约注入奖励代币（按当前金库模式）。</div>`,
      isOwner ? aAct('注入奖池', 'adminOpenDepositPool()', 'fa-circle-plus') +
               aAct('清理全部过期攻击', 'adminCleanBossExpired()', 'fa-broom') : '')
    + aCard('关联设置','fa-link', '',
      isOwner ? aAct('设置关联', 'adminOpenSetBossLinks()', 'fa-pen') : '');
  el.innerHTML = body + (isOwner ? aCard('暂停控制','fa-toggle-on','', aPauseBtn('boss', paused)) : '');
}
async function adminOpenStartRound(){
  const bs = adminCt('boss');
  const cnt = await bs.roundCount().catch(()=>0n);
  if(!confirm('确认开启新一轮世界BOSS？'+(cnt>0?'（注意：需距上一轮开启满 7 天）':''))) return;
  adminFormModal('开启新一轮 BOSS',[
    {label:'BOSS 血量 HP（1000~10000000）', value:'1000000'}
  ], 'adminDoStartRound()');
}
async function adminDoStartRound(){
  const v = adminFormVals(1);
  const hp = Math.max(1000, Math.min(10000000, Math.round(Number(v[0])||1000000)));
  await adminExec('开启 BOSS 轮次', async()=>{
    await (await adminCt('boss',true).startRound(BigInt(hp))).wait();
  });
}
async function adminOpenDepositPool(){
  adminFormModal('注入 BOSS 奖池',[
    {label:'注入数量', placeholder:'如 5000'}
  ], 'adminDoDepositPool()');
}
async function adminDoDepositPool(){
  const v = adminFormVals(1);
  await adminExec('注入奖池', async()=>{
    await (await adminCt('boss',true).depositPool(ethers.parseUnits(v[0]||'0',18))).wait();
  });
}
async function adminCleanBossExpired(){
  await adminExec('清理过期攻击', async()=>{
    await (await adminCt('boss',true).cleanupAllExpiredAttacks()).wait();
  });
}
async function adminOpenSetBossLinks(){
  adminFormModal('设置 BOSS 关联合约',[
    {label:'RandomOracle 地址', value: addrOf('randomOracle')||''},
    {label:'Vault 地址', value: addrOf('vault')||''},
    {label:'PriceOracle 地址', value: addrOf('oracle')||''}
  ], 'adminDoSetBossLinks()');
}
async function adminDoSetBossLinks(){
  const v = adminFormVals(3);
  await adminExec('设置 BOSS 关联', async()=>{
    const ct = adminCt('boss', true);
    await (await ct.setRandomOracle(v[0].trim())).wait();
    await (await ct.setVault(v[1].trim())).wait();
    await (await ct.setPriceOracle(v[2].trim())).wait();
  });
}

/* ============ 核心玩法 V3 ============ */
async function secV3(el, isOwner){
  const core = adminCt('v3');
  const [exp, maxp, pc, mc, paused] = await Promise.all([
    core.pendingExpiryBlocks().catch(()=>null), core.maxPendingPerPlayer().catch(()=>null),
    core.playerCount().catch(()=>null), core.monstersCount().catch(()=>0n),
    core.paused().catch(()=>false)
  ]);
  let monRows = '';
  const mcnt = Number(mc||0);
  if(mcnt>0){
    const ms = [];
    for(let i=0;i<mcnt;i++) ms.push(core.monsters(BigInt(i)).catch(()=>null));
    const list = await Promise.all(ms);
    monRows = list.map((m,i)=> m?`
      <div class="flex items-center gap-2 px-3 py-1.5 bg-[#0d1526] rounded-lg border border-[#24304a]">
        <span class="text-[12px] font-bold num-mono w-6">${i}</span>
        <img src="${monImg(i)}" alt="${escapeHtml(m.name)}" class="w-8 h-8 rounded-md object-cover shrink-0">
        <span class="text-[13px] font-bold flex-1">${escapeHtml(m.name)} ${elBadge(Number(m.element))}</span>
        <span class="text-[11px] num-mono text-red-400">战力 ${fmt(Number(m.power),0)}</span>
        <span class="text-[11px] num-mono text-gold" title="奖励基数 ×0.01 = 基础 ELEM（≈${(Number(m.reward)*0.01).toFixed(2)} ELEM，英雄加成后更高）">奖励基数 ${fmt(Number(m.reward),0)}</span>
        <span class="text-[11px] num-mono text-green-400">经验 ${fmt(Number(m.xp),0)}</span>
      </div>` : '').join('');
  } else { monRows = '<div class="text-[12px] text-muted">暂无怪物</div>'; }
  const ch = adminCt('characters');
  const [sRegen, sMax] = await Promise.all([
    ch.staminaRegen().catch(()=>null), ch.maxStamina().catch(()=>null)
  ]);
  const staminaCard = aCard('英雄体力系统','fa-bolt',
    (sRegen===null || sMax===null)
      ? '<div class="text-[12px] text-amber-400"><i class="fa-solid fa-triangle-exclamation mr-1"></i>当前链上 Characters 合约尚未升级，暂无法读取/设置体力参数（需部署 V2 实现并调用 initializeV2）。</div>'
      : aRow('体力恢复间隔', (Number(sRegen)/60)+' 分钟/点（'+String(sRegen)+' 秒）') +
        aRow('体力上限', String(Number(sMax)) + ' 点') +
        '<div class="text-[11px] text-muted px-1 pt-1">恢复间隔范围 60 秒 ~ 7 天；上限范围 1 ~ 20 点。修改后对所有英雄即时生效（体力按新间隔/上限计算）。</div>',
    isOwner ? aAct('设置恢复间隔', 'adminOpenSetStaminaRegen()', 'fa-clock') +
             aAct('设置体力上限', 'adminOpenSetMaxStamina()', 'fa-gauge-high') : '');
  const body = staminaCard
    + aCard('commit 配置','fa-hourglass-half',
    aRow('过期块数', exp!==null?String(exp):'-') + aRow('每人待处理上限', maxp!==null?String(maxp):'-') + aRow('注册玩家数', pc!==null?String(pc):'-'),
    isOwner ? aAct('修改过期块数', 'adminPromptUint(\'v3\',\'setPendingExpiryBlocks\',\'过期块数（100~450）：\',{min:100,max:450})', 'fa-pen') +
             aAct('修改每人上限', 'adminPromptUint(\'v3\',\'setMaxPendingPerPlayer\',\'每人待处理上限：\',{min:1,max:10})', 'fa-pen') +
             aAct('清理单个过期', 'adminPromptUint(\'v3\',\'cleanupExpiredAction\',\'commitId：\',{})', 'fa-broom') : '')
    + aCard('怪物图鉴（'+mcnt+'）','fa-biohazard', monRows,
      isOwner ? aAct('添加怪物', 'adminOpenAddMonster()', 'fa-plus') + aAct('更新怪物', 'adminOpenUpdateMonster()', 'fa-pen') : '')
    + aCard('关联设置','fa-link',
      `<div class="text-[12px] text-muted">核心玩法关联的 8 个合约地址。</div>`,
      isOwner ? aAct('设置关联', 'adminOpenSetV3Links()', 'fa-pen') +
               aAct('排除注册地址', 'adminOpenSetExcluded()', 'fa-user-slash') : '');
  el.innerHTML = body + (isOwner ? aCard('暂停控制','fa-toggle-on','', aPauseBtn('v3', paused)) : '');
}
async function adminOpenAddMonster(){
  adminFormModal('添加怪物',[
    {label:'怪物名称', placeholder:'如 火焰巨魔'},
    {label:'元素', type:'select', options:[0,1,2,3,4].map(i=>({v:String(i), t:ELEMENTS[i].icon+' '+ELEMENTS[i].name})), value:'0'},
    {label:'战力（≤1000000）', placeholder:'100'},
    {label:'奖励基数（≤10000，×0.01=基础ELEM）', placeholder:'10'},
    {label:'经验（≤10000）', placeholder:'5'}
  ], 'adminDoAddMonster()');
}
async function adminDoAddMonster(){
  const v = adminFormVals(5);
  await adminExec('添加怪物', async()=>{
    await (await adminCt('v3',true).addMonster(v[0].trim(), BigInt(Number(v[1])||0),
      BigInt(Math.max(1,Math.min(1000000,Number(v[2])||100))),
      BigInt(Math.max(0,Math.min(10000,Number(v[3])||0))),
      BigInt(Math.max(0,Math.min(10000,Number(v[4])||0))))).wait();
  });
}
async function adminOpenUpdateMonster(){
  const core = adminCt('v3');
  const mc = await core.monstersCount().catch(()=>0n);
  if(Number(mc)===0){ toast('暂无怪物可更新','warn'); return; }
  const m = await core.monsters(BigInt(0)).catch(()=>null);
  adminFormModal('更新怪物（先填 ID）',[
    {label:'怪物 ID（0~'+(Number(mc)-1)+'）', value:'0'},
    {label:'名称', value: m?m.name:''},
    {label:'元素', type:'select', options:[0,1,2,3,4].map(i=>({v:String(i), t:ELEMENTS[i].icon+' '+ELEMENTS[i].name})), value: m?String(Number(m.element)):'0'},
    {label:'战力', value: m?String(Number(m.power)):''},
    {label:'奖励基数', value: m?String(Number(m.reward)):''},
    {label:'经验', value: m?String(Number(m.xp)):''}
  ], 'adminDoUpdateMonster()');
}
async function adminDoUpdateMonster(){
  const v = adminFormVals(6);
  await adminExec('更新怪物', async()=>{
    await (await adminCt('v3',true).updateMonster(BigInt(Math.round(Number(v[0])||0)), v[1].trim(), BigInt(Number(v[2])||0),
      BigInt(Math.max(1,Math.min(1000000,Number(v[3])||1))),
      BigInt(Math.max(0,Math.min(10000,Number(v[4])||0))),
      BigInt(Math.max(0,Math.min(10000,Number(v[5])||0))))).wait();
  });
}
async function adminOpenSetV3Links(){
  adminFormModal('设置核心玩法关联合约',[
    {label:'Vault 地址', value: addrOf('vault')||''},
    {label:'RandomOracle 地址', value: addrOf('randomOracle')||''},
    {label:'PriceOracle 地址', value: addrOf('oracle')||''},
    {label:'GameToken 地址', value: addrOf('gameToken')||''},
    {label:'Characters 地址', value: addrOf('characters')||''},
    {label:'Weapons 地址', value: addrOf('weapons')||''},
    {label:'Boss 地址', value: addrOf('boss')||''},
    {label:'Registry 地址（可为 0x0）', value:'0x0000000000000000000000000000000000000000'}
  ], 'adminDoSetV3Links()');
}
async function adminDoSetV3Links(){
  const v = adminFormVals(8);
  await adminExec('设置核心关联', async()=>{
    const ct = adminCt('v3', true);
    await (await ct.setVault(v[0].trim())).wait();
    await (await ct.setRandomOracle(v[1].trim())).wait();
    await (await ct.setPriceOracle(v[2].trim())).wait();
    await (await ct.setGameToken(v[3].trim())).wait();
    await (await ct.setCharacterContract(v[4].trim())).wait();
    await (await ct.setWeaponContract(v[5].trim())).wait();
    await (await ct.setBoss(v[6].trim())).wait();
    await (await ct.setRegistry(v[7].trim())).wait();
  });
}
async function adminOpenSetExcluded(){
  adminFormModal('设置排除注册地址',[
    {label:'地址', placeholder:'0x…'},
    {label:'状态', type:'select', options:[{v:'true',t:'排除'},{v:'false',t:'取消排除'}], value:'true'}
  ], 'adminDoSetExcluded()');
}
async function adminDoSetExcluded(){
  const v = adminFormVals(2);
  await adminExec('设置排除地址', async()=>{
    await (await adminCt('v3',true).setExcludedFromRegistry(v[0].trim(), String(v[1]).toLowerCase()==='true')).wait();
  });
}

/* ============ 锻造厂 ============ */
async function secForge(el, isOwner){
  const fs = adminCt('forgeShop');
  const [c1w,c2w,c3w,c4w,c5w,c1s,c2s,c3s,c4s,c5s, exp, maxp, paused] = await Promise.all([
    fs.cum1w().catch(()=>null), fs.cum2w().catch(()=>null), fs.cum3w().catch(()=>null),
    fs.cum4w().catch(()=>null), fs.cum5w().catch(()=>null),
    fs.cum1s().catch(()=>null), fs.cum2s().catch(()=>null), fs.cum3s().catch(()=>null),
    fs.cum4s().catch(()=>null), fs.cum5s().catch(()=>null),
    fs.commitExpiryBlocks().catch(()=>null), fs.maxPendingPerPlayer().catch(()=>null),
    fs.paused().catch(()=>false)
  ]);
  const wA = [c1w,c2w,c3w,c4w,c5w], sA = [c1s,c2s,c3s,c4s,c5s];
  const rateRow = (i)=>`<div class="flex items-center justify-between px-3 py-1.5 bg-[#0d1526] rounded-lg border border-[#24304a]">
    <span class="text-[12px]">${'★'.repeat(i+1)} 武器</span>
    <span class="text-[12px] num-mono text-gold">${wA[i]!==null?(Number(wA[i])/100).toFixed(1)+'%':'-'}</span>
    <span class="text-[12px] text-muted w-10 text-center">|</span>
    <span class="text-[12px]">💎 碎片 ${i+1}</span>
    <span class="text-[12px] num-mono text-purple-300">${sA[i]!==null?(Number(sA[i])/100).toFixed(1)+'%':'-'}</span>
  </div>`;
  const body = aCard('锻造掉落概率（累计千分比 BP）','fa-dice',
    [0,1,2,3,4].map(rateRow).join('') +
    `<div class="text-[11px] text-muted px-1">各星级为累计概率，逐级累加；单次锻造按随机数落入区间判定。</div>`,
    isOwner ? aAct('修改掉落概率', 'adminOpenSetForgeRates()', 'fa-pen') : '')
    + aCard('commit 配置','fa-hourglass-half',
      aRow('过期块数', exp!==null?String(exp):'-') + aRow('每人待处理上限', maxp!==null?String(maxp):'-'),
      isOwner ? aAct('修改过期块数', 'adminPromptUint(\'forgeShop\',\'setCommitExpiryBlocks\',\'过期块数：\',{min:100,max:1000})', 'fa-pen') +
               aAct('修改每人上限', 'adminPromptUint(\'forgeShop\',\'setMaxPendingPerPlayer\',\'每人待处理上限：\',{min:1,max:10})', 'fa-pen') : '')
    + aCard('过期清理','fa-broom',
      `<div class="text-[12px] text-muted">清理超时未揭示的锻造/合成 commit，清理者可获得赏金。</div>`,
      isOwner ? aAct('清理全部锻造', 'adminCleanForgeCommits()', 'fa-broom') +
               aAct('清理全部合成', 'adminCleanForgeSynths()', 'fa-broom') +
               aAct('清理单个', 'adminPromptUint(\'forgeShop\',\'cleanupExpiredCommit\',\'锻造 commitId：\',{})', 'fa-broom') : '')
    + aCard('关联设置','fa-link','',
      isOwner ? aAct('设置关联', 'adminOpenSetForgeLinks()', 'fa-pen') : '');
  el.innerHTML = body + (isOwner ? aCard('暂停控制','fa-toggle-on','', aPauseBtn('forgeShop', paused)) : '');
}
async function adminOpenSetForgeRates(){
  const fs = adminCt('forgeShop');
  const [c1w,c2w,c3w,c4w,c5w,c1s,c2s,c3s,c4s,c5s] = await Promise.all([
    fs.cum1w(),fs.cum2w(),fs.cum3w(),fs.cum4w(),fs.cum5w(),
    fs.cum1s(),fs.cum2s(),fs.cum3s(),fs.cum4s(),fs.cum5s()
  ]);
  adminFormModal('设置锻造掉落概率（累计 BP，0~10000，逐级递增）',[
    {label:'★1 武器 累计', value: String(Number(c1w))},
    {label:'★2 武器 累计', value: String(Number(c2w))},
    {label:'★3 武器 累计', value: String(Number(c3w))},
    {label:'★4 武器 累计', value: String(Number(c4w))},
    {label:'★5 武器 累计', value: String(Number(c5w))},
    {label:'碎片1 累计', value: String(Number(c1s))},
    {label:'碎片2 累计', value: String(Number(c2s))},
    {label:'碎片3 累计', value: String(Number(c3s))},
    {label:'碎片4 累计', value: String(Number(c4s))},
    {label:'碎片5 累计', value: String(Number(c5s))}
  ], 'adminDoSetForgeRates()');
}
async function adminDoSetForgeRates(){
  const v = adminFormVals(10).map(x=>BigInt(Math.max(0,Math.min(10000,Math.round(Number(x)||0)))));
  await adminExec('设置掉落概率', async()=>{
    await (await adminCt('forgeShop',true).setForgeRates(...v)).wait();
  });
}
async function adminCleanForgeCommits(){
  await adminExec('清理过期锻造', async()=>{
    await (await adminCt('forgeShop',true).cleanupAllExpiredCommits()).wait();
  });
}
async function adminCleanForgeSynths(){
  await adminExec('清理过期合成', async()=>{
    await (await adminCt('forgeShop',true).cleanupAllExpiredSynthesizes()).wait();
  });
}
async function adminOpenSetForgeLinks(){
  adminFormModal('设置锻造厂关联合约',[
    {label:'RandomOracle 地址', value: addrOf('randomOracle')||''},
    {label:'Vault 地址', value: addrOf('vault')||''},
    {label:'PriceOracle 地址', value: addrOf('oracle')||''}
  ], 'adminDoSetForgeLinks()');
}
async function adminDoSetForgeLinks(){
  const v = adminFormVals(3);
  await adminExec('设置锻造关联', async()=>{
    const ct = adminCt('forgeShop', true);
    await (await ct.setRandomOracle(v[0].trim())).wait();
    await (await ct.setVault(v[1].trim())).wait();
    await (await ct.setPriceOracle(v[2].trim())).wait();
  });
}

/* ============ 强化铺 ============ */
async function secEnhance(el, isOwner){
  const es = adminCt('enhanceShop');
  const [exp, maxp, paused] = await Promise.all([
    es.commitExpiryBlocks().catch(()=>null), es.maxPendingPerPlayer().catch(()=>null),
    es.paused().catch(()=>false)
  ]);
  const body = aCard('强化 commit 配置','fa-wand-magic-sparkles',
    aRow('过期块数', exp!==null?String(exp):'-') + aRow('每人待处理上限', maxp!==null?String(maxp):'-') +
    aRow('精粹强化手续费', '1阶 2 / 2阶 10 / 3阶 30 / 4阶 80 GAME·次') +
    aRow('高阶精粹合成', '3阶→4阶：500 GAME·次'),
    isOwner ? aAct('修改过期块数', 'adminPromptUint(\'enhanceShop\',\'setCommitExpiryBlocks\',\'过期块数：\',{min:100,max:1000})', 'fa-pen') +
             aAct('修改每人上限', 'adminPromptUint(\'enhanceShop\',\'setMaxPendingPerPlayer\',\'每人待处理上限：\',{min:1,max:10})', 'fa-pen') : '')
    + aCard('过期清理','fa-broom',
      `<div class="text-[12px] text-muted">清理超时未揭示的强化 commit。</div>`,
      isOwner ? aAct('清理全部', 'adminCleanEnhances()', 'fa-broom') +
               aAct('清理单个', 'adminPromptUint(\'enhanceShop\',\'cleanupExpiredEnhance\',\'commitId：\',{})', 'fa-broom') : '')
    + aCard('关联设置','fa-link','',
      isOwner ? aAct('设置关联', 'adminOpenSetEnhanceLinks()', 'fa-pen') : '');
  el.innerHTML = body + (isOwner ? aCard('暂停控制','fa-toggle-on','', aPauseBtn('enhanceShop', paused)) : '');
}
async function adminCleanEnhances(){
  await adminExec('清理过期强化', async()=>{
    await (await adminCt('enhanceShop',true).cleanupAllExpiredEnhances()).wait();
  });
}
async function adminOpenSetEnhanceLinks(){
  adminFormModal('设置强化铺关联合约',[
    {label:'RandomOracle 地址', value: addrOf('randomOracle')||''},
    {label:'Vault 地址', value: addrOf('vault')||''},
    {label:'PriceOracle 地址', value: addrOf('oracle')||''}
  ], 'adminDoSetEnhanceLinks()');
}
async function adminDoSetEnhanceLinks(){
  const v = adminFormVals(3);
  await adminExec('设置强化关联', async()=>{
    const ct = adminCt('enhanceShop', true);
    await (await ct.setRandomOracle(v[0].trim())).wait();
    await (await ct.setVault(v[1].trim())).wait();
    await (await ct.setPriceOracle(v[2].trim())).wait();
  });
}

async function adminOpenSetStaminaRegen(){
  const ch = adminCt('characters');
  const r = await ch.staminaRegen().catch(()=>300n);
  adminFormModal('设置英雄体力恢复间隔',[
    {label:'恢复间隔（分钟，1 ~ 10080 = 7天）', value: String(Math.round(Number(r)/60))}
  ], 'adminDoSetStaminaRegen()');
}
async function adminDoSetStaminaRegen(){
  const v = adminFormVals(1);
  const mins = Math.max(1, Math.min(10080, Math.round(Number(v[0])||5)));
  await adminExec('设置体力恢复间隔', async()=>{
    await (await adminCt('characters',true).setStaminaRegen(BigInt(mins*60))).wait();
  });
}
async function adminOpenSetMaxStamina(){
  const ch = adminCt('characters');
  const m = await ch.maxStamina().catch(()=>5n);
  adminFormModal('设置英雄体力上限',[
    {label:'体力上限（1 ~ 20）', value: String(Number(m))}
  ], 'adminDoSetMaxStamina()');
}
async function adminDoSetMaxStamina(){
  const v = adminFormVals(1);
  const n = Math.max(1, Math.min(20, Math.round(Number(v[0])||5)));
  await adminExec('设置体力上限', async()=>{
    await (await adminCt('characters',true).setMaxStamina(BigInt(n))).wait();
  });
}

/* ============ 随机预言机 ============ */
async function secRandomOracle(el, isOwner){
  const ro = adminCt('randomOracle');
  const [mn, mx, nxt, paused] = await Promise.all([
    ro.minDelayBlocks().catch(()=>null), ro.maxDelayBlocks().catch(()=>null), ro.nextCommitId().catch(()=>null),
    ro.paused().catch(()=>false)
  ]);
  const body = aCard('commit 延迟区间','fa-dice',
    aRow('最小延迟（块）', mn!==null?String(mn):'-') + aRow('最大延迟（块）', mx!==null?String(mx):'-') +
    aRow('已提交总数', nxt!==null?String(nxt):'-') +
    aRow('约束范围', 'min 3~500，max ≤500'),
    isOwner ? aAct('修改延迟区间', 'adminOpenSetDelay()', 'fa-pen') : '');
  el.innerHTML = body + (isOwner ? aCard('暂停控制','fa-toggle-on','', aPauseBtn('randomOracle', paused)) : '');
}
async function adminOpenSetDelay(){
  const ro = adminCt('randomOracle');
  const [mn, mx] = await Promise.all([ro.minDelayBlocks().catch(()=>3n), ro.maxDelayBlocks().catch(()=>450n)]);
  adminFormModal('设置 commit 延迟区间（块）',[
    {label:'最小延迟（3~500）', value: String(Number(mn))},
    {label:'最大延迟（≤500）', value: String(Number(mx))}
  ], 'adminDoSetDelay()');
}
async function adminDoSetDelay(){
  const v = adminFormVals(2);
  const mn = Math.max(3, Math.min(500, Math.round(Number(v[0])||3)));
  const mx = Math.max(mn, Math.min(500, Math.round(Number(v[1])||450)));
  await adminExec('设置延迟区间', async()=>{
    await (await adminCt('randomOracle',true).updateDelayConfig(BigInt(mn), BigInt(mx))).wait();
  });
}

/* ============ NFT 与代币 ============ */
async function secNft(el, isOwner){
  const me = S.account ? S.account.toLowerCase() : null;
  const nftCards = [];
  const buildNftCard = async (key, extraGetters, extraActions) => {
    const ct = adminCt(key);
    const [owner, paused, mine] = await Promise.all([
      ct.owner().catch(()=>null), ct.paused().catch(()=>null),
      me ? ct.minters(S.account).catch(()=>null) : Promise.resolve(null)
    ]);
    let rows = aRow('Owner', owner?shortAddr(owner):'-') + aRow('状态', paused?'<span class="text-red-400">已暂停</span>':'<span class="text-green-400">运行中</span>') +
      aRow('我是否铸造者', mine===null?'-':(mine?'<span class="text-green-400">是</span>':'<span class="text-red-400">否</span>'));
    for(const g of extraGetters){
      try{ const v = await ct[g.fn](); rows += aRow(g.label, v?shortAddr(v):'-'); }catch(e){ rows += aRow(g.label, '-'); }
    }
    const acts = isOwner ? (aAct('设为铸造者', `adminPromptAddr('${key}','setMinter','请输入铸造者地址：')`, 'fa-user-plus') +
      aAct('取消铸造者', `adminMinterOff('${key}')`, 'fa-user-minus') + extraActions + aPauseBtn(key, paused)) : '';
    return aCard(key==='gameToken'?'🪙 GameToken（游戏代币）':(ADMIN_CONTRACTS.find(x=>x.key===key)?.name||key), ADMIN_CONTRACTS.find(x=>x.key===key)?.icon||'fa-box', rows, acts);
  };
  nftCards.push(await buildNftCard('characters',
    [{label:'game()', fn:'game'},{label:'registry()', fn:'registry'}],
    aAct('设置 game', `adminPromptAddr('characters','setGame','请输入 game 合约地址：')`, 'fa-pen') +
    aAct('设置 registry', `adminPromptAddr('characters','setRegistry','请输入 registry 地址：')`, 'fa-pen')));
  nftCards.push(await buildNftCard('weapons',
    [{label:'game()', fn:'game'},{label:'blacksmith()', fn:'blacksmith'},{label:'registry()', fn:'registry'}],
    aAct('设置 game', `adminPromptAddr('weapons','setGame','请输入 game 合约地址：')`, 'fa-pen') +
    aAct('设置 blacksmith', `adminPromptAddr('weapons','setBlacksmith','请输入 blacksmith 合约地址：')`, 'fa-pen') +
    aAct('设置 registry', `adminPromptAddr('weapons','setRegistry','请输入 registry 地址：')`, 'fa-pen')));
  nftCards.push(await buildNftCard('shards', [], ''));
  nftCards.push(await buildNftCard('essence', [], ''));
  const gt = adminCt('gameToken');
  const [gtOwner, gtSupply, gtMine] = await Promise.all([
    gt.owner().catch(()=>null), gt.totalSupply().catch(()=>null),
    me ? gt.minters(S.account).catch(()=>null) : Promise.resolve(null)
  ]);
  nftCards.push(aCard('🪙 GameToken（游戏代币）','fa-coins',
    aRow('Owner', gtOwner?shortAddr(gtOwner):'-') + aRow('总供应', gtSupply!==null?fmtUnits(gtSupply,18,2):'-') +
    aRow('我是否铸造者', gtMine===null?'-':(gtMine?'<span class="text-green-400">是</span>':'<span class="text-red-400">否</span>')),
    isOwner ? aAct('设为铸造者', `adminPromptAddr('gameToken','setMinter','请输入铸造者地址：')`, 'fa-user-plus') +
              aAct('取消铸造者', `adminMinterOff('gameToken')`, 'fa-user-minus') +
              aAct('铸造代币', 'adminOpenMint()', 'fa-circle-plus') +
              aAct('销毁我的代币', 'adminOpenBurn()', 'fa-fire') : ''));
  el.innerHTML = nftCards.join('');
}
async function adminMinterOff(key){
  await adminExec('取消铸造者', async()=>{
    await (await adminCt(key,true).setMinter(S.account, false)).wait();
  });
}
async function adminOpenMint(){
  adminFormModal('铸造 '+S.tokenSymbol, [
    {label:'铸造给（地址）', value: S.account||''},
    {label:'数量', placeholder:'如 10000'}
  ], 'adminDoMint()');
}
async function adminDoMint(){
  const v = adminFormVals(2);
  await adminExec('铸造 '+S.tokenSymbol, async()=>{
    await (await adminCt('gameToken',true).mint(v[0].trim(), ethers.parseUnits(v[1]||'0',18))).wait();
  });
}
async function adminOpenBurn(){
  adminFormModal('销毁我的 '+S.tokenSymbol, [
    {label:'销毁数量（仅销毁您本人持有的代币）', placeholder:'如 100'}
  ], 'adminDoBurn()');
}
async function adminDoBurn(){
  const v = adminFormVals(1);
  if(!confirm('确认销毁 '+v[0]+' '+S.tokenSymbol+'？此操作不可逆。')) return;
  await adminExec('销毁代币', async()=>{
    await (await adminCt('gameToken',true).burn(ethers.parseUnits(v[0]||'0',18))).wait();
  });
}

/* ============ 我的授权 ============ */
async function secApprovals(el, isOwner){
  if(!S.account){ el.innerHTML = '<div class="text-muted py-6 text-center">连接钱包后查看</div>'; return; }
  const nftPairs = [['characters','marketplace'],['weapons','marketplace'],['shards','forgeShop'],['shards','enhanceShop'],['essence','forgeShop'],['essence','enhanceShop']];
  const nftRows = [];
  for(const [nft, sp] of nftPairs){
    const ok = await readCall(nft, c=>c.isApprovedForAll(S.account, addrOf(sp))).catch(()=>null);
    nftRows.push(`<div class="flex items-center justify-between gap-3 px-3 py-2 bg-[#0d1526] rounded-lg border border-[#24304a]">
      <span class="text-[12px]">${ADMIN_CONTRACTS.find(x=>x.key===nft)?.name} → ${ADMIN_CONTRACTS.find(x=>x.key===sp)?.name||sp}</span>
      <span class="flex items-center gap-2"><span class="text-[12px] font-bold ${ok?'text-green-400':'text-muted'}">${ok?'已授权':'未授权'}</span>
      ${ok?`<button class="btn btn-ghost !px-2 !py-1 text-[11px]" onclick="adminRevokeNft('${nft}','${sp}')">撤销</button>`:''}</span>
    </div>`);
  }
  const tokenSpenders = ['v3','forgeShop','enhanceShop','boss','marketplace'];
  const tokenRows = [];
  for(const sp of tokenSpenders){
    const a = addrOf(sp); if(!a) continue;
    const al = await readCall('gameToken', c=>c.allowance(S.account, a)).catch(()=>null);
    tokenRows.push(`<div class="flex items-center justify-between gap-3 px-3 py-2 bg-[#0d1526] rounded-lg border border-[#24304a]">
      <span class="text-[12px]">${sp}（${shortAddr(a)}）</span>
      <span class="flex items-center gap-2"><span class="text-[12px] num-mono ${al>0n?'text-gold':'text-muted'}">${al!==null?fmtUnits(al,18,2):'-'} ${S.tokenSymbol}</span>
      ${al>0n?`<button class="btn btn-ghost !px-2 !py-1 text-[11px]" onclick="adminRevokeToken('${sp}')">撤销</button>`:''}</span>
    </div>`);
  }
  const body = aCard('NFT 授权','fa-id-card',
    nftRows.join('') || '<div class="text-[12px] text-muted">无</div>',
    `<button class="btn btn-ghost" onclick="adminRevokeApprovals()"><i class="fa-solid fa-shield mr-1"></i>一键撤销全部 NFT 授权</button>`)
    + aCard('代币授权（'+S.tokenSymbol+'）','fa-coins',
      tokenRows.join('') || '<div class="text-[12px] text-muted">无</div>',
      `<button class="btn btn-ghost" onclick="adminRevokeAllTokens()"><i class="fa-solid fa-shield mr-1"></i>一键撤销全部代币授权</button>`);
  el.innerHTML = body;
}
async function adminRevokeNft(nftKey, spenderKey){
  if(!confirm(`确认取消 ${nftKey} → ${spenderKey} 的授权？`)) return;
  await adminExec('取消 NFT 授权', async()=>{
    await (await mustC(nftKey).connect(S.signer).setApprovalForAll(addrOf(spenderKey), false)).wait();
  });
}
async function adminRevokeToken(spenderKey){
  if(!confirm(`确认撤销对 ${spenderKey} 的 ${S.tokenSymbol} 授权？`)) return;
  await adminExec('撤销代币授权', async()=>{
    await (await mustC('gameToken').connect(S.signer).approve(addrOf(spenderKey), 0)).wait();
  });
}
async function adminRevokeAllTokens(){
  if(!confirm('确认撤销对全部合约的代币授权？')) return;
  await adminExec('撤销全部代币授权', async()=>{
    const tk = mustC('gameToken').connect(S.signer);
    for(const sp of ['v3','forgeShop','enhanceShop','boss','marketplace']){
      const a = addrOf(sp); if(!a) continue;
      await (await tk.approve(a, 0)).wait();
    }
  });
}
async function adminRevokeApprovals(){
  if(!confirm('确认取消对 Marketplace / ForgeShop / EnhanceShop 的所有 NFT 授权？')) return;
  await adminExec('取消全部 NFT 授权', async()=>{
    const mkt = mustC('marketplace');
    for(const key of ['characters','weapons']){
      const nft = mustC(key).connect(S.signer);
      await (await nft.setApprovalForAll(mkt.target, false)).wait();
    }
    for(const key of ['shards','essence']){
      const nft = mustC(key).connect(S.signer);
      await (await nft.setApprovalForAll(mustC('forgeShop').target, false)).wait();
      await (await nft.setApprovalForAll(mustC('enhanceShop').target, false)).wait();
    }
  });
}
