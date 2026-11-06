/**
 * 站内搜索（前端检索）
 *
 * 由 layout/search.ejs 引入，只在 /search/ 页加载。
 *
 * 数据：
 *   /search.json       hexo-generator-searchdb 生成，含正文，用于检索
 *   /search-meta.json  scripts/search-index.js 生成，含封面/日期/分类/标签/摘要
 * 两份按 url 合并；正文只存一份，避免索引翻倍。
 *
 * 检索规则：
 *   - 关键词按空格拆分，多个词之间是「与」关系（每个词都要出现）
 *   - 权重：标题 ×12、标签/分类 ×6、正文命中 ×(2 + 命中次数，上限 6)
 *   - 结果按分数倒序，同分按发布日期倒序
 *   - 每页 10 条，分页样式复刻 paginate_links()
 *
 * URL 同步：检索时 replaceState 写 ?s=关键词，可直接分享；
 * 打开带 s 参数的地址会自动检索。
 */
(function () {
  'use strict';

  var PAGE_SIZE = 10;
  var END_SIZE = 2;
  var MID_SIZE = 2;

  var panel = document.querySelector('.vt-search-panel');
  if (!panel) return;

  var indexUrl = panel.getAttribute('data-index') || '/search.json';
  var metaUrl = panel.getAttribute('data-meta') || '/search-meta.json';
  var avatarUrl = panel.getAttribute('data-avatar') || '';
  var defaultCover = panel.getAttribute('data-default-cover') || '/images/default.jpg';

  var form = panel.querySelector('.vt-search-form');
  var input = panel.querySelector('.vt-search-input');
  var clearBtn = panel.querySelector('.vt-search-clear');
  var statusEl = panel.querySelector('.vt-search-status');
  var bannerDesc = document.getElementById('vt-search-banner-desc');

  var resultsEl = document.querySelector('.vt-search-results');
  var promptEl = document.querySelector('.vt-search-prompt');
  var noContentEl = document.querySelector('.vt-search-nocontent');
  var pagerEl = document.querySelector('.vt-search-pagination');

  var dataPromise = null;   // { docs, metaMap }
  var dataReady = false;    // 索引是否已就绪
  var hits = [];            // 当前查询的命中结果（已合并元数据）
  var curTerms = [];        // 当前查询的拆词结果
  var curQuery = '';
  var page = 1;
  var pendingPage = 1;      // 检索完成后要落在第几页（从 URL 的 page 参数来）
  var timer = null;         // 输入防抖
  var composing = false;    // 中文输入法组字中

  /* ---------- 工具 ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function reEsc(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function terms(q) {
    return String(q || '').toLowerCase().split(/\s+/).filter(function (t) { return t; });
  }

  function countOf(hay, needle) {
    if (!needle) return 0;
    var n = 0;
    var i = 0;
    while ((i = hay.indexOf(needle, i)) !== -1) {
      n++;
      i += needle.length;
    }
    return n;
  }

  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  /* 与 helpers.js 的 formatHumanTime 同一套阈值，检索时按当前时间重算 */
  function humanTime(iso) {
    var t = Date.parse(iso);
    if (!t) return '';

    var d = new Date(t);
    var diff = Math.floor(Date.now() / 1000) - Math.floor(t / 1000);

    function ymd(withYear) {
      var s = pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
      return withYear ? d.getFullYear() + '-' + s : s;
    }

    if (diff < 0) return ymd(true);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
    if (diff < 31536000) return ymd(false);
    return ymd(true);
  }

  function dateAttr(iso) {
    var t = Date.parse(iso);
    if (!t) return '';
    var d = new Date(t);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
      + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }

  /* ---------- 打分 ---------- */

  function scoreOf(doc, ts) {
    var title = String(doc.title || '').toLowerCase();
    var tags = (doc.tags || []).join(' ').toLowerCase();
    var cats = (doc.categories || []).join(' ').toLowerCase();
    var body = String(doc.content || '').toLowerCase();
    var total = 0;

    for (var i = 0; i < ts.length; i++) {
      var t = ts[i];
      var s = 0;

      if (title.indexOf(t) !== -1) s += 12;
      if (tags.indexOf(t) !== -1) s += 6;
      if (cats.indexOf(t) !== -1) s += 6;

      var c = countOf(body, t);
      if (c) s += 2 + Math.min(4, c);

      if (!s) return 0;   // 有一个词没命中就算不匹配
      total += s;
    }
    return total;
  }

  /* ---------- 摘要与高亮 ---------- */

  function excerptOf(doc, searchDoc, ts) {
    var text = String((searchDoc && searchDoc.content) || '').replace(/\s+/g, ' ').trim();
    if (!text) return doc.excerpt || '';

    var lower = text.toLowerCase();
    var pos = -1;
    for (var i = 0; i < ts.length; i++) {
      var p = lower.indexOf(ts[i]);
      if (p !== -1 && (pos === -1 || p < pos)) pos = p;
    }

    // 命中位置靠后时，从命中处往前推一点截取，否则从头截
    var start = pos > 70 ? pos - 50 : 0;
    var out = text.slice(start, start + 110);
    return (start > 0 ? '…' : '') + out + (start + 110 < text.length ? '…' : '');
  }

  function highlight(escapedText, ts) {
    if (!ts.length) return escapedText;
    var pattern = ts.slice()
      .sort(function (a, b) { return b.length - a.length; })
      .map(function (t) { return reEsc(esc(t)); })
      .join('|');
    try {
      return escapedText.replace(new RegExp('(' + pattern + ')', 'gi'), '<mark>$1</mark>');
    } catch (e) {
      return escapedText;
    }
  }

  /* ---------- 数据加载 ---------- */

  function docsLoaded() {
    return dataReady;
  }

  function loadData() {
    if (dataPromise) return dataPromise;

    dataPromise = Promise.all([
      fetch(indexUrl, { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error('index ' + r.status);
        return r.json();
      }),
      fetch(metaUrl, { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error('meta ' + r.status);
        return r.json();
      }).catch(function () {
        return [];   // 元数据缺失时降级：只显示标题与摘要
      })
    ]).then(function (res) {
      var docs = Array.isArray(res[0]) ? res[0] : [];
      var metaList = Array.isArray(res[1]) ? res[1] : [];

      var metaMap = {};
      metaList.forEach(function (m) {
        if (m && m.url) metaMap[m.url] = m;
      });

      dataReady = true;
      return { docs: docs, metaMap: metaMap };
    }).catch(function (err) {
      dataPromise = null;   // 允许下次输入重试
      dataReady = false;
      throw err;
    });

    return dataPromise;
  }

  /* ---------- 卡片渲染（复刻 _partial/card.ejs 的 DOM） ---------- */

  function cardHtml(item) {
    var url = esc(item.url);
    var title = esc(item.title || '（无标题）');
    var cover = item.cover ? esc(item.cover) : esc(defaultCover);
    var excerpt = highlight(esc(item.excerpt || ''), curTerms);
    var time = humanTime(item.date);

    var tagsHtml = '';
    (item.categories || []).forEach(function (c) {
      tagsHtml += '<a class="vt-card-tag vt-category" href="' + esc(c.url || 'javascript:;') + '">'
        + '<i class="fas fa-folder"></i>' + esc(c.name) + '</a>';
    });
    (item.tags || []).slice(0, 3).forEach(function (t) {
      tagsHtml += '<a class="vt-card-tag" href="' + esc(t.url || 'javascript:;') + '">'
        + '<i class="fas fa-tags"></i>' + esc(t.name) + '</a>';
    });

    var author = esc(item.author || '');
    var avatar = avatarUrl ? esc(avatarUrl) : '';

    return '<div class="vt-card-item">'
      + '<div class="vt-card-thumbnail"><a href="' + url + '">'
      + '<img src="' + cover + '" alt="' + title + '" loading="lazy">'
      + '</a></div>'
      + '<div class="vt-card-body">'
      + '<h3 class="vt-card-title"><a href="' + url + '" title="' + title + '">'
      + highlight(title, curTerms) + '</a></h3>'
      + '<div class="vt-card-excerpt">' + excerpt + '</div>'
      + (tagsHtml ? '<div class="vt-card-meta no-scrollbar">' + tagsHtml + '</div>' : '')
      + '<div class="vt-card-footer">'
      + '<a class="vt-card-author" href="javascript:;">'
      + (avatar ? '<div class="avatar"><img src="' + avatar + '" alt=""></div>' : '')
      + '<span>' + author + '</span></a>'
      + (time ? '<div class="vt-card-time" data-time="' + esc(dateAttr(item.date)) + '">'
        + '<i class="fas fa-clock"></i>' + time + '</div>' : '')
      + '</div></div></div>';
  }

  /* ---------- 分页（复刻 paginate_links 的页码收集逻辑） ---------- */

  /* 页码对应的真实地址：/search/?s=关键词&page=2
     第 1 页不带 page 参数，保证只有一个「干净」入口。
     有了真 href，页码就是可分享、可新标签打开、可被爬虫读到的普通链接，
     JS 只负责拦截点击做无刷新翻页（拦截失败时会退化成正常跳转）。 */
  function buildHref(n) {
    var qs = [];
    if (curQuery) qs.push('s=' + encodeURIComponent(curQuery));
    if (n > 1) qs.push('page=' + n);
    return location.pathname + (qs.length ? '?' + qs.join('&') : '');
  }

  function pageList(current, total) {
    var pages = [];
    var dots = false;
    for (var n = 1; n <= total; n++) {
      if (n === current) {
        pages.push({ n: n, current: true });
        dots = true;
      } else if (n <= END_SIZE || (n >= current - MID_SIZE && n <= current + MID_SIZE) || n > total - END_SIZE) {
        pages.push({ n: n });
        dots = true;
      } else if (dots) {
        pages.push({ dots: true });
        dots = false;
      }
    }
    return pages;
  }

  function renderPager(totalPages) {
    if (!pagerEl) return;

    if (totalPages <= 1) {
      pagerEl.hidden = true;
      pagerEl.innerHTML = '';
      return;
    }

    var html = '<ul class="page-numbers">';
    if (page > 1) {
      html += '<li><a class="prev page-numbers" href="' + esc(buildHref(page - 1)) + '" data-page="' + (page - 1) + '" rel="prev">'
        + '<i class="fas fa-chevron-left"></i></a></li>';
    }
    pageList(page, totalPages).forEach(function (p) {
      if (p.dots) {
        html += '<li><span class="page-numbers dots">…</span></li>';
      } else if (p.current) {
        html += '<li><span class="page-numbers current" aria-current="page">' + p.n + '</span></li>';
      } else {
        html += '<li><a class="page-numbers" href="' + esc(buildHref(p.n)) + '" data-page="' + p.n + '">' + p.n + '</a></li>';
      }
    });
    if (page < totalPages) {
      html += '<li><a class="next page-numbers" href="' + esc(buildHref(page + 1)) + '" data-page="' + (page + 1) + '" rel="next">'
        + '<i class="fas fa-chevron-right"></i></a></li>';
    }
    html += '</ul>';

    pagerEl.innerHTML = html;
    pagerEl.hidden = false;
  }

  /* ---------- 状态切换 ---------- */

  function setStatus(text) {
    statusEl.textContent = text || '';
    statusEl.hidden = !text;
  }

  function setBannerDesc(text) {
    if (bannerDesc) bannerDesc.textContent = text;
  }

  function show(state) {
    // state: 'prompt' | 'results' | 'none' | 'busy'
    if (promptEl) promptEl.hidden = state !== 'prompt';
    if (noContentEl) noContentEl.hidden = state !== 'none';
    if (resultsEl) resultsEl.hidden = state !== 'results';
    if (state !== 'results' && pagerEl) {
      pagerEl.hidden = true;
      pagerEl.innerHTML = '';
    }
  }

  /* ---------- 渲染当前页 ---------- */

  function renderPage(n, scroll, push) {
    var totalPages = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
    page = Math.min(Math.max(1, n), totalPages);

    var start = (page - 1) * PAGE_SIZE;
    var slice = hits.slice(start, start + PAGE_SIZE);
    var html = '';

    for (var i = 0; i < slice.length; i++) html += cardHtml(slice[i]);

    resultsEl.innerHTML = html;
    show('results');
    renderPager(totalPages);

    /* 翻页写一条历史记录，浏览器后退键才能退回上一页；
       新增检索用 replaceState（见 syncUrl），不往历史里堆。 */
    if (push) {
      try {
        history.pushState({ page: page }, '', buildHref(page));
      } catch (e) { /* file:// 等场景忽略 */ }
    } else if (page !== n) {
      /* 页码越界被夹回合法范围（如 page=99）：把地址栏纠正过来，别留个假页码 */
      try {
        history.replaceState({ page: page }, '', buildHref(page));
      } catch (e) { /* ignore */ }
    }

    if (scroll) {
      try {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        window.scrollTo(0, panel.offsetTop - 70);
      }
    }
  }

  /* ---------- 检索 ---------- */

  function syncUrl(q) {
    var url = location.pathname + (q ? '?s=' + encodeURIComponent(q) : '');
    try {
      history.replaceState(null, '', url);
    } catch (e) { /* file:// 等场景忽略 */ }
  }

  function reset() {
    hits = [];
    page = 1;
    resultsEl.innerHTML = '';
    if (pagerEl) {
      pagerEl.hidden = true;
      pagerEl.innerHTML = '';
    }
    show('prompt');
    setStatus('');
    setBannerDesc('全站 ' + (panel.getAttribute('data-total') || '') + ' 篇文章，可搜标题、标签与正文');
  }

  function search(rawQuery, targetPage) {
    var q = String(rawQuery || '').trim();
    pendingPage = Math.max(1, parseInt(targetPage, 10) || 1);
    curTerms = terms(q);
    curQuery = q;

    if (clearBtn) clearBtn.hidden = !q;
    syncUrl(q);

    if (!q) {
      reset();
      return;
    }

    setStatus(docsLoaded() ? '正在检索…' : '首次检索需要加载索引（约 1.3 MB），请稍候…');
    show('busy');

    loadData().then(function (data) {
      // 查询可能在加载期间又变了，以最新输入为准
      if (String(input.value || '').trim() !== q) return;

      var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
      var scored = [];

      for (var i = 0; i < data.docs.length; i++) {
        var doc = data.docs[i];
        var s = scoreOf(doc, curTerms);
        if (!s) continue;

        var meta = data.metaMap[doc.url] || {};
        scored.push({
          score: s,
          item: {
            url: doc.url,
            title: doc.title,
            date: meta.date || '',
            cover: meta.cover || '',
            author: meta.author || '',
            excerpt: excerptOf(meta, doc, curTerms),
            categories: meta.categories || (doc.categories || []).map(function (name) {
              return { name: name, url: 'javascript:;' };
            }),
            tags: meta.tags || (doc.tags || []).map(function (name) {
              return { name: name, url: 'javascript:;' };
            })
          }
        });
      }

      scored.sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return String(b.item.date).localeCompare(String(a.item.date));
      });

      hits = scored.map(function (x) { return x.item; });

      var t1 = (window.performance && performance.now) ? performance.now() : Date.now();
      var ms = Math.max(1, Math.round(t1 - t0));

      if (!hits.length) {
        setStatus('没有找到与「' + q + '」相关的文章');
        setBannerDesc('搜索「' + q + '」的结果');
        show('none');
        return;
      }

      setStatus('找到 ' + hits.length + ' 篇文章（' + ms + ' 毫秒）');
      setBannerDesc('搜索「' + q + '」的结果，共 ' + hits.length + ' 篇');
      renderPage(pendingPage, false);
    }).catch(function () {
      setStatus('搜索索引加载失败，请检查网络后重试');
      show('none');
    });
  }

  function scheduleSearch() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { search(input.value); }, 180);
  }

  /* ---------- 事件 ---------- */

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (timer) clearTimeout(timer);
      search(input.value);
    });
  }

  input.addEventListener('input', function () {
    if (composing) return;
    scheduleSearch();
  });

  input.addEventListener('compositionstart', function () { composing = true; });
  input.addEventListener('compositionend', function () {
    composing = false;
    scheduleSearch();
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      input.value = '';
      search('');
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function (e) {
      e.preventDefault();
      input.value = '';
      search('');
      input.focus();
    });
  }

  if (pagerEl) {
    pagerEl.addEventListener('click', function (e) {
      /* 带修饰键或非左键：交给浏览器按普通链接打开（新标签 / 新窗口），不拦截 */
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      var link = e.target.closest('a[data-page]');
      if (!link) return;
      e.preventDefault();
      renderPage(parseInt(link.getAttribute('data-page'), 10) || 1, true, true);
    });
  }

  /* 浏览器前进 / 后退：按地址栏里的 s 与 page 复原现场 */
  window.addEventListener('popstate', function () {
    var p = new URLSearchParams(location.search);
    var q = p.get('s') || p.get('q') || p.get('keyword') || '';
    var n = parseInt(p.get('page'), 10) || 1;

    if (q !== curQuery || !hits.length) {
      input.value = q;
      search(q, n);
    } else {
      renderPage(n, true, false);
    }
  });

  Array.prototype.forEach.call(panel.querySelectorAll('.vt-search-chip'), function (chip) {
    chip.addEventListener('click', function (e) {
      e.preventDefault();
      input.value = chip.getAttribute('data-q') || chip.textContent.trim();
      search(input.value);
      input.focus();
    });
  });

  /* ---------- 初始化：读 ?s= 与 ?page= 自动检索 ---------- */

  var params = new URLSearchParams(location.search);
  var initial = params.get('s') || params.get('q') || params.get('keyword') || '';
  var initialPage = parseInt(params.get('page'), 10) || 1;

  if (initial) {
    input.value = initial;
    search(initial, initialPage);
  } else {
    reset();
    if (window.matchMedia && window.matchMedia('(min-width: 768px)').matches) {
      input.focus();
    }
  }
})();
