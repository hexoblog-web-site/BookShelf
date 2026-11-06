/* ============================================================
 * 导语块：给正文首段挂 .vt-post-lede
 *
 * 每篇正文首段与 front-matter description 是同一段文字（<!-- more --> 之前）。
 * 这里在 after_post_render 阶段判断：首段纯文本与 description 完全一致时，
 * 才给这个 <p> 加上类名，交给 bookshelf-extra.css 排版成导语样式。
 * 只比对文字，不比对 HTML，避免 typographer / 转义差异导致误判。
 * ============================================================ */
'use strict';

function plain(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

hexo.extend.filter.register('after_post_render', function (data) {
  var desc = data.description;
  if (!desc || !data.content) return data;

  var m = /^<p>([\s\S]*?)<\/p>\s*/.exec(data.content);
  if (!m) return data;

  if (plain(m[1]) !== plain(desc)) return data;

  // 已经打过标记就不重复处理
  if (/^<p class="vt-post-lede">/.test(data.content)) return data;

  data.content = data.content.replace(
    m[0],
    '<p class="vt-post-lede">' + m[1] + '</p>\n'
  );
  return data;
});
