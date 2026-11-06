/**
 * 朋友圈 / 博友动态页脚本
 *
 * 数据接口：hexo-circle-of-friends 风格的 fcircle.json
 *   { stats: { friends, active, articles, updated },
 *     articles: [{ title, link, author, avatar, date, description }] }
 *
 * 配置从页面注入的 window.FCIRCLE_CONFIG 读取（见 layout/fcircle.ejs）：
 *   api_url   接口地址，会自动补结尾斜杠
 *   per_page  每次渲染多少张卡片
 *   random    是否渲染「钓鱼」块
 *   error_img 头像加载失败的兜底图
 *
 * 只用原生 JS，不依赖 jQuery。卡片结构对齐全站 .vt-card-item：
 *   .vt-card-item > .vt-card-body > (.vt-card-title + .vt-card-excerpt + .vt-card-footer)
 */
(function () {
    'use strict';

    var cfg = window.FCIRCLE_CONFIG || {};
    var api = (cfg.api_url || '').replace(/\/?$/, '/');
    var perPage = cfg.per_page || 12;
    var errorImg = cfg.error_img || '/images/placeholder.svg';

    var listEl = document.getElementById('fc-list');
    var statsEl = document.getElementById('fc-stats');
    var loadingEl = document.getElementById('fc-loading');
    var moreBtn = document.getElementById('fc-more');
    var randomEl = document.getElementById('fc-random');
    var randomBtn = document.getElementById('fc-random-btn');

    if (!listEl || !api) return;

    var all = [];
    var shown = 0;

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function card(a) {
        var title = esc(a.title);
        var link = esc(a.link);
        var author = esc(a.author || '博友');
        var avatar = esc(a.avatar || errorImg);
        var date = esc(a.date || '');
        var desc = esc(a.description || '');

        return '<div class="vt-card-item">' +
            '<div class="vt-card-body">' +
                '<h3 class="vt-card-title">' +
                    '<a href="' + link + '" target="_blank" rel="noopener" title="' + title + '">' + title + '</a>' +
                '</h3>' +
                (desc ? '<div class="vt-card-excerpt">' + desc + '</div>' : '') +
                '<div class="vt-card-footer">' +
                    '<a class="vt-card-author" href="javascript:;">' +
                        '<div class="avatar"><img src="' + avatar + '" loading="lazy" alt="" ' +
                            'onerror="this.onerror=null;this.src=\'' + errorImg + '\'"></div>' +
                        '<span>' + author + '</span>' +
                    '</a>' +
                    (date ? '<div class="vt-card-time"><i class="fas fa-clock"></i>' + date + '</div>' : '') +
                '</div>' +
            '</div>' +
        '</div>';
    }

    function renderBatch() {
        var next = all.slice(shown, shown + perPage);
        if (next.length) {
            listEl.insertAdjacentHTML('beforeend', next.map(card).join(''));
            shown += next.length;
        }
        if (shown < all.length) {
            moreBtn.style.display = 'inline-block';
            moreBtn.textContent = '加载更多（还剩 ' + (all.length - shown) + ' 篇）';
        } else {
            moreBtn.style.display = 'none';
        }
    }

    function renderStats(s) {
        if (!statsEl) return;
        s = s || {};
        statsEl.innerHTML =
            '<div class="fc-stat"><span>博友</span><b>' + (s.friends || 0) + '</b></div>' +
            '<div class="fc-stat"><span>活跃</span><b>' + (s.active || 0) + '</b></div>' +
            '<div class="fc-stat"><span>文章</span><b>' + (s.articles || 0) + '</b></div>' +
            '<div class="fc-stat"><span>最后更新</span><b class="fc-stat-date">' + esc(s.updated || '—') + '</b></div>';
    }

    var SENTENCES = [
        '在路边闲逛的时候随手买了一个',
        '翻遍友链突然发现了',
        '今天就决定是这一篇了',
        '发现宝藏文章一篇',
        '刚刷到一篇很有意思的文章'
    ];

    function renderRandom() {
        if (!randomEl || !all.length) return;
        var pick = all[Math.floor(Math.random() * all.length)];
        var sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
        randomEl.innerHTML = '<span class="fc-random-text">' + sentence + '，来自 <b>' +
            esc(pick.author || '博友') + '</b> 的文章：</span> ' +
            '<a class="fc-random-post" href="' + esc(pick.link) + '" target="_blank" rel="noopener">' +
            esc(pick.title) + '</a>';
    }

    if (randomBtn) {
        randomBtn.addEventListener('click', function () {
            var icon = randomBtn.querySelector('i');
            if (icon) {
                icon.style.transition = 'transform .5s ease';
                icon.style.transform = 'rotate(360deg)';
                setTimeout(function () {
                    icon.style.transition = 'none';
                    icon.style.transform = 'none';
                }, 500);
            }
            renderRandom();
        });
    }

    if (moreBtn) {
        moreBtn.addEventListener('click', renderBatch);
    }

    function fail(msg) {
        if (loadingEl) {
            loadingEl.textContent = '加载失败：' + msg;
            loadingEl.classList.add('is-error');
        }
        if (moreBtn) moreBtn.style.display = 'none';
    }

    fetch(api + 'fcircle.json')
        .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(function (data) {
            if (loadingEl) loadingEl.style.display = 'none';

            renderStats(data.stats);

            all = (data.articles || []).filter(function (a) { return a && a.link; });
            if (!all.length) {
                if (loadingEl) loadingEl.textContent = '暂时还没有文章';
                return;
            }

            renderBatch();
            renderRandom();
        })
        .catch(function (e) {
            fail(e.message || '网络异常');
        });
})();
