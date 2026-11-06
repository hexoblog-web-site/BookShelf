/**
 * home-gen.js —— 首页分页前的分类过滤
 *
 * 背景：模板 layout/_partial/home/last.ejs 里的 posts_ids / posts_not_in_ids
 * 是在「分页之后」过滤 page.posts 的 —— 一页 10 篇里排掉 4 篇，这页就只剩 6 篇，
 * 页码还按 10 篇算，最后几页甚至会整页空白。
 *
 * 这里把过滤提前到分页之前：先按分类过滤，再切页，篇数与页码就能对上。
 *
 * 安全性：只有 posts_ids / posts_not_in_ids 真配了东西时才接管 index 生成器；
 * 两个都是空数组时原样调用 hexo-generator-index 的实现，输出与之前完全一致。
 * 站点没装 hexo-generator-index 时也能独立工作（内置一套分页）。
 *
 * 注意：Hexo 的主题脚本是用 vm 包一层执行的（只有 exports/require/module/hexo
 * 几个参数），不认 module.exports，所以这里直接写副作用，不导出函数。
 */

/* eslint-disable no-unused-vars */
(function () {
  function toNames(value) {
    if (value === undefined || value === null || value === '') return [];
    var arr = Array.isArray(value) ? value : String(value).split(',');
    return arr
      .map(function (v) { return String(v === undefined || v === null ? '' : v).trim(); })
      .filter(Boolean);
  }

  function categoryNames(post) {
    var cats = post.categories;
    if (!cats) return [];
    if (typeof cats.toArray === 'function') cats = cats.toArray();
    if (!Array.isArray(cats)) return [];
    return cats.map(function (c) { return (c && c.name) || String(c); });
  }

  function sameName(haystack, needles) {
    var lower = haystack.map(function (s) { return String(s).toLowerCase(); });
    return needles.some(function (n) { return lower.indexOf(String(n).toLowerCase()) !== -1; });
  }

  var original = null;
  try {
    original = hexo.extend.generator.get('index');
  } catch (e) {
    original = null;
  }

  var pagination = null;
  try {
    pagination = require('hexo-pagination');
  } catch (e) {
    pagination = null;
  }

  hexo.extend.generator.register('index', function (locals) {
    var theme = (hexo.theme && hexo.theme.config) || {};
    var include = toNames(theme.posts_ids);
    var exclude = toNames(theme.posts_not_in_ids);

    /* 没配过滤条件 → 完全走原生成器，行为零变化 */
    if (!include.length && !exclude.length) {
      return typeof original === 'function' ? original.call(this, locals) : [];
    }

    var config = this.config || {};
    var indexCfg = config.index_generator || {};
    var perPage = indexCfg.per_page || config.per_page || 10;
    var orderBy = indexCfg.order_by || '-date';
    var paginationDir = indexCfg.pagination_dir || config.pagination_dir || 'page';
    var basePath = indexCfg.path || '';

    var posts = locals.posts.sort(orderBy);
    var list = posts && posts.data
      ? posts.data.slice()
      : Array.prototype.slice.call(posts || []);

    /* 置顶优先（与 hexo-generator-index 一致） */
    list.sort(function (a, b) { return (b.sticky || 0) - (a.sticky || 0); });

    list = list.filter(function (post) {
      var names = categoryNames(post);
      if (include.length && !sameName(names, include)) return false;
      if (exclude.length && sameName(names, exclude)) return false;
      return true;
    });

    if (!pagination) {
      hexo.log.warn('[bookshelf] 缺少 hexo-pagination，posts_ids 过滤未生效');
      return typeof original === 'function' ? original.call(this, locals) : [];
    }

    return pagination(basePath, list, {
      perPage: perPage,
      layout: indexCfg.layout || ['index', 'archive'],
      format: paginationDir + '/%d/',
      data: {
        __index: true
      }
    });
  });
})();
