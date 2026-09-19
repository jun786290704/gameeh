'use strict';

/* ============ 市场 ============ */
function switchMarketTab(t){
  S.marketTab = t;
  document.querySelectorAll('.market-tab').forEach(b=>b.classList.toggle('active', b.dataset.mtab===t));
  $('#mtab-list').classList.toggle('hidden', t!=='list');
  $('#mtab-sell').classList.toggle('hidden', t!=='sell');
  $('#mtab-mine').classList.toggle('hidden', t!=='mine');
  if(t==='list') loadActiveListings();
  else if(t==='mine') loadMyListings();
  else if(t==='sell') onSellTypeChange();
}
async function fetchListings(){
  try{
    const mkt = mustC('marketplace');
    const ids = await mkt.getActiveListings();
    const results = await Promise.all(ids.map(async lid => {
      try{
        const l = await mkt.getListing(lid);
        const item = { lid:Number(lid), seller:l.seller, nftType:Number(l.category), tokenId:Number(l.tokenId), amount:Number(l.amount), price:l.price, active:l.active };
        try{
          if(item.nftType===1){ const w = await readCall('weapons', c=>c.weapons(item.tokenId)); item.element=Number(w.element); item.stars=Number(w.stars); item.bonusBp=Number(w.bonusBp); }
          else if(item.nftType===0){ const h = await readCall('characters', c=>c.heroes(item.tokenId)); item.element=Number(h.element); item.level=Number(h.level); }
          else if(item.nftType===2){ item.element=-2; }
          else if(item.nftType===3){ item.element=-3; }
        }catch(e){}
        return item;
      }catch(e){ return null; }
    }));
    S.marketList = results.filter(x=>x!==null);
  }catch(e){ console.warn('market',e); }
}
function marketCardHtml(l){
  const ic = ['fa-user-ninja','fa-khanda','fa-gem','fa-flask'][l.nftType]||'fa-box';
  const tag = ['英雄','武器','碎片','精粹'][l.nftType]||'物品';
  let meta;
  if(l.nftType===1) meta = `${elBadge(l.element||0)}<span class="text-gold text-[12px] font-bold">${'★'.repeat(l.stars||0)}</span>${l.bonusBp!==undefined?`<span class="text-green-400 text-[12px]">+${bpToPct(l.bonusBp)}</span>`:''}`;
  else if(l.nftType===0) meta = `${elBadge(l.element||0)}<span class="text-[12px] text-muted">Lv.${l.level||'?'}</span>`;
  else if(l.nftType===2) meta = `<span class="badge bg-purple-500/15 text-purple-300">碎片 ${l.tokenId} ×${l.amount}</span>`;
  else meta = `<span class="badge bg-emerald-500/15 text-emerald-300">精粹 ${l.tokenId} ×${l.amount}</span>`;
  return `<div class="game-card p-4 anim-fade">
    <div class="flex items-center justify-between mb-2 flex-wrap gap-1">
      <span class="badge bg-[#1a2740] text-gold"><i class="fa-solid ${ic} mr-1"></i>${tag} #${l.tokenId}</span>
      <span class="badge" style="background:#0d1526;color:#8ea0bd">#${l.lid}</span>
    </div>
    <div class="flex items-center gap-2 mb-1.5 flex-wrap">${meta}</div>
    <div class="text-[12px] text-muted mb-2">卖家 ${shortAddr(l.seller)}</div>
    <div class="text-xl font-black text-gold num-mono mb-3">${fmtUnits(l.price,S.tokenDecimals,2)} ${S.tokenSymbol}</div>
    <button onclick="buyFlow(${l.lid})" class="btn btn-gold w-full"><i class="fa-solid fa-cart-shopping"></i>购买</button>
  </div>`;
}
function buildMarketGroups(items, cardFn){
  cardFn = cardFn || marketCardHtml;
  if(!items.length) return `<div class="col-span-full text-center text-muted py-10">暂无在售物品</div>`;
  const byEl = {};
  for(const l of items){
    let e;
    if(l.nftType===0 || l.nftType===1) e = (l.element===null||l.element===undefined)?-1:l.element;
    else e = l.nftType===2 ? -2 : -3;
    (byEl[e]=byEl[e]||[]).push(l);
  }
  const elNames = {...ELEMENTS};
  elNames[-1] = {name:'未知属性',icon:'❓',color:'#94a3b8',border:'#475569',soft:'rgba(148,163,184,.1)'};
  elNames[-2] = {name:'碎片',icon:'💎',color:'#a78bfa',border:'rgba(167,139,250,.5)',soft:'rgba(167,139,250,.1)'};
  elNames[-3] = {name:'精粹',icon:'🧪',color:'#34d399',border:'rgba(52,211,153,.5)',soft:'rgba(52,211,153,.1)'};
  let html = '';
  for(const el of ELEMENT_ORDER.concat([-2,-3,-1])){
    const arr = byEl[el]; if(!arr) continue;
    const elKey = mGroupKey(el);
    const elOpen = !isCollapsed(elKey);
    const info = elNames[el];
    html += `<button type="button" onclick="toggleMarketGroup(${el})" class="col-span-full w-full flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl border text-left transition-all active:scale-[.99]" style="border-color:${info.border};background:linear-gradient(90deg,${info.soft},transparent 72%)">
      <span class="text-lg leading-none">${info.icon}</span>
      <span class="font-black text-[14px]" style="color:${info.color}">${info.name}</span>
      <span class="badge bg-[#0d1526] text-muted num-mono">${arr.length} 件</span>
      <span class="ml-auto">${groupCaret(elOpen)}</span>
    </button>`;
    if(!elOpen) continue;
    if(el>=0){
      const heroes = arr.filter(l=>l.nftType===0);
      if(heroes.length){
        const subKey = mGroupKey(el,'hero');
        const subOpen = !isCollapsed(subKey);
        html += subGroupHeader(subKey, 'fa-user-ninja', '英雄', heroes.length, `toggleMarketGroup(${el},'hero')`, subOpen);
        if(subOpen) html += heroes.map(cardFn).join('');
      }
      for(let s=1;s<=5;s++){
        const sub = arr.filter(l=>l.nftType===1 && l.stars===s);
        if(!sub.length) continue;
        const subKey = mGroupKey(el,s);
        const subOpen = !isCollapsed(subKey);
        html += subGroupHeader(subKey, 'fa-khanda', `${'★'.repeat(s)} ${starLabel(s)}`, sub.length, `toggleMarketGroup(${el},${s})`, subOpen);
        if(subOpen) html += sub.map(cardFn).join('');
      }
    } else {
      html += arr.map(cardFn).join('');
    }
  }
  return html;
}
async function loadActiveListings(){
  await loadMarketFee();
  const grid = $('#listGrid');
  grid.innerHTML = skeletonBlock(4, 'h-36');
  await fetchListings();
  const active = S.marketList.filter(l=>l.active);
  const fe = S.marketFilterEl;
  const filtered = (fe===null||fe===undefined) ? active : active.filter(l=>l.element===fe);
  const size = S.marketPageSize;
  const pages = Math.max(1, Math.ceil(filtered.length/size));
  S.marketPage = Math.min(S.marketPage, pages-1);
  const pageItems = filtered.slice(S.marketPage*size, S.marketPage*size+size);
  const bar = $('#marketFilterBar');
  if(bar) bar.innerHTML = `<span class="text-[12px] text-muted shrink-0">分类：</span>` + filterChips(S.marketFilterEl, 'setMarketFilter');
  grid.innerHTML = filtered.length ? buildMarketGroups(pageItems) : `<div class="col-span-full text-center text-muted py-10">暂无在售物品</div>`;
  $('#listPager').innerHTML = `<button onclick="marketPage(-1)" class="btn btn-sm btn-ghost" ${S.marketPage<=0?'disabled':''}><i class="fa-solid fa-chevron-left"></i>上一页</button>
    <span class="text-[13px] text-muted num-mono">${S.marketPage+1} / ${pages}</span>
    <button onclick="marketPage(1)" class="btn btn-sm btn-ghost" ${S.marketPage>=pages-1?'disabled':''}>下一页<i class="fa-solid fa-chevron-right"></i></button>`;
}
function marketPage(d){ S.marketPage += d; loadActiveListings(); }
async function buyFlow(lid){
  if(!needWallet()) return;
  try{
    const l = S.marketList.find(x=>x.lid===lid);
    if(!l) return;
    await ensureTokenAllowance(addrOf('marketplace'), l.price);
    withBusy(null,true);
    await (await mustC('marketplace').connect(S.signer).buyItem(lid)).wait();
    toast('购买成功！','success');
    await loadActiveListings(); await refreshBalances();
  }catch(e){ toast(errMsg(e),'error'); }
  finally{ withBusy(null,false); }
}
async function onSellTypeChange(){
  S.sellType = $('#sellTypeSel').value;
  S.sellApproved = false;
  const btn = $('#approveNftBtn'); if(btn) btn.innerHTML = '<i class="fa-solid fa-shield-halved mr-1"></i>授权 NFT';
  $('#listItemBtn').disabled = true;
  const sel = $('#sellTokenSel');
  const amtWrap = $('#sellAmountWrap');
  if(!S.account){ sel.innerHTML = '<option value="">连接钱包后</option>'; amtWrap.classList.add('hidden'); return; }
  try{
    if(S.sellType==='0' || S.sellType==='1'){
      amtWrap.classList.add('hidden');
      const nft = mustC(S.sellType==='0'?'characters':'weapons');
      const ids = await nft.tokensOfOwner(S.account);
      if(!ids.length){ sel.innerHTML = '<option value="">暂无可用资产</option>'; return; }
      sel.innerHTML = ids.map(id=>`<option value="${id}">#${id}</option>`).join('');
    } else {
      amtWrap.classList.remove('hidden');
      const idRange = S.sellType==='2' ? [1,2,3,4,5] : [1,2,3,4];
      const bals = S.sellType==='2' ? S.shardsBal : S.essenceBal;
      sel.innerHTML = idRange.map(id=>`<option value="${id}">${S.sellType==='2'?'碎片':'精粹'} ${id}（持有 ${bals[id]||0}）</option>`).join('');
      onSellAssetChange();
    }
  }catch(e){ sel.innerHTML = '<option value="">读取失败</option>'; }
}
function onSellAssetChange(){
  if(S.sellType==='2' || S.sellType==='3'){
    const id = Number($('#sellTokenSel').value);
    const bals = S.sellType==='2' ? S.shardsBal : S.essenceBal;
    const inp = $('#sellAmountInp');
    if(inp) inp.max = bals[id]||0;
  }
}
async function approveNftForSell(){
  if(!needWallet()) return;
  try{
    if(S.sellType==='0' || S.sellType==='1'){
      await ensureNftApproval(S.sellType==='0'?'characters':'weapons');
    } else {
      await ensureNftApproval(S.sellType==='2'?'shards':'essence');
    }
    S.sellApproved = true;
    $('#approveNftBtn').innerHTML = '✅ 已授权';
    $('#listItemBtn').disabled = false;
    toast('授权成功','success');
  }catch(e){ toast(errMsg(e),'error'); }
}
async function listItemFlow(){
  if(!needWallet()) return;
  const tokenId = Number($('#sellTokenSel').value);
  const priceStr = $('#sellPriceInp').value.trim();
  const amount = (S.sellType==='2' || S.sellType==='3') ? Math.max(1, Number($('#sellAmountInp').value||1)) : 1;
  if(!tokenId || !priceStr){ toast('请填写完整','warn'); return; }
  if(!S.sellApproved){ toast('请先授权','warn'); return; }
  try{
    withBusy('listItemBtn', true, '上架中…');
    const price = ethers.parseUnits(priceStr, S.tokenDecimals);
    await (await mustC('marketplace').connect(S.signer).listItem(Number(S.sellType), tokenId, amount, price)).wait();
    toast('上架成功！','success');
    $('#sellPriceInp').value = '';
    await loadActiveListings(); await loadMyListings(); onSellTypeChange();
  }catch(e){ toast(errMsg(e),'error'); }
  finally{ withBusy('listItemBtn', false); }
}
async function loadMyListings(){
  const grid = $('#myListGrid'); if(!grid) return;
  grid.innerHTML = skeletonBlock(3, 'h-32');
  if(!S.account){ grid.innerHTML = '<div class="col-span-full text-center text-muted py-8">连接钱包后查看</div>'; return; }
  await fetchListings();
  const mine = S.marketList.filter(l=>String(l.seller).toLowerCase()===S.account.toLowerCase());
  grid.innerHTML = mine.length ? buildMarketGroups(mine, mineCardHtml) : '<div class="col-span-full text-center text-muted py-8">还没有上架记录</div>';
}
function mineCardHtml(l){
  const ic = ['fa-user-ninja','fa-khanda','fa-gem','fa-flask'][l.nftType]||'fa-box';
  const tag = ['英雄','武器','碎片','精粹'][l.nftType]||'物品';
  return `<div class="game-card p-4 ${l.active?'':'dim'} anim-fade">
    <div class="flex items-center justify-between mb-2 flex-wrap gap-1">
      <span class="font-bold text-[13px]"><i class="fa-solid ${ic} mr-1"></i>${tag} #${l.tokenId}${l.amount>1?' ×'+l.amount:''}</span>
      <span class="badge ${l.active?'bg-green-500/15 text-green-400':'bg-[#1a2740] text-muted'}">${l.active?'在售':'已售'}</span>
    </div>
    <div class="text-[12px] text-muted mb-2">单号 #${l.lid}</div>
    <div class="text-lg font-black text-gold num-mono mb-3">${fmtUnits(l.price,S.tokenDecimals,2)} ${S.tokenSymbol}</div>
    ${l.active?`<button onclick="cancelListingFlow(${l.lid})" class="btn btn-sm btn-danger w-full"><i class="fa-solid fa-ban"></i>取消上架</button>`:''}
  </div>`;
}
async function cancelListingFlow(lid){
  if(!needWallet()) return;
  try{
    withBusy(null,true);
    await (await mustC('marketplace').connect(S.signer).cancelListing(lid)).wait();
    toast('已取消','success');
    await loadMyListings(); await loadActiveListings();
  }catch(e){ toast(errMsg(e),'error'); }
  finally{ withBusy(null,false); }
}
