'use strict';


/* ============ commit-reveal ============ */
// reveal 类交易链上逻辑较重（自动清理扫描 + 多笔转账 + 批量铸造），MetaMask 估算常偏低导致 OOG；
// 统一改为「估算（最多试 2 次）+ 30% 缓冲 + 15 万兜底」，估算失败时按抽数给足固定限额。
// 固定限额来自主网实测（BSC 主网 2026-10-10）：
//   单抽 reveal            ≈ 29 万 gas（押金退还 + 2 笔 ERC20 转账 + oracle.reveal + 掉落铸造）
//   十连 Weapons.mintBatch(10) = 146 万 gas ⇒ reveal 合计 ≈ 190 万
//   百连 典型 ≈ 1250 万 gas（61% 出武器率 × 100 抽）
//   旧兜底值 60万/200万/400万 在百连时必然 OOG（mintBatch(10) 一把就要 14.6 万 gas）
// 注意：BSC 公共节点 eth_estimateGas 的单笔上限约 16.7M（0x1000000），超了会被截断成空 revert。
const REVEAL_FALLBACK_GAS = { 1: 900000n, 10: 3000000n, 100: 16000000n };
function toBigGas(x){ try{ return typeof x === 'bigint' ? x : BigInt(String(x)); }catch(e){ return null; } }
async function sendRevealTx(ct, method, args, minGas = 900000n){
  let est = null;
  for(let i=0;i<2 && est===null;i++){
    try{ est = await ct[method].estimateGas(...args); }catch(e){ est = null; }
  }
  const g = est === null ? null : toBigGas(est);
  const gasLimit = (g && g > 0n) ? (g * 130n / 100n + 150000n) : minGas;
  return ct[method](...args, { gasLimit, gasPrice: GAS_PRICE });
}
/* 该 pending 所属商店的「真实揭示窗口」（区块数）。
   ForgeShop 主网 commitExpiryBlocks = 256，比 RandomOracle.maxDelayBlocks = 450 更严格：
   合约在 256 块后就会清理掉 pending，此后再 reveal 必然 revert（合约侧 Unauthorized）。
   取「商店有效期」与「oracle 上限」的较小值，否则前端会在 256~450 之间一直重试注定失败的记录。 */
