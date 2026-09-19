'use strict';

/* ============ 钱包 ============ */
// 给 signer 注入固定 gasPrice（0.12 gwei），所有链上交易统一生效
function withGasPrice(signer){
  if(!signer || signer.__gasPriceWrapped) return signer;
  const wrapped = new Proxy(signer, {
    get(t, key){
      if(key === 'sendTransaction'){
        return (req, ...rest) => t.sendTransaction({ ...(req||{}), gasPrice: GAS_PRICE }, ...rest);
      }
      const v = t[key];
      return typeof v === 'function' ? v.bind(t) : v;
    }
  });
  wrapped.__gasPriceWrapped = true;
  return wrapped;
}
function getReadProvider(){
  if(S.readProvider) return S.readProvider;
  S.readProvider = new ethers.JsonRpcProvider(NET.rpcUrl);
  return S.readProvider;
}
async function connectWallet(){
  if(!window.ethereum){ toast('未检测到钱包插件','warn'); return; }
  try{
    const p = new ethers.BrowserProvider(window.ethereum);
    await p.send('eth_requestAccounts', []);
    const signer = await p.getSigner();
    const netInfo = await p.getNetwork();
    S.mode='wallet'; S.provider=p; S.signer=withGasPrice(signer); S.account = await signer.getAddress(); S.chainId = Number(netInfo.chainId);
    if(S.chainId !== NET.chainId){
      try{ await p.send('wallet_switchEthereumChain', [{chainId:NET.chainIdHex}]); toast('请确认钱包已切换到 BSC 测试网','warn'); }
      catch(e){ toast('链 ID 与当前网络不一致','warn'); }
    }
    S.admin.status = 'idle';
    rebuildContracts(); updateConnectUI(); warnChainMismatch();
    await loadOracleConfig();
    await loadTokenInfo();
    await refreshCurrentTabAsync();
    toast('钱包已连接：'+shortAddr(S.account),'success');
    setTimeout(()=>validatePending(), 500);
  }catch(e){ toast(errMsg(e),'error'); }
}
function updateConnectUI(){
  if(S.mode==='wallet' && S.account){ $('#connectTxt').textContent = shortAddr(S.account); }
  else { $('#connectTxt').textContent = '连接钱包'; closeWalletMenu(); }
  refreshWalletMenu();
}

/* ============ 钱包下拉菜单（地址 / 余额 / 社群链接） ============ */
function onWalletClick(){
  if(S.mode==='wallet' && S.account) toggleWalletMenu();
  else { closeWalletMenu(); connectWallet(); }
}
function closeWalletMenu(){
  const w = $('#walletWrap'), m = $('#walletMenu');
  if(w) w.classList.remove('open');
  if(m) m.classList.add('hidden');
}
function toggleWalletMenu(){
  const w = $('#walletWrap'), m = $('#walletMenu');
  if(!w || !m) return;
  if(!m.classList.contains('hidden')){ closeWalletMenu(); return; }
  refreshWalletMenu();
  m.classList.remove('hidden');
  w.classList.add('open');
}
function refreshWalletMenu(){
  const a = $('#wmAddr'), b = $('#wmBal');
  if(a) a.textContent = S.account || '--';
  if(b) b.textContent = fmtUnits(S.tokenBal || 0n, S.tokenDecimals, 2) + ' ' + (S.tokenSymbol || (typeof TOKEN_SYMBOL!=='undefined'?TOKEN_SYMBOL:'EH'));
}
async function copyMyAddress(e){
  if(e){ e.preventDefault(); e.stopPropagation(); }
  if(!S.account){ toast('请先连接钱包','warn'); return; }
  try{
    await navigator.clipboard.writeText(S.account);
    toast('地址已复制','success');
  }catch(err){
    try{
      const ta = document.createElement('textarea');
      ta.value = S.account; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      toast('地址已复制','success');
    }catch(e2){ toast('复制失败，请手动选择地址','error'); }
  }
}
document.addEventListener('click', function(e){
  const w = $('#walletWrap');
  if(w && !w.contains(e.target)) closeWalletMenu();
});
function needWallet(){
  if(S.mode==='wallet' && S.signer) return true;
  toast('请先连接钱包','warn'); return false;
}
function warnChainMismatch(){
  const bar = $('#chainWarn'), txt = $('#chainWarnTxt');
  if(!bar || !txt) return;
  if(S.mode==='wallet' && S.chainId && S.chainId !== NET.chainId){
    txt.textContent = `钱包当前位于链 ${S.chainId}，请在钱包中切换到 ${NET.name}（chainId ${NET.chainId}）`;
    bar.classList.remove('hidden');
  } else {
    bar.classList.add('hidden');
  }
}

/* ============ 合约实例 ============ */
function addrOf(key){
  const a = CONTRACTS[key]; if(!a) return null;
  try{ return ethers.getAddress(a); }catch(e){ return null; }
}
function rebuildContracts(){
  ['characters','weapons','gameToken','shards','essence','vault','forgeShop','enhanceShop','v3','boss','marketplace','oracle','randomOracle'].forEach(k=>{
    try{
      c[k] = null;
      const a = addrOf(k);
      if(a && ABIs[k] && ABIs[k].length){
        const p = (S.signer)||getReadProvider();
        c[k] = new ethers.Contract(a, ABIs[k], p);
      }
    }catch(e){ c[k]=null; }
  });
}
function mustC(key){ const cc = c[key]; if(!cc) throw new Error('未配置 '+key); return cc; }
async function readCall(key, fn){
  const cc = c[key]; if(!cc) throw new Error('未配置 '+key);
  if(S.signer) return fn(cc.connect(S.signer));
  return fn(cc.connect(getReadProvider()));
}

/* ============ 加载合约配置 ============ */
async function loadOracleConfig(){
  try{
    const ro = c.randomOracle; if(!ro) return;
    const [mn, mx] = await Promise.all([
      ro.minDelayBlocks().catch(()=>3n),
      ro.maxDelayBlocks().catch(()=>450n)
    ]);
    S.oracleCfg = { minDelay: Number(mn), maxDelay: Number(mx) };
  }catch(e){ console.warn('[oracleConfig]', e); toast('随机数预言机配置加载失败，使用默认值','warn'); }
}
async function loadMarketFee(){
  try{
    const mk = c.marketplace; if(!mk) return;
    const bp = await mk.marketFeeBp();
    S.marketFeeBp = Number(bp);
    const el = $('#feeTxt'); if(el) el.textContent = (S.marketFeeBp/100).toFixed(2).replace(/\.?0+$/,'') + '%';
  }catch(e){}
}
