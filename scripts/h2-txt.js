/* ============================================================
 * h2 编号拆分：让标题下的短横线避开编号、只挂在文字上
 *
 * 渲染时把 <h2>4. 害人之心不可有</h2> 变成：
 *   <h2>…<span class="vt-h2-num">4. </span><span class="vt-h2-txt">害人之心不可有</span></h2>
 * 横线（h2::before 的替代）改挂 .vt-h2-txt::before，
 * 编号宽度变化不影响横线位置。无编号标题不处理，
 * 继续走 bookshelf-extra.css 里 h2::before 的兜底横线。
 * 全站文章生效，不限分类。
 * ============================================================ */
'use strict';

hexo.extend.filter.register('after_post_render', function (data) {
  if (!data.content) return data;
  if (data.content.indexOf('vt-h2-txt') !== -1) return data;   // 防重复

  data.content = data.content.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, function (m, attrs, inner) {
    // 跳过主题注入的空锚点
    var anchor = '';
    var am = inner.match(/^(\s*<a[^>]*class="headerlink"[^>]*>\s*<\/a>)([\s\S]*)$/);
    if (am) {
      anchor = am[1];
      inner = am[2];
    }
    // 标题文字以编号开头才拆分（1. / 1、 / 1．）
    var nm = inner.match(/^(\s*)(\d+[.、．]\s*)([\s\S]*)$/);
    if (!nm) return m;
    return '<h2' + attrs + '>' + anchor + nm[1] +
      '<span class="vt-h2-num">' + nm[2] + '</span>' +
      '<span class="vt-h2-txt">' + nm[3] + '</span></h2>';
  });

  return data;
});
