'use strict';

/* ============ 锻造 ============ */
async function renderForge(){
  try{
    const o = mustC('oracle');
    try{ const wc = await o.getWeaponCost(); $('#forgeCostTxt').textContent=fmtUnits(wc,S.tokenDecimals,2); }catch(e){}
    try{ const w10 = await o.getWeapon10Cost(); $('#forge10CostTxt').textContent=fmtUnits(w10,S.tokenDecimals,2); }catch(e){}
    try{ const w100 = await o.getWeapon100Cost(); $('#forge100CostTxt').textContent=fmtUnits(w100,S.tokenDecimals,2); }catch(e){}
  }catch(e){}
}
async function forgeFlow(count){
  if(!needWallet()) return;
  try{
    const fs = mustC('forgeShop');
    let cfg;
    if(count===1){
      cfg = { cost: await readCall('oracle', c=>c.getWeaponCost()), busyId:'forge1Btn',
              commit: h=>fs.commitForgeWeapon(h), staticCall: h=>fs.commitForgeWeapon.staticCall(h) };
    } else if(count===10){
      cfg = { cost: await readCall('oracle', c=>c.getWeapon10Cost()), busyId:'forge10Btn',
              commit: h=>fs.commitForgeWeapon10(h), staticCall: h=>fs.commitForgeWeapon10.staticCall(h) };
    } else {
      cfg = { cost: await readCall('oracle', c=>c.getWeapon100Cost()), busyId:'forge100Btn',
              commit: h=>fs.commitForgeWeapon100(h), staticCall: h=>fs.commitForgeWeapon100.staticCall(h) };
    }
    const deposit = cfg.cost * 500n / 10000n;
    const buffer = cfg.cost * 10n / 100n;
    await commitReveal('forge', {
      busyId: cfg.busyId, extra:{ count },
      needToken:true, tokenTarget:addrOf('forgeShop'), tokenAmount: cfg.cost + deposit + buffer,
      staticCall: cfg.staticCall, commit: cfg.commit
    });
  }catch(e){ toast(errMsg(e),'error'); }
}
const SYNTH_FEE_ETHER = { 1:50n, 2:100n, 3:200n, 4:500n, 5:1000n };
async function synthesizeFlow(){
  if(!needWallet()) return;
  const sid = Number($('#synthStarSel').value||1);
  try{
    const bal = await readCall('shards', cc => cc.balanceOf(S.account, sid));
    if(Number(bal) < 10){ toast(`碎片 ${sid} 不足 10 个`,'warn'); return; }
    await ensure1155Approval('shards','forgeShop');
    const fee = (SYNTH_FEE_ETHER[sid] || 50n) * ethers.parseEther('1');
    await commitReveal('synthesize', {
      busyId: 'forge1Btn',
      extra:{shardId:sid, count:10},
      needToken:true, tokenTarget:addrOf('forgeShop'), tokenAmount: fee * 105n / 100n,
      staticCall: h=>mustC('forgeShop').commitSynthesize.staticCall(h, sid),
      commit: h=>mustC('forgeShop').commitSynthesize(h, sid)
    });
  }catch(e){ toast(errMsg(e),'error'); }
}
async function parseForgeResult(rec, p){
  const user = S.account ? S.account.toLowerCase() : null;
  const results=[];
  const bif = new ethers.Interface(ABIs.forgeShop);
  const wif = new ethers.Interface(ABIs.weapons);
  const sif = new ethers.Interface(ABIs.shards);
  for(const log of rec.logs){
    try{
      const d = bif.parseLog(log);
      if(d){
        if(d.name==='WeaponForged' && user && (d.args.player||'').toLowerCase()===user){
          results.push({type:'weapon', id:d.args.tokenId.toString(), stars:Number(d.args.stars), element:Number(d.args.element)});
        } else if(d.name==='ShardsDropped' && user && (d.args.player||'').toLowerCase()===user){
          results.push({type:'shard', id:Number(d.args.shardId), qty:Number(d.args.amount)});
        } else if(d.name==='ForgeMissed' && user && (d.args.player||'').toLowerCase()===user){
          results.push({type:'miss'});
        }
      }
    }catch(e){}
  }
  if(results.length===0){
    for(const log of rec.logs){
      try{
        const d = wif.parseLog(log);
        if(d && d.name==='Transfer' && d.args.from===ethers.ZeroAddress && user && (d.args.to||'').toLowerCase()===user){
          const wid = d.args.tokenId.toString();
          try{ const w = await readCall('weapons', cc=>cc.weapons(wid)); results.push({type:'weapon', id:wid, stars:Number(w.stars), element:Number(w.element)}); }
          catch(e){ results.push({type:'weapon', id:wid, stars:1, element:0}); }
        }
      }catch(e){}
      try{
        const d = sif.parseLog(log);
        if(d && d.name==='TransferSingle' && d.args.from===ethers.ZeroAddress && user && (d.args.to||'').toLowerCase()===user){
          results.push({type:'shard', id:Number(d.args.id), qty:Number(d.args.value)});
        }
      }catch(e){}
    }
  }
  const total = Number((p.extra||{}).count||1);
  for(let i=results.length;i<total;i++) results.push({type:'miss'});
  const stage = $('#forgeStage');
  if(stage){
    const limited = results.slice(0, 100);
    stage.innerHTML = limited.map(r=>{
      if(r.type==='weapon') return `<div class="flip-card w-24 h-32 flipped"><div class="flip-inner w-full h-full"><div class="flip-back absolute inset-0 rounded-xl border-2 flex flex-col items-center justify-center p-1.5" style="border-color:${ELEMENTS[r.element].color};background:linear-gradient(160deg,#1c2a44,#101a2c)"><div class="text-2xl">🗡️</div><div class="text-[11px] font-black" style="color:${ELEMENTS[r.element].color}">${'★'.repeat(r.stars)}</div></div></div></div>`;
      if(r.type==='shard') return `<div class="flip-card w-24 h-32 flipped"><div class="flip-inner w-full h-full"><div class="flip-back absolute inset-0 rounded-xl border-2 border-purple-400/60 flex flex-col items-center justify-center" style="background:linear-gradient(160deg,#251c3f,#101a2c)"><div class="text-2xl">💎</div><div class="text-[11px] font-black text-purple-300">碎片 ${r.id}×${r.qty}</div></div></div></div>`;
      return `<div class="flip-card w-24 h-32 flipped"><div class="flip-inner w-full h-full"><div class="flip-back absolute inset-0 rounded-xl border border-[#33415c] flex items-center justify-center" style="background:#0d1526"><div class="text-2xl grayscale">💨</div></div></div></div>`;
    }).join('');
  }
  await refreshWeapons(); await refreshBalances();
}
async function parseMintHeroResult(rec){
  const user = S.account ? S.account.toLowerCase() : null;
  const cif = new ethers.Interface(ABIs.characters);
  let hid = null;
  for(const log of rec.logs){
    try{ const d = cif.parseLog(log);
      if(d && d.name==='Transfer' && d.args.from===ethers.ZeroAddress && user && (d.args.to||'').toLowerCase()===user){ hid = d.args.tokenId.toString(); }
    }catch(e){}
  }
  if(hid){
    try{
      const h = await readCall('characters', cc=>cc.heroes(hid));
      const pw = await readCall('characters', cc=>cc.heroPower(hid));
      const el = Number(h.element);
      openModal({html:`
        <div class="text-center py-4">
          <div class="w-28 h-28 mx-auto rounded-2xl overflow-hidden border-2 anim-pop flex items-center justify-center text-5xl" style="border-color:${ELEMENTS[el].border};background:radial-gradient(circle at 50% 35%, ${ELEMENTS[el].soft}, #0d1526 75%)">${ELEMENTS[el].icon}</div>
          <div class="text-2xl font-black mt-3">${ELEMENTS[el].icon} ${ELEMENTS[el].name}系英雄 #${hid}</div>
          <div class="text-muted text-[13px] mt-1">${elBadge(el)} 战力 ${fmt(Number(pw),0)} · Lv.${h.level}</div>
          <button onclick="closeModal();switchTab('heroes')" class="btn btn-gold w-full mt-4">查看我的英雄</button>
        </div>`});
    }catch(e){}
  } else { toast('英雄召唤成功','success'); }
  await refreshHeroes(); await refreshBalances();
}
async function parseSynthResult(rec){
  const iface = new ethers.Interface(ABIs.forgeShop);
  let wid = null;
  for(const log of rec.logs){
    try{ const d = iface.parseLog(log); if(d && d.name==='WeaponSynthesized'){ wid = String(d.args.tokenId); break; } }catch(e){}
  }
  if(wid){
    try{
      const w = await readCall('weapons', c=>c.weapons(wid));
      const el = Number(w.element), stars = Number(w.stars), bonus = Number(w.bonusBp);
      openModal({html:`
        <div class="text-center py-3">
          <div class="w-24 h-24 mx-auto rounded-xl flex items-center justify-center text-4xl anim-flip" style="border:2px solid ${ELEMENTS[el].border};background:radial-gradient(circle at 50% 35%, ${ELEMENTS[el].soft}, #0d1526 75%)">🗡️</div>
          <div class="text-xl font-black mt-3">武器 #${wid}</div>
          <div class="mt-1">${'★'.repeat(stars)} <span class="text-gold font-bold">${stars}星</span> ${elBadge(el)}</div>
          <div class="text-[12px] text-green-400 mt-1">强化加成 +${bpToPct(bonus)}</div>
          <button onclick="closeModal();switchTab('weapons')" class="btn btn-gold w-full mt-4">查看武器</button>
        </div>`});
    }catch(e){ toast('合成完成','success'); }
  } else { toast('合成完成','success'); }
  await refreshWeapons(); await refreshBalances();
}
async function parseEnhanceResult(rec){
  const iface = new ethers.Interface(ABIs.enhanceShop);
  for(const log of rec.logs){
    try{ const d = iface.parseLog(log); if(d && d.name==='WeaponEnhanced'){
      floatText('+'+bpToPct(d.args.bonusBpAdded),'text-green-400');
      toast(`武器 #${d.args.weaponId} 强化成功，+${bpToPct(d.args.bonusBpAdded)}（当前 +${bpToPct(d.args.newBonusBp)}）`,'success');
      break;
    }}catch(e){}
  }
  await refreshWeapons(); await refreshBalances();
}

