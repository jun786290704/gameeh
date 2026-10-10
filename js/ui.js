'use strict';

/* ============ Tab ============ */
function switchTab(tab){
  // 管理后台仅管理员可进入（按钮默认隐藏，此处为兜底：直接改 hash / 控制台调用也进不来）
  if(tab==='admin' && typeof canViewAdmin==='function' && !canViewAdmin()) return;
  S.tab = tab;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  document.querySelectorAll('#mainArea > section').forEach(s=>s.classList.add('hidden'));
  const p = $('#panel-'+tab); if(p) p.classList.remove('hidden');
  refreshCurrentTabAsync();
}
async function refreshCurrentTabAsync(){
  const t = S.tab;
  try{
    if(t==='heroes') await renderHeroes();
    else if(t==='weapons') await renderWeapons();
    else if(t==='forge') await renderForge();
    else if(t==='melt') await renderMelt();
    else if(t==='compose') await renderCompose();
    else if(t==='fight') await renderFight();
    else if(t==='boss') await refreshBoss();
    else if(t==='market'){ await loadActiveListings(); await loadMyListings(); }
    else if(t==='vault') await refreshVault();
    else if(t==='invite') await loadInvitePanel();
    else if(t==='rank'){ await loadLeaderboard(); await loadBattleRecords(); }
    else if(t==='gallery'){ await renderGallery(); }
    else if(t==='admin') await renderAdmin();
  }catch(e){ console.warn('[refreshCurrentTab]', t, e); }
}
function refreshCurrentTab(){ refreshCurrentTabAsync(); }

/* ============ 余额 & 代币 ============ */
async function loadTokenInfo(){
  try{
    const tk = mustC('gameToken');
    S.tokenDecimals = Number(await tk.decimals());
    S.tokenSymbol = TOKEN_SYMBOL; // 统一展示 EH，不采用合约 symbol
    if(S.account){ S.tokenBal = await tk.balanceOf(S.account); }
    renderTokenChip();
  }catch(e){ console.warn('token',e); }
}
function renderTokenChip(){
  let el = $('#tokenChip');
  if(!el){
    el = document.createElement('span'); el.id='tokenChip';
    el.className='badge bg-[#1a2740] text-gold num-mono hidden sm:inline-flex mr-1';
    const ref = $('#connectBtn'); if(ref && ref.parentNode) ref.parentNode.insertBefore(el, ref);
  }
  el.innerHTML = '<i class="fa-solid fa-coins mr-1"></i>'+fmtUnits(S.tokenBal, S.tokenDecimals, 2)+' '+S.tokenSymbol;
  if(typeof refreshWalletMenu==='function') refreshWalletMenu();
}
async function refreshBalances(){
  if(!S.account){ renderBalances(); return; }
  try{
    const sh = mustC('shards'), es = mustC('essence');
    const ids1=[1,2,3,4,5], ids2=[1,2,3,4];
    const b1 = await sh.balanceOfBatch(ids1.map(()=>S.account), ids1);
    const b2 = await es.balanceOfBatch(ids2.map(()=>S.account), ids2);
    S.shardsBal = Object.fromEntries(ids1.map((id,i)=>[id,Number(b1[i])]));
    S.essenceBal = Object.fromEntries(ids2.map((id,i)=>[id,Number(b2[i])]));
  }catch(e){ console.warn('balances',e); }
  renderBalances();
}
function renderBalances(){
  const chip = (tag, bal, color) => `<div class="bg-[#0d1526] border border-[#24304a] rounded-xl px-3 py-2 flex items-center justify-between gap-2">
      <span class="text-[12px] font-bold">${tag}</span>
      <span class="badge num-mono" style="color:${color};background:${color}1f">${fmt(bal,0)}</span></div>`;
  const shards = [1,2,3,4,5].map(id=>chip(`碎片 ${id} 💎`, S.shardsBal[id]||0, '#a78bfa')).join('');
  const ess = [1,2,3,4].map(id=>chip(`精粹 ${id} 🧪`, S.essenceBal[id]||0, '#34d399')).join('');
  const m = $('#mintBalances'); if(m) m.innerHTML = shards + ess;
  const cc = $('#composeBalances'); if(cc) cc.innerHTML = ess + shards;
}

