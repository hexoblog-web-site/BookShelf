/**
 * BookShelf Hexo Theme Helpers
 *
 * 本文件将 WordPress 主题的 PHP 函数 1:1 转写为 JavaScript：
 *   - functions.php  : vt_get_config / vt_theme_ad / vt_get_time /
 *                      vt_get_custom_avatar_url / vt_get_thumbnail_url /
 *                      formatHumanTime 等
 *   - inc/helper.php : formatHumanTime / vt_format_view_count /
 *                      sanitize_title / get_breadcrumbs / vt_init_dark_mode
 *   - inc/menu.php   : MyMenu / SideMenu Walker（vt_nav_menu / vt_side_menu）
 *   - inc/setting.php: create_table_of_contents
 *   - comments.php   : get_top_level_comment_count（静态站无评论数据，保留结构）
 *
 * 每个函数头注释标注对应的 WP 原函数名。
 *
 * @author vtheme <mail@vtheme.cn>
 * @link https://www.liublog.cn
 */

'use strict';

/**
 * url_for 包装：helper 内部不能直接依赖 this.url_for 的调用签名
 * （Hexo 视图上下文中 url_for 为绑定后的 helper），
 * 这里直接调用 hexo-util 的 url_for，this 传视图上下文（含 config）。
 */
var hexoUtilUrlFor = require('hexo-util').url_for;

function urlFor(ctx, path) {
  if (path === undefined || path === null || path === '') return '';
  try {
    return hexoUtilUrlFor.call(ctx, String(path));
  } catch (e) {
    return String(path);
  }
}

/* ============================================================
 * __($text, 'vt') —— WordPress 翻译函数
 *
 * WordPress 的 __() 以完整 msgid 精确匹配（含 "." 等字符）。
 * Hexo 内置 __() 使用 "." 作为层级分隔符，含点号的词条（如
 * "Network error, please try again."）无法命中，且第二个参数会被
 * 当作 sprintf 参数。这里按 WP 语义覆盖 __：从 languages/<lang>.yml
 * 精确匹配词条，未命中时原样返回 msgid（与 WP 行为一致）。
 * ============================================================ */
var fs = require('fs');
var pathUtil = require('path');

/* ============================================================
 * 语言包加载 —— 2026-10-31 修正
 *
 * 出身问题：语言文件名按 Hexo 惯例是 zh-CN.yml，而站点的
 * config.language 常写成 zh_CN（WordPress 风格，本站在改之前就是）。
 * 名字对不上，readFileSync 必然失败，字典变成空对象，于是 __() 全部
 * 回退英文 msgid——页面就出现「搜索 / Search」「上一篇 / Previous」
 * 这样的中英混排。
 *
 * 这里做三件事：
 *   1) 归一化：zh_CN / zh-cn / ZH_CN / zh 一律当同一门语言
 *   2) 依次尝试候选文件名，命中即止（zh-CN.yml → zh-cn.yml → zh.yml）
 *   3) 全都不存在时回退 zh-CN，宁可中文也不退回英文
 * ============================================================ */

var dictCache = {};

function langCandidates(lang) {
  var raw = Array.isArray(lang) ? String(lang[0] || '') : String(lang || '');
  raw = raw.trim();
  var list = [];
  function push(v) {
    if (v && list.indexOf(v) < 0) list.push(v);
  }
  if (raw) {
    var norm = raw.replace(/_/g, '-');
    var parts = norm.split('-');
    var head = parts[0].toLowerCase();
    push(norm);
    if (parts.length > 1) {
      var tail = parts.slice(1).join('-');
      push(head + '-' + tail.toUpperCase());   // zh-CN
      push(head + '-' + tail.toLowerCase());   // zh-cn
    }
    push(head);                                 // zh
  }
  push('zh-CN');
  push('zh-cn');
  return list;
}

function readLangFile(name) {
  var file = pathUtil.join(hexo.theme_dir, 'languages', name + '.yml');
  var yaml = require('js-yaml');
  var parsed = yaml.load(fs.readFileSync(file, 'utf8')) || {};
  // 标准结构：顶层是语言名（zh-CN:），词条在下一层
  if (parsed[name] && typeof parsed[name] === 'object') return parsed[name];
  // 兼容「词条直接放顶层」的语言包
  var nested = Object.keys(parsed).some(function (k) {
    return parsed[k] && typeof parsed[k] === 'object';
  });
  return nested ? {} : parsed;
}