/* ============ 熔炼 ============ */
async function renderMelt(){
  await refreshBalances();
  const grid = $('#meltWeaponGrid'); if(!grid) return;
  grid.innerHTML = skeletonBlock(4, 'h-32');
  if(!S.account){ grid.innerHTML = '<div class="col-span-full text-center text-muted py-8">连接钱包后显示可熔炼武器</div>'; return; }
  S.weapons = await fetchWeapons();
  renderMeltGrid();
}
function renderMeltGrid(){
  const grid = $('#meltWeaponGrid'); if(!grid) return;
  if(!S.weapons.length){ grid.innerHTML = '<div class="col-span-full text-center text-muted py-8">暂无武器可熔炼</div>'; $('#meltSelCount').textContent='0'; return; }
  grid.innerHTML = S.weapons.map(w=>{
    const sel = S.meltSel.has(w.id);
    return `<div class="game-card p-3 cursor-pointer anim-fade ${sel?'ring-2 ring-red-400/70':''}" onclick="toggleMeltSel(${w.id})">
      <div class="flex items-center justify-between mb-2">
        <div class="font-bold text-[14px]">武器 #${w.id} ${elBadge(w.element)}</div>
        <div class="w-5 h-5 rounded-md border-2 ${sel?'bg-red-500 border-red-400':'border-[#33415c]'} flex items-center justify-center text-[11px] text-white">${sel?'✓':''}</div>
      </div>
      <div class="text-[12px] text-muted">${'★'.repeat(w.stars)}${'☆'.repeat(5-w.stars)} · 加成 +${bpToPct(w.bonusBp)}</div>
    </div>`;
  }).join('');
  $('#meltSelCount').textContent = S.meltSel.size;
}
function toggleMeltSel(id){ if(S.meltSel.has(id)) S.meltSel.delete(id); else S.meltSel.add(id); renderMeltGrid(); }
function meltSelectFromWeapon(id){ switchTab('melt'); setTimeout(()=>{ S.meltSel.clear(); S.meltSel.add(id); renderMelt(); },60); }
async function meltFlow(){
  if(!S.meltSel.size){ toast('请先勾选武器','warn'); return; }
  if(!needWallet()) return;
  const ids = [...S.meltSel];
  try{
    withBusy('meltBtn', true, '熔炼中…');
    const fs = mustC('forgeShop').connect(S.signer);
    const tx = ids.length===1 ? await fs.meltWeapon(ids[0]) : await fs.meltWeapons(ids);
    await tx.wait();
    S.meltSel.clear();
    toast('熔炼完成','success');
  }catch(e){ toast(errMsg(e),'error'); }
  finally{ withBusy('meltBtn', false); await refreshBalances(); await renderMelt(); await renderWeapons(); }
}

