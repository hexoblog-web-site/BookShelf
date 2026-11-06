'use strict';

/* ============================================================
 * vt_post_views(page) —— 文章页阅读次数的展示参数
 *
 * 配套三处：
 *   _config.yml 的 post_views 节    开关与服务参数
 *   scripts/post-views.js（本文件） 构建时拼好接口地址，交给模板输出 data-*
 *   source/js/post-views.js         运行时请求数字、写入页面
 *
 * 返回对象（模板只读，不改）：
 *   enabled     是否真的去联网取数
 *   provider    static / busuanzi / vercount / waline / umami / zan / custom
 *   label       数字后面的单位文案
 *   hideOnError 取不到时是否整条隐藏
 *   min         小于这个数字不显示
 *   cache       浏览器缓存分钟数
 *   timeout     等数字的上限秒数
 *   spanId      不蒜子/Vercount 把数字写进的 span id
 *   scriptSrc   不蒜子/Vercount 的脚本地址
 *   url         需要 fetch 的接口地址（{path} 已替换）
 *   token       可选 Bearer Token
 *   jsonPath    返回 JSON 里数字的位置
 *   method      GET / POST
 *   path        当前页相对路径，形如 /articles/3ccc38b7.html
 * ============================================================ */

function pick(value, fallback) {
  return (value === undefined || value === null || value === '') ? fallback : value;
}

function pagePath(page) {
  // 优先用 permalink 去掉协议与域名，拿不到就退回 page.path
  var link = String(page.permalink || '');
  var path = link ? link.replace(/^[a-z]+:\/\/[^/]+/i, '') : '';
  if (!path) {
    path = '/' + String(page.path || '').replace(/^\/+/, '');
  }
  if (path.charAt(0) !== '/') path = '/' + path;
  return path || '/';
}

hexo.extend.helper.register('vt_post_views', function (page) {
  var theme = this.theme || {};
  var cfg = theme.post_views || {};
  var provider = String(pick(cfg.provider, 'static')).toLowerCase();

  var out = {
    enabled: false,
    provider: provider,
    label: String(pick(cfg.label, '次阅读')),
    hideOnError: cfg.hide_on_error !== false,
    min: parseInt(pick(cfg.min_display, 1), 10),
    cache: parseInt(pick(cfg.cache_minutes, 30), 10),
    timeout: parseInt(pick(cfg.timeout_seconds, 12), 10),
    spanId: '',
    scriptSrc: '',
    url: '',
    token: '',
    jsonPath: '',
    method: 'GET',
    path: pagePath(page)
  };
  if (isNaN(out.min)) out.min = 0;
  if (isNaN(out.cache)) out.cache = 0;
  if (isNaN(out.timeout) || out.timeout < 3) out.timeout = 12;

  // static 或总开关关闭：不联网，模板照旧显示 front-matter 的 views
  if (!cfg.enable || provider === 'static') {
    return out;
  }

  if (provider === 'busuanzi' || provider === 'vercount') {
    var sub = cfg[provider] || {};
    out.scriptSrc = String(pick(sub.script, '')).trim();
    out.spanId = String(pick(sub.id_prefix, provider)) + '_value_page_pv';
  } else if (provider === 'waline') {
    var waline = cfg.waline || {};
    var server = String(pick(waline.server_url, '')).replace(/\/+$/, '');
    var field = String(pick(waline.path_field, 'pathname')).toLowerCase();
    var target = field === 'permalink' ? String(page.permalink || out.path) : out.path;
    if (server) {
      out.url = server + '/comment?type=count&url=' + encodeURIComponent(target);
    }
  } else if (provider === 'zan') {
    var zan = cfg.zan || {};
    var zanServer = String(pick(zan.server, '')).replace(/\/+$/, '');
    if (zanServer) {
      out.url = zanServer + '/api/zan.php';
    }
    /* 浏览由 zan SDK 自动上报（全站统计），主题这边只读数字 */
    out.method = 'GET';
    out.jsonPath = 'data.views';
    out.cache = 0;
  } else if (provider === 'umami' || provider === 'custom') {
    var node = cfg[provider] || {};
    var raw = String(pick(node.url, pick(node.endpoint, '')));
    if (raw) {
      out.url = raw.replace(/\{path\}/g, encodeURIComponent(out.path));
    }
    out.token = String(pick(node.token, ''));
    out.jsonPath = String(pick(node.json_path, provider === 'umami' ? 'data.pageviews' : 'data.count'));
    out.method = String(pick(node.method, 'GET')).toUpperCase();
  } else {
    // 未知 provider：宁可不显示，也不要输出半截请求
    out.provider = 'static';
    return out;
  }

  // 地址没填全就当作关闭，避免页面里挂一个必然失败的请求
  if (!out.scriptSrc && !out.url) {
    return out;
  }

  out.enabled = true;
  return out;
});
