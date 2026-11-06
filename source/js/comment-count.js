/* ============================================================
 * 列表卡片的评论数（twikoo）
 *
 * 静态生成时拿不到评论数，只能先写 0，运行时再问 twikoo 要。
 * 做法：
 *   1. 收集本页所有 [data-vt-comment]，按 data-path 去重；
 *   2. POST 一次 { event: 'GET_COMMENTS_COUNT', urls: [...] }，
 *      twikoo 支持一次问多个地址，一页 15 张卡片也只发一个请求；
 *   3. 结果按地址回填到 .vt-comment-count，同一浏览器缓存 5 分钟
 *      （翻页、返回时先用缓存，避免重复请求）。
 *
 * 依赖：页脚注入的 <script data-twikoo="服务地址">，见 _partial/footer.ejs
 * 降级：服务不可达就保持 0，不报错、不隐藏（评论数 0 本身是合法值）
 * ============================================================ */
(function () {
    'use strict';

    var script = document.currentScript;
    if (!script) {
        var all = document.getElementsByTagName('script');
        for (var s = all.length - 1; s >= 0; s--) {
            if (all[s].getAttribute('data-twikoo')) { script = all[s]; break; }
        }
    }
    if (!script) return;

    var ENV = script.getAttribute('data-twikoo');
    if (!ENV || !/^https?:/i.test(ENV)) return;

    var BATCH = 50;                 // 单次请求最多问多少个地址
    var TTL = 5 * 60 * 1000;        // 缓存 5 分钟
    var PREFIX = 'vt-comment:';

    function format(n) {
        n = parseInt(n, 10);
        if (!isFinite(n) || n < 0) return '0';
        if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
        return String(n);
    }

    function cacheGet(path) {
        try {
            var raw = sessionStorage.getItem(PREFIX + path);
            if (!raw) return null;
            var box = JSON.parse(raw);
            if (!box || box.exp < Date.now()) return null;
            return box.n;
        } catch (e) {
            return null;
        }
    }

    function cacheSet(path, n) {
        try {
            sessionStorage.setItem(PREFIX + path, JSON.stringify({ n: n, exp: Date.now() + TTL }));
        } catch (e) { /* 隐私模式写不进去，忽略 */ }
    }

    /* 把数字写进同一路径下的所有容器（首页、侧栏、相关推荐可能同时出现同一篇） */
    function paint(nodes, n) {
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i].querySelector('.vt-comment-count');
            if (el) el.textContent = format(n);
        }
    }

    function collect() {
        var list = document.querySelectorAll('[data-vt-comment]');
        var map = {};
        var order = [];
        for (var i = 0; i < list.length; i++) {
            var p = list[i].getAttribute('data-path');
            if (!p) continue;
            if (!map[p]) { map[p] = []; order.push(p); }
            map[p].push(list[i]);
        }
        return { map: map, order: order };
    }

    function ask(paths, done) {
        fetch(ENV, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'GET_COMMENTS_COUNT', urls: paths })
        }).then(function (r) {
            return r.json();
        }).then(function (d) {
            if (!d || !d.data || !d.data.length) return done();
            var got = {};
            for (var i = 0; i < d.data.length; i++) {
                var row = d.data[i];
                if (row && row.url) got[row.url] = parseInt(row.count, 10) || 0;
            }
            done(got);
        }).catch(function () {
            done();
        });
    }

    function run() {
        var set = collect();
        if (!set.order.length) return;

        var missing = [];
        for (var i = 0; i < set.order.length; i++) {
            var path = set.order[i];
            var hit = cacheGet(path);
            if (hit === null) missing.push(path);
            else paint(set.map[path], hit);
        }
        if (!missing.length) return;

        for (var at = 0; at < missing.length; at += BATCH) {
            (function (chunk) {
                ask(chunk, function (got) {
                    for (var k = 0; k < chunk.length; k++) {
                        var p = chunk[k];
                        if (!got || typeof got[p] !== 'number') continue;
                        cacheSet(p, got[p]);
                        paint(set.map[p], got[p]);
                    }
                });
            })(missing.slice(at, at + BATCH));
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
