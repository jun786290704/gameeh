'use strict';

/* ============ 武器 ============ */
async function fetchWeapons(force){
  if(!S.account) return [];
  const cacheKey = 'weapons_'+S.account;
  if(!force){ const cached = cacheGet(cacheKey); if(cached) return cached; }
  try{
    const wp = mustC('weapons');
    const ids = await wp.tokensOfOwner(S.account);
    const results = await Promise.all(ids.map(async id => {
      try{ const w = await wp.weapons(id); return {id:Number(id), stars:Number(w.stars), element:Number(w.element), bonusBp:Number(w.bonusBp)}; }catch(e){ return null; }
    }));
    const out = results.filter(x=>x!==null);
    cacheSet(cacheKey, out);
    return out;
  }catch(e){ console.warn('weapons',e); return []; }
}
function weaponCardHtml(w){
  const e = ELEMENTS[w.element]||ELEMENTS[0];
  return `<div class="game-card overflow-hidden anim-fade">
    <div class="relative h-28 flex items-center justify-center text-4xl overflow-hidden" style="background:radial-gradient(circle at 50% 30%, ${e.soft}, #0d1526 82%);">
      <span style="filter:drop-shadow(0 8px 14px rgba(0,0,0,.55));">⚔️</span>
      <span class="absolute top-2 left-2 text-[11px] font-black px-2 py-0.5 rounded-lg" style="background:rgba(8,12,24,.72);color:${e.color};border:1px solid ${e.border}55;">${e.icon} ${e.name}系</span>
      <span class="absolute top-2 right-2 text-[12px] font-black px-2 py-0.5 rounded-lg badge" style="background:rgba(15,23,42,.85);">${'★'.repeat(w.stars)}${'☆'.repeat(5-w.stars)}</span>
      <span class="absolute bottom-0 left-0 right-0 px-3 pt-4 pb-1.5 text-[12px] font-black text-left" style="background:linear-gradient(180deg,transparent,rgba(8,12,24,.88) 60%);">武器 #${w.id} · ${w.stars}星</span>
    </div>
    <div class="p-3">
      <div class="flex items-center justify-between mb-1"><div class="text-[13px] text-muted">强化加成</div>${elBadge(w.element)}</div>
      <div class="text-[16px] font-black text-green-400 num-mono mb-2">+${bpToPct(w.bonusBp)} <span class="text-[10px] font-bold text-muted">战力</span></div>
      <div class="flex gap-2">
        <button onclick="enhanceSelect(${w.id})" class="btn btn-sm btn-ghost flex-1"><i class="fa-solid fa-gem"></i>强化</button>
        <button onclick="meltSelectFromWeapon(${w.id})" class="btn btn-sm btn-danger flex-1"><i class="fa-solid fa-fire"></i>熔炼</button>
      </div>
    </div>
  </div>`;
}
function buildWeaponGroups(list){
  if(!list.length) return `<div class="col-span-full text-center text-muted py-8">该分类下暂无武器</div>`;
  const byEl = {};
  for(const w of list){ (byEl[w.element]=byEl[w.element]||[]).push(w); }
  let html = '';
  for(const el of ELEMENT_ORDER){
    const arr = byEl[el]; if(!arr) continue;
    const elKey = wGroupKey(el);
    const elOpen = !isCollapsed(elKey);
    html += elGroupHeader(elKey, el, arr.length, `toggleWeaponGroup(${el})`, elOpen);
    if(!elOpen) continue;
    const byStar = {};
    for(const w of arr){ (byStar[w.stars]=byStar[w.stars]||[]).push(w); }
    for(let s=1;s<=5;s++){
      const sub = byStar[s]; if(!sub) continue;
      const subKey = wGroupKey(el, s);
      const subOpen = !isCollapsed(subKey);
      html += subGroupHeader(subKey, 'fa-khanda', `${'★'.repeat(s)}${'☆'.repeat(5-s)} ${starLabel(s)}`, sub.length, `toggleWeaponGroup(${el},${s})`, subOpen);
      if(subOpen) html += sub.map(weaponCardHtml).join('');
    }
  }
  return html;
}
async function renderWeapons(){
  const grid = $('#weaponGrid'); if(!grid) return;
  grid.innerHTML = skeletonBlock(4, 'h-44');
  if(!S.account){ grid.innerHTML = '<div class="col-span-full text-center text-muted py-10">连接钱包后显示你的武器</div>'; return; }
  S.weapons = await fetchWeapons();
  const eb = S.essenceBal;
  const enh = `<div class="col-span-full game-card p-4 elbg-0 anim-fade">
      <div class="font-bold mb-1 flex items-center gap-2"><i class="fa-solid fa-gem text-gold"></i>精粹强化武器</div>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
        <div><div class="lbl">选择武器</div><select id="enhWeaponSel" class="input">${S.weapons.map(w=>`<option value="${w.id}">#${w.id} · ${w.stars}星 · +${bpToPct(w.bonusBp)}</option>`).join('')||'<option value="">暂无武器</option>'}</select></div>
        <div><div class="lbl">精粹阶</div><select id="enhEssenceSel" class="input">${[1,2,3,4].map(i=>`<option value="${i}">精粹 ${i} 阶（持有 ${eb[i]||0}）</option>`).join('')}</select></div>
        <div><div class="lbl">数量</div><input id="enhAmountInp" type="number" min="1" step="1" value="1" class="input"></div>
        <div class="flex items-end"><button onclick="enhanceFlow()" id="enhBtn" class="btn btn-gold w-full" ${S.weapons.length?'':'disabled'}><i class="fa-solid fa-wand-magic-sparkles"></i>强化</button></div>
      </div>
    </div>`;
  const bar = $('#weaponFilterBar');
  if(bar){
    const fe = S.weaponsFilterEl, fs = S.weaponsFilterStar;
    const elCount = el=>S.weapons.filter(w=>w.element===el).length;
    const starCount = s=>S.weapons.filter(w=>w.stars===s).length;
    const sumLine = `共 <b class="text-gold num-mono">${S.weapons.length}</b> 件 · ${ELEMENT_ORDER.map(el=>`<span style="color:${ELEMENTS[el].color}">${ELEMENTS[el].icon} ${elCount(el)}</span>`).join(' ')} · <span class="text-gold">★合计 ${[1,2,3,4,5].reduce((a,s)=>a+starCount(s)*s,0)}</span>`;
    bar.innerHTML = `
      <div class="flex flex-wrap items-center gap-2 mb-2">
        <span class="text-[12px] text-muted shrink-0">元素：</span>${filterChips(fe,'setWeaponFilter')}
      </div>
      <div class="flex flex-wrap items-center gap-2 mb-2">
        <span class="text-[12px] text-muted shrink-0">星级：</span>${filterStarChips(fs,'setWeaponFilterStar')}
      </div>
      <div class="flex flex-wrap items-center gap-2 mb-2">
        <span class="text-[12px] text-muted shrink-0">排序：</span>
        <select class="input !w-auto !py-1 !min-h-[38px]" onchange="setWeaponSort(this.value)">
          <option value="bonus" ${(S.weaponsSort||'bonus')==='bonus'?'selected':''}>强化加成高 → 低</option>
          <option value="stars" ${S.weaponsSort==='stars'?'selected':''}>星级高 → 低</option>
          <option value="id" ${S.weaponsSort==='id'?'selected':''}>编号最新</option>
        </select>
        <span class="text-[12px] text-muted shrink-0">搜索：</span>
        <input class="input !w-40 !py-1 !min-h-[38px]" placeholder="武器编号，如 12" value="${S.weaponSearch||''}" onchange="setWeaponSearch(this.value)">
        ${S.weaponSearch?`<button class="btn btn-sm btn-ghost !min-h-[38px]" onclick="setWeaponSearch('')">清除</button>`:''}
      </div>
      <div class="text-[12px] text-muted px-1 pb-1 flex flex-wrap items-center gap-x-2 gap-y-1">${sumLine}</div>`;
  }
  if(!S.weapons.length){ grid.innerHTML = `<div class="col-span-full text-center text-muted py-10">暂无武器</div>` + enh; return; }
  const fe = S.weaponsFilterEl, fs2 = S.weaponsFilterStar;
  let list = S.weapons.slice();
  if(fe!==null && fe!==undefined) list = list.filter(w=>w.element===fe);
  if(fs2) list = list.filter(w=>w.stars===fs2);
  if(S.weaponSearch) list = list.filter(w=>String(w.id).includes(S.weaponSearch));
  const sort = S.weaponsSort||'bonus';
  list.sort((a,b)=> sort==='stars' ? (b.stars-a.stars || b.bonusBp-a.bonusBp) : sort==='id' ? (b.id-a.id) : (b.bonusBp-a.bonusBp || b.stars-a.stars));
  grid.innerHTML = buildWeaponGroups(list) + enh;
}
function refreshWeapons(){ renderWeapons(); }
function enhanceSelect(id){ switchTab('weapons'); setTimeout(()=>{ const sel=$('#enhWeaponSel'); if(sel) sel.value=id; },60); }
async function enhanceFlow(){
  const wid = Number($('#enhWeaponSel').value);
  const eid = Number($('#enhEssenceSel').value);
  const amt = Math.max(1, Number($('#enhAmountInp').value||1));
  if(!wid){ toast('请先选择武器','warn'); return; }
  if(!needWallet()) return;
  try{
    await ensure1155Approval('essence','enhanceShop');
    const fee = (ENH_FEE_ETHER[eid] || 2n) * ethers.parseEther('1') * BigInt(amt);
    await commitReveal('enhance', {
      busyId:'enhBtn',
      extra:{weaponId:wid, essenceId:eid, amount:amt},
      needToken:true, tokenTarget:addrOf('enhanceShop'), tokenAmount: fee * 105n / 100n,
      staticCall: h=>mustC('enhanceShop').commitEnhance.staticCall(h, wid, amt, eid),
      commit: h=>mustC('enhanceShop').commitEnhance(h, wid, amt, eid)
    });
  }catch(e){ toast(errMsg(e),'error'); }
}
const ENH_FEE_ETHER = { 1:2n, 2:10n, 3:30n, 4:80n };
