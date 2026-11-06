/* ============================================================
 * bookshelf-extra.js —— Hexo 版新增的阅读增强（原 WP 主题无对应脚本）
 *   1. 侧栏目录：滚动高亮当前章节 + 锚点平滑滚动
 *   2. 顶部阅读进度条
 *   3. 正文图片点击放大（轻量灯箱，无第三方依赖）
 * 全部做特性检测，元素不存在就直接跳过，不影响其他页面。
 * ============================================================ */
(function () {
    'use strict';

    var content = document.querySelector('.article-content');

    /* ---------- 0. 侧栏目录 ---------- */
    var tocBox = document.getElementById('vt-toc-aside');
    if (tocBox && content) {
        var tocBody = tocBox.querySelector('.vt-toc-aside__body');
        var links = Array.prototype.slice.call(tocBox.querySelectorAll('ul.toc_list a'));

        // 解析出对应的标题元素，顺便过滤掉锚点失效的条目
        var items = [];
        links.forEach(function (a) {
            var id = decodeURIComponent((a.getAttribute('href') || '').replace(/^#/, ''));
            var el = id && document.getElementById(id);
            if (el) items.push({ link: a, el: el });
        });

        if (items.length) {
            // 固定头部（body[sticky-header]）的高度，用于锚点偏移与高亮判定
            var header = document.querySelector('.header.pc');
            var offset = function () {
                var pos = header ? window.getComputedStyle(header).position : 'static';
                return (pos === 'fixed' || pos === 'sticky') ? header.offsetHeight + 16 : 20;
            };

            // 点击：平滑滚动，避开固定头部
            links.forEach(function (a) {
                a.addEventListener('click', function (e) {
                    var id = decodeURIComponent((a.getAttribute('href') || '').replace(/^#/, ''));
                    var target = id && document.getElementById(id);
                    if (!target) return;
                    e.preventDefault();
                    var top = target.getBoundingClientRect().top + window.pageYOffset - offset();
                    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
                    if (history.replaceState) history.replaceState(null, '', '#' + id);
                });
            });

            var active = null;
            var sync = function () {
                var line = offset() + 8;
                var current = items[0];
                for (var i = 0; i < items.length; i++) {
                    if (items[i].el.getBoundingClientRect().top <= line) {
                        current = items[i];
                    } else {
                        break;
                    }
                }
                // 滚到底时，最后一条章节可能永远到不了基准线，直接归位到末条
                if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 4) {
                    current = items[items.length - 1];
                }
                if (current.link === active) return;
                if (active) active.classList.remove('is-active');
                current.link.classList.add('is-active');
                active = current.link;

                // 当前项滚出目录可视区时，把目录自身滚到能看到的位置
                if (tocBody && tocBody.scrollHeight > tocBody.clientHeight) {
                    var r = current.link.getBoundingClientRect();
                    var c = tocBody.getBoundingClientRect();
                    if (r.top < c.top || r.bottom > c.bottom) {
                        tocBody.scrollTop += r.top - c.top - c.height / 2 + r.height / 2;
                    }
                }
            };

            var queued = false;
            var onScroll = function () {
                if (queued) return;
                queued = true;
                window.requestAnimationFrame(function () {
                    sync();
                    queued = false;
                });
            };

            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll, { passive: true });
            sync();
        }
    }

    /* ---------- 1. 阅读进度条 ---------- */
    var bar = document.getElementById('vt-reading-progress');
    var fill = bar && bar.firstElementChild;

    if (bar && fill && content) {
        var ticking = false;

        var update = function () {
            var rect = content.getBoundingClientRect();
            var total = content.offsetHeight - window.innerHeight;
            var done = -rect.top;
            var ratio = total > 0 ? done / total : (done > 0 ? 1 : 0);
            ratio = Math.max(0, Math.min(1, ratio));
            fill.style.width = (ratio * 100).toFixed(2) + '%';
            bar.classList.toggle('is-visible', window.pageYOffset > 160);
        };

        var barScroll = function () {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(function () {
                update();
                ticking = false;
            });
        };

        window.addEventListener('scroll', barScroll, { passive: true });
        window.addEventListener('resize', barScroll, { passive: true });
        update();
    }

    /* ---------- 2. 图片放大 ---------- */
    var imgs = document.querySelectorAll('.article-content img');
    if (!imgs.length) return;

    var overlay = document.createElement('div');
    overlay.className = 'vt-lightbox';
    overlay.innerHTML = '<img alt=""><button type="button" aria-label="关闭">×</button>';
    document.body.appendChild(overlay);

    var big = overlay.querySelector('img');
    var closeBtn = overlay.querySelector('button');

    var close = function () {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
    };

    var open = function (src, alt) {
        big.src = src;
        big.alt = alt || '';
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    };

    Array.prototype.forEach.call(imgs, function (img) {
        img.classList.add('vt-zoomable');
        img.addEventListener('click', function () {
            open(img.currentSrc || img.src, img.alt);
        });
    });

    overlay.addEventListener('click', function (e) {
        if (e.target !== big) close();
    });
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });
})();