const DEFAULT_REVEAL_WINDOWS = { forge:256, synthesize:256, enhance:450 };
function revealWindowFor(p){
  const cfg = S.oracleCfg || {};
  const action = p && p.action;
  const w = (cfg.windows && cfg.windows[action]) || DEFAULT_REVEAL_WINDOWS[action] || 0;
  const mx = cfg.maxDelay || 450;
  return (w > 0 && w < mx) ? w : mx;
}
function generateRandomSecret(){
  const secret = BigInt(ethers.hexlify(ethers.randomBytes(32)));
  const salt   = BigInt(ethers.hexlify(ethers.randomBytes(32)));
  const hash   = ethers.keccak256(ethers.solidityPacked(['uint256','uint256'], [secret, salt]));
  return { secret: secret.toString(), salt: salt.toString(), hash };
}
function savePending(){ try{ localStorage.setItem('eh_pending', JSON.stringify(S.pending.filter(p=>!p.done))); }catch(e){} }
function loadPending(){
  try{
    const raw = JSON.parse(localStorage.getItem('eh_pending')||'[]');
    S.pending = raw.map(p=>({...p,state:p.state||'ready'})).filter(p=>{
      // 普通战斗已改为直接 fight，无 commit-reveal；历史遗留的 fight 记录直接丢弃
      if(p.action === 'fight') return false;
      if(!S.account) return true;
      if(p.committer && p.committer.toLowerCase() !== S.account.toLowerCase()) return false;
      return true;
    });
  }catch(e){ S.pending=[]; }
}
async function getCommitSafe(commitId){
  const addr = addrOf('randomOracle');
  if(!addr) return null;
  try{
    const runner = S.signer || getReadProvider();
    const ct = new ethers.Contract(addr, ["function getCommit(uint256) view returns (bytes32 hash,uint64 blockNumber,address committer,bool revealed)"], runner);
    const r = await ct.getCommit(BigInt(commitId));
    return { hash: r[0], blockNumber: Number(r[1]), committer: r[2], revealed: r[3] };
  }catch(e){ console.warn('[getCommitSafe]', e); return null; }
}
function expectedCommitterFor(action){
  const key = ACTION_PROXY[action]; if(!key) return null;
  return (addrOf(key) || '').toLowerCase();
}
async function extractCommitId(rec, actionKey){
  const COMMITTED_TOPIC = ethers.id('Committed(uint256,address,bytes32,uint256)');
  const expectedCommitter = expectedCommitterFor(actionKey) || '';
  let fallback = null;
  for(const log of rec.logs){
    if(!log.topics || log.topics[0] !== COMMITTED_TOPIC) continue;
    const commitId = BigInt(log.topics[1]);
    const committer = ('0x' + log.topics[2].slice(26)).toLowerCase();
    if(expectedCommitter && committer === expectedCommitter) return commitId;
    if(fallback === null) fallback = commitId;
  }
  return fallback;
}
async function validatePending(){
  if(!S.pending.length) return;
  try{
    const cur = await (S.signer ? S.provider : getReadProvider()).getBlockNumber();
    const keep = []; let dropped = 0;
    for(const p of S.pending){
      if(p.done){ keep.push(p); continue; }
      const win = revealWindowFor(p);
      if(p.commitBlock && (cur - p.commitBlock) > win){
        dropped++; console.warn('[pending] 超出该商店揭示窗口('+win+' 块):', p.commitId, p.action); continue;
      }
      if(p.commitId !== null){
        const info = await getCommitSafe(p.commitId);
        if(info){
          if(info.blockNumber === 0){ dropped++; continue; }
          if(info.revealed){ dropped++; continue; }
        }
      }
      keep.push(p);
    }
    if(dropped > 0){
      S.pending = keep; savePending(); renderPending();
      toast('已清理 '+dropped+' 条失效的待揭示记录（过期的押金会由合约自动退回）','info');
    }
  }catch(e){ console.warn('[validatePending]', e); }
}

const ACTIONS = {
  forge: {
    label:'锻造', contract:'forgeShop',
    reveal: async p => {
      if(!S.signer) throw new Error('钱包未连接');
      const ct = new ethers.Contract(addrOf('forgeShop'), REVEAL_ABI.forgeShop, S.signer);
      const id = BigInt(p.commitId), sec = BigInt(p.secret), sa = BigInt(p.salt);
      const n = (p.extra && p.extra.count) || 1;
      if(n===100) return sendRevealTx(ct, 'revealForgeWeapon100', [id, sec, sa], REVEAL_FALLBACK_GAS[100]);
      if(n===10) return sendRevealTx(ct, 'revealForgeWeapon10', [id, sec, sa], REVEAL_FALLBACK_GAS[10]);
      return sendRevealTx(ct, 'revealForgeWeapon', [id, sec, sa], REVEAL_FALLBACK_GAS[1]);
    },
    onRevealed: (rec, p) => parseForgeResult(rec, p)
  },
  mintHero: {
    label:'召唤英雄', contract:'v3',
    reveal: async p => {
      if(!S.signer) throw new Error('钱包未连接');
      const ct = new ethers.Contract(addrOf('v3'), REVEAL_ABI.v3, S.signer);
      const name = (p.extra && p.extra.heroName) || ('英雄#'+p.commitId);
      return sendRevealTx(ct, 'revealMintHero', [BigInt(p.commitId), BigInt(p.secret), BigInt(p.salt), name]);
    },
    onRevealed: (rec, p) => parseMintHeroResult(rec, p)
  },
  bossAttack: {
    label:'BOSS攻击', contract:'boss',
    reveal: async p => {
      if(!S.signer) throw new Error('钱包未连接');
      const ct = new ethers.Contract(addrOf('boss'), REVEAL_ABI.boss, S.signer);
      return sendRevealTx(ct, 'revealAttack', [BigInt(p.commitId), BigInt(p.secret), BigInt(p.salt)]);
    },
    onRevealed: (rec, p) => parseBossResult(rec, p)
  },
  enhance: {
    label:'精粹强化', contract:'enhanceShop',
    reveal: async p => {
      if(!S.signer) throw new Error('钱包未连接');
      const ct = new ethers.Contract(addrOf('enhanceShop'), REVEAL_ABI.enhanceShop, S.signer);
      return sendRevealTx(ct, 'revealEnhance', [BigInt(p.commitId), BigInt(p.secret), BigInt(p.salt)]);
    },
    onRevealed: (rec) => { parseEnhanceResult(rec); }
  },
  synthesize: {
    label:'碎片合成', contract:'forgeShop',
    reveal: async p => {
      if(!S.signer) throw new Error('钱包未连接');
      const ct = new ethers.Contract(addrOf('forgeShop'), REVEAL_ABI.forgeShop, S.signer);
      return sendRevealTx(ct, 'revealSynthesize', [BigInt(p.commitId), BigInt(p.secret), BigInt(p.salt)]);
    },
    onRevealed: (rec) => parseSynthResult(rec)
  }
};

