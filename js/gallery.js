'use strict';

/* ============ 图鉴（英雄 + 怪物） ============ */
async function renderGallery(){
  const el = $('#galleryGrid');
  if(!el) return;
  try{
    // 英雄图鉴立即渲染（无需链上数据）
    const heroCards = [0,1,2,3,4].map(elN=>{
      const e = ELEMENTS[elN]||ELEMENTS[0];
      const cnt = (S.heroes||[]).filter(h=>Number(h.element)===elN).length;
      return `<div class="gallery-card char3d-card" style="border-color:${e.border}55;">
        <div class="gallery-art char3d-wrap" style="background:radial-gradient(circle at 50% 30%, ${e.soft}, #0d1526 78%);"><img class="char3d" src="${heroImg(elN)}" alt="${e.name}系英雄"></div>
        <div class="gallery-info">
          <div class="gallery-name" style="color:${e.color};">${e.icon} ${e.name}系英雄</div>
          <div class="gallery-sub">${e.name}之力的守护者 · 五行相生相克</div>
          <div class="gallery-stats">我的英雄 <b class="text-gold">${cnt}</b> 位</div>
        </div>
      </div>`;
    }).join('');
    el.innerHTML = `
      <div class="gallery-sec-title"><i class="fa-solid fa-user-ninja text-gold mr-2"></i>英雄图鉴 · 五行角色</div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">${heroCards}</div>
      <div class="gallery-sec-title"><i class="fa-solid fa-biohazard text-gold mr-2"></i>怪物图鉴<span class="badge bg-[#1a2740] text-muted ml-2" id="galleryMonCount">…</span></div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" id="galleryMons">
        <div class="col-span-full text-center py-6 text-muted text-[13px]"><span class="spinner inline-block mr-2"></span>正在加载怪物图鉴…</div>
      </div>`;
    // 怪物数据异步填充
    try{
      if(!(S.monsters||[]).length){ await fetchMonsters(); }
    }catch(e){}
    const monGrid = $('#galleryMons');
    const cnt = $('#galleryMonCount');
    if(cnt) cnt.textContent = (S.monsters||[]).length;
    if(!monGrid) return;
    if(!(S.monsters||[]).length){
      monGrid.innerHTML = '<div class="col-span-full text-center py-6 text-red-400 text-[13px]">怪物数据加载失败</div><div class="col-span-full text-center pb-4"><button class="btn btn-sm btn-primary" onclick="retryMonsters()"><i class="fa-solid fa-rotate mr-1"></i>重新加载</button></div>';
      return;
    }
    const monCards = S.monsters.map(m=>{
      const e = ELEMENTS[m.element]||ELEMENTS[0];
      const diff = m.power<500?['简单','#22c55e']:m.power<2000?['普通','#eab308']:m.power<8000?['困难','#f97316']:['噩梦','#ef4444'];
      return `<div class="gallery-card char3d-card" style="border-color:${e.border}55;">
        <div class="gallery-art char3d-wrap" style="background:radial-gradient(circle at 50% 30%, ${e.soft}, #0d1526 78%);"><img class="char3d" src="${monImg(m.id)}" alt="${m.name}"></div>
        <div class="gallery-info">
          <div class="gallery-name">${m.name}</div>
          <div class="gallery-sub">${elBadge(m.element)} <span style="color:${diff[1]};">${diff[0]}</span></div>
          <div class="gallery-stats"><span class="text-red-400">⚔${fmt(m.power,0)}</span><span class="text-gold">💰${fmt(m.reward*0.01,2)}</span><span class="text-green-400">+${m.xp} XP</span></div>
        </div>
      </div>`;
    }).join('');
    monGrid.innerHTML = monCards;
  }catch(e){
    el.innerHTML = '<div class="text-center py-8 text-red-400 text-[13px]">图鉴加载失败：'+escapeHtml(errMsg(e))+'</div>';
  }
}

async function retryMonsters(){
  const monGrid = $('#galleryMons');
  const cnt = $('#galleryMonCount');
  if(monGrid) monGrid.innerHTML = '<div class="col-span-full text-center py-6 text-muted text-[13px]"><span class="spinner inline-block mr-2"></span>正在重新加载…</div>';
  await fetchMonsters();
  const g = $('#galleryGrid');
  if(g) renderGallery();
}