function loadDict(lang) {
  var cacheKey = String(Array.isArray(lang) ? lang[0] : (lang || ''));
  if (dictCache[cacheKey]) return dictCache[cacheKey];
  var candidates = langCandidates(lang);
  var dict = {};
  for (var i = 0; i < candidates.length; i++) {
    try {
      var got = readLangFile(candidates[i]);
      if (got && Object.keys(got).length) { dict = got; break; }
    } catch (e) { /* 没有这个文件，试下一个 */ }
  }
  dictCache[cacheKey] = dict;
  return dict;
}

hexo.extend.helper.register('__', function (text) {
  var lang = (this.config && this.config.language) || 'zh-CN';
  var dict = loadDict(lang);
  var value = Object.prototype.hasOwnProperty.call(dict, text) ? dict[text] : text;
  // 兼容 sprintf 风格占位符（%s / %d），与 WP __() + printf 行为一致
  var args = Array.prototype.slice.call(arguments, 1);
  if (args.length) {
    var k = 0;
    value = String(value).replace(/%[sd]/g, function () {
      var v = args[k++];
      return v === undefined ? '' : String(v);
    });
  }
  return value;
});

/* ============================================================
 * vt_get_config($key, $default) —— functions.php
 * 读取 _config.yml 中与 WP 选项同名的字段。
 *
 * 【新增】兼容层：板块的标题/图标/条数已集中到 _config.yml 的
 * sections.<板块>.<字段>（见「板块统一配置」），模板仍按 WP 的
 * 扁平键名读取（hot_title / tags_num …），此处自动映射：
 *   1) 顶层扁平键存在 → 用扁平键（旧写法优先，保证向后兼容）
 *   2) 否则查 sections 下的同名板块字段
 *   3) 都没有 → 返回默认值
 * ============================================================ */
var VT_SECTION_FIELDS = {
  hot_title: ['hot', 'title'],
  hot_icon: ['hot', 'icon'],
  hot_num: ['hot', 'num'],
  links_title: ['links', 'title'],
  links_icon: ['links', 'icon'],
  popular_title: ['popular', 'title'],
  popular_icon: ['popular', 'icon'],
  popular_num: ['popular', 'num'],
  recent_title: ['recent', 'title'],
  recent_icon: ['recent', 'icon'],
  recent_num: ['recent', 'num'],
  tags_title: ['tags', 'title'],
  tags_icon: ['tags', 'icon'],
  tags_num: ['tags', 'num'],
  category_title: ['category', 'title'],
  category_icon: ['category', 'icon'],
  category_num: ['category', 'num']
};

hexo.extend.helper.register('vt_get_config', function (key, defaultValue) {
  var config = this.theme || {};
  if (key === null || key === undefined) return config;
  if (Object.prototype.hasOwnProperty.call(config, key)) return config[key];

  // sections.<板块>.<字段> 映射
  var path = VT_SECTION_FIELDS[key];
  if (path) {
    var sections = config.sections;
    var node = sections && typeof sections === 'object' ? sections[path[0]] : null;
    if (node && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, path[1])) {
      return node[path[1]];
    }
  }
  return defaultValue;
});

/* ============================================================
 * vt_section_title($title, $icon) —— 【新增】板块标题（图标 + 文字）
 *
 * 原 WP 主题的板块标题只有纯文字。此处为新增能力：
 * 图标类名取自 _config.yml 的 *_icon 字段（FontAwesome），
 * 图标留空时只输出文字，DOM 与 WP 版保持一致。
 * ============================================================ */