async function commitReveal(actionKey, opts={}){
  if(!needWallet()) return;
  const {secret,salt,hash} = generateRandomSecret();
  S.busy = true;
  if(opts.busyId) withBusy(opts.busyId, true, '提交中…');
  try{
    if(opts.needToken && opts.tokenAmount){ await ensureTokenAllowance(opts.tokenTarget, opts.tokenAmount); }
    const commitArgs = opts.commitArgs || [];
    if(opts.staticCall){ try{ await opts.staticCall(hash, ...commitArgs); }catch(e){ console.warn('[staticCall预检]', e); } }
    const tx = await opts.commit(hash, ...commitArgs);
    toast(ACTIONS[actionKey].label+'：已提交（Tx: '+tx.hash.slice(0,10)+'…），等待确认…','info');
    const rec = await tx.wait();
    const commitId = await extractCommitId(rec, actionKey);
    if(commitId === null){ toast('未能解析 commitId','warn'); return; }
    const pending = {
      id: Date.now()+'_'+Math.random().toString(36).slice(2,6),
      action: actionKey, label: ACTIONS[actionKey].label,
      commitId: commitId.toString(), secret, salt, hash,
      commitBlock: rec.blockNumber, confirmations: CONFIG.confirmations,
      ts: Date.now(), txHash: rec.hash, state:'ready',
      committer: S.account,
      extra: opts.extra||{}
    };
    if(opts.overlay) pending.overlay = true;
    if(opts.onRevealed) pending.onRevealed = opts.onRevealed;
    S.pending.push(pending); savePending(); renderPending();
    toast('提交成功！'+pending.confirmations+' 个区块后自动揭示','success');
    waitAndReveal(pending);
  }catch(e){
    console.error('[commit失败]', e);
    if(opts.overlay) hideSummonOverlay();
    toast(errMsg(e),'error');
  } finally{
    S.busy = false;
    if(opts.busyId) withBusy(opts.busyId, false);
  }
}
function waitAndReveal(pending){
  let pv;
  try{ pv = S.signer ? S.provider : getReadProvider(); }catch(e){ pv = null; }
  if(!pv) return;
  const win = revealWindowFor(pending);
  // 每 3s 轮询一次；BSC ≈0.45s/块 ⇒ 3s ≈ 7 块，窗口内最多轮询这么多次，不在窗口外瞎重试
  const maxAttempts = Math.max(3, Math.min(120, Math.floor(win / 7) - 1));
  let attempts = 0;
  const timer = setInterval(async ()=>{
    attempts++;
    try{
      const bn = await pv.getBlockNumber();
      const it = S.pending.find(x=>x.id===pending.id);
      if(!it || it.state==='done' || it.state==='busy'){ clearInterval(timer); return; }
      if(bn - pending.commitBlock > win){
        clearInterval(timer);
        it.state='done'; it.done=true; it.expired=true; savePending(); renderPending();
        toast((it.label||'操作')+'：等待过久已超出揭示窗口('+win+' 块)，本次提交失效','warn');
        return;
      }
      if(bn >= pending.commitBlock + (pending.confirmations || 3) || attempts >= maxAttempts){
        clearInterval(timer);
        revealPending(pending.id);
      }
    }catch(e){ console.warn('[waitAndReveal]', e); }
  }, 3000);
}
async function revealPending(id){
  const p = S.pending.find(x=>x.id===id); if(!p) return;
  if(p.state==='busy'||p.state==='done') return;
  // 先按「商店揭示窗口」判过期：过期后链上 pending 已被清理，继续发交易只会白烧 gas 并报「揭示失败」
  const win = revealWindowFor(p);
  const cur0 = await (S.signer ? S.provider : getReadProvider()).getBlockNumber().catch(()=>0);
  if(p.commitBlock && cur0 && (cur0 - p.commitBlock) > win){
    p.state='done'; p.done=true; p.expired=true; savePending(); renderPending();
    toast('该提交已超出揭示窗口('+win+' 块)，'+(p.label||'')+'已失效（押金由合约自动退回）','warn');
    return;
  }
  if(p.commitId !== null){
    const info = await getCommitSafe(p.commitId);
    if(info){
      if(info.blockNumber === 0){
        p.state='done'; p.done=true; savePending(); renderPending();
        toast('该记录已失效，已自动清理','warn'); return;
      }
      if(info.revealed){
        p.state='done'; p.done=true; savePending(); renderPending();
        toast('已揭示过了','info'); return;
      }
    }
  }
  p.state='busy'; savePending(); renderPending();
  const act = ACTIONS[p.action]; if(!act){ toast('未知操作','error'); return; }
  try{
    S.busy = true;
    const tx = await act.reveal(p);
    toast(act.label+'：揭示交易已提交…','info');
    const rec = await tx.wait();
    p.state='done'; p.done=true; p.revealBlock=rec.blockNumber;
    savePending(); renderPending();
    const onRev = p.onRevealed || act.onRevealed;
    if(onRev) await onRev(rec, p);
    toast(act.label+' 揭示成功！','success');
  }catch(e){
    p.state='ready'; savePending(); renderPending();
    console.error('[reveal失败]', e);
    if(p.overlay) hideSummonOverlay();
    toast(act.label+' 揭示失败：'+errMsg(e),'error');
    // 失败往往意味着窗口已过；交给 validatePending 判定是否该丢弃，避免一直重试注定失败的记录
    setTimeout(validatePending, 1500);
  } finally{ S.busy=false; }
}
function renderPending(){
  const list = S.pending.filter(p=>p.state!=='done');
  const n = list.length;
  $('#pendingCount').textContent = n;
  $('#pendingPillBtn').classList.toggle('hidden', n===0);
  $('#pendingHint').textContent = n ? `共 ${n} 项` : '';
  const box = $('#pendingList');
  if(!n){ box.innerHTML = '<div class="text-muted text-[12px] p-2">暂无待揭示操作</div>'; return; }
  box.innerHTML = list.map(p=>{
    const txLink = p.txHash ? `<a href="${explorerTxUrl(p.txHash)}" target="_blank" rel="noopener" class="text-[10px] text-blue-400 hover:underline" onclick="event.stopPropagation()">Tx: ${p.txHash.slice(0,8)}…</a>` : '';
    return `<div class="bg-[#0d1526] border border-[#24304a] rounded-lg p-2.5 flex items-center gap-2 anim-fade">
      <div class="flex-1 min-w-0">
        <div class="text-[13px] font-bold">${escapeHtml(p.label)}</div>
        <div class="text-[11px] text-muted truncate">commitId: ${p.commitId||'?'} · ${txLink}</div>
      </div>
      <button onclick="revealPending('${p.id}')" class="btn btn-sm btn-gold" ${p.state==='busy'?'disabled':''}>${p.state==='busy'?'揭示中':'立即揭示'}</button>
    </div>`;
  }).join('');
}
function togglePendingPanel(){
  var el = $('#pendingPanel'); if(!el) return;
  /* game.html 引了 Tailwind（靠 .hidden 隐藏），map.html 没引（面板靠 .show 显示）。
     两个类一起切，两种环境都能正确开合 —— 只切 hidden 会让地图页面板点不开。 */
  el.classList.toggle('show');
  el.classList.toggle('hidden');
}
