'use strict';

/* ============ BOSS ============ */
async function refreshBoss(){
  const body = $('#bossBody'); if(!body) return;
  if(!S.account){ body.innerHTML = '<div class="lg:col-span-3 text-center text-muted py-10">连接钱包后查看 BOSS</div>'; return; }
  body.innerHTML = skeletonBlock(2,'h-48');
  try{
    if(!(S.heroes||[]).length){ try{ S.heroes = await fetchHeroes(); }catch(e){} }
    if(!(S.weapons||[]).length){ try{ S.weapons = await fetchWeapons(); }catch(e){} }
    const boss = mustC('boss');
    const cnt = Number(await boss.roundCount());
    if(cnt===0){ body.innerHTML = '<div class="lg:col-span-3 text-center text-muted py-10">BOSS 尚未开启</div>'; return; }
    const rid = cnt - 1;
    const r = await boss.rounds(rid);
    const myDmg = await boss.playerDamage(rid, S.account);
    S.boss = { rid, round:{ rid, maxHp:Number(r.maxHp), hp:Number(r.hp), dead:r.dead, rewardPool:Number(r.rewardPool), totalDamage:Number(r.totalDamage) }, myDamage:myDmg };
    const pct = r.maxHp>0?Math.max(0,Math.min(100,(Number(r.hp)/Number(r.maxHp))*100)):0;
    const td = BigInt(r.totalDamage);
    const est = (td>0n && !r.dead) ? BigInt(myDmg)*BigInt(r.rewardPool)/td : 0n;
    body.innerHTML = `
      <div class="lg:col-span-2 game-card p-4 elbg-4">
        <div class="relative h-44 rounded-xl overflow-hidden mb-3" style="background:radial-gradient(circle at 50% 26%, rgba(239,68,68,.18), #0d1526 80%)">
          <img src="${monImg(9)}" alt="世界BOSS" class="w-full h-full object-cover" style="object-position:center 28%;filter:drop-shadow(0 12px 20px rgba(0,0,0,.6));">
          <div class="absolute top-2 left-2 badge font-black text-[12px] px-2.5 py-1 bg-red-500/25 text-red-300 border border-red-500/30">🐉 世界BOSS · 第 ${rid} 轮</div>
          <div class="absolute top-2 right-2 badge font-black text-[12px] px-2.5 py-1 ${r.dead?'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30':'bg-red-500/25 text-red-300 border border-red-500/30'}">${r.dead?'✅ 已讨伐':'⚔ 讨伐中'}</div>
          <div class="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8" style="background:linear-gradient(180deg,transparent,rgba(5,10,20,.94) 62%)">
            <div class="flex justify-between text-[11px] mb-1">
              <span class="text-muted">BOSS 血量</span>
              <span class="num-mono font-black text-red-300">${fmt(Number(r.hp),0)} / ${fmt(Number(r.maxHp),0)} · ${pct}%</span>
            </div>
            <div class="bar h-3"><div class="bar-fill boss" style="width:${pct}%"></div></div>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div class="bg-[#0d1526] rounded-xl p-2.5"><div class="text-[10px] text-muted">奖池</div><div class="font-black text-gold num-mono text-[13px]">${fmtUnits(BigInt(r.rewardPool), S.tokenDecimals, 2)}</div></div>
          <div class="bg-[#0d1526] rounded-xl p-2.5"><div class="text-[10px] text-muted">总伤害</div><div class="font-black num-mono text-[13px]">${fmt(Number(r.totalDamage),0)}</div></div>
          <div class="bg-[#0d1526] rounded-xl p-2.5"><div class="text-[10px] text-muted">我的伤害</div><div class="font-black text-green-400 num-mono text-[13px]">${fmt(Number(myDmg),0)}</div>${est>0n?`<div class="text-[10px] text-muted mt-0.5">预估可分 ≈ <b class="text-gold num-mono">${fmtUnits(est, S.tokenDecimals, 2)}</b></div>`:''}</div>
          <div class="bg-[#0d1526] rounded-xl p-2.5"><div class="text-[10px] text-muted">剩余 HP</div><div class="font-black num-mono text-[13px]">${fmt(Number(r.hp),0)}</div></div>
        </div>
        <div class="mt-3">
          <div class="lbl mb-1">出战英雄 <span class="text-[10px] text-muted">（左右滑动选择）</span></div>
          <div id="bossHeroSel" class="pick-row"></div>
          <div class="lbl mb-1 mt-2.5">出战武器 <span class="text-[10px] text-muted">（左右滑动选择）</span></div>
          <div id="bossWeaponFilterBar" class="flex flex-wrap items-center gap-1.5 mb-2"></div>
          <div id="bossWeaponSel" class="pick-row"></div>
        </div>
        <button onclick="bossAttack()" id="bossAtkBtn" class="btn btn-danger w-full mt-3" ${r.dead?'disabled':''}><i class="fa-solid fa-sword"></i>${r.dead?'本轮已讨伐':'发起攻击'}</button>
      </div>
      <div class="game-card p-4">
        <div class="flex items-center justify-between mb-2"><div class="font-bold">🏆 伤害排行</div><span class="text-[11px] text-muted">TOP 5</span></div>
        <div id="bossTopList">${skeletonBlock(1,'h-24')}</div>
      </div>
      <div class="game-card p-4">
        <div class="font-bold mb-3">📜 规则</div>
        <ul class="text-[12px] text-muted space-y-2">
          <li>· commit→reveal 提交伤害</li>
          <li>· 击破后按伤害占比分奖池</li>
          <li>· 结束后点击「结算奖励」</li>
          <li>· 可在上方选择出战英雄和武器</li>
        </ul>
      </div>`;
    loadBossTop(rid);
    renderBossPicks();
  }catch(e){ body.innerHTML = '<div class="lg:col-span-3 text-center text-red-400 py-10">BOSS 读取失败：'+errMsg(e)+'</div>'; }
}
async function loadBossTop(rid){
  const el = $('#bossTopList'); if(!el) return;
  try{
    const boss = mustC('boss');
    const me = (S.account||'').toLowerCase();
    let addrs = [];
    try{ addrs = await boss.attackersOf(rid); }catch(e){}
    const uniq = [...new Set([...(addrs||[]).map(a=>String(a).toLowerCase()).slice(0,10), me])];
    const rows = (await Promise.all(uniq.map(async a=>{
      try{ return {addr:a, dmg:Number(await boss.playerDamage(rid, a))}; }catch(e){ return {addr:a, dmg:0}; }
    }))).filter(r=>r.dmg>0);
    rows.sort((a,b)=>b.dmg-a.dmg);
    const top = rows.slice(0,5);
    if(!top.length){ el.innerHTML = '<div class="text-[12px] text-muted text-center py-3">本轮暂无伤害记录</div>'; return; }
    const maxD = Math.max(1, top[0].dmg);
    const medals = ['text-gold','text-slate-300','text-amber-600'];
    el.innerHTML = top.map((r,i)=>{
      const isMe = r.addr===me;
      return `<div class="flex items-center gap-2 py-1.5 ${isMe?'rounded-lg bg-[#fbbf24]0f border border-[#fbbf24]33 px-1.5 -mx-1.5':''}">
        <span class="w-4 text-center font-black text-[13px] ${medals[i]||'text-muted'}">${i+1}</span>
        <img src="${monImg(9)}" class="w-7 h-7 rounded-lg object-cover" style="object-position:center 30%;">
        <span class="text-[11px] font-bold num-mono w-16 truncate ${isMe?'text-gold':'text-muted'}">${isMe?'👤 我':r.addr.slice(0,4)+'…'+r.addr.slice(-3)}</span>
        <div class="flex-1 h-1.5 bg-[#0d1526] rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${Math.max(4,Math.round(r.dmg/maxD*100))}%;background:${isMe?'#fbbf24':'#f87171'}"></div></div>
        <span class="text-[11px] font-bold num-mono text-right w-14">${fmt(r.dmg,0)}</span>
      </div>`;
    }).join('');
  }catch(e){ el.innerHTML = '<div class="text-[12px] text-muted text-center py-3">排行读取失败</div>'; }
}
async function bossAttack(){
  if(!needWallet()) return;
  const heroSel = $('#bossHeroSel');
  const weaponSel = $('#bossWeaponSel');
  const heroId = (S.boss.heroId) || (S.heroes[0] && S.heroes[0].id);
  const weaponId = (S.boss.weaponId) || (S.weapons[0] && S.weapons[0].id);
  if(!heroId || !weaponId){ toast('需要英雄和武器','warn'); return; }
  try{
    await ensureBossDepositAllowance();
    await commitReveal('bossAttack', {
      busyId:'bossAtkBtn', extra:{ heroId, weaponId },
      staticCall: h=>mustC('boss').commitAttack.staticCall(h, heroId, weaponId),
      commit: h=>mustC('boss').commitAttack(h, heroId, weaponId)
    });
  }catch(e){ toast(errMsg(e),'error'); }
}
/* BOSS 攻击需按奖池 5% 缴纳保证金（无奖池时免押金）；揭示时全额退还 */
async function ensureBossDepositAllowance(){
  const pool = (S.boss.round && S.boss.round.rewardPool) || 0;
  if(pool <= 0) return;
  const deposit = BigInt(Math.round(pool)) * 5n / 100n;
  if(deposit <= 0n) return;
  let mode = 0;
  try{ mode = Number(await readCall('vault', v=>v.rewardMode())); }catch(e){}
  if(mode === 0){
    await ensureTokenAllowance(addrOf('boss'), deposit * 2n + 1n);
  } else {
    const usdtAddr = await readCall('vault', v=>v.usdt());
    if(!usdtAddr) return;
    const tk = new ethers.Contract(usdtAddr,
      ["function allowance(address,address) view returns (uint256)","function approve(address,uint256) returns (bool)"],
      S.signer);
    const cur = await tk.allowance(S.account, addrOf('boss'));
    if(cur < deposit){
      toast('正在授权 USDT 保证金…','info');
      await (await tk.approve(addrOf('boss'), deposit * 2n + 1n)).wait();
      toast('USDT 授权成功','success');
    }
  }
}
async function parseBossResult(rec){
  const iface = new ethers.Interface(ABIs.boss);
  let ev = null;
  for(const log of rec.logs){
    try{ const d = iface.parseLog(log); if(d && d.name==='BossAttacked'){ ev = d.args; break; } }catch(e){}
  }
  if(ev){ floatText('-' + fmt(Number(ev.damage),0) + ' 伤害','text-red-400'); }
  setTimeout(refreshBoss, 900);
}
async function settleBoss(){
  if(!needWallet()) return;
  if(S.boss.rid===null){ toast('请先刷新','warn'); return; }
  try{
    withBusy('settleBtn', true, '结算中…');
    await (await mustC('boss').connect(S.signer).settleReward(S.boss.rid)).wait();
    toast('结算成功','success');
  }catch(e){ toast(errMsg(e),'error'); }
  finally{ withBusy('settleBtn', false); await refreshBoss(); await refreshBalances(); }
}