/* ============ 分类视图 ============ */
function wGroupKey(el, star){ return star===undefined||star===null ? 'we-'+el : 'we-'+el+'-'+star; }
function mGroupKey(el, sub){ return sub===undefined||sub===null ? 'me-'+el : 'me-'+el+'-'+sub; }
function isCollapsed(k){ return !!S.collapsedGroups[k]; }
function toggleCollapse(k){ S.collapsedGroups[k] = !S.collapsedGroups[k]; }
function groupCaret(open){ return `<i class="fa-solid ${open?'fa-chevron-up':'fa-chevron-down'} text-[11px] opacity-70"></i>`; }
function elGroupHeader(k, el, count, toggleJs, open){
  const e = ELEMENTS[el]||{name:'未知',icon:'❓',color:'#94a3b8',soft:'rgba(148,163,184,.1)',border:'#475569'};
  return `<button type="button" onclick="${toggleJs}" class="col-span-full w-full flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl border text-left transition-all active:scale-[.99]" style="border-color:${e.border};background:linear-gradient(90deg,${e.soft},transparent 72%)">
      <span class="text-lg leading-none">${e.icon}</span>
      <span class="font-black text-[14px]" style="color:${e.color}">${e.name}属性</span>
      <span class="badge bg-[#0d1526] text-muted num-mono">${count} 件</span>
      <span class="ml-auto">${groupCaret(open)}</span>
    </button>`;
}
function subGroupHeader(k, icon, label, count, toggleJs, open){
  return `<button type="button" onclick="${toggleJs}" class="col-span-full w-full flex items-center gap-2 min-h-[44px] px-3 py-1.5 rounded-lg border border-[#24304a] bg-[#0d1526]/70 text-left transition-all active:scale-[.99]">
      <i class="fa-solid ${icon} text-[11px] opacity-60"></i>
      <span class="text-gold font-bold text-[13px]">${label}</span>
      <span class="badge bg-[#1a2740] text-muted num-mono ml-auto">${count}</span>
      ${groupCaret(open)}
    </button>`;
}
function filterChips(active, setFn){
  const chips = [['all','全部']].concat(ELEMENT_ORDER.map(el=>[el, ELEMENTS[el].icon+' '+ELEMENTS[el].name]));
  return chips.map(([v,label])=>{
    const on = v==='all' ? (active===null||active===undefined) : (active===v);
    return `<button type="button" onclick="${setFn}(${v==='all'?'null':v})" class="min-h-[44px] px-3 py-1.5 rounded-xl border text-[13px] font-bold transition-all active:scale-95" style="${on?'border-color:#fbbf24;background:rgba(251,191,36,.12);color:#fbbf24':'border-color:#24304a;background:#0d1526;color:#8ea0bd'}">${label}</button>`;
  }).join('');
}

// 市场类型配置
const MKT_TYPE_META = {
  0: {key:'hero',    name:'英雄', icon:'fa-user-ninja', color:'#60a5fa', soft:'rgba(96,165,250,.14)',  border:'rgba(96,165,250,.5)',  sub:'等级', subIcon:'fa-signal'},
  1: {key:'weapon',  name:'武器', icon:'fa-khanda',     color:'#fbbf24', soft:'rgba(251,191,36,.14)',  border:'rgba(251,191,36,.5)',  sub:'星级', subIcon:'fa-star'},
  2: {key:'shard',   name:'碎片', icon:'fa-gem',        color:'#a78bfa', soft:'rgba(167,139,250,.14)', border:'rgba(167,139,250,.5)', sub:'编号', subIcon:'fa-hashtag'},
  3: {key:'essence', name:'精粹', icon:'fa-flask',      color:'#34d399', soft:'rgba(52,211,153,.14)',  border:'rgba(52,211,153,.5)',  sub:'编号', subIcon:'fa-hashtag'}
};
const MKT_TYPE_ORDER = [0,1,2,3];
// 哪些类型有元素属性
function mktTypeHasEl(t){ return t===0 || t===1; }

/* ===== 市场细分维度 ===== */

