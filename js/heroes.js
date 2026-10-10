'use strict';

/* ============ 英雄 ============ */
async function fetchHeroes(force){
  if(!S.account) return [];
  const cacheKey = 'heroes_'+S.account;
  if(!force){ const cached = cacheGet(cacheKey); if(cached) return cached; }
  try{
    const ch = mustC('characters');
    const ids = await ch.tokensOfOwner(S.account);
    // 铸造限额（0=不限制）
    try{ S.mintLimit = Number(await ch.maxMintPerAddr() || 4); }catch(e){ S.mintLimit = 4; }
    const results = await Promise.all(ids.map(async id => {
      try{
        const [h, pwr, st, sti] = await Promise.all([
          ch.heroes(id), ch.heroPower(id),
          ch.getStamina(id).catch(()=>0n),
          ch.getStaminaInfo(id).catch(()=>null)
        ]);
        const stNow = Number(st);
        const max = sti ? Number(sti.staminaMax || STAMINA_MAX_FALLBACK) : STAMINA_MAX_FALLBACK;
        return {id:Number(id), element:Number(h.element), basePower:Number(h.basePower), level:Number(h.level),
          xp:Number(h.xp), stamina: stNow, staminaMax: max, staminaInterval: sti?Number(sti.recoveryInterval || STAMINA_REGEN_FALLBACK):STAMINA_REGEN_FALLBACK,
          staminaNext: stNow>=max ? 0 : Number(sti&&sti.secondsUntilNext!==undefined?sti.secondsUntilNext:0),
          staminaAt: Date.now(), power:Number(pwr), skin:Number(h.skin||0)};
      }catch(e){ return null; }
    }));
    const out = results.filter(x=>x!==null);
    cacheSet(cacheKey, out);
    return out;
  }catch(e){ console.warn('heroes',e); return []; }
}
async function renderHeroes(force){
  const grid = $('#heroGrid'); if(!grid) return;
  grid.innerHTML = skeletonBlock(3, 'h-52');
  if(!S.account){
    grid.innerHTML = `<div class="col-span-full text-center text-muted py-10"><i class="fa-solid fa-wallet text-2xl block mb-2"></i>连接钱包后显示你的英雄<br><button onclick="connectWallet()" class="btn btn-gold btn-sm mt-3">连接钱包</button></div>`;
    return;
  }
  S.heroes = await fetchHeroes(!!force);
  const limit = S.mintLimit > 0 ? S.mintLimit : '∞';
  $('#heroCount').textContent = S.heroes.length + ' / ' + limit;
  if(!S.heroes.length){ grid.innerHTML = `<div class="col-span-full text-center text-muted py-10">还没有英雄，点击「召唤英雄」开始冒险</div>`; return; }
  grid.innerHTML = S.heroes.map(h=>{
    const pw = h.power;
    const stPct = Math.min(100, Math.round((h.stamina/Math.max(1,(h.staminaMax || STAMINA_MAX_FALLBACK)))*100));
    const xpPct = Math.min(100, Math.round((h.xp/Math.max(1,(h.level*100)))*100));
    return `<div class="game-card char3d-card elbg-${h.element} overflow-hidden anim-fade">
      <div class="char3d-wrap relative h-52 overflow-hidden" style="background:radial-gradient(circle at 50% 26%, ${ELEMENTS[h.element].soft}, #0d1526 78%)">
        <img src="${heroImg(h.element, h.id, h.skin)}" alt="英雄#${h.id}" class="char3d w-full h-full object-cover" style="object-position:center 16%;filter:drop-shadow(0 14px 24px rgba(0,0,0,.6));">
        <div class="absolute top-2 left-2 text-[11px] font-black px-2 py-0.5 rounded-lg" style="background:rgba(8,12,24,.72);color:${ELEMENTS[h.element].color};border:1px solid ${ELEMENTS[h.element].border}66;">${ELEMENTS[h.element].icon} ${ELEMENTS[h.element].name}系</div>
        <div class="absolute top-2 right-2 text-[11px] font-black px-2 py-0.5 rounded-lg" style="background:rgba(8,12,24,.72);">#${h.id}${h.skin>0?` <span style="color:#f59e0b;">皮肤${h.skin}</span>`:''}</div>
        <div class="absolute bottom-0 left-0 right-0 px-3 pt-5 pb-2 text-[13px] font-black" style="background:linear-gradient(180deg,transparent,rgba(8,12,24,.88) 55%);">英雄 #${h.id} · Lv.${h.level}</div>
      </div>
      <div class="p-3">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <div class="text-[12px] text-muted">战力 <b class="text-gold num-mono text-[13px]">${fmt(pw,0)}</b></div>
          ${elBadge(h.element)}
        </div>
        <div class="mb-1.5"><div class="flex justify-between text-[10px] text-muted mb-0.5"><span>体力 ${h.stamina}/${h.staminaMax || STAMINA_MAX_FALLBACK}</span><span class="stamina-tick text-cyan-300 not-italic" data-stamina-next="${h.staminaNext||0}" data-stamina-at="${h.staminaAt||Date.now()}"></span></div><div class="bar"><div class="bar-fill stamina" style="width:${stPct}%"></div></div></div>
        <div class="mb-2.5"><div class="flex justify-between text-[10px] text-muted mb-0.5"><span>经验</span><span class="num-mono">${h.xp}/${h.level*100}</span></div><div class="bar"><div class="bar-fill" style="width:${xpPct}%"></div></div></div>
        <div class="flex gap-2">
          <button onclick="selectFightHero(${h.id})" class="btn btn-sm btn-gold flex-1"><i class="fa-solid fa-crosshairs"></i>出战</button>
          <button onclick="levelUpFlow(${h.id})" class="btn btn-sm btn-ghost flex-1"><i class="fa-solid fa-arrow-up"></i>升级</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
async function mintHeroFlow(){
  if(!needWallet()) return;
  try{
    // V7 强制：铸造前确保已有推荐人（链上已固化/已设置pending则跳过；否则按URL ?ref= 或手动输入设置）
    if(!(await ensureReferrerBeforeMint())) return;
    const ch = mustC('characters');
    const minted = await readCall('characters', cc=>cc.mintedOf(S.account));
    // 铸造限额：动态读取 maxMintPerAddr（0=不限制）
    try{ S.mintLimit = Number(await ch.maxMintPerAddr() || 4); }catch(e){ S.mintLimit = 4; }
    if(S.mintLimit > 0 && Number(minted) >= S.mintLimit){ toast('铸造数量已达上限('+S.mintLimit+')','warn'); return; }
    const cost = await heroCostOf();   // 无池时回退到固定英雄价（链上 DEFAULT_HERO_COST）
    const tb = await readCall('gameToken', cc=>cc.balanceOf(S.account));
    if(BigInt(tb) < BigInt(cost)){ toast('代币余额不足','warn'); return; }
    const tokenAmount = BigInt(cost) * 105n / 100n; // commit 保证金5% + reveal 全款
    showSummonOverlay();
    try{
      await commitReveal('mintHero', {
        busyId:'mintHeroBtn',
        needToken:true, tokenTarget:addrOf('v3'), tokenAmount,
        extra:{ heroName: '英雄' + Date.now().toString(36).slice(-4) },
        overlay:true,
        onRevealed: async (rec) => {
          await renderSummonResult(rec);
          // 铸造成功后自动绑定 URL 携带的推荐人（?ref=0x...）
          await autoBindReferrer(rec);
        },
        staticCall: h=>mustC('v3').commitMintHero.staticCall(h),
        commit: h=>mustC('v3').commitMintHero(h)
      });
    }catch(e){ hideSummonOverlay(); throw e; }
  }catch(e){ toast(errMsg(e),'error'); }
}

/* ============ 推荐人绑定 ============ */
// V7 铸造强制：确保当前玩家已设置推荐人（referrerOfAccount 已固化 / pending 已设置 → 直接通过；
// 链上强制关闭 → 通过；否则按 URL ?ref= 自动设置，无则让玩家输入邀请码或地址）
async function ensureReferrerBeforeMint(){
  if(!S.account) return false;
  try{
    // 管理员关闭强制 → 不拦截
    const req = await readCall('characters', cc=>cc.referrerRequired()).catch(()=>true);
    if(!req) return true;
    // 已固化推荐人（老玩家/已铸造过）→ 通过
    const acc = await readCall('characters', cc=>cc.referrerOfAccount(S.account)).catch(()=>null);
    if(acc && acc !== ethers.ZeroAddress) return true;
    // pending 已设置（上次流程中断，链上会消耗）→ 通过
    const pend = await readCall('characters', cc=>cc.pendingReferrerOf(S.account)).catch(()=>null);
    if(pend && pend !== ethers.ZeroAddress) return true;
  }catch(e){}
  // 需要推荐人：优先 URL ?ref=
  let ref = getRefFromUrl();
  let referrer = ref ? await resolveRefToAddr(ref) : null;
  if(!referrer){
    const input = prompt('铸造英雄必须设置邀请码（推荐人）。请输入推荐人的邀请码或钱包地址：','');
    if(input===null) return false;
    const v = input.trim();
    if(/^0x[a-fA-F0-9]{40}$/.test(v)) referrer = ethers.getAddress(v);
    else if(/^[a-zA-Z0-9]{4,10}$/.test(v)){
      referrer = await resolveRefToAddr({ type:'code', value: v.toLowerCase() });
      if(!referrer){ toast('邀请码不存在','warn'); return false; }
    } else { toast('邀请码/地址格式不正确','warn'); return false; }
  }
  if(!referrer){ toast('邀请码不存在','warn'); return false; }
  if(referrer.toLowerCase() === S.account.toLowerCase()){ toast('不能设置自己为推荐人','warn'); return false; }
  withBusy(null,true);
  try{
    const tx = await mustC('characters').connect(S.signer).setPendingReferrer(referrer);
    await tx.wait();
    toast('推荐人已设置','success');
    return true;
  }catch(e){ toast(errMsg(e),'error'); return false; }
  finally{ withBusy(null,false); }
}
// 解析 URL ?ref=：返回 {type:'addr', value:地址} 或 {type:'code', value:短码} 或 null
function getRefFromUrl(){
  try{
    const ref = new URLSearchParams(location.search).get('ref');
    if(!ref) return null;
    const r = ref.trim();
    if(/^0x[a-fA-F0-9]{40}$/.test(r)) return { type:'addr', value: ethers.getAddress(r) };
    if(/^[a-zA-Z0-9]{4,10}$/.test(r)) return { type:'code', value: r.toLowerCase() };
    return null;
  }catch(e){ return null; }
}
// 把短码解析成地址（resolveReferrerCode）；地址直接返回；解析失败返回 null
async function resolveRefToAddr(ref){
  if(!ref) return null;
  if(ref.type === 'addr') return ref.value;
  try{
    const a = await readCall('characters', cc=>cc.resolveReferrerCode(ref.value));
    return (a && a !== ethers.ZeroAddress) ? ethers.getAddress(a) : null;
  }catch(e){ return null; }
}
// 生成邀请链接：已注册短码用短码，否则用完整地址
async function buildInviteLink(){
  if(!S.account) return null;
  try{
    const code = await readCall('characters', cc=>cc.referrerCodeOf(S.account)).catch(()=>null);
    if(code && code !== ethers.ZeroHash){
      try{
        const s = ethers.decodeBytes32String(code);
        if(/^[a-z0-9]{4,10}$/.test(s)) return location.origin + location.pathname + '?ref=' + s;
      }catch(e){}
    }
  }catch(e){}
  return location.origin + location.pathname + '?ref=' + S.account;
}
// 复制邀请链接（优先短码）
async function copyInviteLink(){
  if(!needWallet()) return;
  try{
    const link = await buildInviteLink();
    if(!link) return;
    await navigator.clipboard.writeText(link);
    toast('邀请链接已复制','success');
  }catch(e){ toast(errMsg(e),'error'); }
}
// 自动分配邀请码：前端随机生成唯一短码并注册（撞码自动重试，合约 CodeTaken 兜底）
async function registerRefCodeFlow(){
  if(!needWallet()) return;
  try{
    // 已注册过 → 直接显示现有码，不重复生成
    const cur = await readCall('characters', cc=>cc.referrerCodeOf(S.account)).catch(()=>null);
    if(cur && cur !== ethers.ZeroHash){
      try{
        const s = ethers.decodeBytes32String(cur);
        if(/^[a-z0-9]{4,10}$/.test(s)){ toast('已注册邀请码：'+s,'info'); return; }
      }catch(e){}
    }
    const CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'; // 32 字符集，去掉易混淆 i/l/o/0/1
    withBusy(null,true);
    try{
      for(let attempt = 0; attempt < 24; attempt++){
        let code = 'eh';
        for(let i = 0; i < 4; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
        try{
          const tx = await mustC('characters').connect(S.signer).registerReferrerCode(code);
          await tx.wait();
          toast('已生成邀请码：'+code,'success');
          // 注册成功顺手复制短码邀请链接
          const link = location.origin + location.pathname + '?ref=' + code;
          try{ await navigator.clipboard.writeText(link); toast('邀请链接已复制','success'); }catch(e){}
          return;
        }catch(e){
          const em = String(e.message||e);
          // 仅撞码（CodeTaken）重试换码；其他错误（余额/拒绝/网络等）直接失败
          if(!/CodeTaken|execution reverted/i.test(em)){ toast(errMsg(e),'error'); return; }
        }
      }
      toast('生成失败，请重试','warn');
    } finally { withBusy(null,false); }
  }catch(e){ toast(errMsg(e),'error'); }
}
async function autoBindReferrer(rec){
  if(!S.account) return;
  const ref = getRefFromUrl();
  if(!ref) return;
  const referrer = await resolveRefToAddr(ref);
  if(!referrer) return;
  const my = S.account.toLowerCase();
  if(referrer.toLowerCase() === my) return; // 不能绑自己
  try{
    // 地址级（V8）：铸造后若该地址尚未绑定推荐人，则直接固化到地址
    const acc = await readCall('characters', cc=>cc.referrerOfAccount(S.account)).catch(()=>ethers.ZeroAddress);
    if(acc && acc !== ethers.ZeroAddress) return; // 已绑定（铸造 setPending 固化或手动绑定过）
    const tx = await mustC('characters').connect(S.signer).bindAccountReferrer(referrer);
    await tx.wait();
    toast('已绑定推荐人：'+shortAddr(referrer),'success');
    renderHeroes(true);
  }catch(e){ console.warn('autoBindReferrer', e); }
}
// 地址级推荐人绑定（V8）：绑定到玩家地址（无需指定英雄；已绑定则链上拒绝）
async function bindReferrerFlow(){
  if(!needWallet()) return;
  const ref = getRefFromUrl();
  const def = ref ? (ref.type==='code' ? ref.value : ref.value) : '';
  const addr = prompt('输入推荐人地址或邀请码（绑定到我的地址，该地址所有英雄战斗胜利推荐人获 10%）：', def);
  if(!addr) return;
  const clean = addr.trim();
  let referrer = null;
  if(/^0x[a-fA-F0-9]{40}$/.test(clean)){
    referrer = ethers.getAddress(clean);
  } else if(/^[a-zA-Z0-9]{4,10}$/.test(clean)){
    toast('正在解析邀请码…','info');
    try{
      const a = await readCall('characters', cc=>cc.resolveReferrerCode(clean.toLowerCase()));
      if(!a || a === ethers.ZeroAddress){ toast('邀请码未注册','warn'); return; }
      referrer = ethers.getAddress(a);
    }catch(e){ toast(errMsg(e),'error'); return; }
  } else {
    toast('请输入完整地址或 4~10 位邀请码','warn'); return;
  }
  if(referrer.toLowerCase() === S.account.toLowerCase()){ toast('不能绑定自己为推荐人','warn'); return; }
  const cur = await readCall('characters', cc=>cc.referrerOfAccount(S.account)).catch(()=>ethers.ZeroAddress);
  if(cur && cur !== ethers.ZeroAddress){ toast('该地址已绑定推荐人：'+shortAddr(cur),'info'); return; }
  withBusy(null,true);
  mustC('characters').connect(S.signer).bindAccountReferrer(referrer)
    .then(async tx=>{ await tx.wait(); toast('绑定推荐人成功！','success'); await renderHeroes(true); })
    .catch(e=>toast(errMsg(e),'error'))
    .finally(()=>withBusy(null,false));
}

/* ============ 召唤动画 ============ */
function showSummonOverlay(){
  let el = $('summonOverlay');
  if(el) return;
  el = document.createElement('div');
  el.id = 'summonOverlay';
  el.innerHTML = `
    <div class="summon-stage">
      <div class="summon-ring"><div class="summon-ring-dot"></div></div>
      <div class="summon-core"><span class="summon-core-icon">🪄</span></div>
      <div class="summon-title">英雄召唤中…</div>
      <div class="summon-sub">提交链上并等待确认 · 请勿关闭页面</div>
    </div>`;
  document.body.appendChild(el);
}
function hideSummonOverlay(){ const el = $('summonOverlay'); if(el) el.remove(); }
async function renderSummonResult(rec){
  const user = S.account ? S.account.toLowerCase() : null;
  const cif = new ethers.Interface(ABIs.characters);
  let hid = null;
  // V15：首铸赠武器事件（同一笔 reveal 交易内，Characters._mint 触发 GiftWeapon）
  let gift = null;
  for(const log of rec.logs){
    try{ const d = cif.parseLog(log);
      if(d && d.name==='Transfer' && d.args.from===ethers.ZeroAddress && user && (d.args.to||'').toLowerCase()===user){ hid = d.args.tokenId.toString(); }
      if(d && d.name==='GiftWeapon' && user && (d.args.player||'').toLowerCase()===user){ gift = { wid:d.args.weaponId.toString(), stars:Number(d.args.stars), bp:Number(d.args.bonusBp) }; }
    }catch(e){}
  }
  const el = $('summonOverlay');
  if(!el) return;
  let html;
  const done = (inner) => `
    <div class="summon-stage summon-done">
      <div class="summon-burst"><span>✨</span><span>🌟</span><span>✨</span></div>
      ${inner}
    </div>`;
  if(hid){
    try{
      const h = await readCall('characters', cc=>cc.heroes(hid));
      const pw = await readCall('characters', cc=>cc.heroPower(hid));
      const ref = await readCall('characters', cc=>cc.referrerOfAccount(S.account)).catch(()=>ethers.ZeroAddress);
      const eln = Number(h.element); const e = ELEMENTS[eln]||ELEMENTS[0];
      const refLine = (ref && ref !== ethers.ZeroAddress)
        ? `<div class="summon-hero-ref"><i class="fa-solid fa-user-plus"></i>推荐人 <b>${shortAddr(ref)}</b></div>`
        : `<div class="summon-hero-ref muted">可绑定推荐人，该地址战斗胜利其获 10% 奖励</div>`;
      const giftLine = gift
        ? `<div class="summon-hero-ref" style="color:#fbbf24;border-color:rgba(251,191,36,.4);"><i class="fa-solid fa-gift"></i>首铸礼包：<b>${gift.stars} 星武器</b>已到账${gift.bp>0?`（附赠加成 ${gift.bp/1000}×）`:''}</div>`
        : '';
      html = done(`
        <div class="summon-result-card">
          <div class="summon-hero-avatar" style="border-color:${e.border};background:radial-gradient(circle at 50% 32%, ${e.soft}, #0d1526 78%);box-shadow:0 0 46px -6px ${e.color}88;"><img src="${heroImg(eln, hid)}" alt="${e.name}系英雄" class="w-full h-full object-cover"></div>
          <div class="summon-result-title">召唤成功！</div>
          <div class="summon-hero-name" style="color:${e.color};">${e.name}系英雄 #${hid}</div>
          <div class="summon-hero-stats"><span>⚔ 战力 ${fmt(Number(pw),0)}</span><span>Lv.${h.level}</span>${elBadge(eln)}</div>
          ${giftLine}
          ${refLine}
          <button onclick="hideSummonOverlay();switchTab('heroes')" class="btn btn-gold w-full mt-1">查看我的英雄</button>
        </div>`);
    }catch(e){
      html = done(`
        <div class="summon-result-card">
          <div class="summon-hero-avatar" style="border-color:#fbbf24;background:radial-gradient(circle at 50% 32%, rgba(251,191,36,.14), #0d1526 78%);">🎉</div>
          <div class="summon-result-title">召唤成功！</div>
          <div class="summon-hero-name">英雄 #${hid}</div>
          <button onclick="hideSummonOverlay();switchTab('heroes')" class="btn btn-gold w-full mt-1">查看我的英雄</button>
        </div>`);
    }
  } else {
    html = done(`
      <div class="summon-result-card">
        <div class="summon-hero-avatar" style="border-color:#fbbf24;background:radial-gradient(circle at 50% 32%, rgba(251,191,36,.14), #0d1526 78%);">🎉</div>
        <div class="summon-result-title">召唤成功！</div>
        <div class="summon-hero-name">前往英雄页查看</div>
        <button onclick="hideSummonOverlay();switchTab('heroes')" class="btn btn-gold w-full mt-1">查看我的英雄</button>
      </div>`);
  }
  el.innerHTML = html;
  await refreshHeroes(); await refreshBalances();
}
async function levelUpFlow(id){
  if(!needWallet()) return;
  try{
    withBusy(null,true);
    const tx = await mustC('v3').connect(S.signer).levelUp(id);
    await tx.wait();
    toast('英雄 #'+id+' 升级成功！','success');
  }catch(e){ toast(errMsg(e),'error'); }
  finally{ withBusy(null,false); await renderHeroes(); }
}
function refreshHeroes(force){ renderHeroes(!!force); }

/* ============ 体力恢复倒计时（每秒刷新） ============ */
setInterval(()=>{
  document.querySelectorAll('.stamina-tick[data-stamina-next]').forEach(el=>{
    const next = Number(el.dataset.staminaNext||0);
    if(!next){ el.textContent=''; return; }
    const at = Number(el.dataset.staminaAt||Date.now());
    const left = next - Math.floor((Date.now()-at)/1000);
    if(left<=0){ el.textContent=''; el.dataset.staminaNext=''; }
    else { const m = Math.floor(left/60), s = left%60; el.textContent = ' · 恢复中 ' + m + '分' + String(s).padStart(2,'0') + '秒'; }
  });
}, 1000);
