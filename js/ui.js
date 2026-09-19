'use strict';

/* ============ Tab ============ */
function switchTab(tab){
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
function setMarketFilter(el){ S.marketFilterEl = (el===S.marketFilterEl)?null:el; loadActiveListings(); }
function toggleWeaponGroup(el, star){ toggleCollapse(wGroupKey(el, star)); renderWeapons(); }
function toggleMarketGroup(el, sub){ toggleCollapse(mGroupKey(el, sub)); loadActiveListings(); }

/* ============ 数据缓存 ============ */
const CACHE_TTL = 30000;
const _cache = {};
function cacheGet(key){ const c = _cache[key]; if(c && Date.now()-c.ts < CACHE_TTL) return c.data; return null; }
function cacheSet(key, data){ _cache[key] = {data, ts:Date.now()}; }
function cacheInvalidate(key){ if(key) delete _cache[key]; else Object.keys(_cache).forEach(k=>delete _cache[k]); }