// 英雄等级段（标签不含中文，便于多语言）
const MKT_LEVEL_BANDS = [
  {id:0, label:'Lv.1-19',  min:1,  max:19},
  {id:1, label:'Lv.20-39', min:20, max:39},
  {id:2, label:'Lv.40-59', min:40, max:59},
  {id:3, label:'Lv.60-79', min:60, max:79},
  {id:4, label:'Lv.80+',   min:80, max:9999}
];
function mktLevelBandOf(l){
  const lv = Number((l && l.level) || 0);
  for(const b of MKT_LEVEL_BANDS){ if(lv >= b.min && lv <= b.max) return b.id; }
  return MKT_LEVEL_BANDS.length - 1;
}
const ROMAN = ['','Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ'];
// 碎片按编号 1-5（对应 1-5 星武器），精粹按编号 1-4（阶）
function mktItemIds(t){ return t===2 ? [1,2,3,4,5] : (t===3 ? [1,2,3,4] : []); }
function mktItemKindName(t){ return t===2 ? '碎片' : '精粹'; }
function mktStarIds(){ return [5,4,3,2,1]; }

// 价格分档：按当前在售最高价四等分（与代币量级无关，永远有 4 档）
function mktPriceTiersOf(list){
  let max = 0n;
  for(const l of (list||[])){ const p = l && l.price; if(typeof p === 'bigint' && p > max) max = p; }
  if(max <= 0n) return null;
  const out = [];
  for(let i=0;i<4;i++) out.push({id:i, min:max*BigInt(i)/4n, max:max*BigInt(i+1)/4n, last:i===3});
  return out;
}
function mktBandOf(price, tiers){
  if(!tiers || !tiers.length) return null;
  for(const t of tiers){
    if(t.last){ if(price >= t.min) return t.id; }
    else if(price >= t.min && price < t.max) return t.id;
  }
  return tiers[0].id;
}
function mktBandLabel(t, dec){
  if(!t) return '';
  return fmtUnits(t.min, dec===undefined?S.tokenDecimals:dec, 0) + '–' + fmtUnits(t.max, dec===undefined?S.tokenDecimals:dec, 0);
}

// 单个筛选 chip
function mktChip(label, on, onClickJs, opts){
  const o = opts || {};
  const sty = (on && o.color) ? ` style="border-color:${o.border||o.color};background:${o.soft||'rgba(251,191,36,.12)'};color:${o.color}"` : '';
  const cnt = (o.count === undefined) ? '' : `<i class="mkt-chip-n">${o.count}</i>`;
  return `<button type="button" onclick="${onClickJs}" class="mkt-chip${on?' on':''}"${sty}>${label}${cnt}</button>`;
}
// 一行筛选（标签 + chips）
function mktChipRow(label, icon, chips, hidden){
  return `<div class="mkt-fgroup"${hidden?' style="display:none"':''}><span class="mkt-flabel"><i class="fa-solid ${icon}"></i><span>${label}</span></span><span class="mkt-fchips">${chips}</span></div>`;
}

// 分组折叠 key（带类型前缀，避免英雄等级段与武器星级撞 key）
function mktElKey(tt, el){ return 'mk'+tt+'-'+(el===null||el===undefined?'x':el); }
function mktSubKey(tt, el, sub){ return 'mk'+tt+'-'+(el===null||el===undefined?'x':el)+'-'+(sub===null||sub===undefined?'x':sub); }
function toggleMarketEl(kind, tt, el){ toggleCollapse(mktElKey(tt, el)); (kind==='mine'?loadMyListings:loadActiveListings)(); }
function toggleMarketSub(kind, tt, el, sub){ toggleCollapse(mktSubKey(tt, el, sub)); (kind==='mine'?loadMyListings:loadActiveListings)(); }

// 市场 / 我的上架两套 setter 名
function mktSetNames(kind){
  return kind === 'mine'
    ? {type:'setMyListFilterType', el:'setMyListFilter', level:'setMyListLevel', star:'setMyListStar', item:'setMyListItem', band:'setMyListBand', clear:'clearMyListFilters'}
    : {type:'setMarketFilterType', el:'setMarketFilter', level:'setMarketLevel', star:'setMarketStar', item:'setMarketItem', band:'setMarketBand', clear:'clearMarketFilters'};
}