function escText(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

hexo.extend.helper.register('vt_section_title', function (title, icon) {
  var html = '';
  if (icon) {
    html += '<i class="' + escText(icon).replace(/"/g, '&quot;') + ' vt-section-icon"></i>';
  }
  html += '<span>' + escText(title) + '</span>';
  return html;
});

/* ============================================================
 * THEME_URL 常量 —— functions.php define('THEME_URL', ...)
 * Hexo 中主题静态资源位于 source/ 根下：
 *   /style/  /images/  /js/  /lib/
 * ============================================================ */
hexo.extend.helper.register('THEME_URL', function () {
  return '';
});

/* ============================================================
 * formatHumanTime($time, $lang) —— inc/helper.php
 * 多语言人性化时间格式化函数，逐行转写。
 * ============================================================ */
function formatHumanTime(time, lang) {
  lang = lang || '';

  var langMap = {
    'zh_CN': 'zh', 'zh_TW': 'zh-tw', 'zh_HK': 'zh-tw', 'zh_MO': 'zh-tw', 'zh_SG': 'zh',
    'en_US': 'en', 'en_GB': 'en', 'en_CA': 'en', 'en_AU': 'en', 'en_NZ': 'en', 'en_ZA': 'en', 'en_IE': 'en',
    'ja': 'ja', 'ja_JP': 'ja',
    'ko': 'ko', 'ko_KR': 'ko'
  };

  var directLangs = ['zh', 'zh-tw', 'en', 'ja', 'ko'];

  // 自动获取站点语言（WP get_locale() → Hexo config.language）
  if (!lang) {
    lang = this.config && this.config.language ? this.config.language : 'zh_CN';
  }

  /* Hexo 的 config.language 惯用 BCP 47 写法（zh-CN / zh-TW / en-US），
     WP get_locale() 则是下划线 locale（zh_CN）。原来只查下划线表，
     zh-CN 查不到就兜底成 en，卡片时间会显示成「4 days ago」。
     这里统一：直写 → 原样查表 → 连字符转下划线 → 忽略大小写。 */
  function detectLang(l) {
    if (!l) return '';
    l = String(l);
    if (directLangs.indexOf(l) !== -1) return l;
    if (langMap[l]) return langMap[l];
    var u = l.replace(/-/g, '_');
    if (langMap[u]) return langMap[u];
    var lower = u.toLowerCase();
    for (var k in langMap) {
      if (k.toLowerCase() === lower) return langMap[k];
    }
    return '';
  }

  var langKey = detectLang(lang) || 'en';

  // 转换时间为时间戳
  var timestamp = typeof time === 'string' ? Date.parse(time.replace(/ /, 'T')) : new Date(time).getTime();

  if (isNaN(timestamp) || timestamp <= 0) {
    var invalidTexts = {
      'zh': '无效时间', 'zh-tw': '無效時間', 'en': 'Invalid time',
      'ja': '無効な時間', 'ko': '잘못된 시간'
    };
    return invalidTexts[langKey] || 'Invalid time';
  }

  var diff = Math.floor(Date.now() / 1000) - Math.floor(timestamp / 1000);

  // 未来时间
  if (diff < 0) {
    return formatDate(timestamp, 'Y-m-d');
  }

  // 多语言配置 [分钟，小时，天，后缀，刚刚]
  var units = {
    'zh': ['分钟', '小时', '天', '前', '刚刚'],
    'zh-tw': ['分鐘', '小時', '天', '前', '剛剛'],
    'en': [' min', ' hour', ' day', ' ago', 'Just now'],
    'ja': ['分', '時間', '日', '前', 'たった今'],
    'ko': ['분', '시간', '일', '전', '방금']
  };

  var u = units[langKey] || units['en'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function formatDate(ts, fmt) {
    var d = new Date(ts);
    var y = d.getFullYear(), m = pad(d.getMonth() + 1), day = pad(d.getDate());
    if (fmt === 'm-d') return m + '-' + day;
    return y + '-' + m + '-' + day;
  }

  if (diff < 60) return u[4];
  if (diff < 3600) {
    var val1 = Math.floor(diff / 60);
    var plural1 = (langKey === 'en' && val1 > 1) ? 's' : '';
    return val1 + u[0] + plural1 + u[3];
  }
  if (diff < 86400) {
    var val2 = Math.floor(diff / 3600);
    var plural2 = (langKey === 'en' && val2 > 1) ? 's' : '';
    return val2 + u[1] + plural2 + u[3];
  }
  if (diff < 2592000) {
    var val3 = Math.floor(diff / 86400);
    var plural3 = (langKey === 'en' && val3 > 1) ? 's' : '';
    return val3 + u[2] + plural3 + u[3];
  }
  if (diff < 31536000) {
    return formatDate(timestamp, 'm-d');
  }

  return formatDate(timestamp, 'Y-m-d');
}

/* vt_get_time($time) —— functions.php */
hexo.extend.helper.register('vt_get_time', function (time) {
  return formatHumanTime.call(this, time);
});

/* ============================================================
 * vt_format_view_count($count) —— inc/helper.php
 * 缩减浏览次数显示，逐行转写。
 * ============================================================ */
hexo.extend.helper.register('vt_format_view_count', function (count) {
  count = parseInt(count, 10) || 0;
  var locale = ((this.config && this.config.language) || 'zh_CN').replace(/-/g, '_').toLowerCase();

  // 同上：zh-CN → zh_cn，统一按小写比较，避免中文站显示成 1k / 1M
  var isChinese = ['zh_cn', 'zh_tw', 'zh_hk', 'zh_mo', 'zh_sg', 'ja', 'ja_jp', 'ko', 'ko_kr'].indexOf(locale) !== -1;

  function roundTrim(n) {
    // rtrim(rtrim(round($count / x, 1), '0'), '.')
    return String(Math.round(n * 10) / 10).replace(/\.?0+$/, '');
  }

  if (count <= 1000) return String(count);
  if (count < 10000) return roundTrim(count / 1000) + (isChinese ? '千' : 'k');
  if (count < 100000000) {
    if (isChinese) return roundTrim(count / 10000) + '万';
    return roundTrim(count / 1000000) + 'M';
  }
  return roundTrim(count / 100000000) + (isChinese ? '亿' : 'M');
});

/* ============================================================
 * get_post_views($postID) —— functions.php
 * WP 读取 post_views_count meta；Hexo 静态站读取文章 front-matter
 * 的 views 字段（未设置时返回 0，与 WP meta 为空时行为一致）。
 * ============================================================ */
hexo.extend.helper.register('get_post_views', function (post) {
  if (post && post.views !== undefined && post.views !== null && post.views !== '') {
    return post.views;
  }
  return 0;
});

/* ============================================================
 * get_real_client_ip() —— inc/helper.php
 * 静态站无后端，保留空实现供依赖函数引用。
 * ============================================================ */

/* ============================================================
 * vt_get_custom_avatar_url($user_id) —— functions.php
 * WP 优先读取自定义头像 meta，否则回退默认头像；
 * 静态站无用户系统，固定回退默认头像（与 WP 空回退一致）。
 * ============================================================ */
hexo.extend.helper.register('vt_get_custom_avatar_url', function () {
  return urlFor(this, '/images/avatar.jpg');
});

/* ============================================================
 * vt_get_thumbnail_url($post_id, $size) —— functions.php
 * WP 优先特色图片，否则 default_image / 默认图；
 * Hexo 中 post.cover 或 post.banner 为封面约定字段，回退链一致。
 * ============================================================ */
hexo.extend.helper.register('vt_get_thumbnail_url', function (post) {
  if (post && (post.cover || post.banner)) return post.cover || post.banner;
  var defaultImage = this.vt_get_config('default_image', '');
  return defaultImage ? defaultImage : urlFor(this, '/images/default.jpg');
});

/* ============================================================
 * sanitize_title($title) —— WP sanitize_title（inc/setting.php TOC 使用）
 * ============================================================ */
function sanitizeTitle(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/<[^>]*>/g, '')            // 去 HTML 标签
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')            // 空白与下划线 → -
    .replace(/[^a-z0-9\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af-]/g, '') // 仅保留字母数字/中日韩/-（WP 保留 UTF-8 字母）
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ============================================================
 * create_table_of_contents($content) —— inc/setting.php
 * 生成文章目录（TOC），逐行转写。
 * 修正说明：原 add_heading_ids_to_content 回调中 "</h2>" 为硬编码
 * 笔误（WP 版 bug），此处按实际标题级别闭合；Hexo 渲染器已为标题
 * 生成 id，转写沿用已有 id，无 id 时用 sanitize_title 生成。
 * ============================================================ */
hexo.extend.helper.register('vt_toc', function (content) {
  var matches = [];
  var regexp = /<h([2-6]).*?\>(.*?)<\/h[2-6]>/is;
  var globalRegexp = /<h([2-6])([^>]*)\>(.*?)<\/h[2-6]>/gis;

  var toc = '';
  var m;
  while ((m = globalRegexp.exec(content)) !== null) {
    matches.push(m);
  }

  if (matches.length) {
    toc = '<ul class="toc_list">';
    for (var key = 0; key < matches.length; key++) {
      var headingLevel = parseInt(matches[key][1], 10);
      var headingText = matches[key][3].replace(/<[^>]*>/g, '');
      // Hexo 渲染器已生成 id，优先沿用（替代 WP 的 str_replace 注入）
      var attrs = matches[key][2] || '';
      var idMatch = attrs.match(/id="([^"]*)"/);
      var anchor = idMatch ? idMatch[1] : sanitizeTitle(headingText);
      toc += '<li class="level-' + headingLevel + '"><a href="#' + anchor + '"> ' + headingText + '</a></li>';
    }
    toc += '</ul>';
  }
  return toc;
});

/* ============================================================
 * vt_theme_ad($position) —— functions.php
 * 显示广告：{position}_enable / _code / _code_pc，逐行转写。
 * ============================================================ */
hexo.extend.helper.register('vt_theme_ad', function (position) {
  var cfg = this.theme || {};
  function get(key, def) {
    return Object.prototype.hasOwnProperty.call(cfg, key) ? cfg[key] : def;
  }
  var enable = get(position + '_enable', true);
  var code = get(position + '_code', '');
  var codePc = get(position + '_code_pc', '');

  if (!enable || !code) return '';

  var html = '<div class="vt-theme-ad ad-' + position + '">';
  html += '<div class="ad-mobile">' + code + '</div>';
  if (codePc) {
    html += '<div class="ad-pc">' + codePc + '</div>';
  }
  html += '</div>';
  return html;
});

/* ============================================================
 * vt_clean_the_excerpt($content) —— inc/shortcode.php
 * 移除保护短代码并去除所有标签，逐行转写。
 * ============================================================ */
hexo.extend.helper.register('vt_clean_the_excerpt', function (content) {
  var protectedShortcodes = ['login', 'vip', 'comment'];
  content = content || '';

  protectedShortcodes.forEach(function (shortcode) {
    var pattern = new RegExp('\\[' + shortcode + '\\][\\s\\S]*?\\[\\/' + shortcode + '\\]', 'g');
    while (pattern.test(content)) {
      content = content.replace(pattern, '');
    }
    var single = new RegExp('\\[' + shortcode + '\\]', 'g');
    content = content.replace(single, '');
  });

  // strip_shortcodes + wp_strip_all_tags
  content = content.replace(/\[[^\]]*\]/g, '');
  content = String(content).replace(/<[^>]*>/g, '');

  return content.trim();
});

/* ============================================================
 * vt_get_the_excerpt(item) —— WP get_the_excerpt()（wp-includes/
 * post-template.php）的等价实现：
 *   有手动摘要（front-matter excerpt）→ 直接使用；
 *   无摘要 → 从正文自动提取（vt_clean_the_excerpt 去标签，
 *   对应 WP 对 the_content 应用 excerpt 过滤）。
 * wp_trim_words 压缩空白；截取长度沿用主题海报处
 * mb_substr(get_the_excerpt(), 0, 100) 的 100 字上限（截断不追加省略号，
 * 与 WP 截断行为一致）。卡片与分享海报共用。
 * ============================================================ */
hexo.extend.helper.register('vt_get_the_excerpt', function (item) {
  var self = this;
  var excerpt = item && item.excerpt ? String(item.excerpt) : '';

  if (!excerpt) {
    // WP: 无手动摘要时取 the_content 的纯文本
    var content = item && item.content ? String(item.content) : '';
    excerpt = self.vt_clean_the_excerpt(content);
  } else {
    // Hexo 的 excerpt 是 <!-- more --> 之前的 HTML，先去标签再计长度，
    // 否则 <p>/<img> 会占掉 100 字配额，海报处还会被 esc_html 转义成字面标签
    excerpt = self.vt_clean_the_excerpt(excerpt);
  }

  // wp_trim_words：摘要内不保留换行与多余空白
  excerpt = excerpt.replace(/\s+/g, ' ').trim();

  // 与 single.php 海报处 mb_substr(get_the_excerpt(), 0, 100) 一致
  if (excerpt.length > 100) {
    excerpt = excerpt.slice(0, 100);
  }

  return excerpt;
});

/* ============================================================
 * vt_get_poster_excerpt(item) —— 分享海报的文案来源，两级回退：
 *   1) front-matter 的 description（人工撰写、字数已受控）→ 优先
 *   2) 没有 description → 退回 vt_get_the_excerpt（more 之前 → 全文自动提取）
 * 返回纯文本，调用处无需再做去标签处理。
 * ============================================================ */
hexo.extend.helper.register('vt_get_poster_excerpt', function (item) {
  var self = this;
  var text = '';

  if (item && item.description) {
    text = self.vt_clean_the_excerpt(String(item.description));
    text = text.replace(/\s+/g, ' ').trim();
  }

  if (!text) {
    return self.vt_get_the_excerpt(item);
  }

  if (text.length > 100) {
    text = text.slice(0, 100);
  }
  return text;
});

/* ============================================================
 * vt_init_dark_mode() —— inc/helper.php
 * 返回 { is_dark_mode, dark_mode_class }。
 * WP 通过 PHP 端 Cookie 判断 is_dark_mode；Hexo 为静态生成，
 * 初始 is_dark_mode 固定 false（暗黑切换由原主题
 * js/src/dark-mode.js 在客户端接管，行为一致）。
 * ============================================================ */
hexo.extend.helper.register('vt_init_dark_mode', function () {
  var darkModeType = this.vt_get_config('dark_mode_type', 2);
  var isDarkMode = false;
  var darkModeClass = '';

  if (darkModeType == 0) {        // 禁用
    // $_COOKIE['darkModeType'] = 0;
  } else if (darkModeType == 1) { // 手动
    // $_COOKIE['darkModeType'] = 1;
    isDarkMode = false;
    darkModeClass = isDarkMode ? 'dark-mode' : '';
  } else if (darkModeType == 2) { // 自动
    // $_COOKIE['darkModeType'] = 2;
    isDarkMode = false;
    darkModeClass = 'dark-mode-auto';
  }

  return {
    is_dark_mode: isDarkMode,
    dark_mode_class: darkModeClass
  };
});

/* ============================================================
 * vt_nav_menu($items, $menuClass) —— inc/menu.php MyMenu Walker
 * 输出结构 1:1 复刻 MyMenu：
 *   <ul class="{menuClass}">
 *     <li class="menu-item"><a href="...">标题</a>
 *       （有子级时 <a> 内追加 <i class="fa-solid fa-chevron-down"></i>）
 *       <ul class="child-menu">…</ul>
 *     </li>
 *   </ul>
 * 未配置菜单时走 MyMenu::fallback。
 * depth 4（与 WP wp_nav_menu depth=4 一致）。
 * ============================================================ */
hexo.extend.helper.register('vt_nav_menu', function (items, menuClass) {
  var self = this;

  function esc(str) {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // MyMenu::fallback
  if (!items || !items.length) {
    return '<ul class="' + esc(menuClass) + '">' +
      '<li class="menu-item"><a href="#">' + esc(self.__('Add menu', 'vt')) + '</a></li>' +
      '</ul>';
  }

  var output = '<ul id="" class="' + esc(menuClass) + '">\n';

  function walk(list, depth) {
    list.forEach(function (item) {
      var url = item.url ? urlFor(self, item.url) : '';
      var title = item.title || '';
      var hasChildren = item.children && item.children.length && depth < 4 - 1;

      output += '<li class="menu-item">';
      output += '<a href="' + esc(url) + '">';
      output += esc(title);
      if (hasChildren) {
        output += '<i class="fa-solid fa-chevron-down"></i></a>';
      } else {
        output += '</a>';
      }
      if (hasChildren) {
        output += '\n<ul class="child-menu">\n';
        walk(item.children, depth + 1);
        output += '</ul>\n';
      }
      output += '</li>\n';
    });
  }

  walk(items, 0);
  output += '</ul>\n';
  return output;
});

/* ============================================================
 * SideMenu Walker —— inc/menu.php（CategoryWidget 侧边菜单）
 * 二级输出 <ul class="side-child-menu">，depth==1 追加 (count)。
 * ============================================================ */
hexo.extend.helper.register('vt_side_menu', function (items) {
  var self = this;

  function esc(str) {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  if (!items || !items.length) {
    return '<ul class="side-menu">' +
      '<li class="menu-item"><a href="#">' + esc(self.__('Please create theme sidebar menu', 'vt')) + '</a></li>' +
      '</ul>';
  }

  var output = '<ul id="" class="side-menu">\n';

  function walk(list, depth) {
    list.forEach(function (item) {
      var url = item.url ? urlFor(self, item.url) : '';
      var title = item.title || '';
      var hasChildren = item.children && item.children.length && depth < 2 - 1;

      output += '<li class="menu-item">';
      output += '<a href="' + esc(url) + '">';
      output += esc(title);
      if (depth === 1 && item.count !== undefined) {
        output += '(' + esc(item.count) + ')';
      }
      if (hasChildren) {
        output += '<i class="fa-solid fa-chevron-up arrow"></i></a>';
      } else {
        output += '</a>';
      }
      if (hasChildren) {
        output += '\n<ul class="side-child-menu">\n';
        walk(item.children, depth + 1);
        output += '</ul>\n';
      }
      output += '</li>\n';
    });
  }

  walk(items, 0);
  output += '</ul>\n';
  return output;
});

/* ============================================================
 * vt_category_list($limit) —— 【新增】文章分类列表
 *
 * WP 版的 CategoryWidget 只认「侧边栏菜单」（side_menu），
 * 菜单未配置时 Walker::fallback 只输出一条“添加菜单”提示，
 * 后台还得手工把分类一条条加进菜单。
 * Hexo 版补充默认行为：side_menu 未配置时直接取站点文章分类
 * （site.categories），DOM 结构与 SideMenu Walker 输出保持一致：
 *   <ul id="" class="side-menu">
 *     <li class="menu-item"><a href="..."><span>名称</span>
 *       <span class="category-count">数量</span></a>
 *       <ul class="side-child-menu">…</ul></li>
 *   </ul>
 * 支持父子分类（Hexo categories 的 parent 字段），$limit=0 不限制。
 * ============================================================ */
hexo.extend.helper.register('vt_category_list', function (limit) {
  var self = this;
  var max = parseInt(limit, 10);
  if (isNaN(max)) max = 0;

  function esc(str) {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var all = (self.site.categories && self.site.categories.toArray)
    ? self.site.categories.toArray()
    : [];

  if (!all.length) {
    return '<ul id="" class="side-menu">\n' +
      '<li class="menu-item"><a href="#">' + esc(self.__('No Content')) + '</a></li>\n' +
      '</ul>\n';
  }

  // 父子分组：parent 为空的是顶级分类
  // 注意：Hexo 的 category.parent 存的是父分类的 _id（不是名称），
  // 早期版本存名称，这里两种都兼容。
  var tops = all.filter(function (c) { return !c.parent; });
  var childrenOf = function (parent) {
    var keys = [parent._id, parent.id, parent.name].filter(function (k) { return !!k; });
    return all.filter(function (c) {
      return !!c.parent && keys.indexOf(c.parent) !== -1;
    });
  };

  // 按名称排序（wp_list_categories 默认 orderby=name）
  tops.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'zh'); });
  if (max > 0) tops = tops.slice(0, max);

  var output = '<ul id="" class="side-menu">\n';

  function itemHtml(cat, depth) {
    var kids = depth < 1 ? childrenOf(cat) : [];
    var url = urlFor(self, cat.path || '');
    var html = '<li class="menu-item">';
    html += '<a href="' + esc(url) + '">';
    html += '<span>' + esc(cat.name) + '</span>';
    html += '<span class="category-count">' + esc(cat.length || 0) + '</span>';
    if (kids.length) {
      html += '<i class="fa-solid fa-chevron-up arrow"></i>';
    }
    html += '</a>';
    if (kids.length) {
      kids.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'zh'); });
      html += '\n<ul class="side-child-menu">\n';
      kids.forEach(function (kid) { html += itemHtml(kid, depth + 1); });
      html += '</ul>\n';
    }
    html += '</li>\n';
    return html;
  }

  tops.forEach(function (cat) { output += itemHtml(cat, 0); });
  output += '</ul>\n';
  return output;
});

