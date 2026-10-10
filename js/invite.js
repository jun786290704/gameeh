'use strict';

/* ============ 邀请中心（Invite Center） ============
 * 推荐人绑定到玩家地址（V8/V9/V10/V11/V12）：
 *  - 下线列表：Characters.downlineCount/downlineAt 链上直读（V9 反向映射，零事件依赖）
 *  - 每个下线贡献奖励：Characters.downlineEarned(下线地址) 链上直读（V10 记账，公共 RPC 不提供 getLogs 也能用）
 *  - 累计推荐奖励 = 各下线 downlineEarned 之和（链上直读）
 *  - 待领取邀请奖励：vault.getPendingReferral（V2+ 分账，与战斗奖励分开；claimReferral() 单独领取）
 *  - 战斗奖励待领取：vault.getPendingReward（claim() 领取）
 *  - 返现：vault.setMyReferrerSplit 自由比例（V12 起每次修改 7 天冷却）；下线绑定/铸造时快照锁定比例
 */

// 时长格式化：秒 → X天X小时X分
function fmtDur(sec){
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if(d > 0) return d + '天' + h + '小时';
  if(h > 0) return h + '小时' + m + '分';
  return m + '分';
}

async function loadInvitePanel(){
  const root = $('#inviteRoot'); if(!root) return;
  root.innerHTML = `<div class="space-y-3">${skeletonBlock(2,'h-24')}</div>`;
  if(!S.account){
    root.innerHTML = `<div class="game-card p-6 text-center text-muted"><i class="fa-solid fa-user-group text-3xl block mb-2"></i>连接钱包后查看邀请中心<br><button onclick="connectWallet()" class="btn btn-gold btn-sm mt-3">连接钱包</button></div>`;
    return;
  }
  try{
    const ch = mustC('characters');
    const vault = mustC('vault');
    // 我的邀请码
    let myCode = null;
    try{ const c = await ch.referrerCodeOf(S.account); if(c && c !== ethers.ZeroHash){ try{ myCode = ethers.decodeBytes32String(c); }catch(e){ myCode = '0x'+c.slice(2,10); } } }catch(e){}
    // 推荐人
    const myRef = await ch.referrerOfAccount(S.account).catch(()=>ethers.ZeroAddress);
    // 模式与代币
    const mode = await loadVaultMode(true);
    let dec = S.tokenDecimals, sym = S.tokenSymbol;
    if(mode===1){ try{ const u = await vault.usdt(); const erc20 = new ethers.Contract(u, ["function decimals() view returns (uint8)","function symbol() view returns (string)"], (S.signer||getReadProvider())); dec = Number(await erc20.decimals()); sym = await erc20.symbol(); }catch(e){ sym='USDT'; dec=18; } }
    // 分账读取：战斗奖励（pending）+ 邀请奖励（pendingReferral）+ 返现（pendingCashback）+ 已领取 + 我的返现档位 + 冷却/快照
    const [battlePend, refPend, claimed, claimedU, refClaimed, refClaimedU, cbPend, cbClaimed, cbClaimedU, mySplit, lastChg, mySnap, cooldown] = await Promise.all([
      vault.getPendingReward(S.account).catch(()=>0n),
      vault.getPendingReferral(S.account).catch(()=>0n),
      vault.totalClaimed(S.account).catch(()=>0n),
      vault.totalClaimedUSDT(S.account).catch(()=>0n),
      vault.totalClaimedReferral(S.account).catch(()=>0n),
      vault.totalClaimedReferralUSDT(S.account).catch(()=>0n),
      vault.getPendingCashback(S.account).catch(()=>0n),
      vault.totalClaimedCashback(S.account).catch(()=>0n),
      vault.totalClaimedCashbackUSDT(S.account).catch(()=>0n),
      vault.referrerSplitBp(S.account).catch(()=>0n),
      vault.lastSplitChange(S.account).catch(()=>0n),
      vault.cashbackBpOf(S.account).catch(()=>0n),
      vault.SPLIT_COOLDOWN().catch(()=>604800n)
    ]);
    const mySplitN = Number(mySplit);
    // bp(万分数) → 百分比文案：0=不返现、100=1%、3500=35%、9000=90%
    const splitPct = mySplitN / 100; // 0~90，一位小数
    const splitLabel = mySplitN === 0 ? '0%（不返现）' : splitPct + '%';
    const splitKeepPct = mySplitN === 0 ? 100 : (100 - splitPct); // 邀请者自留
    // 7 天冷却：上次修改时间 + SPLIT_COOLDOWN，未到则禁止修改
    const cooldownSec = Number(cooldown) || 604800;
    const lastChgN = Number(lastChg);
    const nowSec = Math.floor(Date.now() / 1000);
    const cooldownEnd = lastChgN + cooldownSec;
    const cooling = nowSec < cooldownEnd;
    const remainSec = Math.max(0, cooldownEnd - nowSec);
    const remainLabel = cooling ? fmtDur(remainSec) : '';
    // 我的返现快照：0x8000=已固化（绑定/铸造时刻比例锁定）；否则跟随推荐人当前比例
    const mySnapN = Number(mySnap);
    const mySnapFrozen = (mySnapN & 0x8000) !== 0;
    const mySnapPct = ((mySnapN & 0x7FFF) / 100);
    // 下线列表（链上直读 V9 映射）+ 每个下线贡献（V10 记账）
    const downlines = await _loadDownlines();
    // 累计推荐奖励 = 各下线 downlineEarned 之和（链上直读，公共 RPC 无法 getLogs 也可用）
    const totalRef = downlines.reduce((s,d)=>s + d.contribution, 0n);

    const inviteLink = await buildInviteLink().catch(()=>null);

    root.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-1 space-y-3">
          <div class="game-card p-4">
            <div class="text-[12px] text-muted mb-2"><i class="fa-solid fa-link text-gold mr-1"></i>我的邀请链接</div>
            <div class="flex gap-2">
              <button onclick="copyInviteLink()" class="btn btn-gold btn-sm flex-1"><i class="fa-solid fa-copy"></i>复制邀请链接</button>
              <button onclick="registerRefCodeFlow()" class="btn btn-sm btn-ghost" title="注册短码后链接更短">${myCode ? '<i class="fa-solid fa-tag"></i> '+myCode : '<i class="fa-solid fa-plus"></i> 注册邀请码'}</button>
            </div>
            ${inviteLink ? `<div class="mt-2 text-[11px] num-mono break-all text-muted/80">${inviteLink}</div>` : ''}
            <div class="mt-3 pt-3 border-t border-[#1c2740]">
              <div class="text-[12px] text-muted mb-2"><i class="fa-solid fa-hand-holding-dollar text-amber-400 mr-1"></i>返现比例（当前：<span class="text-amber-300 font-bold">${splitLabel}</span>）</div>
              <div class="text-[11px] text-muted/70 mb-2">下线战斗胜利时你获得 10% 推荐奖励；可自由设置返现比例（0%~90%），把其中一部分返现给下线激励拉新，其余自留（当前自留 ${splitKeepPct}%）。</div>
              <div class="flex gap-2">
                <input id="splitInput" type="number" min="0" max="90" step="1" value="${splitPct}" placeholder="0~90" ${cooling?'disabled':''}
                  class="flex-1 bg-[#0d1526] border border-[#24304a] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-gold num-mono ${cooling?'opacity-50':''}">
                <button onclick="setMySplitPct()" class="btn btn-gold btn-sm" ${cooling?'disabled':''}><i class="fa-solid fa-check"></i>保存</button>
              </div>
              ${cooling
                ? `<div class="text-[11px] text-amber-300/90 mt-1"><i class="fa-solid fa-clock mr-1"></i>冷却中：${remainLabel}后可再次修改（每次修改后需等待 7 天）</div>`
                : `<div class="text-[11px] text-muted/70 mt-1">1 = 返现 1%，35 = 返现 35%，最高 90%，最低 0（不返现）。每次修改需等待 7 天冷却。</div>`}
              <div class="text-[11px] text-muted/70 mt-1"><i class="fa-solid fa-circle-info mr-1"></i>修改只影响<b class="text-amber-300">之后</b>邀请的下线（下线在绑定/铸造时按当时的比例锁定）；先前邀请的下线返现比例不变。</div>
            </div>
          </div>
          <div class="game-card p-4">
            <div class="text-[12px] text-muted mb-2"><i class="fa-solid fa-user-plus text-amber-400 mr-1"></i>我的推荐人</div>
            ${myRef && myRef !== ethers.ZeroAddress
              ? `<div class="num-mono text-amber-300 text-[13px] font-bold">${myRef}</div>`
              : `<button onclick="bindReferrerFlow()" class="btn btn-sm btn-ghost w-full"><i class="fa-solid fa-user-plus mr-1"></i>绑定推荐人（10% 邀请奖励）</button>`}
          </div>
        </div>

        <div class="lg:col-span-2 space-y-3">
          <div class="game-card p-4">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div class="text-[13px] font-bold"><i class="fa-solid fa-gift text-amber-400 mr-1"></i>邀请奖励（推荐奖励）</div>
              <button onclick="claimReferralVault()" id="refClaimBtn" class="btn btn-gold btn-sm" ${refPend===0n?'disabled':''}><i class="fa-solid fa-hand-holding-dollar"></i>领取 ${refPend===0n?'':fmtUnits(refPend,dec,2)+' '+sym}</button>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-[#0d1526] border border-[#24304a] rounded-xl px-2 py-3">
                <div class="text-[11px] text-muted mb-1">待领取邀请奖励</div>
                <div class="text-amber-300 num-mono text-[15px] font-black">${fmtUnits(refPend,dec,2)} ${sym}</div>
              </div>
              <div class="bg-[#0d1526] border border-[#24304a] rounded-xl px-2 py-3">
                <div class="text-[11px] text-muted mb-1">累计邀请奖励</div>
                <div class="text-amber-300 num-mono text-[15px] font-black">${fmtUnits(totalRef,dec,2)} ${sym}</div>
              </div>
              <div class="bg-[#0d1526] border border-[#24304a] rounded-xl px-2 py-3">
                <div class="text-[11px] text-muted mb-1">已领取邀请奖励</div>
                <div class="text-green-400 num-mono text-[15px] font-black">${fmtUnits(mode===1?refClaimedU:refClaimed,dec,2)} ${sym}</div>
              </div>
            </div>
            <div class="text-[11px] text-muted/70 mt-2"><i class="fa-solid fa-circle-info mr-1"></i>邀请奖励 = 下线战斗胜利奖励的 10%，由金库额外支付（不从下线奖励中扣除）。邀请奖励与战斗奖励分开记账、分开领取。你可设置「返现档位」，把部分邀请奖励返现给下线。</div>
          </div>

          <div class="game-card p-4">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div class="text-[13px] font-bold"><i class="fa-solid fa-hand-holding-dollar text-purple-400 mr-1"></i>我的返现（推荐人让利）</div>
              <button onclick="claimCashbackVault()" id="cbClaimBtn" class="btn btn-gold btn-sm" ${cbPend===0n?'disabled':''}><i class="fa-solid fa-hand-holding-dollar"></i>领取返现 ${cbPend===0n?'':fmtUnits(cbPend,dec,2)+' '+sym}</button>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-[#0d1526] border border-[#24304a] rounded-xl px-2 py-3">
                <div class="text-[11px] text-muted mb-1">返现待领取</div>
                <div class="text-purple-300 num-mono text-[15px] font-black">${fmtUnits(cbPend,dec,2)} ${sym}</div>
              </div>
              <div class="bg-[#0d1526] border border-[#24304a] rounded-xl px-2 py-3">
                <div class="text-[11px] text-muted mb-1">累计已领取返现</div>
                <div class="text-green-400 num-mono text-[15px] font-black">${fmtUnits(mode===1?cbClaimedU:cbClaimed,dec,2)} ${sym}</div>
              </div>
              <div class="bg-[#0d1526] border border-[#24304a] rounded-xl px-2 py-3">
                <div class="text-[11px] text-muted mb-1">我的返现比例</div>
                <div class="num-mono text-[13px] font-bold ${myRef && myRef!==ethers.ZeroAddress?'text-purple-300':'text-muted'}">${myRef && myRef!==ethers.ZeroAddress ? (mySnapFrozen ? '锁定 '+mySnapPct+'%（绑定时刻）' : '跟随推荐人当前比例') : '未绑定推荐人'}</div>
              </div>
            </div>
            <div class="text-[11px] text-muted/70 mt-2"><i class="fa-solid fa-circle-info mr-1"></i>如果你的推荐人设置了返现档位，他获得的 10% 推荐奖励中会按档位返现给你（金库支付，不影响你的战斗奖励）。返现比例在你<b class="text-purple-300">绑定/铸造</b>时锁定，此后推荐人修改档位不影响你；返现单独领取。</div>
          </div>

          <div class="game-card p-4">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div class="text-[13px] font-bold"><i class="fa-solid fa-swords text-cyan-300 mr-1"></i>我的战斗奖励</div>
              <button onclick="claimVault()" id="battleClaimBtn" class="btn btn-sm btn-ghost" ${battlePend===0n?'disabled':''}><i class="fa-solid fa-hand-holding-dollar"></i>领取 ${battlePend===0n?'':fmtUnits(battlePend,dec,2)+' '+sym}</button>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-[#0d1526] border border-[#24304a] rounded-xl px-2 py-3">
                <div class="text-[11px] text-muted mb-1">战斗奖励待领取</div>
                <div class="text-cyan-300 num-mono text-[15px] font-black">${fmtUnits(battlePend,dec,2)} ${sym}</div>
              </div>
              <div class="bg-[#0d1526] border border-[#24304a] rounded-xl px-2 py-3">
                <div class="text-[11px] text-muted mb-1">累计已领取</div>
                <div class="text-green-400 num-mono text-[15px] font-black">${fmtUnits(mode===1?claimedU:claimed,dec,2)} ${sym}</div>
              </div>
              <div class="bg-[#0d1526] border border-[#24304a] rounded-xl px-2 py-3">
                <div class="text-[11px] text-muted mb-1">金库余额</div>
                <div class="text-gold num-mono text-[15px] font-black">${fmtUnits(await vault.vaultBalance().catch(()=>0n),dec,0)} ${sym}</div>
              </div>
            </div>
            <div class="text-[11px] text-muted/70 mt-2"><i class="fa-solid fa-circle-info mr-1"></i>战斗奖励为挑战怪物/世界BOSS胜利所得，与邀请奖励分开领取。</div>
          </div>

          <div class="game-card p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="text-[13px] font-bold"><i class="fa-solid fa-user-group text-cyan-300 mr-1"></i>我的下线（${downlines.length}）</div>
              <button onclick="loadInvitePanel()" class="btn btn-sm btn-ghost"><i class="fa-solid fa-rotate"></i>刷新</button>
            </div>
            ${downlines.length === 0
              ? `<div class="text-center text-muted py-6 text-[13px]">还没有下线。把你的邀请链接分享给好友，好友铸造/绑定后即可生效。</div>`
              : `<div class="overflow-x-auto"><table class="w-full text-[13px] min-w-[620px]">
                  <thead><tr class="bg-[#182338] text-muted">
                    <th class="px-3 py-2 text-left">下线地址</th><th class="px-3 py-2 text-left">绑定方式</th>
                    <th class="px-3 py-2 text-right">战斗</th><th class="px-3 py-2 text-right">胜利</th>
                    <th class="px-3 py-2 text-right">贡献奖励</th>
                  </tr></thead><tbody>${downlines.map(d=>`
                    <tr class="border-t border-[#1c2740]">
                      <td class="px-3 py-2 num-mono">${shortAddr(d.addr)}</td>
                      <td class="px-3 py-2">${d.kind}</td>
                      <td class="px-3 py-2 text-right num-mono">${d.fights}</td>
                      <td class="px-3 py-2 text-right num-mono text-green-400">${d.wins}</td>
                      <td class="px-3 py-2 text-right num-mono text-amber-300">+${fmtUnits(d.contribution,dec,2)} ${sym}</td>
                    </tr>`).join('')}
                  </tbody></table></div>
                  <div class="text-[11px] text-muted/70 mt-2"><i class="fa-solid fa-circle-info mr-1"></i>「贡献奖励」为该下线地址累计为你贡献的邀请奖励（链上记账，精确值）。推荐人绑定后不可更改，奖励恒归你。</div>`}
          </div>
        </div>
      </div>`;
  }catch(e){
    root.innerHTML = `<div class="game-card p-6 text-center text-red-400">加载失败：${errMsg(e)}</div>`;
  }
}

/* ---------- 领取邀请奖励（与战斗奖励分开） ---------- */
async function claimReferralVault(){
  if(!needWallet()) return;
  try{
    const vault = mustC('vault');
    const pend = await vault.getPendingReferral(S.account).catch(()=>0n);
    if(pend===0n){ toast('没有可领取的邀请奖励','warn'); return; }
    const tx = await vault.claimReferral();
    toast('已提交，等待确认…','info');
    await tx.wait();
    toast('邀请奖励已领取','success');
    loadInvitePanel();
  }catch(e){ toast(errMsg(e),'error'); }
}

/* ---------- 领取返现（推荐人让利，单独领取） ---------- */
async function claimCashbackVault(){
  if(!needWallet()) return;
  try{
    const vault = mustC('vault');
    const pend = await vault.getPendingCashback(S.account).catch(()=>0n);
    if(pend===0n){ toast('没有可领取的返现','warn'); return; }
    const tx = await vault.claimCashback();
    toast('已提交，等待确认…','info');
    await tx.wait();
    toast('返现已领取','success');
    loadInvitePanel();
  }catch(e){ toast(errMsg(e),'error'); }
}

/* ---------- 设置我的返现比例（自由输入百分比，0~90；V12 起 7 天冷却） ---------- */
async function setMySplitPct(){
  if(!needWallet()) return;
  const el = document.getElementById('splitInput');
  const pct = el ? Number(el.value) : NaN;
  if(!(pct >= 0 && pct <= 90 && Number.isInteger(pct))){ toast('请输入 0~90 的整数百分比','warn'); return; }
  const bp = pct * 100; // 万分数：1% = 100
  try{
    const vault = mustC('vault');
    const cur = Number(await vault.referrerSplitBp(S.account).catch(()=>0n));
    if(cur===bp){ toast('已是该比例','info'); loadInvitePanel(); return; }
    const tx = await vault.setMyReferrerSplit(bp);
    toast('已提交，等待确认…','info');
    await tx.wait();
    toast('返现比例已更新（7 天冷却开始）','success');
    loadInvitePanel();
  }catch(e){
    const msg = String(e && (e.reason || e.shortMessage || e.message) || e);
    if(/cooldown|SplitCooldown/i.test(msg)){ toast('冷却中：距上次修改不足 7 天，暂不能修改','warn'); }
    else { toast(errMsg(e),'error'); }
    loadInvitePanel();
  }
}

/* ---------- 下线列表（链上直读 V9/V10，无事件依赖） ---------- */
async function _loadDownlines(){
  const ch = mustC('characters');
  const v3 = mustC('v3');
  const my = S.account.toLowerCase();
  // 1) 链上反向映射：downlineCount/downlineAt（V9）
  const n = Number(await ch.downlineCount(S.account).catch(()=>0n));
  if(!n) return [];
  const addrs = [];
  for(let i=0;i<n;i++){
    try{ const a = await ch.downlineAt(S.account, i); if(a && a !== ethers.ZeroAddress) addrs.push(ethers.getAddress(a)); }catch(e){}
  }
  const rows = [];
  const chunks = [];
  for(let i=0;i<addrs.length;i+=20) chunks.push(addrs.slice(i,i+20));
  for(const chunk of chunks){
    const stats = await Promise.all(chunk.map(async a=>{
      let fights=0, wins=0, contribution=0n;
      try{ const st = await v3.stats(a); fights = Number(st.fights); wins = Number(st.wins); }catch(e){}
      try{ contribution = await ch.downlineEarned(a); }catch(e){ contribution = 0n; }
      return { addr:a, kind:'链上登记', fights, wins, contribution };
    }));
    rows.push(...stats);
  }
  return rows;
}

/* ---------- 注册到 refreshCurrentTab ---------- */
function refreshInvite(){ loadInvitePanel(); }