// 完整筛选面板（随类型联动显示可用维度）
function mktFilterPanelHTML(st, kind, tiers){
  const N = mktSetNames(kind);
  const call = (fn, v) => `${N[fn]}(${v===null||v===undefined?'null':v})`;
  const rows = [];
  const t = st.type;
  const isAll = (t===null || t===undefined);

  // 元素（英雄 / 武器 / 全部）
  if(isAll || mktTypeHasEl(t)){
    const elOn = st.el!==null && st.el!==undefined;
    let chips = mktChip('全部', !elOn, call('el',null));
    chips += ELEMENT_ORDER.map(el=>{
      const e = ELEMENTS[el];
      return mktChip(`${e.icon} ${e.name}`, st.el===el, call('el',el), {color:e.color, soft:e.soft, border:e.border});
    }).join('');
    rows.push(mktChipRow('元素','fa-shapes',chips));
  }
  // 英雄：等级段
  if(t===0){
    const on = st.level!==null && st.level!==undefined;
    let chips = mktChip('全部', !on, call('level',null));
    chips += MKT_LEVEL_BANDS.map(b=>mktChip(b.label, st.level===b.id, call('level',b.id))).join('');
    rows.push(mktChipRow('等级','fa-signal',chips));
  }
  // 武器：星级
  if(t===1){
    const on = st.star!==null && st.star!==undefined;
    let chips = mktChip('全部', !on, call('star',null));
    chips += [1,2,3,4,5].map(s=>mktChip('★'.repeat(s), st.star===s, call('star',s))).join('');
    rows.push(mktChipRow('星级','fa-star',chips));
  }
  // 碎片 / 精粹：编号
  if(t===2 || t===3){
    const ids = mktItemIds(t);
    const on = st.item!==null && st.item!==undefined;
    let chips = mktChip('全部', !on, call('item',null));
    chips += ids.map(i=>`<button type="button" onclick="${call('item',i)}" class="mkt-chip${st.item===i?' on':''}"><span>${mktItemKindName(t)}</span><i class="roman">${ROMAN[i]}</i></button>`).join('');
    rows.push(mktChipRow('编号','fa-hashtag',chips));
  }
  // 价格区间（全类型）
  if(tiers && tiers.length){
    const on = st.band!==null && st.band!==undefined;
    let chips = mktChip('全部', !on, call('band',null));
    chips += tiers.map(x=>mktChip(mktBandLabel(x), st.band===x.id, call('band',x.id))).join('');
    rows.push(mktChipRow('价格','fa-coins',chips));
  }
  return rows.join('');
}

// 是否有任何细分筛选生效（用于"清除筛选"按钮）
function mktHasAnyFilter(st){
  if(st.type!==null && st.type!==undefined) return true;
  if(st.search) return true;
  return [st.el, st.level, st.star, st.item, st.band].some(v=>v!==null && v!==undefined);
}

// 按维度过滤（tiers 为价格分档；search 为关键词：tokenId / 挂单号 / 卖家地址）
function applyMarketFilters(list, st, tiers){
  let l = (list||[]).slice();
  if(st.type!==null && st.type!==undefined) l = l.filter(x=>x.nftType===st.type);
  if(st.el!==null && st.el!==undefined) l = l.filter(x=>x.element===st.el);
  if(st.level!==null && st.level!==undefined) l = l.filter(x=>x.nftType===0 && mktLevelBandOf(x)===st.level);
  if(st.star!==null && st.star!==undefined) l = l.filter(x=>x.nftType===1 && Number(x.stars||0)===st.star);
  if(st.item!==null && st.item!==undefined) l = l.filter(x=>(x.nftType===2||x.nftType===3) && Number(x.tokenId)===st.item);
  if(st.band!==null && st.band!==undefined && tiers) l = l.filter(x=>mktBandOf(x.price, tiers)===st.band);
  if(st.search){
    const q = String(st.search).trim().toLowerCase();
    if(q) l = l.filter(x=> String(x.tokenId).includes(q)
      || String(x.lid).includes(q)
      || String(x.seller||'').toLowerCase().includes(q));
  }
  return l;
}

// 类型筛选条（主分类，带数量角标）
function mktTypeChips(active, setFn, counts, total){
  const cells = [];
  cells.push(mktChip('全部', active===null||active===undefined, `${setFn}(null)`, {count: total}));
  for(const t of MKT_TYPE_ORDER){
    const m = MKT_TYPE_META[t];
    cells.push(mktChip(`<i class="fa-solid ${m.icon}"></i> ${m.name}`, active===t, `${setFn}(${t})`,
      {color:m.color, soft:m.soft, border:m.border, count: counts ? (counts[t]||0) : undefined}));
  }
  return `<span class="mkt-fchips">${cells.join('')}</span>`;
}

