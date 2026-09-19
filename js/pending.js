'use strict';


/* ============ commit-reveal ============ */
// reveal 类交易链上逻辑较重（自动清理扫描 + 多笔转账），MetaMask 估算常偏低导致 OOG；
// 统一改为「估算 + 25% 缓冲 + 10 万兜底」，估算失败时给足固定限额
async function sendRevealTx(ct, method, args){
  let est = null;
  try{ est = await ct[method].estimateGas(...args); }catch(e){ est = null; }
  const gasLimit = est ? (est * 125n / 100n + 100000n) : 600000n;
  return ct[method](...args, { gasLimit, gasPrice: GAS_PRICE });
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
    const maxDelay = S.oracleCfg.maxDelay || 450;
    const keep = []; let dropped = 0;
    for(const p of S.pending){
      if(p.done){ keep.push(p); continue; }
      if(p.commitBlock && (cur - p.commitBlock) > maxDelay){
        dropped++; console.warn('[pending] 超出最大揭示窗口:', p.commitId, p.action); continue;
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
      toast('已清理 '+dropped+' 条失效的待揭示记录','info');
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
      if(n===100) return sendRevealTx(ct, 'revealForgeWeapon100', [id, sec, sa]);
      if(n===10) return sendRevealTx(ct, 'revealForgeWeapon10', [id, sec, sa]);
      return sendRevealTx(ct, 'revealForgeWeapon', [id, sec, sa]);
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
  let attempts = 0;
  const timer = setInterval(async ()=>{
    attempts++;
    try{
      const bn = await pv.getBlockNumber();
      if(bn >= pending.commitBlock + (pending.confirmations || 3)){
        clearInterval(timer);
        const it = S.pending.find(x=>x.id===pending.id);
        if(it && it.state!=='done' && it.state!=='busy') revealPending(pending.id);
      }
      if(attempts >= 120){
        clearInterval(timer);
        const it = S.pending.find(x=>x.id===pending.id);
        if(it && it.state!=='done' && it.state!=='busy') revealPending(pending.id);
      }
    }catch(e){ console.warn('[waitAndReveal]', e); }
  }, 3000);
}
async function revealPending(id){
  const p = S.pending.find(x=>x.id===id); if(!p) return;
  if(p.state==='busy'||p.state==='done') return;
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
    const txLink = p.txHash ? `<a href="https://testnet.bscscan.com/tx/${p.txHash}" target="_blank" rel="noopener" class="text-[10px] text-blue-400 hover:underline" onclick="event.stopPropagation()">Tx: ${p.txHash.slice(0,8)}…</a>` : '';
    return `<div class="bg-[#0d1526] border border-[#24304a] rounded-lg p-2.5 flex items-center gap-2 anim-fade">
      <div class="flex-1 min-w-0">
        <div class="text-[13px] font-bold">${escapeHtml(p.label)}</div>
        <div class="text-[11px] text-muted truncate">commitId: ${p.commitId||'?'} · ${txLink}</div>
      </div>
      <button onclick="revealPending('${p.id}')" class="btn btn-sm btn-gold" ${p.state==='busy'?'disabled':''}>${p.state==='busy'?'揭示中':'立即揭示'}</button>
    </div>`;
  }).join('');
}
function togglePendingPanel(){ $('#pendingPanel').classList.toggle('hidden'); }
