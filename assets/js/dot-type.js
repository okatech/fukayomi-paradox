/* =========================================================
   DOT MATRIX TYPE ENGINE
   英文表示を 5x7 ビットマップから DOM のドットとして描画する。
   LEDパネル／ドット絵風の英文タイポを、画像もWebフォントも使わずに再現する。

   使い方:
     <span class="dot" data-dot="PARADOX"></span>
     <span class="dot" data-dot="LISTEN" data-dot-scale="s"></span>

   data-dot-scale: s（小） / m（既定） / l（大）
   ========================================================= */
(function () {
  'use strict';

  // 5列 x 7行。各文字は7つの5bit値（左が最上位ビット）。
  var GLYPHS = {
    'A': [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
    'B': [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
    'C': [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E],
    'D': [0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E],
    'E': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F],
    'F': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
    'G': [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0E],
    'H': [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
    'I': [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
    'J': [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C],
    'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
    'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
    'M': [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11],
    'N': [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
    'O': [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
    'P': [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
    'Q': [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D],
    'R': [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
    'S': [0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E],
    'T': [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
    'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
    'V': [0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04],
    'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
    'X': [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
    'Y': [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04],
    'Z': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
    '0': [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
    '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
    '2': [0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F],
    '3': [0x1F, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0E],
    '4': [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
    '5': [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
    '6': [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E],
    '7': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
    '8': [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
    '9': [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
    '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x0C, 0x0C],
    ',': [0x00, 0x00, 0x00, 0x00, 0x0C, 0x0C, 0x08],
    '-': [0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00],
    '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
    '?': [0x0E, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
    '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
    ':': [0x00, 0x0C, 0x0C, 0x00, 0x0C, 0x0C, 0x00],
    '&': [0x0C, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0D],
    '+': [0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00],
    '*': [0x00, 0x0A, 0x04, 0x1F, 0x04, 0x0A, 0x00],
    '#': [0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A],
    '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
    ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08]
  };

  var COLS = 5, ROWS = 7;

  /* data-dot-scale ごとのドット径（px）。上限＝理想サイズ、下限＝これ以上は縮めない。
     実際の値は、置かれた場所の幅に合わせて自動調整する（fit を参照）。 */
  var SCALE = {
    xs: [2.2, 3.4],
    s:  [2.4, 4.2],
    m:  [2.8, 6.5],
    l:  [3.4, 10],
    xl: [4.0, 15],
    '': [2.6, 5]
  };
  /* 1文字の幅（ドット径 u を単位とした値）。
     5列 + 列間の隙間4つ（u/3）= 5 + 4/3 */
  var CHAR_UNITS = COLS + (COLS - 1) / 3;
  var CHAR_GAP_UNITS = 1.6;   /* .dot-word の gap */

  /* 置かれた場所の幅を測り、はみ出さない最大のドット径を割り当てる。
     一語で折り返せない語（PARADOX など）が溢れるのを防ぐ。 */
  function fit(el) {
    var key = el.getAttribute('data-dot-scale') || '';
    var range = SCALE[key] || SCALE[''];
    var words = el.querySelectorAll('.dot-word');
    if (!words.length) return;

    var widest = 0;
    words.forEach(function (w) {
      var n = w.children.length;
      var units = n * CHAR_UNITS + (n - 1) * CHAR_GAP_UNITS;
      if (units > widest) widest = units;
    });
    if (widest <= 0) return;

    var parent = el.parentElement;
    var avail = 0;
    if (parent) {
      var cs = getComputedStyle(parent);
      avail = parent.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
    }
    if (!avail || avail <= 0) return;

    var u = Math.min(range[1], avail / widest);
    u = Math.max(range[0], u);
    el.style.setProperty('--u', Math.round(u * 100) / 100 + 'px');
  }

  function fitAll(root) {
    (root || document).querySelectorAll('.dot.is-rendered').forEach(fit);
  }

  function render(el) {
    var text = (el.getAttribute('data-dot') || el.textContent || '').toUpperCase();
    if (!text) return;

    // スクリーンリーダー用に元のテキストを保持
    // （aria-hidden が付いている場合は、別途テキストが用意されているので触らない）
    if (el.getAttribute('aria-hidden') !== 'true') {
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', text);
      el.setAttribute('role', 'img');
    }
    el.textContent = '';

    var chars = text.split('');
    var frag = document.createDocumentFragment();
    var index = 0;
    var panel = el.classList.contains('is-panel');
    var word = null;

    function newWord() {
      word = document.createElement('span');
      word.className = 'dot-word';
      frag.appendChild(word);
      return word;
    }

    chars.forEach(function (ch) {
      if (ch === ' ') {
        // 単語の区切り。ここで改行できるようにワードを分ける。
        word = null;
        return;
      }
      if (!word) newWord();

      var g = GLYPHS[ch];
      var cell = document.createElement('span');
      cell.className = 'dot-char';

      if (!g) {
        // 未定義文字はそのまま表示（フォールバック）
        cell.className = 'dot-fallback';
        cell.textContent = ch;
        word.appendChild(cell);
        return;
      }

      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var on = (g[r] >> (COLS - 1 - c)) & 1;
          // 消灯ドットはパネル表現のときだけ生成する。
          // 通常は点灯ドットだけを明示配置し、DOM ノード数を大きく減らす。
          if (!on && !panel) continue;
          var d = document.createElement('i');
          d.className = on ? 'dot-on' : 'dot-off';
          d.style.gridArea = (r + 1) + ' / ' + (c + 1);
          // 左上から右下へ順に灯る波
          if (on) d.style.setProperty('--d', ((index * 7) + (r * 2) + c) * 9 + 'ms');
          cell.appendChild(d);
        }
      }
      index++;
      word.appendChild(cell);
    });

    el.appendChild(frag);
    el.classList.add('is-rendered');
    fit(el);
  }

  function renderAll(root) {
    (root || document).querySelectorAll('.dot:not(.is-rendered)').forEach(render);
  }

  /* 画面幅が変わったら測り直す */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { fitAll(); }, 120);
  });

  window.DotType = { render: render, renderAll: renderAll, fit: fit, fitAll: fitAll, glyphs: GLYPHS };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { renderAll(); });
  } else {
    renderAll();
  }
  // Webフォント読み込みなどで幅が変わることがあるため、確定後にもう一度合わせる
  window.addEventListener('load', function () { fitAll(); });
})();
