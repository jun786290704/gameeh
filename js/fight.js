'use strict';

/* ============ 战斗 ============ */
const MONSTER_REG_ABI = [
  "function monstersLength() view returns (uint256)",
  "function getMonster(uint256) view returns (string name,uint8 element,uint32 power,uint32 reward,uint32 xp)"
];
async function fetchMonsters(){
  for(let attempt=0; attempt<3; attempt++){
    try{
      const v3 = mustC('v3');
      // 优先读 MonsterRegistry（与链上结算同源）；未设置时回退 V3 本地数组
      let n = 0, arr = [];
      const regAddr = await v3.monsterRegistry().catch(()=>ethers.ZeroAddress);
      if(regAddr && regAddr !== ethers.ZeroAddress){
        const reg = new ethers.Contract(regAddr, MONSTER_REG_ABI, getReadProvider());
        n = Number(await reg.monstersLength());
        arr = await Promise.all(Array.from({length:n},(_,i)=>i).map(async i=>{
          try{
            const m = await reg.getMonster(i);
            return {id:i, name: String(m.name).trim()||('怪物'+i), element:Number(m.element), power:Number(m.power), reward:Number(m.reward), xp:Number(m.xp)};
          }catch(e){ return null; }
        }));
      } else {
        n = Number(await v3.monstersLength());
        arr = await Promise.all(Array.from({length:n},(_,i)=>i).map(async i=>{
          try{
            const m = await v3.monsters(i);
            return {id:i, name: String(m.name).trim()||('怪物'+i), element:Number(m.element), power:Number(m.power), reward:Number(m.reward), xp:Number(m.xp)};
          }catch(e){ return null; }
        }));
      }
      const ok = arr.filter(Boolean);
      if(ok.length){ S.monsters = ok; return ok; }
    }catch(e){}
    if(attempt<2) await new Promise(r=>setTimeout(r, 1500));
  }
  S.monsters = S.monsters||[];
  return S.monsters;
}
async function renderFight(){
  await fetchMonsters();
  const heroSel = $('#fightHeroSel'); if(!heroSel) return;
  const monsterIcons = ['👹','👺','👻','💀','🐉','🦇','🕷️','🐍','🦂','🐺'];
  if(!S.account){
    heroSel.innerHTML = '<div class="text-muted text-[12px] text-center py-4 w-full">连接钱包后选择英雄</div>';
    const hc0 = $('#fightHeroCount'); if(hc0) hc0.textContent='';
    const ws0 = $('#fightWeaponSel'); if(ws0) ws0.innerHTML='';
    const wc0 = $('#fightWeaponCount'); if(wc0) wc0.textContent='';
    const mg0 = $('#monsterGrid'); if(mg0) mg0.innerHTML='';
    autoPreviewFight();
    return;
  }
  S.heroes = await fetchHeroes();
  const hc = $('#fightHeroCount'); if(hc) hc.textContent = `共 ${S.heroes.length} 位`;
  if(!S.heroes.length){
    heroSel.innerHTML = '<div class="text-center py-4 w-full"><i class="fa-solid fa-user-ninja text-2xl opacity-30 mb-1 block"></i><div class="text-muted text-[12px]">暂无英雄，前往英雄页面召唤</div></div>';
  } else {
    if(!S.fight.heroId || !S.heroes.find(h=>h.id===S.fight.heroId)) S.fight.heroId = S.heroes[0].id;
    heroSel.innerHTML = S.heroes.map(h=>{
      const active = S.fight.heroId===h.id;
      const e = ELEMENTS[h.element]||ELEMENTS[0];
      const staminaPct = Math.min(100, (h.stamina/Math.max(1, h.staminaMax || STAMINA_MAX_FALLBACK))*100);
      return `<button onclick="selectFightHero(${h.id}, this)" class="pick-chip ${active?'pick-active':''}" style="${active?`border-color:${e.border};background:${e.soft};`:''}">
        <span class="pick-avatar char3d-wrap" style="background:${e.soft};border:1px solid ${e.border};"><img class="char3d" src="${heroImg(h.element, h.id, h.skin)}" alt="英雄#${h.id}"></span>
        <span class="pick-body">
          <span class="pick-title"><b>#${h.id}</b><em class="pick-tag" style="color:${e.color};">${e.name}系</em></span>
          <span class="pick-sub"><b class="text-gold">⚔${fmt(h.power,0)}</b><i class="text-muted">Lv.${h.level} 体力${h.stamina}/${h.staminaMax || STAMINA_MAX_FALLBACK}${h.staminaNext>0?' 恢复中':''}</i></span>
          <span class="pick-bar"><i style="width:${staminaPct}%;background:${staminaPct>30?'#22c55e':'#ef4444'};"></i></span>
        </span>
        <span class="pick-radio ${active?'pick-radio-on':''}">${active?'✓':''}</span>
      </button>`;
    }).join('');
  }
  S.weapons = S.weapons.length ? S.weapons : await fetchWeapons();
  const wsel = $('#fightWeaponSel');
  const wbar = $('#fightWeaponFilterBar');
  if(wbar){
    if(S.weapons.length){ wbar.classList.remove('hidden'); wbar.innerHTML = weaponMiniFilterHTML(S.fightW, 'fight'); }
    else wbar.classList.add('hidden');
  }
  const wlist = applyWeaponFilter(S.weapons, S.fightW);
  const wc = $('#fightWeaponCount'); if(wc) wc.textContent = `共 ${wlist.length} / ${S.weapons.length} 把`;
  if(!wlist.length){
    wsel.innerHTML = '<div class="text-center py-4 w-full"><i class="fa-solid fa-khanda text-2xl opacity-30 mb-1 block"></i><div class="text-muted text-[12px]">该分类下暂无武器</div></div>';
    if(!S.weapons.length) S.fight.weaponId=null;
  } else {
    if(!S.fight.weaponId || !wlist.find(w=>w.id===S.fight.weaponId)) S.fight.weaponId = wlist[0].id;
    wsel.innerHTML = wlist.map(w=>{
      const active = S.fight.weaponId===w.id;
      const e = ELEMENTS[w.element]||ELEMENTS[0];
      const stars = '★'.repeat(w.stars)+'☆'.repeat(5-w.stars);
      return `<button onclick="selectFightWeapon(${w.id}, this)" class="pick-chip ${active?'pick-active':''}" style="${active?`border-color:${e.border};background:${e.soft};`:''}">
        <span class="pick-avatar char3d-wrap" style="background:${e.soft};border:1px solid ${e.border};"><img src="${weaponImg(w.element,w.stars)}" alt="武器#${w.id}" class="w-full h-full object-cover rounded-lg"></span>
        <span class="pick-body">
          <span class="pick-title"><b>#${w.id}</b><em class="pick-tag" style="color:${e.color};">${e.name}系</em></span>
          <span class="pick-sub"><b class="text-gold">${stars}</b></span>
          <span class="pick-sub"><i class="text-green-400">加成 +${bpToPct(w.bonusBp)}</i><i class="text-gold ml-2">奖励 +${rewardBonusOf(w.stars, w.bonusBp)}%</i></span>
        </span>
        <span class="pick-radio ${active?'pick-radio-on':''}">${active?'✓':''}</span>
      </button>`;
    }).join('');
  }
  if(S.fight.monsterId===null && S.monsters.length) S.fight.monsterId = S.monsters[0].id;
  // 为每个怪物随机生成五行属性（每次进入战斗页面都随机刷新）
  if(!S.monsterRandomElements || S.monsterRandomElements.length !== S.monsters.length){
    S.monsterRandomElements = S.monsters.map(() => Math.floor(Math.random() * 5));
  }
  const mg = $('#monsterGrid');
  mg.innerHTML = S.monsters.map((m, idx)=>{
    const active = S.fight.monsterId===m.id;
    // 用随机生成的五行属性显示
    const randomEl = S.monsterRandomElements[idx];
    const e = ELEMENTS[randomEl]||ELEMENTS[0];
    const icon = monsterIcons[m.id % monsterIcons.length] || '👾';
    const difficulty = m.power < 500 ? {label:'简单',color:'#22c55e'} : m.power < 2000 ? {label:'普通',color:'#eab308'} : m.power < 8000 ? {label:'困难',color:'#f97316'} : {label:'噩梦',color:'#ef4444'};
    return `<button onclick="selectMonster(${m.id}, this)" class="pick-chip monster-chip ${active?'pick-active':''}" style="${active?`border-color:${e.border};background:${e.soft};`:''}">
      <span class="pick-avatar char3d-wrap" style="background:${e.soft};border:1px solid ${e.border};"><img class="char3d" src="${monImg(m.id)}" alt="${m.name}"></span>
      <span class="pick-body">
        <span class="pick-title"><b style="${active?`color:${e.color};`:''}">${m.name}</b><em class="pick-tag" style="color:${difficulty.color};">${difficulty.label}</em></span>
        <span class="pick-sub"><b class="text-red-400">⚔${fmt(m.power,0)}</b><i class="text-gold" title="胜利基础奖励（USDT，按英雄星级/等级加成后更高，存入金库待领取）">💰${fmt(m.reward*0.01,2)} USDT</i></span>
      </span>
      <span class="pick-radio ${active?'pick-radio-on':''}">${active?'✓':''}</span>
    </button>`;
  }).join('');
  autoPreviewFight();
}
function selectFightHero(id, el){ 
  S.fight.heroId = id; 
  // 完整更新英雄选中状态和预览
  const hero = S.heroes.find(x=>x.id===id);
  const e = hero ? (ELEMENTS[hero.element]||ELEMENTS[0]) : ELEMENTS[0];
  document.querySelectorAll('#fightHeroSel .pick-chip').forEach(chip=>{
    chip.classList.remove('pick-active');
    chip.style.borderColor = '';
    chip.style.background = '';
    const radio = chip.querySelector('.pick-radio');
    if(radio){ radio.classList.remove('pick-radio-on'); radio.textContent=''; }
  });
  if(el){
    el.classList.add('pick-active');
    el.style.borderColor = e.border;
    el.style.background = e.soft;
    const radio = el.querySelector('.pick-radio');
    if(radio){ radio.classList.add('pick-radio-on'); radio.textContent='✓'; }
  }
  autoPreviewFight();
}
function selectFightWeapon(id, el){ 
  S.fight.weaponId = id; 
  // 完整更新武器选中状态和预览
  const wpn = S.weapons.find(x=>x.id===id);
  const e = wpn ? (ELEMENTS[wpn.element]||ELEMENTS[0]) : ELEMENTS[0];
  document.querySelectorAll('#fightWeaponSel .pick-chip').forEach(chip=>{
    chip.classList.remove('pick-active');
    chip.style.borderColor = '';
    chip.style.background = '';
    const radio = chip.querySelector('.pick-radio');
    if(radio){ radio.classList.remove('pick-radio-on'); radio.textContent=''; }
  });
  if(el){
    el.classList.add('pick-active');
    el.style.borderColor = e.border;
    el.style.background = e.soft;
    const radio = el.querySelector('.pick-radio');
    if(radio){ radio.classList.add('pick-radio-on'); radio.textContent='✓'; }
  }
  autoPreviewFight();
}
function selectMonster(id, el){ 
  S.fight.monsterId = id; 
  // 完整更新怪物选中状态和预览
  const monIdx = S.monsters.findIndex(x=>x.id===id);
  const randomEl = (S.monsterRandomElements && S.monsterRandomElements[monIdx] !== undefined) 
    ? S.monsterRandomElements[monIdx] 
    : 0;
  const e = ELEMENTS[randomEl]||ELEMENTS[0];
  document.querySelectorAll('#monsterGrid .monster-chip').forEach(chip=>{
    chip.classList.remove('pick-active');
    chip.style.borderColor = '';
    chip.style.background = '';
    const radio = chip.querySelector('.pick-radio');
    if(radio){ radio.classList.remove('pick-radio-on'); radio.textContent=''; }
  });
  if(el){
    el.classList.add('pick-active');
    el.style.borderColor = e.border;
    el.style.background = e.soft;
    const radio = el.querySelector('.pick-radio');
    if(radio){ radio.classList.add('pick-radio-on'); radio.textContent='✓'; }
  }
  autoPreviewFight();
}
// 重新刷新怪物五行属性（战斗后或切换英雄后调用）
function refreshMonsterElements(){
  S.monsterRandomElements = S.monsters.map(() => Math.floor(Math.random() * 5));
  renderFight();
}
function refreshFight(){ renderFight(); }
async function autoPreviewFight(){
  const h = S.fight.heroId, w = S.fight.weaponId, m = S.fight.monsterId;
  const box = $('#previewBody');
  const btns = [...document.querySelectorAll('#fightBtn,#fightBtnBar')];
  const hint = $('#fightHint');
  const barWin = $('#fightBarWin');
  const barSum = $('#fightBarSummary');
  const missTxt = !h ? '请先选择英雄' : !w ? '请先选择武器' : '请选择怪物';
  if(!h || !w || m===null){
    btns.forEach(b=>{ b.disabled = true; });
    if(barWin) barWin.textContent = '--';
    if(barSum) barSum.textContent = missTxt;
    if(hint) hint.textContent = missTxt;
    if(box) box.innerHTML = '<div class="text-muted text-[13px] text-center py-6"><i class="fa-solid fa-hand-pointer text-3xl mb-2 block opacity-40"></i>选择英雄、武器与怪物后自动分析</div>';
    return;
  }
  btns.forEach(b=>{ b.disabled = false; });
  if(hint) hint.textContent = '';
  if(box) box.innerHTML = '<div class="text-center py-4"><span class="spinner"></span><div class="text-[12px] text-muted mt-2">分析中…</div></div>';
  try{
    let eff, chance, basePower, monPower, heroEl, wEl, monEl, heroLv, elMult;
    // 获取选中怪物的随机五行属性
    const monIdx = S.monsters.findIndex(x=>x.id===m);
    const randomMonsterElement = (S.monsterRandomElements && S.monsterRandomElements[monIdx] !== undefined) 
      ? S.monsterRandomElements[monIdx] 
      : 0;
    if(c.viewHelper){
      // viewHelper 不支持传 monsterElement，我们手动计算
      const r = await readCall('v3', cc=>cc.getFightPower(h, w));
      const hero = S.heroes.find(x=>x.id===h)||{};
      const wpn = S.weapons.find(x=>x.id===w)||{};
      const mon = S.monsters.find(x=>x.id===m)||{power:0,element:0};
      basePower = Number(r); monPower = mon.power; heroEl=hero.element; wEl=wpn.element; monEl=randomMonsterElement; heroLv=hero.level||1;
      /* 链上 getFightPower = 英雄战力×(1+武器加成)，若英雄与武器【同元素】还额外 ×1.1；
         但真正结算用的 _calcFight 里并没有这条同元素加成 —— 不除掉它，同元素配置下
         预览胜率会比链上高约 1.7%。反推误差 ≤1 战力（17 万量级下可忽略）。 */
      if(heroEl === wEl) basePower = Math.floor(basePower * 100 / 110);
      // 手动计算元素克制
      elMult = 10000;
      if((wEl + 1) % 5 === monEl) elMult = 13000;
      else if((monEl + 1) % 5 === wEl) elMult = 7500;
      eff = Math.floor(basePower * elMult / 10000);
      if((heroEl + 1) % 5 === monEl) eff = Math.floor(eff * 110 / 100);
      // 怪物战力随等级缩放 + 胜率：统一走 utils 的共享函数（口径与链上 _doFight/_calcFight 一致）
      monPower = scaledMonsterPower(mon.power, heroLv);
      chance = winChanceBp(eff, monPower);
    } else {
      const power = await readCall('v3', cc=>cc.getFightPower(h, w));
      const mon = S.monsters.find(x=>x.id===m) || {power:0, element:0};
      const charsCt = new ethers.Contract(addrOf('characters'), ABIs.characters, getReadProvider());
      const hero = await charsCt.heroes(h);
      heroLv = Number(hero.level); heroEl = Number(hero.element);
      const weaponsCt = new ethers.Contract(addrOf('weapons'), ABIs.weapons, getReadProvider());
      const wpn = await weaponsCt.weapons(w);
      wEl = Number(wpn.element); monEl = randomMonsterElement;  // 用随机五行属性
      monPower = scaledMonsterPower(mon.power, heroLv);
      elMult = 10000;
      if((wEl + 1) % 5 === monEl) elMult = 13000;
      else if((monEl + 1) % 5 === wEl) elMult = 7500;
      /* 同元素加成只存在于 getFightPower（面板口径），链上结算 _calcFight 里没有 → 除掉 */
      const rawPower = (heroEl === wEl) ? Math.floor(Number(power) * 100 / 110) : Number(power);
      eff = Math.floor(rawPower * elMult / 10000);
      if((heroEl + 1) % 5 === monEl) eff = Math.floor(eff * 110 / 100);
      basePower = rawPower;
      chance = winChanceBp(eff, monPower);
    }
    const heroData = S.heroes.find(x=>x.id===h)||{element:heroEl||0,level:heroLv||1};
    const wpnData = S.weapons.find(x=>x.id===w)||{element:wEl||0,stars:1};
    const monData = S.monsters.find(x=>x.id===m)||{name:'怪物',element:monEl||0,power:monPower};
    // 覆盖 monData.element 为随机五行属性
    monData.element = monEl;
    const he = ELEMENTS[heroData.element]||{icon:'❓',name:'?',color:'#94a3b8',soft:'rgba(148,163,184,.1)'};
    const we = ELEMENTS[wpnData.element]||{icon:'❓',name:'?',color:'#94a3b8'};
    const me = ELEMENTS[monData.element]||{icon:'❓',name:'?',color:'#94a3b8',soft:'rgba(148,163,184,.1)'};
    const totalPower = eff + monPower;
    const heroPct = totalPower>0 ? Math.round(eff/totalPower*100) : 50;
    const monPct = 100 - heroPct;
    const chancePct = (chance/100).toFixed(1);
    const chanceColor = chance >= 7000 ? '#22c55e' : chance >= 4000 ? '#eab308' : '#ef4444';
    const elAdvantage = elMult > 10000 ? '克制' : elMult < 10000 ? '被克制' : '中性';
    const elAdvColor = elMult > 10000 ? '#22c55e' : elMult < 10000 ? '#ef4444' : '#8b92a5';
    /* 预计奖励（与链上 _calcReward 同口径） */
    let estReward = null, estDec = S.tokenDecimals, estSym = S.tokenSymbol||TOKEN_SYMBOL;
    try{
      const monTier = Math.floor(heroLv / 10);
      const monMult = 100 + 15 * monTier;
      const starBonus = (wpnData.stars||1)<=2 ? 10000 : (10000 + Math.floor((wpnData.bonusBp||0) / 4));
      const lvT = Math.min(5, Math.floor((heroLv||1) / 10));
      const lvBonus = 10000 + lvT * 500;
      // 奖励 = 怪物基础奖励 × 等级档位缩放(1+0.15×tier) × 武器星级乘数 × 英雄等级乘数
      // 已移除星级奖励上限(cap)：星级只做乘数、不再封顶，与链上 _calcReward 保持一致
      estReward = BigInt(monData.reward||0) * BigInt(monMult) * 10000000000000000n / 100n * BigInt(starBonus) / 10000n * BigInt(lvBonus) / 10000n;
      if(S.vaultMode === 1){ estDec = 6; estSym = 'USDT'; estReward = estReward / 1000000000000n; }
    }catch(e){ estReward = null; }
    /* 本次战斗销毁（按代币价格阶梯，转账到黑洞） */
    let burnAmt = 0n;
    try{
      if(S.signer){
        const burn = await mustC('v3').getFightBurnAmount().catch(()=>0n);
        burnAmt = BigInt(burn) || 0n;
      }
    }catch(e){}
    const burnLine = burnAmt > 0n
      ? `<div class="bg-[#0d1526]/60 rounded-lg px-2 py-1.5 col-span-2"><span class="text-muted">本次战斗销毁（转账黑洞）</span><div class="font-bold text-red-400 num-mono">🔥 ${fmtUnits(burnAmt, S.tokenDecimals, 0)} ${S.tokenSymbol||TOKEN_SYMBOL}</div></div>`
      : '';
    if(barWin) barWin.textContent = chancePct + '%';
    if(barSum) barSum.textContent = `英雄 #${h} vs ${monData.name} · 战力 ${fmt(eff,0)} VS ${fmt(monPower,0)}`;
    if(box) box.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex-1 text-center">
            <div class="w-14 h-14 mx-auto rounded-2xl overflow-hidden mb-1" style="background:${he.soft};border:2px solid ${he.color}44;"><img src="${heroImg(heroData.element, heroData.id, heroData.skin)}" alt="英雄#${h}" class="w-full h-full object-cover"></div>
            <div class="font-black text-[13px]" style="color:${he.color};">英雄 #${h}</div>
            <div class="text-[10px] text-muted">${he.name}系 · Lv.${heroData.level}</div>
            <div class="w-10 h-10 mx-auto rounded-xl overflow-hidden mb-0.5" style="background:${we.soft};border:1px solid ${we.border}55;"><img src="${weaponImg(wpnData.element, wpnData.stars)}" alt="武器#${w}" class="w-full h-full object-cover"></div>
            <div class="text-[10px] text-muted">🗡️ #${w} · ${'★'.repeat(wpnData.stars||1)}</div>
          </div>
          <div class="flex flex-col items-center px-1">
            <div class="text-2xl font-black text-gold mb-1">VS</div>
            <div class="text-[9px] px-2 py-0.5 rounded-full" style="background:${elAdvColor}22;color:${elAdvColor};">元素${elAdvantage}</div>
          </div>
          <div class="flex-1 text-center">
            <div class="w-14 h-14 mx-auto rounded-2xl overflow-hidden mb-1" style="background:${me.soft};border:2px solid ${me.color}44;"><img src="${monImg(monData.id)}" alt="${monData.name}" class="w-full h-full object-cover"></div>
            <div class="font-black text-[13px]" style="color:${me.color};">${monData.name}</div>
            <div class="text-[10px] text-muted">${me.name}系</div>
            <div class="text-[10px] text-muted mt-0.5">Tier ${Math.floor(heroLv/10)}</div>
          </div>
        </div>
        <div class="flex items-center gap-2 text-[11px] mb-1">
          <span class="text-gold font-bold num-mono flex-1 text-right">${fmt(eff,0)}</span>
          <span class="text-muted text-[9px]">战力对比</span>
          <span class="text-red-400 font-bold num-mono flex-1">${fmt(monPower,0)}</span>
        </div>
        <div class="h-3 rounded-full bg-[#1a2740] overflow-hidden flex">
          <div class="h-full transition-all duration-500" style="width:${heroPct}%;background:linear-gradient(90deg,${he.color},${he.color}cc);"></div>
          <div class="h-full transition-all duration-500" style="width:${monPct}%;background:linear-gradient(90deg,${me.color}cc,${me.color});"></div>
        </div>
        <div class="bg-[#0d1526] rounded-xl p-3 text-center">
          <div class="text-[10px] text-muted mb-1">预估胜率</div>
          <div class="text-3xl font-black num-mono" style="color:${chanceColor};">${chancePct}%</div>
          <div class="mt-2 h-2 rounded-full bg-[#1a2740] overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500" style="width:${chancePct}%;background:${chanceColor};"></div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div class="bg-[#0d1526]/60 rounded-lg px-2 py-1.5"><span class="text-muted">基础战力</span><div class="font-bold text-gold num-mono">${fmt(basePower,0)}</div></div>
          <div class="bg-[#0d1526]/60 rounded-lg px-2 py-1.5"><span class="text-muted">元素加成</span><div class="font-bold num-mono" style="color:${elAdvColor};">${(elMult/100).toFixed(0)}%</div></div>
          <div class="bg-[#0d1526]/60 rounded-lg px-2 py-1.5 col-span-2"><span class="text-muted">预计奖励（胜利时）</span><div class="font-bold text-gold num-mono">${estReward===null?'--':'+ '+fmtUnits(estReward, estDec, 2)+' '+estSym}</div></div>
          ${burnLine}
        </div>
      </div>`;
  }catch(e){
    if(box) box.innerHTML = '<div class="text-center py-4 text-red-400 text-[12px]"><i class="fa-solid fa-triangle-exclamation mb-1 block"></i>预览失败：'+escapeHtml(errMsg(e))+'</div>';
    if(barWin) barWin.textContent = '--';
    if(barSum) barSum.textContent = '预览失败';
  }
}
function previewFight(){ autoPreviewFight(); }
async function fightFlow(){
  if(!S.fight.heroId || S.fight.monsterId===null){ toast('请选择英雄与怪物','warn'); return; }
  if(!S.fight.weaponId){ toast('请先持有一把武器','warn'); return; }
  if(!needWallet()) return;
  const { heroId, weaponId, monsterId } = S.fight;
  const btns = [...document.querySelectorAll('#fightBtn,#fightBtnBar')];
  try{
    btns.forEach(b=>{ b.disabled = true; });
    withBusy('fightBtn', true, '战斗中…');
    
    // 单次交易直接战斗（调用 v3.fightOnce）
    const eh = mustC('v3').connect(S.signer);
    
    // 战斗销毁：按代币价格阶梯转账到黑洞（需玩家授权，首次自动引导一次性大额授权）
    let burnAmt = 0n;
    try{ burnAmt = BigInt(await eh.getFightBurnAmount()) || 0n; }catch(e){}
    if(burnAmt > 0n){
      const tk = mustC('gameToken').connect(S.signer);
      const al = await tk.allowance(S.account, CONTRACTS.v3).catch(()=>0n);
      if(al < burnAmt){
        toast(`首次战斗需授权 ${S.tokenSymbol||TOKEN_SYMBOL}（用于战斗销毁）`,'info');
        await ensureTokenAllowance(CONTRACTS.v3, ethers.MaxUint256);
      }
      const bal = await tk.balanceOf(S.account).catch(()=>0n);
      if(bal === 0n){
        toast(`钱包无 ${S.tokenSymbol||TOKEN_SYMBOL}，本次销毁 0 枚，奖励到账后自动生效`,'warn');
      } else if(bal < burnAmt){
        toast(`代币余额不足 ${fmtUnits(burnAmt,18,0)} 枚，本次将销毁全部余额 ${fmtUnits(bal,18,2)} 枚`,'warn');
      }
    }
    
    // 获取选中怪物的随机五行属性
    const monsterIdx = S.monsters.findIndex(m=>m.id===monsterId);
    const monsterElement = S.monsterRandomElements && S.monsterRandomElements[monsterIdx] !== undefined 
      ? S.monsterRandomElements[monsterIdx] 
      : Math.floor(Math.random() * 5);
    const tx = await sendRevealTx(eh, 'fightOnce', [heroId, weaponId, monsterId, monsterElement]);
    toast('战斗中…','info');
    const rec = await tx.wait();
    
    // 提取战斗结果
    const rec3 = extractFightResult(rec);
    if(rec3){
      await playBattleAnimation(rec3);
      toast('战斗完成','success');
    } else {
      toast('战斗完成','success');
    }
  }catch(e){ toast(errMsg(e),'error'); }
  finally{
    withBusy('fightBtn', false);
    btns.forEach(b=>{ b.disabled = false; });
    try{ 
      // 战斗完成后，重新刷新怪物五行属性
      refreshMonsterElements();
    }catch(e){}
  }
}

async function parseFightResult(rec, p){
  const rec2 = extractFightResult(rec);
  if(rec2){ await playBattleAnimation(rec2); return; }
  openModal({html:`
    <div class="text-center py-6">
      <div class="text-4xl mb-3">⚔️</div>
      <div class="text-lg font-bold mb-2">战斗已完成</div>
      <div class="text-[13px] text-muted mb-4">战斗结果已上链，可在战斗记录中查看详情。</div>
      <button onclick="closeModal()" class="btn btn-gold w-full">确定</button>
    </div>`});
  await refreshHeroes();
}
function extractFightResult(rec){
  const iface = new ethers.Interface(ABIs.v3);
  let ev = null;
  for(const log of rec.logs){
    try{ const d = iface.parseLog(log); if(d && d.name==='FightResult'){ ev = d.args; break; } }catch(e){}
  }
  if(!ev) return null;
  const rec2 = { ts:Date.now(), heroId:Number(ev.heroId), monsterId:Number(ev.monsterId), win:ev.win,
    reward: ev.reward.toString(), xp:Number(ev.xpGained),
    effPower:Number(ev.eff), winChanceBp:Number(ev.chance), roll:Number(ev.roll) };
  S.battleRecords.unshift(rec2); if(S.battleRecords.length>20)S.battleRecords.length=20;
  try{ localStorage.setItem('eh_battles', JSON.stringify(S.battleRecords)); }catch(e){}
  return rec2;
}

/* ============ 战斗动画舞台（12秒回合制互殴） ============ */
async function playBattleAnimation(rec2){
  if(!rec2){ return; }
  const m = S.monsters.find(x=>x.id===rec2.monsterId) || {name:'怪物', element:0, power:0};
  const hero = S.heroes.find(x=>x.id===rec2.heroId) || {element:0, level:1, power:rec2.effPower||100};
  const he = ELEMENTS[hero.element]||ELEMENTS[0];
  const me = ELEMENTS[m.element]||ELEMENTS[0];
  const monsterIcons = ['👹','👺','👻','💀','🐉','🦇','🕷️','🐍','🦂','🐺'];
  const icon = monsterIcons[rec2.monsterId % monsterIcons.length] || '👾';
  const win = !!rec2.win;
  const hpHero = Math.max(Math.round((hero.power||rec2.effPower||100)/10), 8);
  const hpMon  = Math.max(Math.round((m.power||100)/10), 8);
  const heroSkills = ['🗡️ 飞剑','💥 '+he.name+'冲击','🌪️ 旋风斩','✨ 星光弹'];
  const monSkills  = ['👹 魔焰','🦷 尖牙撕咬','💀 骨刺','🌋 熔岩弹'];

  const stage = document.createElement('div');
  stage.id='battleStage';
  stage.innerHTML = `
    <div class="battle-box">
      <div class="battle-top">
        <div class="battle-hp-card">
          <div class="bch-head"><span class="bch-emoji" style="color:${he.color};">${he.icon}</span><span class="bch-name">英雄 #${rec2.heroId}</span><span class="bch-hpnum">HP <b id="bhpNumHero">${hpHero}</b>/${hpHero}</span></div>
          <div class="battle-hp hero"><i id="bhpHero"></i></div>
        </div>
        <div class="battle-vs">VS</div>
        <div class="battle-hp-card hc-mon">
          <div class="bch-head"><span class="bch-emoji">${icon}</span><span class="bch-name">${m.name}</span><span class="bch-hpnum">HP <b id="bhpNumMon">${hpMon}</b>/${hpMon}</span></div>
          <div class="battle-hp mon"><i id="bhpMon"></i></div>
        </div>
      </div>
      <div class="battle-ground">
        <div class="battle-fighter battle-hero" id="bfHero" style="border-color:${he.border};background:radial-gradient(circle at 50% 35%, ${he.soft}, transparent 75%);">
          <div class="battle-fighter-emoji"><img src="${heroImg(hero.element, rec2.heroId, hero.skin)}" alt="英雄#${rec2.heroId}"></div>
          <div class="battle-fighter-name">英雄 #${rec2.heroId}</div>
        </div>
        <div class="battle-fighter battle-monster" id="bfMon" style="border-color:${me.border};background:radial-gradient(circle at 50% 35%, ${me.soft}, transparent 75%);">
          <div class="battle-fighter-emoji"><img src="${monImg(rec2.monsterId)}" alt="${m.name}"></div>
          <div class="battle-fighter-name">${m.name}</div>
        </div>
      </div>
      <div class="battle-log" id="battleLog"></div>
      <div class="battle-result ${win?'battle-win':'battle-lose'}">
        <div class="battle-banner">${win?'🎉 胜利！':'💀 战败…'}</div>
        <div class="battle-stats">
          <span>战力 <b>${fmt(rec2.effPower,0)}</b></span>
          <span>胜率 <b>${(rec2.winChanceBp/100).toFixed(1)}%</b></span>
          <span>判定 <b>${rec2.roll}/100</b></span>
        </div>
        ${win?`<div class="battle-reward">
          <div class="battle-reward-item gold"><i class="fa-solid fa-coins"></i>+${fmtUnits(BigInt(rec2.reward)/((S.vaultMode===1)?1000000000000n:1n), (S.vaultMode===1)?6:S.tokenDecimals, 2)} ${(S.vaultMode===1)?'USDT':(S.tokenSymbol||TOKEN_SYMBOL)}</div>
          </div>
          <div class="battle-reward-note"><i class="fa-solid fa-vault mr-1"></i>奖励已存入金库，可前往「金库」页领取</div>
          <div class="battle-reward-item xp"><i class="fa-solid fa-star"></i>+${rec2.xp} XP</div>
        </div>`:''}
        <button id="battleContinueBtn" onclick="closeBattleStage()" class="btn ${win?'btn-gold':'btn-ghost'} w-full text-base py-3 mt-3">${win?'继续冒险':'再战一次'}</button>
      </div>
    </div>`;
  document.body.appendChild(stage);

  // 动画期间强制锁定结果按钮（JS 层兜底，不依赖 CSS 是否生效/缓存）
  const resBtn = stage.querySelector('#battleContinueBtn');
  if(resBtn){
    resBtn.disabled = true;
    resBtn.style.pointerEvents = 'none';
    resBtn.setAttribute('aria-disabled','true');
  }

  const hEl = stage.querySelector('#bfHero');
  const mEl = stage.querySelector('#bfMon');
  const vsEl = stage.querySelector('.battle-vs');
  const hpH = stage.querySelector('#bhpHero');
  const hpM = stage.querySelector('#bhpMon');
  const hpNumH = stage.querySelector('#bhpNumHero');
  const hpNumM = stage.querySelector('#bhpNumMon');
  const logEl = stage.querySelector('#battleLog');
  const ground = stage.querySelector('.battle-ground');
  const sleep2 = ms=>new Promise(r=>setTimeout(r,ms));
  let curH = hpHero, curM = hpMon;

  const setHp = (side, val)=>{
    if(side==='hero'){ curH = Math.max(0,val); hpH.style.width = Math.max(0,curH/hpHero*100)+'%'; hpNumH.textContent = curH; }
    else { curM = Math.max(0,val); hpM.style.width = Math.max(0,curM/hpMon*100)+'%'; hpNumM.textContent = curM; }
  };
  const log = (html)=>{
    const r = document.createElement('div');
    r.className = 'battle-log-row';
    r.innerHTML = html;
    logEl.appendChild(r);
    while(logEl.children.length>3) logEl.removeChild(logEl.firstChild);
  };
  const showDmg = (side, val)=>{
    const d = document.createElement('div');
    d.className = 'battle-dmg-num';
    d.textContent = '-'+val;
    d.style.left = (side==='hero'?'20%':'72%');
    ground.appendChild(d);
    setTimeout(()=>d.remove(), 1000);
  };
  const throwProj = async (attacker)=>{
    const p = document.createElement('div');
    p.className = 'battle-projectile';
    p.textContent = attacker==='hero' ? '⚔️' : '💥';
    p.style.left = attacker==='hero' ? '15%' : '76%';
    p.style.top = '36%';
    p.style.transition = 'left .62s cubic-bezier(.3,.8,.4,1), top .62s cubic-bezier(.3,.8,.4,1), transform .62s ease';
    ground.appendChild(p);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      p.style.left = attacker==='hero' ? '74%' : '17%';
      p.style.top = '30%';
      p.style.transform = 'scale(1.3) rotate(360deg)';
    }));
    await sleep2(620);
    p.remove();
  };
  const doTurn = async (attacker, defender, dmg, fatal)=>{
    const aEl = attacker==='hero' ? hEl : mEl;
    const dEl = defender==='hero' ? hEl : mEl;
    aEl.classList.add('battle-lunge-'+(attacker==='hero'?'r':'l'));
    await sleep2(240);
    await throwProj(attacker);
    dEl.classList.add('battle-hurt');
    stage.classList.add('battle-shake');
    setTimeout(()=>{ dEl.classList.remove('battle-hurt'); stage.classList.remove('battle-shake'); }, 520);
    if(defender==='hero') setHp('hero', curH-dmg); else setHp('mon', curM-dmg);
    showDmg(defender, dmg);
    const aName = attacker==='hero' ? ('英雄 #'+rec2.heroId) : m.name;
    const dName = defender==='hero' ? ('英雄 #'+rec2.heroId) : m.name;
    const skillSet = attacker==='hero' ? heroSkills : monSkills;
    const sk = skillSet[Math.floor(Math.random()*skillSet.length)];
    const ac = attacker==='hero' ? 'text-cyan-300' : 'text-red-400';
    const dc = defender==='hero' ? 'text-cyan-300' : 'text-red-400';
    log('<b class="'+ac+'">'+aName+'</b> 投掷 '+sk+' → <b class="'+dc+'">'+dName+'</b> <span class="text-amber-300">-'+dmg+'</span>');
    aEl.classList.remove('battle-lunge-r','battle-lunge-l');
    if(fatal){
      dEl.classList.add('battle-dead');
      log('<span class="text-red-400 font-black">💀 '+dName+' 被击败了！</span>');
    }
    await sleep2(360);
  };

  /* 出场 */
  await sleep2(480);
  vsEl.classList.add('battle-vs-pop');
  await sleep2(620);

  /* 回合编排：败方 6 次削血 + 最后一击致命，胜方承受少量伤害存活 */
  const heroDmg = Math.max(1, Math.round(hpMon*0.16));
  const monDmg  = Math.max(1, Math.round(hpHero*0.08));
  if(win){
    for(let i=0;i<6;i++){
      if(i%2===0){ await doTurn('hero','mon', heroDmg, false); }
      else { await doTurn('mon','hero', monDmg, false); }
    }
    await doTurn('hero','mon', curM, true);
  } else {
    const heroFat = Math.max(1, Math.round(hpHero*0.16));
    for(let i=0;i<6;i++){
      if(i%2===0){ await doTurn('mon','hero', heroFat, false); }
      else { await doTurn('hero','mon', Math.max(1, Math.round(hpMon*0.08)), false); }
    }
    await doTurn('mon','hero', curH, true);
  }

  stage.classList.add('battle-result-show');
  await sleep2(320);
  const banner = stage.querySelector('.battle-banner');
  if(banner) banner.classList.add('battle-banner-in');
  await sleep2(300);
  stage.classList.add('battle-rewards-in');
  // 动画完全结束，解锁结果按钮
  if(resBtn){
    resBtn.disabled = false;
    resBtn.style.pointerEvents = '';
    resBtn.removeAttribute('aria-disabled');
  }
}

function closeBattleStage(){
  const s = $('battleStage'); if(s) s.remove();
  cacheInvalidate('heroes_'+(S.account||''));
  refreshHeroes(true);
  try{ renderFight(); }catch(e){}
}
