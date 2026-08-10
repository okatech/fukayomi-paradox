/* =========================================================
   深読みパラドックス — main.js
   ローディング / イントロ / メニュー / スクロール演出 /
   エピソード概要ファインダー / リンク生成
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var body = document.body;
  var STORE_KEY = 'fp-mode';

  /* ---------- スクロール位置の制御 ----------
     イントロ表示中に背後がスクロールできてしまうと、
     モードを選んだ瞬間にページ途中から始まってしまうため、
     入場するまでは最上部に固定しておく。 */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  var pendingHash = location.hash && location.hash.length > 1 ? location.hash : '';

  var locks = 0;
  function lockScroll(on) {
    locks = Math.max(0, locks + (on ? 1 : -1));
    body.classList.toggle('is-locked', locks > 0);
  }

  function jumpTop() {
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  }

  /* ---------- ローディング → イントロ ---------- */
  var savedMode = null;
  try { savedMode = localStorage.getItem(STORE_KEY); } catch (e) {}

  var entered = false;

  if (!savedMode) {
    lockScroll(true);
    jumpTop();
  }

  window.addEventListener('load', function () {
    if (!entered) jumpTop();
    setTimeout(function () { body.classList.add('loaded'); }, 600);
  });

  /* ---------- モード ---------- */
  function applyMode(mode, persist) {
    var deep = mode === 'deep';
    body.classList.toggle('deep', deep);
    if (persist) {
      try { localStorage.setItem(STORE_KEY, deep ? 'deep' : 'plain'); } catch (e) {}
    }
    document.querySelectorAll('[data-mode]').forEach(function (b) {
      if (b.hasAttribute('aria-pressed')) {
        b.setAttribute('aria-pressed', String(b.dataset.mode === (deep ? 'deep' : 'plain')));
      }
    });
    if (typeof EPISODES !== 'undefined' && EPISODES && EPISODES.length) render();
  }

  function enter(mode) {
    entered = true;
    applyMode(mode, true);
    body.classList.add('entered');
    lockScroll(false);
    // イントロを抜けた瞬間は必ず最上部から。
    // ハッシュ付きで来た場合だけ、遷移が落ち着いてから該当位置へ送る。
    jumpTop();
    if (pendingHash) {
      var target = document.querySelector(pendingHash);
      if (target) {
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setTimeout(function () {
          target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        }, reduce ? 0 : 900);
      }
      pendingHash = '';
    }
    revealAll();
  }

  document.querySelectorAll('#intro [data-mode]').forEach(function (b) {
    b.addEventListener('click', function () { enter(b.dataset.mode); });
  });

  if (savedMode) {
    // 2回目以降はイントロを飛ばす
    entered = true;
    body.classList.add('entered');
    applyMode(savedMode, false);
    if (!pendingHash) jumpTop();
  } else {
    // 選択前は既定の見え方にするだけで、保存はしない。
    // ここで保存すると、リロード時にイントロが二度と出なくなる。
    applyMode('plain', false);
  }

  function toggleMode() {
    applyMode(body.classList.contains('deep') ? 'plain' : 'deep', true);
  }

  var modeBtn = document.getElementById('menu-mode');
  if (modeBtn) modeBtn.addEventListener('click', toggleMode);

  document.querySelectorAll('#mode-switch [data-mode], .menu-mode [data-mode]').forEach(function (s) {
    s.addEventListener('click', function () { applyMode(s.dataset.mode, true); });
  });

  /* ---------- メニュー ---------- */
  var menuBtn = document.getElementById('menu-btn');
  var menu = document.getElementById('menu');

  var menuOpen = false;
  function setMenu(open) {
    if (open === menuOpen) return;
    menuOpen = open;
    body.classList.toggle('menu-open', open);
    lockScroll(open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    // 閉じている間はキーボードのフォーカスが中に入らないようにする
    if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
  }
  menu.setAttribute('inert', '');

  menuBtn.addEventListener('click', function () {
    if (!entered) return; // イントロ表示中は操作させない
    setMenu(!menuOpen);
  });
  menu.querySelectorAll('a[data-nav]').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen) setMenu(false);
  });

  // メニュー項目のスタガー
  menu.querySelectorAll('li').forEach(function (li, i) {
    var el = li.firstElementChild;
    if (el) el.style.transitionDelay = (0.06 * i + 0.12) + 's';
  });

  /* ---------- スクロールフェードイン ---------- */
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('on');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  }

  function observe(root) {
    (root || document).querySelectorAll('.js-fi:not(.on)').forEach(function (el, i) {
      if (io) {
        el.style.transitionDelay = (Math.min(i, 6) * 0.08) + 's';
        io.observe(el);
      } else {
        el.classList.add('on');
      }
    });
    lightDots(root);
  }

  /* ドットタイポを画面内に入った順に点灯させる */
  var dotIo = null;
  if ('IntersectionObserver' in window) {
    dotIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-lit');
          dotIo.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.2 });
  }
  function lightDots(root) {
    (root || document).querySelectorAll('.dot.is-anim:not(.is-lit)').forEach(function (el) {
      if (dotIo) dotIo.observe(el); else el.classList.add('is-lit');
    });
  }

  function revealAll() {
    document.querySelectorAll('.hero .js-fi').forEach(function (el) { el.classList.add('on'); });
    document.querySelectorAll('.hero .dot.is-anim').forEach(function (el) { el.classList.add('is-lit'); });
  }
  observe();

  /* ---------- リンク生成 ---------- */
  var LINK_ORDER = ['podcast', 'youtube', 'x', 'shop'];
  var LINK_EN = { podcast: 'PODCAST', youtube: 'YOUTUBE', x: 'X', shop: 'SHOP' };

  var grid = document.getElementById('link-grid');
  var footLinks = document.getElementById('foot-links');

  LINK_ORDER.forEach(function (key) {
    var d = (CFG.links || {})[key];
    if (!d) return;

    // カードは <a> の入れ子を避けるため div にし、
    // 主リンクを疑似要素でカード全面に広げる。
    var card = document.createElement('div');
    card.className = 'link-card js-fi';

    var url = safeUrl(d.url) || '#';
    var ext = url !== '#';

    var html =
      '<a class="link-main" href="' + esc(url) + '"' +
        (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
        '<span class="link-en"><span class="dot dot-hover is-panel" data-dot-scale="l" data-dot="' + LINK_EN[key] + '"></span></span>' +
        '<span class="link-note">' + esc(d.note || '') + '</span>' +
      '</a>';
    if (d.sub && d.sub.length) {
      html += '<div class="link-sub">' + d.sub.map(function (s) {
        var su = safeUrl(s.url) || '#';
        return '<a href="' + esc(su) + '"' + (su !== '#' ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + esc(s.label) + '</a>';
      }).join('') + '</div>';
    }
    html += '<span class="link-arrow" aria-hidden="true">↗</span>';
    card.innerHTML = html;

    grid.appendChild(card);

    var li = document.createElement('li');
    var fu = safeUrl(d.url) || '#';
    li.innerHTML = '<a href="' + esc(fu) + '"' + (fu !== '#' ? ' target="_blank" rel="noopener noreferrer"' : '') +
      '><span class="dot" data-dot-scale="xs" data-dot="' + LINK_EN[key] + '"></span></a>';
    footLinks.appendChild(li);
  });

  if (window.DotType) {
    window.DotType.renderAll(grid);
    window.DotType.renderAll(footLinks);
  }
  // 生成後に監視へ登録しないと、フェードイン用の .on が付かず
  // リンクカードが opacity:0 のまま表示されない。
  observe(grid);

  var contactBtn = document.getElementById('contact-btn');
  if (contactBtn && CFG.contact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(CFG.contact)) contactBtn.href = 'mailto:' + CFG.contact;

  /* ---------- エピソード概要ファインダー ---------- */
  var listEl = document.getElementById('ep-list');
  var emptyEl = document.getElementById('ep-empty');
  var tagbar = document.getElementById('tagbar');
  var countEl = document.getElementById('count');
  var qEl = document.getElementById('q');

  var EPISODES = [];
  var activeTags = new Set();
  var query = '';

  fetch('assets/data/episodes.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      EPISODES = data.slice().sort(function (a, b) {
        var ap = a.status === 'planned' ? 1 : 0;
        var bp = b.status === 'planned' ? 1 : 0;
        if (ap !== bp) return ap - bp;          // 配信済みを先に
        return ap ? a.no - b.no : b.no - a.no;  // 企画中は昇順、配信済みは新しい順
      });
      buildTags();
      render();
    })
    .catch(function () {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyEl.innerHTML = 'エピソードを読み込めませんでした。<br>ローカルで開いている場合は簡易サーバー経由でご覧ください。';
    });

  function buildTags() {
    var all = [];
    EPISODES.forEach(function (e) {
      (e.tags || []).forEach(function (t) { if (all.indexOf(t) < 0) all.push(t); });
    });
    all.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tag';
      b.textContent = t;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        if (activeTags.has(t)) activeTags.delete(t); else activeTags.add(t);
        b.classList.toggle('on', activeTags.has(t));
        b.setAttribute('aria-pressed', String(activeTags.has(t)));
        render();
      });
      tagbar.appendChild(b);
    });
  }

  function haystack(e) {
    return [
      e.title, e.lead, e.leadDeep,
      (e.tags || []).join(' '), (e.keywords || []).join(' '),
      (e.points || []).join(' '), (e.pointsDeep || []).join(' '),
      (e.chapters || []).map(function (c) { return c.h; }).join(' ')
    ].join(' ').toLowerCase();
  }

  function filtered() {
    return EPISODES.filter(function (e) {
      if (activeTags.size) {
        var tags = e.tags || [];
        var hit = false;
        activeTags.forEach(function (t) { if (tags.indexOf(t) >= 0) hit = true; });
        if (!hit) return false;
      }
      if (query && haystack(e).indexOf(query) < 0) return false;
      return true;
    });
  }

  function render() {
    var items = filtered();
    // 破棄する要素を監視から外す（再描画のたびに監視対象が増え続けるのを防ぐ）
    if (io) listEl.querySelectorAll('.js-fi').forEach(function (el) { io.unobserve(el); });
    if (dotIo) listEl.querySelectorAll('.dot.is-anim').forEach(function (el) { dotIo.unobserve(el); });
    listEl.innerHTML = '';
    emptyEl.hidden = items.length > 0;
    countEl.textContent = items.length + ' / ' + EPISODES.length;

    items.forEach(function (e) {
      listEl.appendChild(card(e));
    });
    observe(listEl);
    if (window.DotType) window.DotType.renderAll(listEl);
  }

  function card(e) {
    var li = document.createElement('li');
    li.className = 'ep js-fi';
    var id = 'ep-body-' + e.no;
    var planned = e.status === 'planned';
    var deep = body.classList.contains('deep');

    var lead = (deep && e.leadDeep) ? e.leadDeep : e.lead;
    var points = (deep && e.pointsDeep && e.pointsDeep.length) ? e.pointsDeep : e.points;

    var meta = planned
      ? '<span class="ep-status">企画中</span>'
      : esc(fmtDate(e.date)) + '<br>' + esc(e.duration || '');

    var head = document.createElement('button');
    head.type = 'button';
    head.className = 'ep-head';
    head.setAttribute('aria-expanded', 'false');
    head.setAttribute('aria-controls', id);
    head.innerHTML =
      '<div class="ep-meta"><span class="no dot" data-dot-scale="s" data-dot="' +
        esc((planned ? 'PLAN ' : 'EP ') + pad(e.no)) + '"></span>' +
      meta + '</div>' +
      '<div><h3 class="ep-title">' + esc(e.title) + '</h3>' +
      '<p class="ep-lead">' + esc(lead || '') + '</p>' +
      '<div class="ep-tags">' + (e.tags || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div></div>' +
      '<span class="ep-toggle" aria-hidden="true"></span>';

    var actions = linkBtn(e.links && e.links.podcast, '聴く') +
      linkBtn(e.links && e.links.youtube, '観る');

    var pointsHead = planned
      ? (deep ? 'HYPOTHESES' : 'POINTS')
      : 'POINTS';
    var pointsSub = planned
      ? (deep ? '読みにいく仮説' : 'この回で話すこと')
      : (deep ? 'この回に残った問い' : 'この回の要点');
    var flowHead = planned ? 'OUTLINE' : 'CHAPTERS';
    var flowSub = planned ? '話す順番' : '話の流れ';

    var bodyWrap = document.createElement('div');
    bodyWrap.className = 'ep-body';
    bodyWrap.id = id;
    bodyWrap.innerHTML =
      '<div class="inner"><div class="ep-detail">' +
        '<div class="ep-block">' + blockHead(pointsHead, pointsSub) +
          '<ul class="ep-points">' + (points || []).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
          '<div class="ep-keywords">' + (e.keywords || []).map(function (k) { return '<span>' + esc(k) + '</span>'; }).join('') + '</div>' +
        '</div>' +
        '<div class="ep-block">' + blockHead(flowHead, flowSub) +
          '<ul class="ep-chapters' + (planned ? ' is-outline' : '') + '">' + (e.chapters || []).map(function (c) {
            return '<li>' + (planned ? '' : '<span class="t">' + esc(c.t) + '</span>') + '<span>' + esc(c.h) + '</span></li>';
          }).join('') + '</ul>' +
        '</div>' +
        (actions ? '<div class="ep-actions">' + actions + '</div>' : '') +
      '</div></div>';

    head.addEventListener('click', function () {
      var open = li.classList.toggle('open');
      head.setAttribute('aria-expanded', String(open));
    });

    li.appendChild(head);
    li.appendChild(bodyWrap);
    return li;
  }

  function blockHead(en, ja) {
    return '<h4><span class="dot" data-dot-scale="xs" data-dot="' + esc(en) + '"></span>' +
      '<span class="h4-ja">' + esc(ja) + '</span></h4>';
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function linkBtn(url, label) {
    var u = safeUrl(url);
    if (!u || u === '#') return '';
    return '<a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '<span class="mk">◑</span></a>';
  }

  function fmtDate(s) {
    if (!s) return '';
    var p = s.split('-');
    return p[0] + '.' + p[1] + '.' + p[2];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* href に入れてよい URL かを検証する。
     javascript: や data: を弾き、想定外のスキームは無効化する。 */
  function safeUrl(url) {
    if (!url) return '';
    var u = String(url).trim();
    if (u === '#') return '#';
    if (/^(https?:|mailto:|\/|\.\/|#)/i.test(u) && !/^javascript:/i.test(u)) return u;
    return '';
  }

  var timer = null;
  qEl.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      query = qEl.value.trim().toLowerCase();
      render();
    }, 150);
  });
})();
