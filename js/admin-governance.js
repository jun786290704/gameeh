'use strict';
/* =============================================================
   治理管理 —— 升级提案 / 投票 / 执行 / 暂停开关（主网启用）
   依赖：admin.js 的 ADMIN_CONTRACTS/ADMIN_ABIS 治理条目、
         core.js 的 CONTRACTS.governance（空 = 未部署）
   ============================================================= */
async function secGovernance(el, isOwner){
  const gAddr = addrOf('governance');
  if(!gAddr){
    el.innerHTML = aCard('治理（升级投票）','fa-scale-balanced',
      '<div class="text-[12px] text-amber-400"><i class="fa-solid fa-hourglass-half mr-1"></i>治理合约尚未部署（主网启用）。</div>' +
      '<div class="text-[12px] text-muted mt-2">主网部署 ElementHeroesGovernance 并填写 core.js 中 CONTRACTS.governance 地址后，即可在此发起升级提案并管理投票。</div>' +
      '<div class="text-[12px] text-muted mt-1">流程：管理员发起提案 → 按代币余额投票（每地址一票，权重=余额）→ 赞成 &gt;51% 通过 → 任何人执行 upgradeTo。逃生通道：admin 可随时暂停治理，暂停期间可紧急取消任意未执行提案。</div>');
    return;
  }
  const g = adminCt('governance');
  const [owner, token, period, rate, paused, cnt, v3Owner, curBlock] = await Promise.all([
    g.owner().catch(()=>null), g.token().catch(()=>null),
    g.votingPeriodBlocks().catch(()=>null), g.passRateBp().catch(()=>null),
    g.paused().catch(()=>false), g.proposalCount().catch(()=>0n),
    readCall('v3', c=>c.owner()).catch(()=>null),
    getReadProvider().getBlockNumber().catch(()=>0)
  ]);
  const isGovOwner = owner && S.account && String(owner).toLowerCase()===S.account.toLowerCase();
  const isV3Gov = v3Owner && String(v3Owner).toLowerCase()===String(gAddr).toLowerCase();
  const need = Number(rate)/100;
  const n = Number(cnt||0);
  let propHtml = '<div class="text-[12px] text-muted">暂无提案</div>';
  if(n>0){
    const arr = [];
    for(let i=1;i<=n;i++) arr.push(g.proposals(BigInt(i)).catch(()=>null));
    const list = await Promise.all(arr);
    propHtml = list.map((p,i)=>{
      if(!p) return '';
      const id = i+1;
      const inVote = curBlock >= Number(p.startBlock) && curBlock < Number(p.endBlock) && !p.executed && !p.canceled;
      const total = Number(p.votesFor)+Number(p.votesAgainst);
      const passPct = total>0 ? (Number(p.votesFor)/total*100) : 0;
      const passed = total>0 && Number(p.votesFor)*10000 > total*Number(rate);
      const status = p.executed ? '<span class="text-green-400">✅ 已执行</span>'
        : p.canceled ? '<span class="text-red-400">✖ 已取消</span>'
        : inVote ? '<span class="text-amber-400">🗳 投票中</span>'
        : passed ? '<span class="text-green-400">✔ 已通过 · 待执行</span>'
        : '<span class="text-red-400">✖ 未通过</span>';
      const pctBar = Math.min(100, Math.max(2, passPct));
      return `
      <div class="bg-[#0d1526] rounded-xl border border-[#24304a] p-3 mb-2">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="text-[13px] font-bold">#${id} ${escapeHtml(String(p.title).slice(0,40)||'(无标题)')}</div>
          ${status}
        </div>
        <div class="text-[11px] num-mono text-muted mt-1 truncate">目标 ${shortAddr(p.target)} → 新实现 ${shortAddr(p.implementation)}</div>
        <div class="text-[11px] text-muted mt-0.5">投票期 块 ${String(p.startBlock)} ~ ${String(p.endBlock)} · 快照块 ${String(p.snapshotBlock)}</div>
        ${p.description?`<div class="text-[11px] text-muted mt-1 italic">${escapeHtml(String(p.description).slice(0,120))}</div>`:''}
        <div class="flex items-center gap-2 mt-2 text-[11px]">
          <span class="text-green-400 font-bold shrink-0">赞成 ${fmt(total>0?Number(p.votesFor):0,0)}</span>
          <div class="flex-1 h-1.5 rounded-full bg-[#1a2740] overflow-hidden"><div class="h-full bg-green-400/70" style="width:${pctBar}%"></div></div>
          <span class="text-red-400 font-bold shrink-0">反对 ${fmt(total>0?Number(p.votesAgainst):0,0)}</span>
        </div>
        <div class="text-[11px] text-muted mt-1">赞成率 ${passPct.toFixed(1)}% / 需 &gt;${need}%</div>
        <div class="flex flex-wrap gap-2 mt-2">
          ${inVote?`<button class="btn btn-gold !px-2 !py-1 text-[11px]" onclick="govVote(${id},true)"><i class="fa-solid fa-thumbs-up mr-1"></i>赞成</button>
          <button class="btn btn-ghost !px-2 !py-1 text-[11px]" onclick="govVote(${id},false)"><i class="fa-solid fa-thumbs-down mr-1"></i>反对</button>`:''}
          ${(!p.executed && !p.canceled && !inVote && passed)?`<button class="btn btn-ghost !px-2 !py-1 text-[11px] text-green-400" onclick="govExecute(${id})"><i class="fa-solid fa-rocket mr-1"></i>执行升级</button>`:''}
          ${isGovOwner && !p.executed && !p.canceled?`<button class="btn btn-ghost !px-2 !py-1 text-[11px]" onclick="govCancel(${id})">取消提案</button>`:''}
          ${isGovOwner && paused && !p.executed && !p.canceled?`<button class="btn btn-ghost !px-2 !py-1 text-[11px] text-red-400" onclick="govEmergencyCancel(${id})">紧急取消</button>`:''}
        </div>
      </div>`;
    }).join('');
  }
  const body = aCard('治理状态','fa-scale-balanced',
    aRow('治理合约', shortAddr(gAddr)) +
    aRow('owner', owner?shortAddr(owner):'-') +
    aRow('投票代币', token?shortAddr(token):'-') +
    aRow('投票期', period!==null?String(Number(period))+' 块':'-') +
    aRow('通过比例', rate!==null?(Number(rate)/100)+'%（须严格大于）':'-') +
    aRow('治理暂停', paused?'<span class="text-red-400">已暂停 · 逃生通道生效</span>':'<span class="text-green-400">运行中</span>') +
    aRow('V3 owner=治理', isV3Gov?'<span class="text-green-400">是 · 升级走投票</span>':'<span class="text-amber-400">否 · 尚未转移</span>'),
    isGovOwner ? (paused? aAct('恢复治理', 'govUnpause()', 'fa-play') : aAct('暂停治理', 'govPause()', 'fa-pause')) : '')
    + aCard('发起升级提案（仅管理员）','fa-file-circle-plus',
      `<div class="text-[12px] text-muted">提案通过并执行后，目标代理将升级到新实现。默认目标：金库（Vault）代理 —— 金库升级受治理投票控制。</div>
      <div class="flex gap-2 mt-2"><input id="govTarget" type="text" class="input flex-1" value="${addrOf('vault')||addrOf('v3')||''}" placeholder="待升级代理地址（默认金库）"><input id="govImpl" type="text" class="input flex-1" placeholder="新实现地址 0x…"></div>
      <div class="mt-2"><input id="govTitle" type="text" class="input w-full" placeholder="标题，如：V3 平衡性更新 v1.2.0"></div>
      <div class="mt-2"><textarea id="govDesc" class="input w-full" rows="2" placeholder="提案描述（变更内容、风险说明）"></textarea></div>`,
      isGovOwner ? aAct('发起提案', 'govPropose()', 'fa-file-circle-plus') : '')
    + aCard('提案列表（'+n+'）','fa-list-check', propHtml);
  el.innerHTML = body;
}
async function govPropose(){
  const target = document.getElementById('govTarget').value.trim();
  const impl = document.getElementById('govImpl').value.trim();
  const title = document.getElementById('govTitle').value.trim();
  const desc = document.getElementById('govDesc').value.trim();
  if(!/^0x[a-fA-F0-9]{40}$/.test(target) || !/^0x[a-fA-F0-9]{40}$/.test(impl)){ toast('请填写正确的代理与新实现地址','warn'); return; }
  if(!title){ toast('请填写标题','warn'); return; }
  await adminExec('发起升级提案', async()=>{
    await (await adminCt('governance',true).propose(target, impl, title, desc)).wait();
  });
}
async function govVote(id, support){
  if(!S.signer){ needWallet(); return; }
  await adminExec(support?'投赞成票':'投反对票', async()=>{
    await (await adminCt('governance',true).vote(BigInt(id), support)).wait();
  }, false);
}
async function govExecute(id){
  if(!confirm('确认执行提案 #'+id+' 的合约升级？此操作不可逆。')) return;
  await adminExec('执行升级', async()=>{
    await (await adminCt('governance',true).execute(BigInt(id))).wait();
  }, false);
}
async function govCancel(id){
  if(!confirm('确认取消提案 #'+id+'？')) return;
  await adminExec('取消提案', async()=>{
    await (await adminCt('governance',true).cancel(BigInt(id))).wait();
  });
}
async function govEmergencyCancel(id){
  if(!confirm('紧急取消提案 #'+id+'（治理暂停状态下）？')) return;
  await adminExec('紧急取消', async()=>{
    await (await adminCt('governance',true).emergencyCancel(BigInt(id))).wait();
  });
}
async function govPause(){
  await adminExec('暂停治理', async()=>{
    await (await adminCt('governance',true).pause()).wait();
  });
}
async function govUnpause(){
  await adminExec('恢复治理', async()=>{
    await (await adminCt('governance',true).unpause()).wait();
  });
}
