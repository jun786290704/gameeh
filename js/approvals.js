'use strict';

/* ============ 授权 ============ */
async function ensureTokenAllowance(target, amount){
  if(!S.signer) return;
  const tk = mustC('gameToken').connect(S.signer);
  const cur = await tk.allowance(S.account, target);
  if(cur >= amount) return;
  toast('正在授权代币…','info');
  await (await tk.approve(target, amount)).wait();
  toast('授权成功','success');
}
async function checkNftApproved(nftKey, spenderAddr){
  try{
    const nft = mustC(nftKey);
    return await nft.isApprovedForAll(S.account, spenderAddr);
  }catch(e){ return false; }
}
async function ensureNftApproval(nftKey){
  const nft = mustC(nftKey).connect(S.signer);
  const mkt = addrOf('marketplace');
  if(await nft.isApprovedForAll(S.account, mkt)) return true;
  const nftName = nftKey==='characters'?'英雄 NFT':(nftKey==='weapons'?'武器 NFT':(nftKey==='shards'?'碎片':'精粹'));
  openModal({html:`
    <div class="py-2">
      <div class="text-lg font-black mb-2"><i class="fa-solid fa-shield-halved text-gold mr-1"></i>授权确认</div>
      <div class="text-[13px] text-muted mb-3">即将授权 <b class="text-gold">Marketplace</b> 操作您的全部 <b class="text-gold">${escapeHtml(nftName)}</b>。</div>
      <div class="bg-[#0d1526] rounded-lg p-3 text-[12px] text-amber-300 border border-amber-500/30 mb-4">
        <i class="fa-solid fa-triangle-exclamation mr-1"></i>授权后，Marketplace 合约可在您上架时转移您的 NFT。如需取消授权，可在「我的上架」页面点击「取消授权」。
      </div>
      <div class="flex gap-2">
        <button onclick="closeModal()" class="btn btn-ghost flex-1">取消</button>
        <button onclick="closeModal();_doNftApproval('${nftKey}','marketplace')" class="btn btn-gold flex-1"><i class="fa-solid fa-check"></i>确认授权</button>
      </div>
    </div>`});
  return false;
}
async function _doNftApproval(nftKey, spenderKey){
  try{
    const nft = mustC(nftKey).connect(S.signer);
    const sp = addrOf(spenderKey);
    toast('正在授权 NFT…','info');
    await (await nft.setApprovalForAll(sp, true)).wait();
    toast('授权成功','success');
    if(spenderKey==='marketplace'){ S.sellApproved = true; const btn=$('#approveNftBtn'); if(btn) btn.innerHTML='✅ 已授权'; const lb=$('#listItemBtn'); if(lb) lb.disabled=false; }
  }catch(e){ toast(errMsg(e),'error'); }
}
async function revokeNftApproval(nftKey, spenderKey){
  try{
    const nft = mustC(nftKey).connect(S.signer);
    const sp = addrOf(spenderKey);
    toast('正在取消授权…','info');
    await (await nft.setApprovalForAll(sp, false)).wait();
    toast('已取消授权','success');
    if(spenderKey==='marketplace'){ S.sellApproved = false; const btn=$('#approveNftBtn'); if(btn) btn.innerHTML='<i class="fa-solid fa-shield-halved mr-1"></i>授权 NFT'; const lb=$('#listItemBtn'); if(lb) lb.disabled=true; }
  }catch(e){ toast(errMsg(e),'error'); }
}
async function ensure1155Approval(nftKey, spenderKey){
  const nft = mustC(nftKey).connect(S.signer);
  const sp = addrOf(spenderKey);
  if(!sp) throw new Error('未配置 '+spenderKey);
  if(await nft.isApprovedForAll(S.account, sp)) return true;
  const nftName = nftKey==='shards'?'碎片':'精粹';
  const spName = spenderKey==='forgeShop'?'ForgeShop（锻造厂）':spenderKey==='enhanceShop'?'EnhanceShop（强化铺）':spenderKey;
  openModal({html:`
    <div class="py-2">
      <div class="text-lg font-black mb-2"><i class="fa-solid fa-flask text-gold mr-1"></i>授权确认</div>
      <div class="text-[13px] text-muted mb-3">即将授权 <b class="text-gold">${escapeHtml(spName)}</b> 操作您的全部 <b class="text-gold">${escapeHtml(nftName)}</b>。</div>
      <div class="bg-[#0d1526] rounded-lg p-3 text-[12px] text-amber-300 border border-amber-500/30 mb-4">
        <i class="fa-solid fa-triangle-exclamation mr-1"></i>锻造/熔炼/合成需要转移您的 ${escapeHtml(nftName)}，因此需要无限授权。操作完成后可在管理页面取消授权。
      </div>
      <div class="flex gap-2">
        <button onclick="closeModal()" class="btn btn-ghost flex-1">取消</button>
        <button onclick="closeModal();_doNftApproval('${nftKey}','${spenderKey}')" class="btn btn-gold flex-1"><i class="fa-solid fa-check"></i>确认授权</button>
      </div>
    </div>`});
  return false;
}
