/**
 * inject.js —— 自定义代码注入
 *
 * 对应主题 _config.yml 末尾的 inject 节：
 *
 *   inject:
 *     head:                        # 插入到 </head> 之前
 *       - <link rel="stylesheet" href="/style/custom.css">
 *     bottom:                      # 插入到 </body> 之前
 *       - <script src="/js/flink.js"></script>
 *
 * 模板用法（见 layout/_partial/header.ejs、footer.ejs）：
 *   <%- vt_inject('head') %>
 *   <%- vt_inject('bottom') %>
 *
 * 设计取舍：
 *  - 内容一律原样输出（<%- 不转义），否则 <link> 会被转成 &lt;link&gt;；
 *    能写这个配置的人就是站点主人，不需要再做 XSS 过滤。
 *  - 支持三种写法：数组（推荐）、单个字符串、未配置 / 空数组。
 *  - 一个元素可以写多行（YAML 的 | 块），按位置统一缩进，源码干净。
 *  - 空字符串、null、纯空白项直接跳过，不会在页面里留空行。
 *  - 顺序 = 配置里的顺序，head 后写的优先于先写的（CSS 覆盖关系靠这个）。
 *
 * @author 老刘博客主题定制
 */

'use strict';

// 按输出位置决定缩进（head 内容在 <head> 内，缩进 4 空格；body 底部顶格）
var INJECT_PAD = {
  head: '    ',
  bottom: ''
};

function toArray(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * 把多行内容按前缀缩进，去掉首尾空行。
 * 不改变内容本身的相对缩进，只统一整体位置。
 */
function indentBlock(text, pad) {
  var lines = String(text).replace(/\r\n/g, '\n').replace(/\s+$/, '').split('\n');
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  if (!pad) return lines.join('\n');
  return lines.map(function (line) {
    return line.trim() === '' ? '' : pad + line;
  }).join('\n');
}

hexo.extend.helper.register('vt_inject', function (position) {
  var cfg = (this.theme && this.theme.inject) || hexo.theme.config.inject || {};
  var pad = INJECT_PAD[position] === undefined ? '' : INJECT_PAD[position];
  var list = toArray(cfg[position]);

  var out = [];
  list.forEach(function (item) {
    if (item === undefined || item === null) return;
    var text = String(item);
    if (text.trim() === '') return;
    out.push(indentBlock(text, pad));
  });

  // 末尾不补换行：模板里调用处已自带换行，避免 </body> 前多出空行
  return out.join('\n');
});
