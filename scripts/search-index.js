/**
 * search-meta.json —— 搜索页卡片所需的文章元数据
 *
 * 为什么需要它：
 *   hexo-generator-searchdb 生成的 /search.json 只有 title / url / content /
 *   categories(名称) / tags(名称)，够检索，但不够还原主题的卡片样式
 *   （封面、日期、作者、分类与标签的链接都缺）。
 *   这里在构建期把缺的字段补成一份小索引（约 80 KB），
 *   搜索页把两份 JSON 按 url 拼起来，正文只存一份，不重复占体积。
 *
 * 输出：/search-meta.json
 *   [{ title, url, date, author, cover, excerpt,
 *      categories: [{name, url}], tags: [{name, url}] }]
 *
 * 说明：
 *   - 正文不在这里，仍走 /search.json（content 字段）
 *   - 按发布日期倒序，前端做稳定排序时用作次序依据
 *   - 站点根目录不是 / 时，url 会自动带上 root 前缀
 */
'use strict';

var ROOT = '/';

function withRoot(path) {
  var p = String(path || '').replace(/^\/+/, '');
  var r = ROOT === '/' ? '/' : ROOT.replace(/\/+$/, '') + '/';
  return r + p;
}

/* 去标签、压空白、解码常见实体，得到纯文本 */
function plain(html) {
  var s = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

function termList(collection) {
  var arr = [];
  if (!collection) return arr;
  var list = collection.toArray ? collection.toArray() : collection;
  (list || []).forEach(function (item) {
    if (!item) return;
    arr.push({
      name: item.name || String(item),
      url: withRoot(item.path || '')
    });
  });
  return arr;
}

hexo.extend.generator.register('bookshelf_search_meta', function (locals) {
  var posts = locals.posts.sort('-date');
  var list = [];

  posts.forEach(function (post) {
    // 草稿与未发布页面不参与
    if (post.published === false) return;

    var text = plain(post.content || '');
    var excerpt = text.length > 110 ? text.slice(0, 110) + '…' : text;

    list.push({
      title: post.title || '',
      url: withRoot(post.path),
      date: post.date ? post.date.toISOString() : '',
      author: post.author || '',
      cover: post.cover ? withRoot(post.cover) : (post.banner ? withRoot(post.banner) : ''),
      excerpt: excerpt,
      categories: termList(post.categories),
      tags: termList(post.tags)
    });
  });

  return {
    path: 'search-meta.json',
    data: JSON.stringify(list)
  };
});
