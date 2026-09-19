'use strict';

/* ============ 初始化 ============ */
async function init(){
  loadPending();
  updateConnectUI();
  renderPending();
  warnChainMismatch();
  rebuildContracts();
  await loadOracleConfig();
  await loadTokenInfo();
  await refreshCurrentTabAsync();
  await refreshBalances();
  if(window.ethereum){
    try{
      const accs = await window.ethereum.request({method:'eth_accounts'});
      if(accs && accs.length){ await connectWallet(); }
    }catch(e){}
  }
  setTimeout(async ()=>{
    await validatePending();
    const cur = await (S.signer ? S.provider : getReadProvider()).getBlockNumber().catch(()=>0);
    const maxDelay = S.oracleCfg.maxDelay || 450;
    S.pending.filter(p=>!p.done).forEach(p=>{
      if(!p.ts) return;
      if(p.commitBlock && cur && (cur - p.commitBlock) > maxDelay) return;
      waitAndReveal(p);
    });
  }, 3000);
  if(window.ethereum && typeof window.ethereum.on === 'function'){
    window.ethereum.on('chainChanged', async ()=>{
      toast('钱包链已切换，请重新连接','warn');
      S.signer=null; S.account=null; updateConnectUI(); warnChainMismatch();
    });
    window.ethereum.on('accountsChanged', async (accs)=>{
      if(!accs || !accs.length){
        toast('账户已断开','warn');
        S.signer=null; S.account=null; updateConnectUI();
        S.pending=[]; try{ localStorage.removeItem('eh_pending'); }catch(e){}
        renderPending();
        return;
      }
      try{
        const p = new ethers.BrowserProvider(window.ethereum);
        const signer = await p.getSigner();
        S.provider = p; S.signer = signer; S.account = await signer.getAddress();
        S.pending=[]; try{ localStorage.removeItem('eh_pending'); }catch(e){}
        renderPending();
        rebuildContracts();
        await loadTokenInfo(); await refreshBalances(); await refreshCurrentTabAsync();
        toast('账户已切换：'+shortAddr(S.account),'info');
      }catch(e){ toast('账户切换失败，请手动连接','warn'); }
    });
  }
}
document.addEventListener('DOMContentLoaded', init);