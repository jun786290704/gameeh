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
  else if(t==='sell') openSellTab();
}
// 上架页需要"同类在售参考价"，首次进入时顺带拉一次列表（只填缓存，不渲染）
async function openSellTab(){
  if(!(S.marketList||[]).length){ try{ await fetchListings(); }catch(e){} }
  await onSellTypeChange();
}
// force=true 时忽略缓存（上架/购买/取消/清算等操作后必须强制）
async function fetchListings(force){
  if(!force){
    const c = cacheGet('mkt_listings');
    if(c){ S.marketList = c; return; }
  }
  try{
    const mkt = mustC('marketplace');
    const ids = await mkt.getActiveListings();
    const results = await Promise.all(ids.map(async lid => {
      try{
        const l = await mkt.getListing(lid);
        const item = { lid:Number(lid), seller:l.seller, nftType:Number(l.category), tokenId:Number(l.tokenId), amount:Number(l.amount), price:l.price, active:l.active };
        // 过期时间：getListing() 的 struct 不含它，且挂单过期后 active 仍为 true（要等人调 expireListing），
        // 不读这个字段就会把「已过期」的挂单当成在售，买家点购买必然 revert(ListingAlreadyExpired)
        try{
          const ea = await mkt.listingExpireAt(lid);
          item.expireAt = Number(ea);
          item.expired = Number(ea) > 0 && Number(ea) * 1000 < Date.now();
        }catch(e){ item.expireAt = 0; item.expired = false; }
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
    cacheSet('mkt_listings', S.marketList);
  }catch(e){ console.warn('market',e); }
}

// 计算类型分布 + 均价 + 最低价（仅用于展示）
function recomputeMarketStats(){
  const counts = {0:0,1:0,2:0,3:0};
  let total = 0n, n = 0, minP = null;
  for(const l of S.marketList){
    if(!l.active || l.expired) continue;   // 已过期的不计入在售统计（买不了）
    counts[l.nftType] = (counts[l.nftType]||0)+1;
    total += l.price; n++;
    if(minP===null || l.price < minP) minP = l.price;
  }
  S.marketTypeCounts = counts;
  S.marketAvgPrice = n ? total/BigInt(n) : 0n;
  S.marketMinPrice = minP;
}

/* ---------- 卡片 ---------- */
// 类型强调色 / 稀有度色
function mktAccentOf(l){
  const M = MKT_TYPE_META[l.nftType] || {color:'#fbbf24', soft:'rgba(251,191,36,.14)'};
  if(l.nftType===1){
    const sc = {1:'#94a3b8',2:'#60a5fa',3:'#a78bfa',4:'#f97316',5:'#fbbf24'};
    const c = sc[l.stars] || '#fbbf24';
    return {color:c, soft:`color-mix(in srgb, ${c} 22%, transparent)`};
  }
  if(l.nftType===0){
    const e = ELEMENTS[l.element] || ELEMENTS[0];
    return {color:e.color, soft:e.soft};
  }
  return {color:M.color, soft:M.soft};
}
// 缩略图区（武器图 / 英雄立绘 / 碎片·精粹图标）
function mktThumbHtml(l){
  if(l.nftType===1) return `<img class="mkt-thumb-img" src="${weaponImg(l.element||0, l.stars||1)}" alt="">`;
  if(l.nftType===0) return `<img class="mkt-thumb-img is-hero" src="${heroImg(l.element||0, l.tokenId)}" alt="">`;
  if(l.nftType===2) return `<div class="mkt-thumb-ico" style="color:#a78bfa"><i class="fa-solid fa-gem"></i><em>${ROMAN[Math.min(5,l.tokenId)]||l.tokenId}</em></div>`;
  return `<div class="mkt-thumb-ico" style="color:#34d399"><i class="fa-solid fa-flask"></i><em>${ROMAN[Math.min(4,l.tokenId)]||l.tokenId}</em></div>`;
}
// 属性徽章行
function mktMetaHtml(l){
  const out = [];
  if(l.nftType===0){
    out.push(elBadge(l.element||0));
    out.push(`<span class="mkt-tag"><i class="fa-solid fa-signal"></i>Lv.${l.level||'?'}</span>`);
  } else if(l.nftType===1){
    out.push(elBadge(l.element||0));
    out.push(`<span class="mkt-tag star">${'★'.repeat(l.stars||0)}</span>`);
    if(l.bonusBp!==undefined){
      out.push(`<span class="mkt-tag plus">+${bpToPct(l.bonusBp)}</span>`);
      const rb = rewardBonusOf(l.stars||1, l.bonusBp);
      if(rb>0) out.push(`<span class="mkt-tag reward"><i class="fa-solid fa-coins"></i>+${rb}%</span>`);
    }
  } else {
    const kind = l.nftType===2 ? '碎片' : '精粹';
    const cls = l.nftType===2 ? 'shard' : 'essence';
    out.push(`<span class="mkt-tag ${cls}">${kind} <i class="roman">${ROMAN[Math.min(l.tokenId,5)]||l.tokenId}</i></span>`);
    out.push(`<span class="mkt-tag">×${l.amount}</span>`);
  }
  return out.join('');
}
// 统一卡片（列表页 / 我的上架）
function mktCardHtml(l, opts){
  opts = opts || {};
  const mine = !!opts.mine;
  const M = MKT_TYPE_META[l.nftType] || {name:'物品', icon:'fa-box'};
  const ac = mktAccentOf(l);
  const unitPrice = (l.amount>1) ? l.price/BigInt(l.amount) : null;
  const status = mine
    ? (l.active
        ? (l.expired ? `<span class="mkt-badge exp">已过期</span>` : `<span class="mkt-badge on">在售</span>`)
        : `<span class="mkt-badge">已售</span>`)
    : '';
  const btn = mine
    ? (l.active
        ? (l.expired
            ? `<button onclick="expireListingFlow(${l.lid})" class="btn btn-sm btn-ghost mkt-buy"><i class="fa-solid fa-rotate-left"></i>清算</button>`
            : `<button onclick="cancelListingFlow(${l.lid})" class="btn btn-sm btn-danger mkt-buy"><i class="fa-solid fa-ban"></i>取消</button>`)
        : '')
    : `<button onclick="buyFlow(${l.lid})" class="btn btn-gold mkt-buy"><i class="fa-solid fa-cart-shopping"></i>购买</button>`;
  const dimmed = mine && (!l.active || l.expired);

  return `<div class="game-card mkt-card ${dimmed?'dim':''} anim-fade" style="--accent:${ac.color};--accent-soft:${ac.soft}">
    <div class="mkt-card-bar"></div>
    <div class="mkt-thumb" style="border-color:${ac.color}">
      ${mktThumbHtml(l)}
      <span class="mkt-thumb-tag" style="color:${ac.color};border-color:${ac.color}"><i class="fa-solid ${M.icon}"></i>${M.name} #${l.tokenId}</span>
      ${status}
    </div>
    <div class="mkt-body">
      <div class="mkt-meta">${mktMetaHtml(l)}</div>
      <div class="mkt-seller"><i class="fa-solid fa-user"></i>${shortAddr(l.seller)} <span class="mkt-lid">#${l.lid}</span></div>
      <div class="mkt-foot">
        <div class="mkt-price-wrap">
          <div class="mkt-price">${fmtUnits(l.price,S.tokenDecimals,2)}<span>${S.tokenSymbol}</span></div>
          ${unitPrice!==null?`<div class="mkt-unit">${fmtUnits(unitPrice,S.tokenDecimals,2)} / 件</div>`:''}
        </div>
        ${btn}
      </div>
    </div>
  </div>`;
}
// 兼容旧调用名
function marketCardHtml(l){ return mktCardHtml(l); }
function mineCardHtml(l){ return mktCardHtml(l, {mine:true}); }

/* ---------- 分组行 ---------- */
function mktMinPrice(arr){
  let m = null;
  for(const l of arr){ if(m===null || l.price<m) m = l.price; }
  return m;
}
function mktHeadHtml(o){
  const cls = o.level===1 ? 'mkt-gh' : (o.level===2 ? 'mkt-gh mkt-gh-2' : 'mkt-gh mkt-gh-3');
  const ico = o.fa
    ? `<i class="fa-solid ${o.icon}"></i>`
    : `<span class="mkt-gh-emoji">${o.icon}</span>`;
  return `<button type="button" onclick="${o.toggle}" class="${cls}" style="--gh:${o.color};--gh-soft:${o.soft};--gh-border:${o.border}">
    <span class="mkt-gh-ico">${ico}</span>
    <span class="mkt-gh-name">${o.name}</span>
    ${o.roman?`<i class="roman">${o.roman}</i>`:''}
    <span class="mkt-gh-n">${o.count}</span>
    ${o.price!==null&&o.price!==undefined?`<span class="mkt-gh-price"><i class="fa-solid fa-arrow-down"></i>${fmtUnits(o.price,S.tokenDecimals,0)}</span>`:''}
    ${o.extra||''}
    <span class="mkt-gh-caret">${groupCaret(o.open)}</span>
  </button>`;
}

// 生成"分组行"序列：[{kind:'head'|'cards', ...}]，便于按组切页
// opts: {filterType, typePrefix, emptyText}
function buildMarketRows(items, opts){
  opts = opts || {};
  const t = opts.filterType;
  const typePrefix = opts.typePrefix || 'mt';
  const sortKind = typePrefix==='mymt' ? 'mine' : 'list';
  if(!items.length) return [];

  const elNames = {...ELEMENTS};
  elNames[-1] = {name:'未知属性',icon:'❓',color:'#94a3b8',border:'#475569',soft:'rgba(148,163,184,.1)'};

  const rows = [];
  const typeSeq = (t===null||t===undefined) ? MKT_TYPE_ORDER : [t];
  const toggleTypeFn = typePrefix==='mymt' ? 'toggleMyListTypeGroup' : 'toggleMarketTypeGroup';

  for(const tt of typeSeq){
    const groupItems = items.filter(l=>l.nftType===tt);
    if(!groupItems.length) continue;
    const meta = MKT_TYPE_META[tt];
    const typeKey = typePrefix+'-'+tt;
    const typeOpen = !isCollapsed(typeKey);
    // 头部统计只看「真正在售」的（排除已售与已过期），与卡片状态保持一致
    const liveOf = arr => arr.filter(l=>l.active && !l.expired);
    const liveItems = liveOf(groupItems);
    const totalPrice = liveItems.reduce((s,l)=>s+l.price, 0n);

    rows.push({kind:'head', level:1, html: mktHeadHtml({
      level:1, fa:true, icon:meta.icon, name:meta.name, color:meta.color, soft:meta.soft, border:meta.border,
      count:groupItems.length, price:mktMinPrice(liveItems),
      extra:`<span class="mkt-gh-sum">Σ ${fmtUnits(totalPrice,S.tokenDecimals,0)} ${S.tokenSymbol}</span>`,
      toggle:`${toggleTypeFn}(${tt})`, open:typeOpen
    })});
    if(!typeOpen) continue;

    if(tt===0 || tt===1){
      // 元素层
      for(const el of ELEMENT_ORDER.concat([-1])){
        const arr = groupItems.filter(l=>((l.element===null||l.element===undefined)?-1:l.element)===el);
        if(!arr.length) continue;
        const info = elNames[el];
        const elKey = mktElKey(tt, el);
        const elOpen = !isCollapsed(elKey);
        rows.push({kind:'head', level:2, html: mktHeadHtml({
          level:2, fa:false, icon:info.icon, name:`${info.name}属性`, color:info.color, soft:info.soft, border:info.border,
          count:arr.length, price:mktMinPrice(liveOf(arr)),
          toggle:`toggleMarketEl('${sortKind}',${tt},${el})`, open:elOpen
        })});
        if(!elOpen) continue;

        if(tt===0){
          // 英雄：等级段
          for(const band of MKT_LEVEL_BANDS){
            const sub = arr.filter(l=>mktLevelBandOf(l)===band.id);
            if(!sub.length) continue;
            const bKey = mktSubKey(tt, el, band.id);
            const bOpen = !isCollapsed(bKey);
            rows.push({kind:'head', level:3, html: mktHeadHtml({
              level:3, fa:true, icon:'fa-signal', name:band.label, color:info.color, soft:info.soft, border:info.border,
              count:sub.length, price:mktMinPrice(liveOf(sub)),
              toggle:`toggleMarketSub('${sortKind}',${tt},${el},${band.id})`, open:bOpen
            })});
            if(bOpen) rows.push({kind:'cards', cards:sub});
          }
        } else {
          // 武器：星级（高星在前）
          for(const s of mktStarIds()){
            const sub = arr.filter(l=>Number(l.stars||0)===s);
            if(!sub.length) continue;
            const sKey = mktSubKey(tt, el, s);
            const sOpen = !isCollapsed(sKey);
            rows.push({kind:'head', level:3, html: mktHeadHtml({
              level:3, fa:true, icon:'fa-star', name:'★'.repeat(s), color:info.color, soft:info.soft, border:info.border,
              count:sub.length, price:mktMinPrice(liveOf(sub)),
              toggle:`toggleMarketSub('${sortKind}',${tt},${el},${s})`, open:sOpen
            })});
            if(sOpen) rows.push({kind:'cards', cards:sub});
          }
          const noStar = arr.filter(l=>!l.stars);
          if(noStar.length) rows.push({kind:'cards', cards:noStar});
        }
      }
    } else {
      // 碎片 / 精粹：按编号
      const ids = mktItemIds(tt);
      for(const id of ids){
        const sub = groupItems.filter(l=>Number(l.tokenId)===id);
        if(!sub.length) continue;
        const k = mktSubKey(tt, null, id);
        const open = !isCollapsed(k);
        rows.push({kind:'head', level:3, html: mktHeadHtml({
          level:3, fa:false, icon:'#'+id, name:mktItemKindName(tt), roman:ROMAN[id]||String(id),
          color:meta.color, soft:meta.soft, border:meta.border,
          count:sub.length, price:mktMinPrice(liveOf(sub)),
          toggle:`toggleMarketSub('${sortKind}',${tt},null,${id})`, open:open
        })});
        if(open) rows.push({kind:'cards', cards:sub});
      }
      const rest = groupItems.filter(l=>ids.indexOf(Number(l.tokenId))<0);
      if(rest.length) rows.push({kind:'cards', cards:rest});
    }
  }
  return rows;
}

// 按"不切断分组"的方式分页
function paginateRows(rows, size, page){
  const pages = [];
  let cur = [], curCount = 0, pending = [];
  const flushHeads = ()=>{ if(pending.length){ for(const h of pending) cur.push(h); pending = []; } };
  for(const r of rows){
    if(r.kind !== 'cards'){ pending.push(r); continue; }
    const len = r.cards.length;
    if(curCount > 0 && curCount + len > size){
      pages.push(cur); cur = []; curCount = 0;
    }
    flushHeads();
    cur.push(r); curCount += len;
    if(curCount >= size){ pages.push(cur); cur = []; curCount = 0; }
  }
  if(pending.length){
    if(curCount > 0){ pages.push(cur); cur = []; curCount = 0; }
    flushHeads();
  }
  if(cur.length) pages.push(cur);
  const P = pages.filter(p=>p.length);
  const total = Math.max(1, P.length);
  const idx = Math.min(Math.max(Number(page)||0, 0), total-1);
  return {rows:P[idx]||[], total, idx};
}
function renderMarketRows(rows, cardFn){
  cardFn = cardFn || marketCardHtml;
  return rows.map(r=> r.kind==='cards' ? r.cards.map(cardFn).join('') : r.html).join('');
}
// 向后兼容：旧签名（内部改为"整表渲染，不分页"）
function buildMarketGroups(items, cardFn, opts){
  opts = opts || {};
  const rows = buildMarketRows(items, opts);
  if(!rows.length) return `<div class="col-span-full text-center text-muted py-10">${opts.emptyText||'暂无在售物品'}</div>`;
  return renderMarketRows(rows, cardFn);
}

/* ---------- 筛选条渲染 ---------- */
function mktFilterState(prefix){
  return prefix==='mine'
    ? {type:S.myListFilterType, el:S.myListFilterEl, level:S.myListFilterLevel, star:S.myListFilterStar, item:S.myListFilterItem, band:S.myListFilterBand, search:S.myListSearch}
    : {type:S.marketFilterType, el:S.marketFilterEl, level:S.marketFilterLevel, star:S.marketFilterStar, item:S.marketFilterItem, band:S.marketFilterBand, search:S.marketSearch};
}
function mktRenderBars(prefix, counts, total, avg, tiers){
  const st = mktFilterState(prefix);
  const N = mktSetNames(prefix);
  const ids = prefix==='mine'
    ? {stats:'#myListStatsBar', type:'#myListTypeBar', panel:'#myListElBar', sort:'#myListSortBar'}
    : {stats:'#marketStatsBar', type:'#marketTypeBar', panel:'#marketElBar', sort:'#marketSortBar'};
  const stats = $(ids.stats);
  if(stats) stats.innerHTML = mktStatsRow(counts, total, avg, S.tokenSymbol, S.tokenDecimals, st.type, N.type, prefix==='mine'?S.myListMinPrice:S.marketMinPrice);
  const typeBar = $(ids.type);
  if(typeBar) typeBar.innerHTML = `<span class="mkt-flabel"><i class="fa-solid fa-layer-group"></i><span>分类</span></span>` + mktTypeChips(st.type, N.type, counts, total);
  const panel = $(ids.panel);
  if(panel){
    panel.className = 'mkt-filter-panel';
    panel.innerHTML = mktFilterPanelHTML(st, prefix, tiers)
      + (mktHasAnyFilter(st) ? `<div class="mkt-fgroup"><button type="button" class="mkt-clear" onclick="${N.clear}()"><i class="fa-solid fa-xmark"></i>清除筛选</button></div>` : '');
  }
  const sortBar = $(ids.sort);
  if(sortBar) sortBar.innerHTML = `<span class="mkt-flabel"><i class="fa-solid fa-arrow-down-wide-short"></i></span>` + mktSortSelect(prefix==='mine'?S.myListSort:S.marketSort, prefix==='mine'?'setMyListSort':'setMarketSort');
}

/* ---------- 在售列表 ---------- */
async function loadActiveListings(force){
  await loadMarketFee();
  const grid = $('#listGrid');
  // 首次或强制刷新才显示骨架；筛选/分页切换用缓存渲染，避免闪烁
  const hasCache = !!cacheGet('mkt_listings');
  if(force || !hasCache) grid.innerHTML = skeletonBlock(4, 'h-36');
  await fetchListings(force);
  recomputeMarketStats();

  // 过期挂单不展示：它 active 仍为 true 但购买必然 revert(ListingAlreadyExpired)
  const all = S.marketList.filter(l=>l.active && !l.expired);
  S.marketPriceTiers = mktPriceTiersOf(all);
  const st = mktFilterState('list');
  const filtered = applyMarketFilters(all, st, S.marketPriceTiers);
  const sorted = sortMarketList(filtered, S.marketSort);

  const rows = buildMarketRows(sorted, {filterType:S.marketFilterType, typePrefix:'mt'});
  const pg = paginateRows(rows, S.marketPageSize, S.marketPage);
  S.marketPage = pg.idx;

  mktRenderBars('list', S.marketTypeCounts, all.length, S.marketAvgPrice, S.marketPriceTiers);

  grid.innerHTML = pg.rows.length
    ? renderMarketRows(pg.rows, marketCardHtml)
    : `<div class="col-span-full text-center text-muted py-10">暂无在售物品</div>`;
  const pager = $('#listPager');
  if(pager) pager.innerHTML = `<button onclick="marketPage(-1)" class="btn btn-sm btn-ghost" ${pg.idx<=0?'disabled':''}><i class="fa-solid fa-chevron-left"></i>上一页</button>
    <span class="text-[13px] text-muted num-mono">${sorted.length} 件 · ${pg.idx+1}/${pg.total}</span>
    <button onclick="marketPage(1)" class="btn btn-sm btn-ghost" ${pg.idx>=pg.total-1?'disabled':''}>下一页<i class="fa-solid fa-chevron-right"></i></button>`;
}
function marketPage(d){ S.marketPage += d; loadActiveListings(); }

/* ---------- 我的上架 ---------- */
async function loadMyListings(force){
  const grid = $('#myListGrid'); if(!grid) return;
  const empty = $('#myListEmpty');
  const hasCache = !!cacheGet('mkt_listings');
  if(force || !hasCache) grid.innerHTML = skeletonBlock(3, 'h-32');
  if(!S.account){
    grid.innerHTML = '';
    if(empty) empty.classList.remove('hidden');
    return;
  }
  if(empty) empty.classList.add('hidden');
  await fetchListings(force);
  const mineAll = S.marketList.filter(l=>String(l.seller).toLowerCase()===S.account.toLowerCase());

  const counts = {0:0,1:0,2:0,3:0};
  let totalValue = 0n, minPrice = null;
  for(const l of mineAll){
    counts[l.nftType] = (counts[l.nftType]||0)+1;
    if(l.active && !l.expired){          // 过期的不计入「在售价值」
      totalValue += l.price;
      if(minPrice===null || l.price<minPrice) minPrice = l.price;
    }
  }
  S.myListTypeCounts = counts;
  S.myListTotalValue = totalValue;
  S.myListMinPrice = minPrice;
  S.myListPriceTiers = mktPriceTiersOf(mineAll.filter(l=>l.active && !l.expired));

  const st = mktFilterState('mine');
  const filtered = applyMarketFilters(mineAll, st, S.myListPriceTiers);
  const sorted = sortMarketList(filtered, S.myListSort);
  const rows = buildMarketRows(sorted, {filterType:S.myListFilterType, typePrefix:'mymt'});
  const pg = paginateRows(rows, S.marketPageSize, S.myListPage||0);
  S.myListPage = pg.idx;

  mktRenderBars('mine', counts, mineAll.length, 0n, S.myListPriceTiers);

  grid.innerHTML = pg.rows.length
    ? renderMarketRows(pg.rows, mineCardHtml)
    : '<div class="col-span-full text-center text-muted py-8">没有匹配的上架记录</div>';
}

/* ---------- 交易操作 ---------- */
async function buyFlow(lid){
  if(!needWallet()) return;
  try{
    const l = S.marketList.find(x=>x.lid===lid);
    if(!l) return;
    await ensureTokenAllowance(addrOf('marketplace'), l.price);
    withBusy(null,true);
    await (await mustC('marketplace').connect(S.signer).buyItem(lid)).wait();
    toast('购买成功！','success');
    await loadActiveListings(true); await refreshBalances();
  }catch(e){ toast(errMsg(e),'error'); }
  finally{ withBusy(null,false); }
}
// 清算过期挂单：任何人都可调用，资产原路退回卖家
async function expireListingFlow(lid){
  if(!needWallet()) return;
  try{
    withBusy(null,true);
    await (await mustC('marketplace').connect(S.signer).expireListing(lid)).wait();
    toast('已清算，资产已退回卖家','success');
    await loadMyListings(true); await loadActiveListings(true);
  }catch(e){ toast(errMsg(e),'error'); }
  finally{ withBusy(null,false); }
}
async function cancelListingFlow(lid){
  if(!needWallet()) return;
  try{
    withBusy(null,true);
    await (await mustC('marketplace').connect(S.signer).cancelListing(lid)).wait();
    toast('已取消','success');
    await loadMyListings(true); await loadActiveListings(true);
  }catch(e){ toast(errMsg(e),'error'); }
  finally{ withBusy(null,false); }
}

/* ---------- 上架：可视化资产选择器 ---------- */
function sellKind(){ return Number(S.sellType||0); }

// 可上架资产（英雄/武器带元数据，碎片/精粹按余额过滤）
function sellItemsOfType(t){
  if(t===0) return (S.heroes||[]).slice().sort((a,b)=> (b.level||0)-(a.level||0) || (b.power||0)-(a.power||0))
      .map(h=>({id:h.id, element:h.element, level:h.level, power:h.power, skin:h.skin}));
  if(t===1) return (S.weapons||[]).slice().sort((a,b)=> (b.bonusBp||0)-(a.bonusBp||0) || (b.stars||0)-(a.stars||0))
      .map(w=>({id:w.id, element:w.element, stars:w.stars, bonusBp:w.bonusBp}));
  const bal = t===2 ? (S.shardsBal||{}) : (S.essenceBal||{});
  return mktItemIds(t).filter(id=>(bal[id]||0) > 0).map(id=>({id:id, amount:bal[id]||0}));
}
function sellFilteredItems(){
  const t = sellKind();
  let arr = sellItemsOfType(t);
  if(t===0 || t===1){
    if(S.sellPickEl!==null && S.sellPickEl!==undefined) arr = arr.filter(x=>x.element===S.sellPickEl);
    if(t===0 && S.sellPickLevel!==null && S.sellPickLevel!==undefined){
      const b = MKT_LEVEL_BANDS[S.sellPickLevel];
      if(b) arr = arr.filter(x=>{ const lv=Number(x.level||0); return lv>=b.min && lv<=b.max; });
    }
    if(t===1 && S.sellPickStar) arr = arr.filter(x=>Number(x.stars)===Number(S.sellPickStar));
  }
  return arr;
}
function sellFilterBar(t){
  const rows = [];
  const elOn = S.sellPickEl!==null && S.sellPickEl!==undefined;
  let c1 = mktChip('全部', !elOn, 'setSellPickEl(null)');
  c1 += ELEMENT_ORDER.map(el=>{
    const e = ELEMENTS[el];
    return mktChip(`${e.icon} ${e.name}`, S.sellPickEl===el, `setSellPickEl(${el})`, {color:e.color, soft:e.soft, border:e.border});
  }).join('');
  rows.push(mktChipRow('元素','fa-shapes',c1));
  if(t===0){
    const on = S.sellPickLevel!==null && S.sellPickLevel!==undefined;
    let c = mktChip('全部', !on, 'setSellPickLevel(null)');
    c += MKT_LEVEL_BANDS.map(b=>mktChip(b.label, S.sellPickLevel===b.id, `setSellPickLevel(${b.id})`)).join('');
    rows.push(mktChipRow('等级','fa-signal',c));
  } else if(t===1){
    const on = S.sellPickStar!==null && S.sellPickStar!==undefined;
    let c = mktChip('全部', !on, 'setSellPickStar(null)');
    c += [1,2,3,4,5].map(s=>mktChip('★'.repeat(s), S.sellPickStar===s, `setSellPickStar(${s})`)).join('');
    rows.push(mktChipRow('星级','fa-star',c));
  }
  return `<div class="mkt-filter-panel sell-filter">${rows.join('')}</div>`;
}
// 单个可上架资产小卡
function sellPickCardHtml(it, t, on){
  let accent = '#fbbf24', thumb = '', meta = '';
  if(t===0){
    const e = ELEMENTS[it.element] || ELEMENTS[0];
    accent = e.color;
    thumb = `<img class="sell-pick-img is-hero" src="${heroImg(it.element, it.id, it.skin)}" alt="">`;
    meta = `${elBadge(it.element)} <span class="mkt-tag"><i class="fa-solid fa-signal"></i>Lv.${it.level||'?'}</span>`;
  } else if(t===1){
    const sc = {1:'#94a3b8',2:'#60a5fa',3:'#a78bfa',4:'#f97316',5:'#fbbf24'};
    accent = sc[it.stars] || '#fbbf24';
    thumb = `<img class="sell-pick-img" src="${weaponImg(it.element, it.stars)}" alt="">`;
    meta = `${elBadge(it.element)} <span class="mkt-tag star">${'★'.repeat(it.stars||0)}</span> <span class="mkt-tag plus">+${bpToPct(it.bonusBp)}</span>`;
  } else {
    accent = t===2 ? '#a78bfa' : '#34d399';
    thumb = `<div class="sell-pick-ico" style="color:${accent}"><i class="fa-solid ${t===2?'fa-gem':'fa-flask'}"></i><em>${ROMAN[Math.min(it.id,5)]||it.id}</em></div>`;
    meta = `<span class="mkt-tag ${t===2?'shard':'essence'}">${mktItemKindName(t)} <i class="roman">${ROMAN[it.id]||it.id}</i></span><span class="mkt-tag">×${it.amount}</span>`;
  }
  return `<button type="button" class="sell-pick-card${on?' on':''}" style="--accent:${accent}" onclick="pickSellAsset(${it.id})" data-id="${it.id}" title="#${it.id}">
    <span class="sell-pick-check"><i class="fa-solid fa-check"></i></span>
    <span class="sell-pick-thumb">${thumb}</span>
    <span class="sell-pick-id">#${it.id}</span>
    <span class="sell-pick-meta">${meta}</span>
  </button>`;
}
async function renderSellPicker(){
  const box = $('#sellPicker'); if(!box) return;
  const sel = $('#sellTokenSel');
  const hint = $('#sellHoldHint');
  const amtWrap = $('#sellAmountWrap');
  const t = sellKind();
  if(!S.account){
    box.innerHTML = `<div class="sell-empty"><i class="fa-solid fa-wallet"></i>连接钱包后显示可上架资产</div>`;
    if(hint) hint.textContent = '';
    if(sel) sel.innerHTML = '';
    if(amtWrap) amtWrap.classList.add('hidden');
    return;
  }
  box.innerHTML = `<div class="sell-empty"><span class="spinner inline-block mr-2"></span>加载中…</div>`;
  try{
    if(t===0 && !(S.heroes||[]).length) S.heroes = await fetchHeroes();
    if(t===1 && !(S.weapons||[]).length) S.weapons = await fetchWeapons();
  }catch(e){}

  const all = sellItemsOfType(t);
  const items = sellFilteredItems();
  let cur = S.sellPickId;
  if(cur===null || cur===undefined || !items.some(x=>x.id===cur)) cur = items.length ? items[0].id : null;
  S.sellPickId = cur;

  if(sel) sel.innerHTML = items.map(x=>`<option value="${x.id}">#${x.id}</option>`).join('');
  if(sel && cur!==null) sel.value = String(cur);
  if(hint) hint.textContent = all.length ? `可上架 ${all.length}` : '';

  if(amtWrap) amtWrap.classList.toggle('hidden', !(t===2 || t===3));
  box.innerHTML = (t===0 || t===1 ? sellFilterBar(t) : '')
    + (items.length
        ? `<div class="sell-pick-grid">${items.map(x=>sellPickCardHtml(x,t,x.id===cur)).join('')}</div>`
        : `<div class="sell-empty">没有匹配的资产</div>`);
  if(t===2 || t===3) onSellAssetChange();
  updateSellHelper();
}
function pickSellAsset(id){
  const sel = $('#sellTokenSel');
  S.sellPickId = Number(id);
  if(sel) sel.value = String(id);
  // 只切换卡片高亮/勾选，不整格重绘（避免闪烁与选择状态不同步）
  document.querySelectorAll('.sell-pick-card').forEach(c=>{
    const on = Number(c.dataset.id)===S.sellPickId;
    c.classList.toggle('on', on);
  });
  onSellAssetChange();
  updateSellHelper();
}
function setSellPickEl(v){ S.sellPickEl = mktToggleVal(S.sellPickEl, v); S.sellPickId = null; renderSellPicker(); }
function setSellPickStar(v){ S.sellPickStar = mktToggleVal(S.sellPickStar, v); S.sellPickId = null; renderSellPicker(); }
function setSellPickLevel(v){ S.sellPickLevel = mktToggleVal(S.sellPickLevel, v); S.sellPickId = null; renderSellPicker(); }

// 同类在售参考价
function sellRefOf(t, item){
  const list = (S.marketList||[]).filter(l=>l.active && l.nftType===t);
  if(!list.length) return null;
  let same = list;
  if(t===1 && item && item.stars) same = list.filter(l=>Number(l.stars||0)===Number(item.stars));
  if(t===0 && item && item.level) same = list.filter(l=>mktLevelBandOf(l)===mktLevelBandOf(item));
  if(!same.length) same = list;
  const minOf = arr => arr.reduce((m,l)=> (m===null||l.price<m) ? l.price : m, null);
  return {min: minOf(list), minSame: minOf(same), sameCount: same.length, count: list.length};
}
function updateSellHelper(){
  const box = $('#sellHelper'); if(!box) return;
  const t = sellKind();
  const feeBp = Number(S.marketFeeBp||0);
  const inp = $('#sellPriceInp');
  const priceStr = inp ? String(inp.value||'').trim() : '';
  const price = priceStr ? Number(priceStr) : 0;
  const net = price > 0 ? price * (1 - feeBp/10000) : 0;
  const item = (S.sellItems||[]).concat(sellItemsOfType(t)).find(x=>x.id===S.sellPickId) || null;
  const ref = sellRefOf(t, item);
  const fmtP = wei => fmtUnits(wei, S.tokenDecimals, 2) + ' ' + S.tokenSymbol;
  box.innerHTML = `<div class="sell-helper">
    <div class="sell-helper-item"><span>同类最低</span><b>${ref ? fmtP(ref.minSame) : '--'}</b></div>
    <div class="sell-helper-item"><span>全类最低</span><b>${ref ? fmtP(ref.min) : '--'}</b></div>
    <div class="sell-helper-item"><span>手续费</span><b>${(feeBp/100).toFixed(2)}%</b></div>
    <div class="sell-helper-item is-net"><span>到手</span><b>${price>0 ? net.toLocaleString('zh-CN',{maximumFractionDigits:2}) + ' ' + S.tokenSymbol : '--'}</b></div>
    ${ref ? `<button type="button" class="mkt-chip sell-ref-btn" onclick="fillSellRefPrice('${ref.minSame}')"><i class="fa-solid fa-wand-magic-sparkles"></i>一键填入最低价</button>` : ''}
  </div>`;
}
function fillSellRefPrice(wei){
  const inp = $('#sellPriceInp'); if(!inp) return;
  try{ inp.value = ethers.formatUnits(BigInt(wei), S.tokenDecimals); }catch(e){}
  updateSellHelper();
}

/* ---------- 上架流程 ---------- */
async function onSellTypeChange(){
  S.sellType = $('#sellTypeSel').value;
  S.sellApproved = false;
  S.sellPickId = null; S.sellPickEl = null; S.sellPickStar = null; S.sellPickLevel = null;
  const btn = $('#approveNftBtn'); if(btn) btn.innerHTML = '<i class="fa-solid fa-shield-halved mr-1"></i>授权 NFT';
  const listBtn = $('#listItemBtn'); if(listBtn) listBtn.disabled = true;
  await renderSellPicker();
  updateSellHelper();
}
function onSellAssetChange(){
  const t = sellKind();
  if(t===2 || t===3){
    const id = Number($('#sellTokenSel').value);
    const bals = t===2 ? S.shardsBal : S.essenceBal;
    const inp = $('#sellAmountInp');
    if(inp) inp.max = (bals||{})[id]||0;
  }
  updateSellHelper();
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
    const pin = $('#sellPriceInp'); if(pin) pin.value = '';
    // 资产已转入市场合约持有，强制刷新持有列表（不能沿用缓存）
    try{ cacheInvalidate('heroes_'+S.account); cacheInvalidate('weapons_'+S.account); }catch(e){}
    S.heroes = []; S.weapons = [];
    await loadActiveListings(true); await loadMyListings(true); await onSellTypeChange();
  }catch(e){ toast(errMsg(e),'error'); }
  finally{ withBusy('listItemBtn', false); }
}
