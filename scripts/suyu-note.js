/* ============================================================
 * 俗语释义徽标：给「标题 + 阐述」条目的阐述段挂释义徽标
 *
 * 适用范围：分类为「俗语俚语」的文章。
 * 规则：紧跟在编号小节标题（<h2> 以数字开头，如 "1. 画虎画皮难画骨"）
 * 之后的第一个 <p>，视为该俗语的阐述段，在段首插入行内标签：
 *   <p><span class="vt-suyu-label">释义：</span>正文…</p>
 * 标签文字与颜色由 bookshelf-extra.css 控制，改文案只改 BADGE 一处。
 * 非俗语分类、无编号标题、叙事型文章（如 002）一律不做处理。
 * ============================================================ */
'use strict';

var BADGE = '释义';

function hasCategory(data, name) {
  if (!data.categories) return false;
  var cats = data.categories;
  var arr = [];
  if (typeof cats.forEach === 'function') {
    cats.forEach(function (c) { arr.push(typeof c === 'string' ? c : (c && c.name)); });
  } else if (cats.data) {
    cats.data.forEach(function (c) { arr.push(c.name); });
  } else if (cats.length !== undefined) {
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      arr.push(typeof c === 'string' ? c : (c && c.name));
    }
  }
  return arr.indexOf(name) !== -1;
}

hexo.extend.filter.register('after_post_render', function (data) {
  if (!data.content) return data;
  if (!hasCategory(data, '俗语俚语')) return data;
  if (data.content.indexOf('vt-suyu-label') !== -1) return data;   // 防重复

  // 匹配：<h2 ...>...数字. 俗语...</h2> ... <p>阐述</p>
  // 主题会在 h2 内注入 <a class="headerlink"> 锚点，所以先整块匹配 h2，
  // 再在回调里剥掉标签判断标题文字是否编号开头（1. / 1、 / 1．），
  // 避免误伤"结语"等无编号小节
  var re = /(<h2[^>]*>[\s\S]*?<\/h2>)(\s*)(<p>)([\s\S]*?)(<\/p>)/g;

  data.content = data.content.replace(re, function (m, h2, gap, pOpen, inner, pClose) {
    var text = h2.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!/^\d+[.、．]/.test(text)) return m;
    return h2 + gap +
      '<p><span class="vt-suyu-label">' + BADGE + '：</span>' + inner + '</p>';
  });

  return data;
});
