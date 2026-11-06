/**
 * 自动加载（无限滚动）
 *
 * 由 _config.yml 的 posts_auto_load / posts_auto_load_limit 控制，
 * 模板 layout/_partial/home/last.ejs 会在 .media-list 上输出：
 *   data-auto-load="1"        启用标记
 *   data-auto-next="/page/2/" 下一页地址
 *   data-auto-limit="1"       再自动加载几次（0 = 一直到最后一页）
 *
 * 做法：在列表末尾放一个哨兵元素，滚到它时 fetch 下一页 HTML，
 * 解析出 .media-list 的子节点追加到当前列表，再把 data-auto-next
 * 换成下一页自己的值；取不到下一页就结束。
 *
 * 降级：脚本没跑 / 请求失败 / 用户禁用 JS 时，底部分页条仍然可用，
 * 所以分页条只在自动加载生效期间隐藏，结束后会重新显示。
 */
(function () {
  'use strict';

  var list = document.querySelector('.media-list[data-auto-load]');
  if (!list) return;

  var next = list.getAttribute('data-auto-next') || '';
  var limit = parseInt(list.getAttribute('data-auto-limit'), 10);
  if (isNaN(limit) || limit < 0) limit = 1;

  var loaded = 0;
  var busy = false;
  var done = !next;

  var pagination = document.querySelector('.pagination-container');

  /* 加载中提示：追加到列表末尾，结束时移除 */
  var tip = document.createElement('div');
  tip.className = 'auto-load-tip';
  tip.textContent = '加载中…';
  tip.style.cssText = 'display:none;text-align:center;padding:18px 0;color:#999;font-size:14px;';

  /* 哨兵：滚到它就触发加载 */
  var sentinel = document.createElement('div');
  sentinel.className = 'auto-load-sentinel';
  sentinel.style.cssText = 'height:1px;';

  list.parentNode.insertBefore(tip, list.nextSibling);
  list.parentNode.insertBefore(sentinel, tip.nextSibling);

  function hidePagination() {
    if (pagination) pagination.style.display = 'none';
  }

  function showPagination() {
    if (pagination) pagination.style.display = '';
  }

  function finish() {
    done = true;
    tip.style.display = 'none';
    sentinel.style.display = 'none';
    showPagination();
    if (observer) observer.disconnect();
  }

  function pickNext(doc) {
    var nextList = doc.querySelector('.media-list[data-auto-load]');
    return nextList ? (nextList.getAttribute('data-auto-next') || '') : '';
  }

  function append(doc) {
    var newList = doc.querySelector('.media-list[data-auto-load]') || doc.querySelector('.media-list');
    if (!newList) return 0;
    var items = Array.prototype.slice.call(newList.children);
    var added = 0;
    items.forEach(function (el) {
      list.appendChild(el);
      added++;
    });
    return added;
  }

  function load() {
    if (busy || done) return;
    if (limit > 0 && loaded >= limit) { finish(); return; }

    busy = true;
    tip.style.display = '';
    list.classList.add('is-auto-loading');

    fetch(next, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var added = append(doc);
        if (!added) { next = ''; return; }
        loaded++;
        next = pickNext(doc);
        /* 新追加的图片要重新交给懒加载，否则一直是占位图 */
        if (typeof window.vtReinitLazyLoad === 'function') window.vtReinitLazyLoad();
      })
      .catch(function () {
        /* 失败就停在这里，保留分页条给用户手动翻 */
        next = '';
      })
      .then(function () {
        busy = false;
        tip.style.display = 'none';
        list.classList.remove('is-auto-loading');
        if (!next || (limit > 0 && loaded >= limit)) finish();
      });
  }

  var observer = null;
  if ('IntersectionObserver' in window) {
    hidePagination();
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) load();
      });
    }, { rootMargin: '300px 0px' });
    observer.observe(sentinel);
  } else {
    /* 老浏览器：滚动监听兜底 */
    hidePagination();
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking || done) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        var rect = sentinel.getBoundingClientRect();
        if (rect.top < window.innerHeight + 300) load();
      });
    });
  }
})();