function renderBossPicks(){
  const hs = $('#bossHeroSel'); const ws = $('#bossWeaponSel');
  if(hs){
    if(!S.heroes.length){ hs.innerHTML = '<div class="text-muted text-[12px] py-3 text-center w-full shrink-0">暂无英雄，先召唤英雄</div>'; }
    else {
      if(!S.boss.heroId || !S.heroes.find(h=>h.id===S.boss.heroId)) S.boss.heroId = S.heroes[0].id;
      hs.innerHTML = S.heroes.map(h=>{
        const active = S.boss.heroId===h.id;
        const e = ELEMENTS[h.element]||ELEMENTS[0];
        const staminaPct = Math.min(100, (h.stamina/Math.max(1,h.staminaMax||5))*100);
        return `<button onclick="selectBossHero(${h.id})" class="pick-chip ${active?'pick-active':''}" style="${active?`border-color:${e.border};background:${e.soft};`:''}">
          <span class="pick-avatar char3d-wrap" style="background:${e.soft};border:1px solid ${e.border};"><img class="char3d" src="${heroImg(h.element)}" alt="英雄#${h.id}"></span>
          <span class="pick-body">
            <span class="pick-title"><b>#${h.id}</b><em class="pick-tag" style="color:${e.color};">${e.name}系</em></span>
            <span class="pick-sub"><b class="text-gold">⚔${fmt(h.power,0)}</b><i class="text-muted">Lv.${h.level} 体力${h.stamina}/${h.staminaMax||5}</i></span>
            <span class="pick-bar"><i style="width:${staminaPct}%;background:${staminaPct>30?'#22c55e':'#ef4444'};"></i></span>
          </span>
          <span class="pick-radio ${active?'pick-radio-on':''}">${active?'✓':''}</span>
        </button>`;
      }).join('');
    }
  }
  if(ws){
    const wbar = $('#bossWeaponFilterBar');
    if(wbar) wbar.innerHTML = weaponMiniFilterHTML(S.bossW, 'boss');
    const wlist = applyWeaponFilter(S.weapons, S.bossW);
    if(!S.weapons.length){ ws.innerHTML = '<div class="text-muted text-[12px] py-3 text-center w-full shrink-0">暂无武器，先锻造武器</div>'; }
    else if(!wlist.length){ ws.innerHTML = '<div class="text-muted text-[12px] py-3 text-center w-full shrink-0">该分类下暂无武器</div>'; }
    else {
      if(!S.boss.weaponId || !wlist.find(w=>w.id===S.boss.weaponId)) S.boss.weaponId = wlist[0].id;
      ws.innerHTML = wlist.map(w=>{
        const active = S.boss.weaponId===w.id;
        const e = ELEMENTS[w.element]||ELEMENTS[0];
        const stars = '★'.repeat(w.stars)+'☆'.repeat(5-w.stars);
        return `<button onclick="selectBossWeapon(${w.id})" class="pick-chip ${active?'pick-active':''}" style="${active?`border-color:${e.border};background:${e.soft};`:''}">
          <span class="pick-avatar" style="background:${e.soft};border:1px solid ${e.border};">🗡️</span>
          <span class="pick-body">
            <span class="pick-title"><b>#${w.id}</b><em class="pick-tag" style="color:${e.color};">${e.name}系</em></span>
            <span class="pick-sub"><b class="text-gold">${stars}</b></span>
            <span class="pick-sub"><i class="text-green-400">加成 +${bpToPct(w.bonusBp)}</i></span>
          </span>
          <span class="pick-radio ${active?'pick-radio-on':''}">${active?'✓':''}</span>
        </button>`;
      }).join('');
    }
  }
}
function selectBossHero(id){ S.boss.heroId = id; renderBossPicks(); }
function selectBossWeapon(id){ S.boss.weaponId = id; renderBossPicks(); }
