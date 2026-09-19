'use strict';

/* ============ 英雄 ============ */
async function fetchHeroes(force){
  if(!S.account) return [];
  const cacheKey = 'heroes_'+S.account;
  if(!force){ const cached = cacheGet(cacheKey); if(cached) return cached; }
  try{
    const ch = mustC('characters');
    const ids = await ch.tokensOfOwner(S.account);
    const results = await Promise.all(ids.map(async id => {
      try{
        const [h, pwr, st, sti] = await Promise.all([
          ch.heroes(id), ch.heroPower(id),
          ch.getStamina(id).catch(()=>0n),
          ch.getStaminaInfo(id).catch(()=>null)
        ]);
        const stNow = Number(st);
        const max = sti ? Number(sti.staminaMax||5) : 5;
        return {id:Number(id), element:Number(h.element), basePower:Number(h.basePower), level:Number(h.level),
          xp:Number(h.xp), stamina: stNow, staminaMax: max, staminaInterval: sti?Number(sti.recoveryInterval||300):300,
          staminaNext: stNow>=max ? 0 : Number(sti&&sti.secondsUntilNext!==undefined?sti.secondsUntilNext:0),
          staminaAt: Date.now(), power:Number(pwr)};
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
  $('#heroCount').textContent = S.heroes.length + ' / 4';
  if(!S.heroes.length){ grid.innerHTML = `<div class="col-span-full text-center text-muted py-10">还没有英雄，点击「召唤英雄」开始冒险</div>`; return; }
  grid.innerHTML = S.heroes.map(h=>{
    const pw = h.power;
    const stPct = Math.min(100, Math.round((h.stamina/Math.max(1,(h.staminaMax||5)))*100));
    const xpPct = Math.min(100, Math.round((h.xp/Math.max(1,(h.level*100)))*100));
    return `<div class="game-card char3d-card elbg-${h.element} overflow-hidden anim-fade">
      <div class="char3d-wrap relative h-52 overflow-hidden" style="background:radial-gradient(circle at 50% 26%, ${ELEMENTS[h.element].soft}, #0d1526 78%)">
        <img src="${heroImg(h.element)}" alt="英雄#${h.id}" class="char3d w-full h-full object-cover" style="object-position:center 16%;filter:drop-shadow(0 14px 24px rgba(0,0,0,.6));">
        <div class="absolute top-2 left-2 text-[11px] font-black px-2 py-0.5 rounded-lg" style="background:rgba(8,12,24,.72);color:${ELEMENTS[h.element].color};border:1px solid ${ELEMENTS[h.element].border}66;">${ELEMENTS[h.element].icon} ${ELEMENTS[h.element].name}系</div>
        <div class="absolute top-2 right-2 text-[11px] font-black px-2 py-0.5 rounded-lg" style="background:rgba(8,12,24,.72);">#${h.id}</div>
        <div class="absolute bottom-0 left-0 right-0 px-3 pt-5 pb-2 text-[13px] font-black" style="background:linear-gradient(180deg,transparent,rgba(8,12,24,.88) 55%);">英雄 #${h.id} · Lv.${h.level}</div>
      </div>
      <div class="p-3">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <div class="text-[12px] text-muted">战力 <b class="text-gold num-mono text-[13px]">${fmt(pw,0)}</b></div>
          ${elBadge(h.element)}
        </div>
        <div class="mb-1.5"><div class="flex justify-between text-[10px] text-muted mb-0.5"><span>体力 ${h.stamina}/${h.staminaMax||5}</span><span class="stamina-tick text-cyan-300 not-italic" data-stamina-next="${h.staminaNext||0}" data-stamina-at="${h.staminaAt||Date.now()}"></span></div><div class="bar"><div class="bar-fill stamina" style="width:${stPct}%"></div></div></div>
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
    const bal = await readCall('characters', cc=>cc.balanceOf(S.account));
    if(Number(bal) >= 4){ toast('英雄数量已达上限(4)','warn'); return; }
    const cost = await readCall('oracle', c=>c.getHeroCost());
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
        onRevealed: async (rec) => { await renderSummonResult(rec); },
        staticCall: h=>mustC('v3').commitMintHero.staticCall(h),
        commit: h=>mustC('v3').commitMintHero(h)
      });
    }catch(e){ hideSummonOverlay(); throw e; }
  }catch(e){ toast(errMsg(e),'error'); }
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
  for(const log of rec.logs){
    try{ const d = cif.parseLog(log);
      if(d && d.name==='Transfer' && d.args.from===ethers.ZeroAddress && user && (d.args.to||'').toLowerCase()===user){ hid = d.args.tokenId.toString(); }
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
      const eln = Number(h.element); const e = ELEMENTS[eln]||ELEMENTS[0];
      html = done(`
        <div class="summon-result-card">
          <div class="summon-hero-avatar" style="border-color:${e.border};background:radial-gradient(circle at 50% 32%, ${e.soft}, #0d1526 78%);box-shadow:0 0 46px -6px ${e.color}88;"><img src="${heroImg(eln)}" alt="${e.name}系英雄" class="w-full h-full object-cover"></div>
          <div class="summon-result-title">召唤成功！</div>
          <div class="summon-hero-name" style="color:${e.color};">${e.name}系英雄 #${hid}</div>
          <div class="summon-hero-stats"><span>⚔ 战力 ${fmt(Number(pw),0)}</span><span>Lv.${h.level}</span>${elBadge(eln)}</div>
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
