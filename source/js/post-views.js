/* ============================================================
 * 文章页阅读次数（前端）
 *
 * 只做三件事：
 *   1. 按 data-provider 取数字：不蒜子/Vercount 交给它们自己的脚本，
 *      Waline / Umami / 自建接口用 fetch 拿 JSON；
 *   2. 把数字填进 .vt-view-count，过万折叠成「1.2万」；
 *   3. 取不到就按 data-hide-on-error 隐藏整条，绝不把 0 挂在页面上。
 *
 * 配置来源：_config.yml 的 post_views 节
 * 地址计算：scripts/post-views.js（构建时写进 data-*）
 * ============================================================ */
(function () {
    'use strict';

    var el = document.querySelector('.hit-conuter[data-views="1"]');
    if (!el) return;

    var cfg = el.dataset;
    var countEl = el.querySelector('.vt-view-count');
    if (!countEl) return;

    var min = parseInt(cfg.min, 10) || 0;
    var cacheMinutes = parseInt(cfg.cache, 10) || 0;
    // 等数字的上限：不蒜子脚本本身就要 5~6 秒，给足余量再判失败
    var timeoutMs = (parseInt(cfg.timeout, 10) || 12) * 1000;
    var cacheKey = 'vt-pv:' + (cfg.path || location.pathname);
    var settled = false;

    /* 数字格式化：过万折成 X.X万，去掉多余的小数 */
    function format(n) {
        n = parseInt(n, 10);
        if (!isFinite(n) || n < 0) return '';
        if (n >= 10000) {
            return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
        }
        return String(n);
    }

    function hide() {
        el.classList.add('is-hidden');
    }

    /* force=true 允许覆盖先前画上去的数字：zan 的浏览回执比查询晚到，
       它带的是「写入之后」的准数，必须能盖掉先前的旧值 */
    function succeed(n, force) {
        if (settled && !force) return;
        var num = parseInt(n, 10);
        if (!isFinite(num) || num < 0) {
            if (!settled) fail();
            return;
        }
        if (num < min) {
            if (!settled) hide();
            return;
        }
        settled = true;
        countEl.textContent = format(num);
        el.classList.remove('is-pending', 'is-hidden');
        el.classList.add('is-ready');
        if (cacheMinutes > 0) {
            try {
                sessionStorage.setItem(cacheKey, JSON.stringify({ n: num, t: Date.now() }));
            } catch (e) { /* 隐私模式下 sessionStorage 不可用，忽略 */ }
        }
    }

    function fail() {
        if (settled) return;
        settled = true;
        el.classList.remove('is-pending');
        if (cfg.hideOnError !== '0') {
            hide();
        } else {
            countEl.textContent = '0';
            el.classList.add('is-ready');
        }
    }

    /* 从返回的 JSON 里按 json_path 取数字；
     * Waline 的 data 是 [{url, count}] 或 [count]，单独兼容一下。 */
    function extract(json, path) {
        if (json && json.errno !== undefined && json.errno !== 0) return NaN;
        var value;

        if (path === 'data' && json && json.data !== undefined) {
            var data = json.data;
            if (Array.isArray(data)) {
                var first = data[0];
                value = (first && typeof first === 'object')
                    ? (first.count !== undefined ? first.count : first.value)
                    : first;
            } else {
                value = data;
            }
        } else if (path) {
            value = path.split('.').reduce(function (obj, key) {
                return (obj === null || obj === undefined) ? undefined : obj[key];
            }, json);
        } else {
            value = json;
        }

        if (typeof value === 'string') value = value.replace(/[,\s]/g, '');
        return value;
    }

    function readCache() {
        if (cacheMinutes <= 0) return null;
        try {
            var raw = sessionStorage.getItem(cacheKey);
            if (!raw) return null;
            var item = JSON.parse(raw);
            if (!item || !item.t) return null;
            if (Date.now() - item.t > cacheMinutes * 60000) {
                sessionStorage.removeItem(cacheKey);
                return null;
            }
            return item.n;
        } catch (e) {
            return null;
        }
    }

    /* ---- 不蒜子 / Vercount：脚本自己往 span 里写数字，这里只等它 ---- */
    function loadScriptCounter() {
        if (!cfg.scriptSrc) return fail();

        var script = document.createElement('script');
        script.src = cfg.scriptSrc;
        script.async = true;
        script.onerror = fail;
        document.body.appendChild(script);

        var tries = 0;
        var timer = setInterval(function () {
            tries += 1;
            var text = (countEl.textContent || '').trim();
            if (text) {
                clearInterval(timer);
                succeed(text);
            } else if (tries * 300 >= timeoutMs) {
                clearInterval(timer);
                fail();
            }
        }, 300);
    }

    /* ---- Waline / Umami / 自建接口：fetch 一次 ---- */

    /* 只用于比对「是不是同一个页面」，不参与请求 */
    function normPath(p) {
        p = String(p || '').split('#')[0].split('?')[0];
        p = p.replace(/\/index\.html?$/i, '/');
        if (p.charAt(0) !== '/') p = '/' + p;
        return p.replace(/\/+$/, '') || '/';
    }

    /* zan：浏览由 SDK 自动上报（全站都记），这里只读数字，避免一条浏览被算两次。
     * 但 SDK 带 defer，比本脚本晚执行——直接查会读到「上报之前」的旧值。
     * 所以：先查一次把数字顶上去，再听 SDK 上报完的回执，用写入后的准数覆盖。 */
    function fetchZan() {
        var path = cfg.path || location.pathname;

        function onReport(e) {
            var d = (e && e.detail) || {};
            var n = parseInt(d.views, 10);
            if (!isFinite(n) || n < 0) return;
            if (d.path && normPath(d.path) !== normPath(path)) return;
            window.removeEventListener('zan:pageview', onReport);
            succeed(n, true);
        }
        window.addEventListener('zan:pageview', onReport);
        setTimeout(function () {
            window.removeEventListener('zan:pageview', onReport);
        }, 8000);

        fetch(cfg.url + '?action=query&keys[]=' + encodeURIComponent(path), { credentials: 'omit' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (json) {
                var row = json && json.data ? json.data[path] : null;
                if (!row) throw new Error('no data');
                succeed(row.views);
            })
            .catch(fail);
    }

    function fetchCounter() {
        if (!cfg.url) return fail();
        if (cfg.provider === 'zan') return fetchZan();

        var options = {
            method: (cfg.method || 'GET').toUpperCase(),
            credentials: 'omit',
            headers: {}
        };
        if (cfg.token) {
            options.headers.Authorization = 'Bearer ' + cfg.token;
        }
        if (options.method === 'POST') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify({ path: cfg.path || location.pathname });
        }

        fetch(cfg.url, options)
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (json) {
                succeed(extract(json, cfg.jsonPath));
            })
            .catch(fail);
    }

    var cached = readCache();
    if (cached !== null) {
        succeed(cached);
        return;
    }

    if (cfg.provider === 'busuanzi' || cfg.provider === 'vercount') {
        loadScriptCounter();
    } else {
        fetchCounter();
    }
})();