// 元素筛选条（子分类）
function mktElChips(active, setFn){
  const list = [['all','全部']].concat(ELEMENT_ORDER.map(el=>[el, ELEMENTS[el].icon+' '+ELEMENTS[el].name]));
  return list.map(([v,label])=>{
    const on = v==='all' ? (active===null||active===undefined) : (active===v);
    const sty = on
      ? `border-color:#fbbf24;background:rgba(251,191,36,.12);color:#fbbf24`
      : `border-color:#24304a;background:#0d1526;color:#8ea0bd`;
    return `<button type="button" onclick="${setFn}(${v==='all'?'null':v})" class="min-h-[44px] px-3 py-1.5 rounded-xl border text-[13px] font-bold transition-all active:scale-95" style="${sty}">${label}</button>`;
  }).join('');
}

// 排序下拉
function mktSortSelect(active, setFn){
  const opts = [
    ['default','默认排序'],
    ['priceAsc','价格 ↑ 低到高'],
    ['priceDesc','价格 ↓ 高到低'],
    ['rarityDesc','稀有度 ↓ 高到低'],
    ['newest','最新上架'],
  ];
  const items = opts.map(([v,l])=>`<option value="${v}" ${v===active?'selected':''}>${l}</option>`).join('');
  return `<select onchange="${setFn}(this.value)" class="mkt-sort-select input py-1.5 pl-3 pr-8 text-[13px] font-bold rounded-xl" style="min-height:44px;border-color:#24304a;background:#0d1526;color:#fbbf24">${items}</select>`;
}

// 顶部汇总 chip 行（点击切换类型筛选）
function mktStatsRow(counts, total, avgPrice, symbol, decimals, active, setFn, minPrice){
  const cells = [];
  const onAll = active===null || active===undefined;
  cells.push(`<button type="button" onclick="${setFn}(null)" class="mkt-stat-chip${onAll?' on':''}">
    <i class="fa-solid fa-store"></i><span class="mkt-stat-k">在售</span><span class="mkt-stat-v">${total}</span>
  </button>`);
  for(const t of MKT_TYPE_ORDER){
    const m = MKT_TYPE_META[t];
    const on = active===t;
    const sty = on ? ` style="border-color:${m.border};background:${m.soft};color:${m.color}"` : '';
    cells.push(`<button type="button" onclick="${setFn}(${t})" class="mkt-stat-chip${on?' on':''}"${sty}>
      <i class="fa-solid ${m.icon}"></i><span class="mkt-stat-k">${m.name}</span><span class="mkt-stat-v">${counts[t]||0}</span>
    </button>`);
  }
  cells.push(`<div class="mkt-stat-chip is-info"><i class="fa-solid fa-arrow-down-long"></i><span class="mkt-stat-k">最低价</span><span class="mkt-stat-v">${minPrice===null||minPrice===undefined?'--':fmtUnits(minPrice,decimals,2)}</span></div>`);
  cells.push(`<div class="mkt-stat-chip is-info"><i class="fa-solid fa-chart-simple"></i><span class="mkt-stat-k">均价</span><span class="mkt-stat-v">${fmtUnits(avgPrice,decimals,2)}</span></div>`);
  return cells.join('');
}