/* ============================================================
 * paginate_links($args) —— WP 核心函数（category.php / tag.php /
 * search.php / templates/home/last.php，type=list，end_size=2，
 * mid_size=2，prev/next 为字体图标）
 * 输出结构 1:1 复刻 WP paginate_links 'type' => 'list'：
 *   <ul class='page-numbers'>
 *     <li><a class="prev page-numbers" href="...">icon</a></li>
 *     <li><a class='page-numbers' href='...'>1</a></li>
 *     <li><span class="page-numbers current">2</span></li>
 *     <li><span class="page-numbers dots">…</span></li>
 *     <li><a class="next page-numbers" href="...">icon</a></li>
 *   </ul>
 * ============================================================ */
hexo.extend.helper.register('vt_paginate_links', function (args) {
  var current = parseInt(args.current, 10) || 1;
  var total = parseInt(args.total, 10) || 1;
  var linkFor = args.linkFor || function () { return '#'; };
  var prevText = args.prev_text || '&laquo;';
  var nextText = args.next_text || '&raquo;';
  var endSize = args.end_size === undefined ? 2 : parseInt(args.end_size, 10);
  var midSize = args.mid_size === undefined ? 2 : parseInt(args.mid_size, 10);

  if (total <= 1) return '';

  // 复刻 paginate_links() 内部的页码收集逻辑
  var pages = [];
  var dots = false;
  for (var n = 1; n <= total; n++) {
    if (n === current) {
      pages.push({ n: n, current: true });
      dots = true;
    } else if (
      n <= endSize ||
      (current && n >= current - midSize && n <= current + midSize) ||
      n > total - endSize
    ) {
      pages.push({ n: n, current: false });
      dots = true;
    } else if (dots) {
      pages.push({ dots: true });
      dots = false;
    }
  }

  var html = "<ul class='page-numbers'>\n";

  if (current > 1) {
    html += '<li><a class="prev page-numbers" href="' + linkFor(current - 1) + '">' + prevText + '</a></li>\n';
  }

  pages.forEach(function (p) {
    if (p.dots) {
      html += "<li><span class='page-numbers dots'>…</span></li>\n";
    } else if (p.current) {
      html += "<li><span class='page-numbers current'>" + p.n + "</span></li>\n";
    } else {
      html += "<li><a class='page-numbers' href='" + linkFor(p.n) + "'>" + p.n + "</a></li>\n";
    }
  });

  if (current < total) {
    html += '<li><a class="next page-numbers" href="' + linkFor(current + 1) + '">' + nextText + '</a></li>\n';
  }

  html += '</ul>\n';
  return html;
});

