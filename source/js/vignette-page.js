/* vignette-page.js —— 即刻短文页（/vignette/）的交互
 *
 * 页面在构建期就把数据写进 HTML 了，这里不请求任何接口：
 *   1) 相对时间：把 <time> 里的 2025-02-18 换成「1年前」
 *   2) 加载更多：先渲染全部，默认只露 perPage 条，点一次放一批
 *   3) 图集翻页：一屏两张，左右按钮 / 触屏滑动，首尾相接
 *   4) 图片灯箱：点图看大图，同一条说说的图左右切换
 *
 * 点赞不在这里做：容器带 data-zan-scope="content"，交给 zan.js（Sugar-Box）。
 */
(function () {
  'use strict';

  var cfg = window.VIGNETTE_CONFIG || {};
  var PER_PAGE = parseInt(cfg.perPage, 10) || 8;

  /* ---------- 1. 相对时间 ---------- */
  function relative(iso) {
    if (!iso) return '';
    var t = new Date(iso + 'T00:00:00');
    if (isNaN(t.getTime())) return '';
    var diff = Date.now() - t.getTime();
    if (diff < 0) return '刚刚';
    var min = 60 * 1000, hour = 60 * min, day = 24 * hour, month = 30 * day, year = 365 * day;
    if (diff < min) return '刚刚';
    if (diff < hour) return Math.floor(diff / min) + '分钟前';
    if (diff < day) return Math.floor(diff / hour) + '小时前';
    if (diff < month) return Math.floor(diff / day) + '天前';
    if (diff < year) return Math.floor(diff / month) + '个月前';
    return Math.floor(diff / year) + '年前';
  }

  function fillTime(root) {
    (root || document).querySelectorAll('.essay-ago').forEach(function (el) {
      var txt = relative(el.getAttribute('datetime'));
      if (txt) el.textContent = txt;
    });
  }

  /* ---------- 2. 加载更多 ---------- */
  function initMore() {
    var list = document.getElementById('essay-list');
    var btn = document.getElementById('essay-more');
    var wrap = document.getElementById('essay-more-wrap');
    if (!list || !btn || !wrap) return;

    var items = Array.prototype.slice.call(list.querySelectorAll('.essay-item'));

    function revealBatch() {
      var hidden = items.filter(function (li) { return li.classList.contains('is-hidden'); });
      hidden.slice(0, PER_PAGE).forEach(function (li, i) {
        /* 一条一条错开出来，别整块闪现 */
        li.style.animationDelay = (i * 40) + 'ms';
        li.classList.remove('is-hidden');
        li.classList.add('is-entering');
      });
      if (!hidden.length || hidden.length <= PER_PAGE) wrap.hidden = true;
      fillTime(list);
    }

    btn.addEventListener('click', function () {
      btn.classList.add('is-loading');
      /* 留 180ms 给按钮的加载态，体感上有个反馈 */
      setTimeout(function () {
        revealBatch();
        btn.classList.remove('is-loading');
      }, 180);
    });

    if (items.filter(function (li) { return li.classList.contains('is-hidden'); }).length === 0) {
      wrap.hidden = true;
    }
  }

  /* ---------- 3. 图集翻页：一屏两张，首尾相接 ---------- */
  function initGalleries() {
    document.querySelectorAll('.essay-gallery--multi').forEach(function (g) {
      var track = g.querySelector('.essay-gallery-track');
      if (!track) return;
      var screens = track.children.length;
      if (screens < 2) return;

      var dots = g.querySelectorAll('.essay-gallery-dots i');
      var idx = 0;

      function go(n) {
        idx = (n + screens) % screens;
        track.style.transform = 'translateX(' + (-idx * 100) + '%)';
        Array.prototype.forEach.call(dots, function (d, i) {
          d.classList.toggle('is-active', i === idx);
        });
      }

      var prev = g.querySelector('.essay-gallery-nav--prev');
      var next = g.querySelector('.essay-gallery-nav--next');
      if (prev) prev.addEventListener('click', function () { go(idx - 1); });
      if (next) next.addEventListener('click', function () { go(idx + 1); });

      /* 触屏再加一条左右滑，和按钮殊途同归 */
      var vp = g.querySelector('.essay-gallery-viewport');
      var startX = null;
      if (vp) {
        vp.addEventListener('touchstart', function (e) {
          startX = e.touches[0].clientX;
        }, { passive: true });
        vp.addEventListener('touchend', function (e) {
          if (startX === null) return;
          var dx = e.changedTouches[0].clientX - startX;
          if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
          startX = null;
        }, { passive: true });
      }
    });
  }

  /* ---------- 4. 灯箱 ---------- */
  var lb = null;
  var lbList = [];
  var lbIdx = 0;
  var lbReturn = null;

  var ICON_PREV = '<i class="fas fa-chevron-left"></i>';
  var ICON_NEXT = '<i class="fas fa-chevron-right"></i>';
  var ICON_CLOSE = '<i class="fas fa-xmark"></i>';

  function ensureLightbox() {
    if (lb) return lb;

    lb = document.createElement('div');
    lb.className = 'essay-lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '图片预览');
    lb.setAttribute('aria-hidden', 'true');
    lb.innerHTML =
      '<button class="elb-btn elb-close" type="button" aria-label="关闭">' + ICON_CLOSE + '</button>' +
      '<button class="elb-btn elb-nav elb-prev" type="button" aria-label="上一张">' + ICON_PREV + '</button>' +
      '<button class="elb-btn elb-nav elb-next" type="button" aria-label="下一张">' + ICON_NEXT + '</button>' +
      '<div class="elb-stage"><img class="elb-img" alt=""></div>' +
      '<div class="elb-bar"><span class="elb-count"></span><span class="elb-dots"></span></div>';
    document.body.appendChild(lb);

    lb.querySelector('.elb-close').addEventListener('click', closeLightbox);
    lb.querySelector('.elb-prev').addEventListener('click', function () { stepLightbox(-1); });
    lb.querySelector('.elb-next').addEventListener('click', function () { stepLightbox(1); });

    /* 点图片外的空白关闭；点图片本身不关，免得误触 */
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('elb-stage')) closeLightbox();
    });

    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') stepLightbox(-1);
      else if (e.key === 'ArrowRight') stepLightbox(1);
      /* 灯箱打开时不希望空格 / PageDown 把背后页面滚走 */
      else if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'Home' || e.key === 'End') e.preventDefault();
      else return;
      e.preventDefault();
    });

    /* 锁住背景滚动：不碰 overflow（那会把页面滚回顶部），只拦滚动事件 */
    lb.addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false });
    lb.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

    /* 触屏左右滑 */
    var sx = null;
    var stage = lb.querySelector('.elb-stage');
    stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) stepLightbox(dx < 0 ? 1 : -1);
      sx = null;
    }, { passive: true });

    return lb;
  }

  function renderLightbox() {
    var im = lb.querySelector('.elb-img');
    var count = lb.querySelector('.elb-count');
    var dots = lb.querySelector('.elb-dots');

    im.style.opacity = '0';
    im.onload = function () { im.style.opacity = '1'; };
    im.src = lbList[lbIdx];
    if (im.complete && im.naturalWidth) im.style.opacity = '1';

    count.textContent = (lbIdx + 1) + ' / ' + lbList.length;

    if (dots.children.length !== lbList.length) {
      var html = '';
      for (var i = 0; i < lbList.length; i++) html += '<i></i>';
      dots.innerHTML = html;
    }
    Array.prototype.forEach.call(dots.children, function (d, i) {
      d.classList.toggle('is-active', i === lbIdx);
    });

    /* 只有一张图时不出左右按钮 */
    lb.classList.toggle('is-single', lbList.length < 2);
  }

  function openLightbox(link) {
    var g = link.closest('.essay-gallery');
    var nodes = g ? g.querySelectorAll('.essay-img') : [link];
    lbList = Array.prototype.map.call(nodes, function (n) {
      return n.getAttribute('href') || (n.querySelector('img') || {}).src || '';
    }).filter(Boolean);
    lbIdx = Math.max(0, Array.prototype.indexOf.call(nodes, link));

    ensureLightbox();
    renderLightbox();

    /* 大图的 alt 用这条说说的标题，读屏和右键另存时都认得出来 */
    var card = link.closest('.essay-item');
    var titleEl = card ? card.querySelector('.essay-title') : null;
    lb.querySelector('.elb-img').alt = titleEl ? titleEl.textContent.trim() : '';

    lbReturn = link;
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    lb.querySelector('.elb-close').focus();
  }

  function closeLightbox() {
    if (!lb) return;
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    /* preventScroll：焦点回到图片时别让浏览器把页面滚一下 */
    if (lbReturn && lbReturn.focus) lbReturn.focus({ preventScroll: true });
  }

  function stepLightbox(d) {
    if (lbList.length < 2) return;
    lbIdx = (lbIdx + d + lbList.length) % lbList.length;
    renderLightbox();
  }

  function initLightbox() {
    document.querySelectorAll('.essay-gallery .essay-img').forEach(function (a) {
      a.addEventListener('click', function (e) {
        /* Ctrl / Cmd / Shift 点击仍然开新窗口看原图 */
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        openLightbox(a);
      });
    });
  }

  function init() {
    if (!document.querySelector('.page-vignette')) return;
    fillTime(document);
    initMore();
    initGalleries();
    initLightbox();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