// 排序工具（仅作用于已加载列表）
function sortMarketList(arr, mode){
  const a = arr.slice();
  if(mode==='priceAsc') a.sort((x,y)=> Number(x.price>y.price)-Number(x.price<y.price));
  else if(mode==='priceDesc') a.sort((x,y)=> Number(y.price>x.price)-Number(y.price<x.price));
  else if(mode==='newest') a.sort((x,y)=> (y.lid||0)-(x.lid||0));
  else if(mode==='rarityDesc'){
    const rarity = l => {
      if(l.nftType===1) return (l.stars||0)*1000 + (l.bonusBp||0);
      if(l.nftType===0) return (l.level||0)*10;
      return l.amount||0;
    };
    a.sort((x,y)=> rarity(y)-rarity(x));
  }
  return a;
}
function setWeaponFilter(el){ S.weaponsFilterEl = (el===S.weaponsFilterEl)?null:el; renderWeapons(); }
function weaponMiniFilterHTML(st, prefix){
  const chips = (act, arr, sfx)=>{
    return [['all','全部']].concat(arr).map(([v,label])=>{
      const on = v==='all' ? (act===null||act===undefined) : (act===v);
      return `<button type="button" onclick="${sfx}(${v==='all'?'null':v})" class="min-h-[30px] px-2 py-0.5 rounded-lg border text-[11px] font-bold transition-all active:scale-95" style="${on?'border-color:#fbbf24;background:rgba(251,191,36,.12);color:#fbbf24':'border-color:#24304a;background:#0d1526;color:#8ea0bd'}">${label}</button>`;
    }).join('');
  };
  const elArr = ELEMENT_ORDER.map(el=>[el, ELEMENTS[el].icon]);
  const starArr = [1,2,3,4,5].map(s=>[s, '★'.repeat(s)]);
  const pre = prefix==='fight' ? 'setFightW' : 'setBossW';
  return `
    <span class="text-[10px] text-muted shrink-0">元素</span>${chips(st.el, elArr, pre+'El')}
    <span class="text-[10px] text-muted shrink-0 ml-1">星级</span>${chips(st.star, starArr, pre+'Star')}
  `;
}
function setFightWEl(el){ S.fightW.el = (el===S.fightW.el)?null:el; renderFight(); }
function setFightWStar(s){ S.fightW.star = (s===S.fightW.star)?null:s; renderFight(); }
function setBossWEl(el){ S.bossW.el = (el===S.bossW.el)?null:el; renderBossPicks(); }
function setBossWStar(s){ S.bossW.star = (s===S.bossW.star)?null:s; renderBossPicks(); }
function applyWeaponFilter(list, st){
  let l = (list||[]).slice();
  if(st.el!==null && st.el!==undefined) l = l.filter(w=>w.element===st.el);
  if(st.star) l = l.filter(w=>w.stars===st.star);
  l.sort((a,b)=>b.bonusBp-a.bonusBp || b.stars-a.stars);
  return l;
}
function filterStarChips(active, setFn){
  const chips = [['all','全部']].concat([1,2,3,4,5].map(s=>[s, '★'.repeat(s)+'☆'.repeat(5-s)]));
  return chips.map(([v,label])=>{
    const on = v==='all' ? (active===null||active===undefined) : (active===v);
    return `<button type="button" onclick="${setFn}(${v==='all'?'null':v})" class="min-h-[44px] px-3 py-1.5 rounded-xl border text-[13px] font-bold transition-all active:scale-95" style="${on?'border-color:#fbbf24;background:rgba(251,191,36,.12);color:#fbbf24':'border-color:#24304a;background:#0d1526;color:#8ea0bd'}">${label}</button>`;
  }).join('');
}
function setWeaponFilterStar(s){ S.weaponsFilterStar = (s===S.weaponsFilterStar)?null:s; renderWeapons(); }
function setWeaponSort(k){ S.weaponsSort = k; renderWeapons(); }
function setWeaponSearch(v){ S.weaponSearch = (v||'').trim(); renderWeapons(); }
// 通用：点已选中的项 → 取消（回到全部）
function mktToggleVal(cur, v){
  const val = (v===undefined || v===null || v==='null') ? null : (typeof v==='string' ? Number(v) : v);
  return (val===cur) ? null : val;
}
function setMarketFilter(el){
  S.marketFilterEl = mktToggleVal(S.marketFilterEl, el);
  S.marketPage=0; loadActiveListings();
}
function setMarketFilterType(t){
  // 字符串 'null' → null, 数字字符串 → 数字
  const v = (t===null||t===undefined||t==='null') ? null : Number(t);
  S.marketFilterType = (v===S.marketFilterType) ? null : v;
  // 切换类型时，清掉该类型不适用的细分筛选
  if(S.marketFilterType!==null){
    if(!mktTypeHasEl(S.marketFilterType)) S.marketFilterEl = null;
    if(S.marketFilterType!==0) S.marketFilterLevel = null;
    if(S.marketFilterType!==1) S.marketFilterStar = null;
    if(S.marketFilterType!==2 && S.marketFilterType!==3) S.marketFilterItem = null;
  }
  S.marketPage=0;
  loadActiveListings();
}
function setMarketLevel(v){ S.marketFilterLevel = mktToggleVal(S.marketFilterLevel, v); S.marketPage=0; loadActiveListings(); }
function setMarketStar(v){ S.marketFilterStar = mktToggleVal(S.marketFilterStar, v); S.marketPage=0; loadActiveListings(); }
function setMarketItem(v){ S.marketFilterItem = mktToggleVal(S.marketFilterItem, v); S.marketPage=0; loadActiveListings(); }
function setMarketBand(v){ S.marketFilterBand = mktToggleVal(S.marketFilterBand, v); S.marketPage=0; loadActiveListings(); }
function clearMarketFilters(){
  S.marketFilterType=null; S.marketFilterEl=null; S.marketFilterLevel=null;
  S.marketFilterStar=null; S.marketFilterItem=null; S.marketFilterBand=null;
  S.marketSearch='';
  const inp = document.getElementById('marketSearchInp'); if(inp) inp.value='';
  S.marketPage=0; loadActiveListings();
}
function setMarketSort(v){ S.marketSort = v; S.marketPage=0; loadActiveListings(); }
// 市场 / 我的上架 搜索（关键词：tokenId / 挂单号 / 卖家地址）
function setMarketSearch(v){ S.marketSearch = (v||'').trim(); S.marketPage=0; loadActiveListings(); }
function toggleWeaponGroup(el, star){ toggleCollapse(wGroupKey(el, star)); renderWeapons(); }
function toggleMarketGroup(el, sub){ toggleCollapse(mGroupKey(el, sub)); loadActiveListings(); }
function toggleMarketTypeGroup(t){ toggleCollapse('mt-'+t); loadActiveListings(); }