/* ============================================================
 * get_breadcrumbs() —— inc/helper.php
 * 增强版面包屑导航。Hexo 页面类型映射：
 *   is_single → is_post, is_category → is_category,
 *   is_tag → is_tag, is_page → is_page, is_search → 搜索页,
 *   is_404 → 404 页。日期归档/作者归档 WP 专属分支保留注释。
 * ============================================================ */
hexo.extend.helper.register('get_breadcrumbs', function () {
  var self = this;
  var page = self.page || {};

  // 如果是首页，不显示面包屑
  if (self.is_home()) return '';

  var html = '<div class="breadcrumbs">';
  html += '<a href="' + urlFor(self, '/') + '"><i class="fa-solid fa-house"></i>' + self.__('Home', 'vt') + '</a>';

  // 文章页面
  if (self.is_post()) {
    var categories = page.categories || [];
    if (categories && categories.length) {
      var category = categories.first ? categories.first() : categories[0];
      // WP get_category_parents：完整层级路径；Hexo 用各级名称拼接
      html += ' &gt; ' + escHtml(category.name);
    }
    html += ' &gt; <span class="current">' + self.__('Content', 'vt') + '</span>';
  }
  // 分类归档页面
  else if (self.is_category()) {
    html += ' &gt; <span class="current">' + escHtml(page.category) + '</span>';
  }
  // 标签归档页面
  else if (self.is_tag()) {
    html += ' &gt; ' + self.__('Tag:', 'vt') + ' <span class="current">' + escHtml(page.tag) + '</span>';
  }
  // 页面
  else if (self.is_page()) {
    html += ' &gt; <span class="current">' + self.__('Content', 'vt') + '</span>';
  }

  html += '</div>';
  return html;

  function escHtml(str) {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
});

/* ============================================================
 * mb_substr —— inc/setting.php / single.php 中使用
 * ============================================================ */
hexo.extend.helper.register('mb_substr', function (str, start, length) {
  str = String(str === undefined || str === null ? '' : str);
  return Array.from(str).slice(start, start + length).join('');
});

/* ============================================================
 * esc_js / esc_html / esc_attr / esc_url —— WP 转义函数
 * EJS 的 <%= %> 已做 HTML 转义，这里补齐 JS/URL 转义供 <%- %> 使用。
 * ============================================================ */
hexo.extend.helper.register('esc_js', function (str) {
  return String(str === undefined || str === null ? '' : str)
    .replace(/\\/g, '\\\\').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '\\n');
});

hexo.extend.helper.register('esc_html', function (str) {
  return String(str === undefined || str === null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
});

hexo.extend.helper.register('esc_attr', function (str) {
  return String(str === undefined || str === null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
});

hexo.extend.helper.register('esc_url', function (str) {
  return String(str === undefined || str === null ? '' : str)
    .replace(/"/g, '%22').replace(/'/g, '%27').replace(/</g, '%3C').replace(/>/g, '%3E');
});
