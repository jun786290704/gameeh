'use strict';

/* ============ 金库 ============ */
async function refreshVault(){
  const tag = $('#vaultModeTag');
  if(!S.account){ $('#vaultReward').textContent='--'; if(tag) tag.textContent='--'; return; }
  try{
    const vault = mustC('vault');
    const mode = Number(await vault.rewardMode());
    S.vaultMode = mode;
    if(tag) tag.textContent = mode===0 ? (S.tokenSymbol+' 模式') : 'USDT 模式';
    const r = await vault.getPendingReward(S.account);
    let dec = S.tokenDecimals, sym = S.tokenSymbol;
    if(mode===1){
      try{
        const usdtAddr = await vault.usdt();
        const erc20 = new ethers.Contract(usdtAddr, ["function decimals() view returns (uint8)","function symbol() view returns (string)"], (S.signer||getReadProvider()));
        dec = Number(await erc20.decimals());
        sym = await erc20.symbol();
      }catch(e){ sym='USDT'; dec=18; }
    }
    $('#vaultReward').textContent = fmtUnits(r, dec, 2) + ' ' + sym;
  }catch(e){ $('#vaultReward').textContent = '--'; }
}
async function claimVault(){
  if(!needWallet()) return;
  try{
    withBusy('claimBtn', true, '领取中…');
    await (await mustC('vault').connect(S.signer).claim()).wait();
    toast('领取成功','success');
    await refreshVault(); await refreshBalances(); await loadTokenInfo();
  }catch(e){ toast(errMsg(e),'error'); }
  finally{ withBusy('claimBtn', false); }
}

/* ============ 排行榜 ============ */
async function loadLeaderboard(){
  const tbody = $('#rankBody'); if(!tbody) return;
  const pager = $('#rankPager');
  tbody.innerHTML = `<tr><td colspan="6" class="py-8"><div class="skeleton h-8 max-w-md mx-auto"></div></td></tr>`;
  try{
    let rows = [];
    if(c.viewHelper){
      const r = await readCall('viewHelper', cc=>cc.getLeaderboard(addrOf('v3'), S.rankPage*S.rankSize, S.rankSize));
      rows = (r.addrs||[]).map((a,i)=>({addr:a, wins:Number(r.wins[i]), fights:Number(r.fights[i]), powers:Number(r.powers[i])}));
    } else {
      const v3 = mustC('v3');
      const n = Number(await v3.playerCount());
      const start = S.rankPage * S.rankSize;
      const end = Math.min(n, start + S.rankSize);
      for(let i=start; i<end; i++){
        try{
          const a = await v3.playerList(i);
          const st = await v3.stats(a);
          rows.push({addr:a, wins:Number(st.wins), fights:Number(st.fights), powers:Number(st.totalPower)});
        }catch(e){}
      }
    }
    if(!rows.length){ tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-muted">暂无数据</td></tr>`; }
    else {
      tbody.innerHTML = rows.map((r,i)=>{
        const me = S.account && String(r.addr).toLowerCase()===S.account.toLowerCase();
        const winRate = r.fights>0 ? Math.round((r.wins/r.fights)*100) : 0;
        return `<tr class="border-t border-[#1c2740] ${me?'bg-[#fbbf24]/10':''}">
          <td class="px-3 py-2.5 num-mono">${S.rankPage*S.rankSize+i+1}</td>
          <td class="px-3 py-2.5">${shortAddr(r.addr)}${me?' <span class="badge bg-[#fbbf24]/20 text-gold">我</span>':''}</td>
          <td class="px-3 py-2.5 text-right text-green-400 num-mono">${r.wins}</td>
          <td class="px-3 py-2.5 text-right num-mono">${r.fights}</td>
          <td class="px-3 py-2.5 text-right num-mono">${winRate}%</td>
          <td class="px-3 py-2.5 text-right text-gold num-mono">${fmt(r.powers,0)}</td>
        </tr>`;
      }).join('');
    }
    pager.innerHTML = `<button onclick="rankPage(-1)" class="btn btn-sm btn-ghost" ${S.rankPage<=0?'disabled':''}>上一页</button>
      <span class="text-[13px] text-muted num-mono">第 ${S.rankPage+1} 页</span>
      <button onclick="rankPage(1)" class="btn btn-sm btn-ghost" ${rows.length<S.rankSize?'disabled':''}>下一页</button>`;
  }catch(e){ tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-red-400">读取失败：${errMsg(e)}</td></tr>`; }
}
function rankPage(d){ S.rankPage = Math.max(0, S.rankPage + d); loadLeaderboard(); }
async function loadBattleRecords(){
  const box = $('#battleLog'); if(!box) return;
  try{
    S.battleRecords = JSON.parse(localStorage.getItem('eh_battles')||'[]');
  }catch(e){ S.battleRecords=[]; }
  if(!S.battleRecords.length){ box.innerHTML = '<div class="text-center text-muted py-8 text-[13px]">暂无战斗记录</div>'; return; }
  box.innerHTML = S.battleRecords.slice(0,20).map(r=>{
    const m = S.monsters.find(x=>x.id===r.monsterId) || {name:'怪物', element:0};
    return `<div class="flex items-center gap-3 bg-[#0d1526] border border-[#24304a] rounded-xl px-3 py-2.5">
      <div class="w-10 h-10 rounded-lg overflow-hidden shrink-0"><img src="${monImg(r.monsterId)}" alt="${m.name}" class="w-full h-full object-cover"></div>
      <div class="flex-1"><div class="text-[13px] font-bold">${m.name}</div></div>
      <span class="badge ${r.win?'bg-green-500/15 text-green-400':'bg-red-500/15 text-red-400'}">${r.win?'胜':'负'}</span>
      <div class="text-right w-24">
        <div class="text-[12px] font-bold text-gold num-mono">${r.win?'+'+fmtUnits(BigInt(r.reward), S.tokenDecimals, 2):'0'} 💰</div>
        <div class="text-[11px] text-green-400 num-mono">+${r.xp} XP</div>
      </div>
    </div>`;
  }).join('');
}
