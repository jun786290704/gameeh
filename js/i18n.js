/* ===== 游戏页面 i18n 翻译器（DOM 覆盖式，不侵入业务 JS） ===== */
window.GAME_RE = [
  [/^英雄#(\d+)$/, m => 'Hero #' + m[1]],
  [/^英雄 #(\d+)$/, m => 'Hero #' + m[1]],
  [/^英雄 #$/, () => 'Hero #'],
  [/^共 (\d+) 位$/, m => 'Total ' + m[1]],
  [/^共 (\d+) \/ (\d+) 把$/, m => m[1] + ' / ' + m[2] + ' weapons'],
  [/^ · 恢复中 (\d+)分(\d+)秒$/, m => ' · recovering ' + m[1] + 'm ' + m[2] + 's'],
  [/^ · 恢复中$/, () => ' · recovering'],
  [/^恢复中$/, () => 'recovering'],
  [/^第 (\d+) 轮$/, m => 'Round ' + m[1]],
  [/^第 (\d+) 轮/, m => 'Round ' + m[1]],
  [/^碎片 (\d+) 不足 10 个$/, m => 'Shard ' + m[1] + ' < 10'],
  [/^碎片 (\d+) 💎$/, m => 'Shard ' + m[1] + ' 💎'],
  [/^精粹 (\d+) 🧪$/, m => 'Essence ' + m[1] + ' 🧪'],
  [/^碎片 #(\d+)$/, m => 'Shard #' + m[1]],
  [/^(\S+)系英雄$/, m => m[1] + ' heroes'],
  [/^（当前 (.+?)）$/, m => ' (current: ' + m[1] + ')' ],
  [/^，范围 (.+?)~(.+?)$/, m => ', range ' + m[1] + '~' + m[2]],
  [/^第 (.+?) 轮$/, m => 'Round ' + m[1]],
  [/^（注意：需距上一轮开启满 7 天）$/, () => '(needs 7-day cooldown since last round)'],
  [/^胜利奖励 ≈ (.+?) EH（按英雄星级\/等级加成，存入金库待领取）$/, m => 'Win reward ≈ ' + m[1] + ' EH (hero bonus, stored in vault)'],
  [/^英雄 #(.+?) vs (.+?) · 战力 (.+?) VS (.+?)$/, m => 'Hero #' + m[1] + ' vs ' + m[2] + ' · Power ' + m[3] + ' VS ' + m[4]],
  [/^武器 #(\d+) 强化成功，\+(\S+)（当前 \+(\S+)）$/, m => 'Weapon #' + m[1] + ' enhanced +' + m[2] + ' (now +' + m[3] + ')'],
  [/^已清理 (\d+) 条失效的待揭示记录$/, m => 'Cleaned ' + m[1] + ' stale pending records'],
  [/^共 (\d+) 项$/, m => 'Total ' + m[1] + ' items'],
  [/^钱包当前位于链 (\d+)，请在钱包中切换到 (.+?)（chainId (\d+)）$/, m => 'Wallet on chain ' + m[1] + ', switch to ' + m[2] + ' (chainId ' + m[3] + ')'],
  [/^奖励基数 ×0.01 = 基础 EH（≈(.+?) EH，英雄加成后更高）$/, m => 'Reward base ×0.01 = base EH (≈' + m[1] + ' EH, higher with hero bonus)'],
  [/^ 分钟\/点（(.+?) 秒）$/, m => ' min/point (' + m[1] + 's)'],
  [/^(\d+) 天$/, m => m[1] + 'd'],
  [/^存入 (\d+)$/, m => 'Deposit ' + m[1]],
  [/^铸造 (\d+)$/, m => 'Mint ' + m[1]],
  [/^销毁我的 (\d+)$/, m => 'Burn my ' + m[1]],
  [/^确认销毁 (\d+)$/, m => 'Confirm burn ' + m[1]],
  [/^ 个区块后自动揭示$/, m => ' blocks until reveal'],
  [/^：已提交（Tx: (.+?)），等待确认…$/, m => ': submitted (Tx: ' + m[1] + '), waiting…'],
  [/^：揭示交易已提交…$/, () => ': reveal tx submitted…'],
  [/^ 揭示失败：(.+)$/, m => ' reveal failed: ' + m[1]],
  [/^ 揭示成功！$/, () => ' revealed!'],
  [/^ 升级成功！$/, () => ' leveled up!'],
  [/^ 成功$/, () => ' succeeded'],
  [/^ 缺少管理 ABI$/, () => ' missing admin ABI'],
  [/^ 伤害$/, () => ' damage'],
  [/^ 模式$/, () => ' mode'],
  [/^确认取消 (.+?) → (.+?) 的授权？$/, m => 'Revoke allowance ' + m[1] + ' → ' + m[2] + '?'],
  [/^确认撤销对 (.+?) 的 (.+?) 授权？$/, m => 'Revoke ' + m[2] + ' allowance for ' + m[1] + '?'],
  [/^请输入金库地址：$/, () => 'Enter vault address:'],
  [/^请输入铸造者地址：$/, () => 'Enter minter address:'],
  [/^请输入 game 合约地址：$/, () => 'Enter game contract address:'],
  [/^请输入 registry 地址：$/, () => 'Enter registry address:'],
  [/^请输入 blacksmith 合约地址：$/, () => 'Enter blacksmith address:'],
  [/^过期块数（100~1000）：$/, () => 'Expiry blocks (100~1000):'],
  [/^每人待处理上限：$/, () => 'Max pending per player:'],
  [/^过期块数：$/, () => 'Expiry blocks:'],
  [/^过期块数（100~450）：$/, () => 'Expiry blocks (100~450):'],
  [/^锻造 commitId：$/, () => 'Forge commitId:'],
];

window.GAME_I18N = (function () {
  var LANG_KEY = 'eh_lang';
  var LANGS = ['zh', 'en', 'ja', 'es'];
  var LABELS = { zh: '中文', en: 'EN', ja: '日本語', es: 'ES' };
  var TITLES = {
    zh: '元素英雄 · RPG',
    en: 'Element Heroes · RPG',
    ja: 'エレメントヒーローズ · RPG',
    es: 'Element Heroes · RPG'
  };
  var cur = 'zh';
  try { cur = localStorage.getItem(LANG_KEY) || 'zh'; } catch (e) {}
  if (LANGS.indexOf(cur) < 0) cur = 'zh';

  function trText(raw) {
    if (!raw || cur === 'zh' || !/[\u4e00-\u9fff]/.test(raw)) return raw;
    var D = (window.GAME_DICT || {})[cur] || {};
    if (D[raw] != null) return D[raw];
    var tr = raw.trim();
    if (tr !== raw && D[tr] != null) return raw.replace(tr, D[tr]);
    var RE = window.GAME_RE || [];
    for (var i = 0; i < RE.length; i++) {
      var m = raw.match(RE[i][0]);
      if (m) {
        var f = RE[i][1];
        return typeof f === 'function' ? f(m) : raw.replace(RE[i][0], f);
      }
    }
    return raw;
  }

  var busy = false;
  function translateNode(n) {
    if (busy || cur === 'zh') return;
    busy = true;
    try {
      if (n.nodeType === 3) {
        var v = trText(n.nodeValue);
        if (v !== n.nodeValue) n.nodeValue = v;
      } else if (n.nodeType === 1) {
        var els = n.querySelectorAll ? n.querySelectorAll('*') : [];
        for (var i = 0; i < els.length; i++) {
          var e = els[i];
          // 直接文本子节点（兼容含 icon 的混合内容，如 <button><i></i>英雄</button>）
          var cns = e.childNodes;
          for (var c = 0; c < cns.length; c++) {
            if (cns[c].nodeType === 3) {
              var tv = trText(cns[c].nodeValue);
              if (tv !== cns[c].nodeValue) cns[c].nodeValue = tv;
            }
          }
          ['title', 'placeholder', 'aria-label'].forEach(function (a) {
            if (e.hasAttribute(a)) {
              var av = trText(e.getAttribute(a));
              if (av !== e.getAttribute(a)) e.setAttribute(a, av);
            }
          });
        }
      }
    } finally { busy = false; }
  }

  function translateRoot() {
    var b = document.body;
    if (!b) return;
    translateNode(b);
  }

  // 观察动态渲染
  var mo = null;
  function startObserver() {
    if (mo || !document.body) return;
    mo = new MutationObserver(function (muts) {
      var pending = [];
      for (var i = 0; i < muts.length; i++) {
        var t = muts[i].type;
        if (t === 'childList') {
          for (var j = 0; j < muts[i].addedNodes.length; j++) {
            var an = muts[i].addedNodes[j];
            if (an.nodeType === 1 || an.nodeType === 3) pending.push(an);
          }
        } else if (t === 'characterData') {
          if (muts[i].target && muts[i].target.nodeType === 3) pending.push(muts[i].target);
        }
      }
      if (pending.length && cur !== 'zh') {
        busy = false;
        for (var k = 0; k < pending.length; k++) translateNode(pending[k]);
      }
    });
    mo.observe(document.body, { childList: true, characterData: true, subtree: true });
  }

  function setLang(l) {
    if (LANGS.indexOf(l) < 0) l = 'zh';
    cur = l;
    try { localStorage.setItem(LANG_KEY, cur); } catch (e) {}
    // 整页重载以正确还原/应用语言（避免反向翻译残留）
    location.reload();
  }

  function init() {
    // 注入语言下拉选择器（header 右端：主按钮显示当前语言，点击展开选择）
    var styleEl = document.createElement('style');
    styleEl.textContent = '.lang-drop{position:relative;display:inline-flex;margin-left:2px;align-items:center;z-index:130}.lang-main{display:inline-flex;align-items:center;gap:7px;border:0;background:rgba(7,12,24,.72);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:700;padding:6px 13px;border-radius:999px;cursor:pointer;font-family:inherit;letter-spacing:.03em;transition:all .18s;line-height:1}.lang-main:hover{border-color:rgba(251,191,36,.55)}.lang-main .caret{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid rgba(255,255,255,.75);transition:transform .18s}.lang-drop.open .caret{transform:rotate(180deg)}.lang-menu{position:absolute;top:calc(100% + 6px);right:0;min-width:132px;background:rgba(7,12,24,.95);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:4px;display:none;flex-direction:column;gap:2px;box-shadow:0 12px 30px rgba(0,0,0,.55);backdrop-filter:blur(8px)}.lang-drop.open .lang-menu{display:flex}.lang-menu button{border:0;background:transparent;color:rgba(255,255,255,.78);font-size:13px;font-weight:600;padding:8px 14px;border-radius:8px;cursor:pointer;font-family:inherit;text-align:left;transition:all .15s;white-space:nowrap}.lang-menu button:hover{background:rgba(251,191,36,.14);color:#f7c948}.lang-menu button.on{background:linear-gradient(135deg,#f7c948,#ff9f43);color:#1a1305;font-weight:700}';
    document.head.appendChild(styleEl);
    var connectBtn = document.getElementById('connectBtn');
    var wrap = document.createElement('div');
    wrap.id = 'langBtn';
    wrap.className = 'lang-drop';
    var main = document.createElement('button');
    main.type = 'button';
    main.className = 'lang-main';
    main.innerHTML = '<span>' + LABELS[cur] + '</span><span class="caret"></span>';
    main.onclick = function (e) {
      e.stopPropagation();
      wrap.classList.toggle('open');
    };
    wrap.appendChild(main);
    var menu = document.createElement('div');
    menu.className = 'lang-menu';
    LANGS.forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = LABELS[l] + (l === cur ? ' ✓' : '');
      b.className = l === cur ? 'on' : '';
      b.onclick = (function (ll) { return function () { if (ll !== cur) setLang(ll); }; })(l);
      menu.appendChild(b);
    });
    wrap.appendChild(menu);
    document.addEventListener('click', function () { wrap.classList.remove('open'); });
    if (connectBtn && connectBtn.parentNode) connectBtn.parentNode.insertBefore(wrap, connectBtn);
    document.title = TITLES[cur] || TITLES.zh;
    translateRoot();
    startObserver();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__gameLang = function(){ return cur; };
  return { setLang: setLang, getLang: function(){ return cur; } };
})();