/* ============ 合成 ============ */
async function renderCompose(){
  await refreshBalances();
  const sel = $('#composeLowSel'); if(!sel) return;
  sel.innerHTML = [1,2,3].map(i=>`<option value="${i}">精粹 ${i} 阶（持有 ${S.essenceBal[i]||0}）→ 精粹 ${i+1} 阶</option>`).join('');
  syncCompose();
}
function syncCompose(){
  const low = Number($('#composeLowSel').value||1);
  const high = low+1;
  const times = Math.max(1, Number($('#composeTimesInp').value||1));
  const feeEth = low===1?20n : low===2?100n : 500n;
  const fee = feeEth * BigInt(times);
  $('#composeHighShow').innerHTML = `<span>精粹 ${high} 阶</span><span class="ml-auto">${ELEMENTS[Math.min(4,high)].icon}</span>`;
  const bal = S.essenceBal[low]||0;
  $('#composeNeedTxt').innerHTML = `当前持有精粹 ${low} 阶 <b class="text-gold">${bal}</b> 个，本次消耗 <b class="text-gold">${times*50}</b> 个，可合成 <b class="text-gold">${Math.floor(bal/50)}</b> 个精粹 ${high} 阶。手续费 <b class="text-gold">${fmt(feeEth,0)} GAME/次</b>（共 ${fmt(fee,0)}）。`;
}
const COMPOSE_FEE_ETHER = { 1:20n, 2:100n, 3:500n };
async function composeFlow(){
  const low = Number($('#composeLowSel').value||1);
  const times = Math.max(1, Number($('#composeTimesInp').value||1));
  if(!needWallet()) return;
  try{
    withBusy('composeBtn', true, '合成中…');
    const shopKey = low<=2 ? 'forgeShop' : 'enhanceShop';
    const fee = (COMPOSE_FEE_ETHER[low] || 20n) * ethers.parseEther('1') * BigInt(times);
    await ensureTokenAllowance(addrOf(shopKey), fee);
    const tx = await mustC(shopKey).connect(S.signer).composeEssence(low, times);
    await tx.wait();
    toast('合成成功','success');
  }catch(e){ toast(errMsg(e),'error'); }
  finally{ withBusy('composeBtn', false); await refreshBalances(); await renderCompose(); }
}
