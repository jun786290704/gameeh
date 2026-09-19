'use strict';

/* ============ 工具 ============ */
const $ = id => document.getElementById(String(id).replace(/^#/,''));
function escapeHtml(s){ if(s===null||s===undefined) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function fmt(n, d=2){ const x = Number(n); if(!isFinite(x)) return '--'; return x.toLocaleString('zh-CN',{maximumFractionDigits:d}); }
function fmtUnits(wei, dec, d){
  if(wei===null||wei===undefined) return '--';
  try{ const s = ethers.formatUnits(wei, dec===undefined?S.tokenDecimals:dec); return fmt(parseFloat(s), d===undefined?2:d); }catch(e){ return fmt(Number(wei),2); }
}
function bpToPct(bp, digits=2){
  if(bp===null||bp===undefined) return '--';
  const p = Number(bp) / 100;
  return p.toLocaleString('zh-CN',{maximumFractionDigits:digits}) + '%';
}
function shortAddr(a){ if(!a) return '--'; a = String(a); return a.slice(0,6)+'…'+a.slice(-4); }
function heroImg(el){ return 'img/hero_'+(Number(el)%5)+'.png'; }
function monImg(id){ return 'img/mon_'+(Number(id)%10)+'.png'; }
const ELEMENTS = {
  0:{name:'金',icon:'🪙',color:'#f59e0b',soft:'rgba(245,158,11,.14)',border:'rgba(251,191,36,.5)'},
  1:{name:'木',icon:'🌿',color:'#22c55e',soft:'rgba(34,197,94,.14)',border:'rgba(34,197,94,.5)'},
  2:{name:'土',icon:'🪨',color:'#b45309',soft:'rgba(180,83,9,.16)',border:'rgba(180,83,9,.55)'},
  3:{name:'水',icon:'💧',color:'#38bdf8',soft:'rgba(56,189,248,.14)',border:'rgba(56,189,248,.5)'},
  4:{name:'火',icon:'🔥',color:'#ef4444',soft:'rgba(239,68,68,.14)',border:'rgba(239,68,68,.5)'}
};
const ELEMENT_ORDER = [0,1,2,3,4];
const STAR_LABELS = {1:'一星',2:'二星',3:'三星',4:'四星',5:'五星'};
function starLabel(n){ return STAR_LABELS[n]||(n+'星'); }
function elBadge(el){
  const e = ELEMENTS[el]||{name:'?',icon:'❓',color:'#94a3b8',border:'#94a3b8',soft:'rgba(148,163,184,.12)'};
  return `<span class="el-badge" style="color:${e.color};border-color:${e.border};background:${e.soft}">${e.icon} ${e.name}</span>`;
}
function errMsg(e){
  const reason = (e&&e.revert&&e.revert.args&&e.revert.args[0]) || (e&&e.reason) || (e&&e.shortMessage) || (e&&e.message) || '';
  const m = String(reason);
  if(/user rejected|user denied|ACTION_REJECTED/i.test(m)) return '用户取消交易';
  if(/too early/i.test(m)) return '⏳ 太早了：还需等待若干区块';
  if(/too late/i.test(m)) return '⌛ 太晚了：commit 已过期';
  if(/invalid reveal/i.test(m)) return '🔐 secret/salt 与 commit 不匹配';
  if(/already revealed/i.test(m)) return '✅ 已经揭示过了';
  if(/not committer/i.test(m)) return '❌ 不是本人 commit';
  if(/not yours|NotYours|NotYourHero|NotYourWeapon/i.test(m)) return '❌ 不是本人的英雄/武器，或 pending 已被清理';
  if(/MaxHeroesReached/i.test(m)) return '🚫 英雄数量已达上限(4)';
  if(/BonusAlreadyMax|BonusOverCap/i.test(m)) return '🔝 该武器强化已达上限';
  if(/InvalidEssenceTier/i.test(m)) return '🧪 该星级武器不可使用此阶精粹';
  if(/NotInWindow/i.test(m)) return '⏰ 不在 BOSS 攻击窗口期内';
  if(/BossAlreadyDead/i.test(m)) return '💀 BOSS 已被击败';
  if(/TooManyPending/i.test(m)) return '⏳ 待处理操作过多，请先揭示或等待清理';
  if(/NotEnded/i.test(m)) return '⏳ BOSS 轮次尚未结束';
  if(/AlreadySettled/i.test(m)) return '✅ 本轮的奖励已结算过了';
  if(/NoStamina/i.test(m)) return '⚡ 英雄体力不足';
  if(/TooEarly/i.test(m)) return '⏳ BOSS 新一轮需等待 7 天冷却';
  if(/insufficient|transfer amount exceeds/i.test(m)) return '💰 余额或授权不足';
  if(/no matching fragment/i.test(m)) return '🔧 ABI 不匹配，请 Ctrl+F5';
  if(/insufficient funds/i.test(m)) return 'Gas 余额不足';
  if(/nonce/i.test(m)) return 'Nonce 冲突，请刷新';
  return m.length>180 ? m.slice(0,180)+'…' : m;
}
function toast(msg, type='info'){
  const icons = {success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info', warn:'fa-triangle-exclamation'};
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role','status');
  el.innerHTML = `<i class="fa-solid ${icons[type]||icons.info} mt-0.5"></i><div class="flex-1">${escapeHtml(msg)}</div>`;
  el.onclick = ()=>el.remove();
  $('toastStack').appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .4s'; setTimeout(()=>el.remove(),420); }, 4200);
}
function floatText(txt, cls='text-gold'){
  const d = document.createElement('div');
  d.className = 'float-text '+cls;
  d.textContent = txt;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 2000);
}
function openModal({html, cls=''}){
  const root = $('modalRoot');
  root.innerHTML = `<div class="mask" onclick="if(event.target===this)closeModal()"><div class="mbody panel p-5 ${cls}">${html}</div></div>`;
}
function closeModal(){ $('modalRoot').innerHTML=''; }
function skeletonBlock(n=3, cls='h-40'){ return Array.from({length:n}, ()=>`<div class="skeleton ${cls}"></div>`).join(''); }
function withBusy(id, on, label){
  const b = id ? $(id) : null;
  if(b){
    if(on){ b.disabled = true; b.dataset.old = b.innerHTML; b.innerHTML = '<span class="spinner"></span> '+(label||'处理中…'); }
    else { b.disabled = false; if(b.dataset.old){ b.innerHTML = b.dataset.old; } }
    return;
  }
  document.querySelectorAll('.btn').forEach(x=>{
    if(on){ x.dataset.d = x.disabled; x.disabled = true; }
    else { x.disabled = x.dataset.d==='true'; }
  });
  if(on) showGlobalLoading(label||'交易处理中…'); else hideGlobalLoading();
}
function showGlobalLoading(msg){
  let el = $('globalLoading');
  if(!el){
    el = document.createElement('div');
    el.id = 'globalLoading';
    el.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(5,10,20,.6);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;';
    document.body.appendChild(el);
  }
  el.innerHTML = `<div style="background:#1a1d28;border:1px solid #252836;border-radius:16px;padding:24px 32px;text-align:center;"><div class="spinner" style="width:28px;height:28px;border-width:3px;"></div><div style="margin-top:12px;color:#e4e7ed;font-weight:600;font-size:14px;">${escapeHtml(msg||'处理中…')}</div></div>`;
}
function hideGlobalLoading(){ const el = $('globalLoading'); if(el) el.remove(); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
window.addEventListener('error', e=>{
  console.error('[EH-ERR]', e);
  const b = $('errBadge'); if(!b) return;
  b.textContent = e.message||'JS错误'; b.classList.remove('hidden');
  setTimeout(()=>b.classList.add('hidden'), 8000);
});
window.addEventListener('unhandledrejection', e=>{
  console.error('[EH-REJ]', e.reason);
  const b = $('errBadge'); if(!b) return;
  b.textContent = (e.reason&&e.reason.message)||'Promise 错误'; b.classList.remove('hidden');
  setTimeout(()=>b.classList.add('hidden'), 8000);
});