// 我的上架 — 同一套 setter，绑定不同 state 字段
function setMyListFilter(el){ S.myListFilterEl = mktToggleVal(S.myListFilterEl, el); loadMyListings(); }
function setMyListFilterType(t){
  const v = (t===null||t===undefined||t==='null') ? null : Number(t);
  S.myListFilterType = (v===S.myListFilterType) ? null : v;
  if(S.myListFilterType!==null){
    if(!mktTypeHasEl(S.myListFilterType)) S.myListFilterEl = null;
    if(S.myListFilterType!==0) S.myListFilterLevel = null;
    if(S.myListFilterType!==1) S.myListFilterStar = null;
    if(S.myListFilterType!==2 && S.myListFilterType!==3) S.myListFilterItem = null;
  }
  loadMyListings();
}
function setMyListLevel(v){ S.myListFilterLevel = mktToggleVal(S.myListFilterLevel, v); loadMyListings(); }
function setMyListStar(v){ S.myListFilterStar = mktToggleVal(S.myListFilterStar, v); loadMyListings(); }
function setMyListItem(v){ S.myListFilterItem = mktToggleVal(S.myListFilterItem, v); loadMyListings(); }
function setMyListBand(v){ S.myListFilterBand = mktToggleVal(S.myListFilterBand, v); loadMyListings(); }
function clearMyListFilters(){
  S.myListFilterType=null; S.myListFilterEl=null; S.myListFilterLevel=null;
  S.myListFilterStar=null; S.myListFilterItem=null; S.myListFilterBand=null;
  S.myListSearch='';
  const inp = document.getElementById('myListSearchInp'); if(inp) inp.value='';
  loadMyListings();
}
function setMyListSort(v){ S.myListSort = v; loadMyListings(); }
function setMyListSearch(v){ S.myListSearch = (v||'').trim(); loadMyListings(); }
function toggleMyListTypeGroup(t){ toggleCollapse('mymt-'+t); loadMyListings(); }

/* ============ 数据缓存 ============ */
const CACHE_TTL = 30000;
const _cache = {};
function cacheGet(key){ const c = _cache[key]; if(c && Date.now()-c.ts < CACHE_TTL) return c.data; return null; }
function cacheSet(key, data){ _cache[key] = {data, ts:Date.now()}; }
function cacheInvalidate(key){ if(key) delete _cache[key]; else Object.keys(_cache).forEach(k=>delete _cache[k]); }
