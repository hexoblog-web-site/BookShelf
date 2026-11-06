/**
 * 404 页面生成器 —— 对应 WordPress 404.php
 *
 * Hexo 核心不生成 404.html（WordPress 由 404.php 模板直接响应），
 * 为保证主题页面完整（404 页面与 WP 版一致），在主题内注册生成器：
 * 输出 /404.html，使用 layout/404.ejs 渲染。
 */
hexo.extend.generator.register('bookshelf_404', function (locals) {
  return {
    path: '404.html',
    layout: '404',
    data: {
      title: '404',
      path: '404.html'
    }
  };
});
