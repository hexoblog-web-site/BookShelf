# BookShelf（书架）

**一款优雅的 Hexo 文学阅读博客主题。**

版式克制、留白充足，把注意力留给文字本身；列表给摘要、正文给节奏，适合长篇随笔、书摘笔记、民俗掌故这类要"读进去"的内容。

> **第一次用？** 先看 [使用说明](docs/guide.md)——安装、最少配置、接点赞与评论、常见问题都在那一篇里。
> 本文讲的是每个配置项对应 WordPress 后台的哪一格，属于参考手册。

## 特性

- **阅读优先的排版**——正文 16px / 1.9 行高，段落间距与中文标点全角对齐，导语段单独成样式；
- **卡片三统计**——浏览量、点赞数、评论数三项并排，窄屏自动收成一项，不挤压标题；
- **深浅双色**——跟随系统或手动切换，两套配色分别调过对比度，夜间不刺眼；
- **文章页完整**——目录 TOC、阅读进度、版权声明、分享海报、上下篇、相关推荐；
- **首页可编排**——幻灯片、公告、热门、最新、友链五个板块自由排序、开关、改标题；
- **侧栏小工具**——热门 / 最新 / 分类 / 标签 / 用户卡片 / 评论，条数与标题都在配置里；
- **搜索、归档、分类、标签、404** 全部内置，无需额外插件；
- **可接真实数据**——点赞与浏览量可接 [BookShelf-Box](https://zan.liublog.cn)，评论数可接 twikoo，取不到就安静回落 0。

## 关于名字与来源

BookShelf 的前身是 WordPress 主题 **Mirage v3.12.0**（vtheme.cn）的 Hexo 转写版，本仓库接手后更名 BookShelf 并继续维护：

- 页面结构、DOM 层级、class/id 命名沿用原转写版，**已有站点的自定义样式不需要跟着改**；
- WordPress 后台控制项仍按 1:1 对应到 `_config.yml`，字段 ID 与 WP 选项（Codestar Framework `inc/config.php`）完全一致；
- 新增的阅读增强集中在 `source/js/bookshelf-extra.js` 与 `source/style/bookshelf-extra.css`，与主样式分离，升级时可整块替换；
- 原主题作者署名与 GPL-2.0 许可一并保留，见 `LICENSE` 与页脚。

---

## 一、安装使用

```bash
# 1. 把主题放入 Hexo 站点
cp -r bookshelf  <你的hexo站点>/themes/bookshelf

# 2. 站点 _config.yml 关键配置
theme: bookshelf
language: zh-CN          # 对应 WP get_locale()，翻译文件 languages/zh-CN.yml
index_generator:
  per_page: 10           # 对应 WP 设置→阅读 的 posts_per_page

# 3. 生成
hexo clean && hexo generate && hexo server
```

## 二、页面模板映射（WordPress → Hexo）

| WordPress 文件 | Hexo EJS | 说明 |
| --- | --- | --- |
| `header.php` | `layout/_partial/header.ejs` | 含 mobile/pc 双头部、MyMenu 菜单、搜索弹窗 |
| `footer.php` | `layout/_partial/footer.ejs` | 含 bar/login 引入、wp_footer 脚本、i18n 注入 |
| `index.php` | `layout/index.ejs` | 按 `home_layout.enabled` 顺序调度首页模块 |
| `single.php` | `layout/post.ejs` | 文章页（含 TOC、打赏、分享海报、相关推荐） |
| `page.php` | `layout/page.ejs` | 独立页面 |
| `page-links.php` | `layout/page-links.ejs` | front-matter 写 `layout: page-links` 启用 |
| `page-fullwidth.php` | `layout/page-fullwidth.ejs` | front-matter 写 `layout: page-fullwidth` 启用 |
| `category.php` | `layout/category.ejs` | 分类列表页 |
| `tag.php` | `layout/tag.ejs` | 标签列表页 |
| `404.php` | `layout/404.ejs` + `scripts/404-generator.js` | Hexo 核心不产出 404.html，主题内置生成器 |
| （WP 无 archive.php，按层级回落 index） | `layout/archive.ejs` | 按 category.php 列表结构转写，供 Hexo 归档页使用 |
| （WP 无分类/标签总览页；WP 做法为手动建 Page） | `layout/categories.ejs` / `layout/tags.ejs` | /categories/ 与 /tags/ 索引页。按 page.php 骨架转写，内容区输出 CategoryWidget / TagsWidget 原始 DOM（避免导航 404）。用法：`source/categories/index.md` 写 front-matter `layout: categories`，`source/tags/index.md` 写 `layout: tags` |
| `templates/card.php` | `layout/_partial/card.ejs` | 文章卡片（列表/侧栏/推荐共用） |
| `templates/bar.php` | `layout/_partial/bar.ejs` | 回到顶部浮窗 |
| `templates/css.php` | `layout/_partial/css.ejs` | 主色调/背景图/暗黑开关 CSS 变量 |
| `templates/seo.php` | `layout/_partial/seo.ejs` | keywords/description 分支逻辑 |
| `templates/login.php` | `layout/_partial/login.ejs` | 登录/注册/找回密码对话框（结构保留） |
| `templates/home/slider.php` | `layout/_partial/home/slider.ejs` | 幻灯片 + 推荐图 |
| `templates/home/notices.php` | `layout/_partial/home/notices.ejs` | 公告滚动（含原 JS） |
| `templates/home/hot.php` | `layout/_partial/home/hot.ejs` | 热门文章 |
| `templates/home/last.php` | `layout/_partial/home/last.ejs` | 最新文章 + 分页 |
| `templates/home/links.php` | `layout/_partial/home/links.ejs` | 友情链接 |
| `comments.php` | `layout/_partial/comments.ejs` | 评论模块（表单/列表结构保留） |
| `inc/widget.php` 六个小工具 | `layout/_partial/widgets/*.ejs` | hot-list / image-article-list / category-list / user-widget / tags-widget / recent-comments |
| `dynamic_sidebar()` | `layout/_partial/sidebar.ejs` | 小工具列表来自 `_config.yml` sidebar 段 |
| `inc/menu.php` MyMenu/SideMenu Walker | `scripts/helpers.js` vt_nav_menu / vt_side_menu | 输出结构 1:1（child-menu、下拉箭头、(count)） |
| `paginate_links(type=list)` | `scripts/helpers.js` vt_paginate_links | page-numbers 列表结构、end_size=2、mid_size=2 |
| `get_breadcrumbs()` | `scripts/helpers.js` get_breadcrumbs | 面包屑 |
| `formatHumanTime / vt_format_view_count / vt_get_time / vt_theme_ad / vt_get_thumbnail_url / vt_clean_the_excerpt / create_table_of_contents / sanitize_title` | `scripts/helpers.js` 同名语义函数 | 函数头注释标明原 WP 函数 |

## 三、控制面板映射（_config.yml ← inc/config.php）

字段 ID 与 WP 后台完全一致，按原 CSF 分节注释：

- **常规设置**：`basic_style` / `dark_mode_type` / `default_image` / `background_image` / `lazy_load_enabled`（`update_is_on`、`page_data_type`、`editor_type` 为 WP 后台功能，字段保留）
- **SEO 设置**：`keywords` / `description`
- **首页设置**：`home_layout.enabled`（数组顺序 = 显示顺序，白名单同 index.php）、`slider_height` / `slider_autoplay` / `slider_effect` / `slider_items` / `top_items`、`notice_target` / `notice_items`、`hot_title` / `hot_cat_id` / `hot_post_ids`、`posts_ids` / `posts_not_in_ids` / `posts_auto_load` / `posts_auto_load_limit` / `full_width` / `list_type` / `vt_columns`、`links_switcher` / `links_title`
- **顶部设置**：`site_logo` / `site_logo_darkness` / `sticky_header`（`show_admin_bar` 保留字段）
- **底部设置**：`footer_bg_type` / `footer_copyright` / `footer_js` / `sns_items` / `footer_links`
- **文章设置**：`show_copyright` / `show_copyright_text` / `highlight_is_on` / `breadcrumbs_enabled` / `qrcode_items`
- **广告设置**：`ad_header_*` / `ad_footer_*` / `ad_sidebar_*` / `ad_single_top_*` / `ad_single_bottom_*`（enable/code/code_pc，与 `vt_theme_ad()` 读取方式一致）
- **会员设置**：`privacy_policy` / `terms_of_service` / `vip_avatar_upload` 等（字段保留）
- **WP 系统项转写**：`menu`（导航菜单，最多 4 级）、`side_menu`（侧栏分类菜单）、`sidebar.default-sidebar / posts-sidebar`（小工具列表）、`users_can_register`、`thread_comments_depth`、`term_meta`（分类/标签自定义字段 vt_full_width / vt_list_type / vt-thumbnail）、`links_data` / `links_groups`（WP 链接管理器）

## 四、文章 front-matter 扩展

| 字段 | 对应 WP | 说明 |
| --- | --- | --- |
| `cover` / `banner` | 特色图片 | 列表缩略图、分享海报 |
| `views` | post_views_count meta | 浏览次数（卡片与文章页显示） |
| `sticky: true` | 置顶文章 | 显示"置顶"角标 |
| `full_width: true` | `_vt_article_full_width` meta | 文章/页面全宽 |
| `show_table: true` | `_vt_article_show_table` meta | 显示文章目录 TOC |
| `author` | post_author | 作者名（缺省用站点 author） |

## 五、静态站与 WordPress 的本质差异（已保留结构、后端能力缺失）

以下功能依赖 WP 后端（PHP + MySQL），在 Hexo 静态站中 **DOM 结构完整保留但无法产生数据**，模板中以注释标注了原 WP 逻辑：

1. **用户系统**：登录/注册/找回密码/个人中心/头像上传（`api/`、`inc/user.php`、`inc/ajax.php`）——登录对话框正常显示，提交不可用；头部登录后用户卡片分支按"未登录"渲染。
2. **评论**：评论提交、点赞、删除、评论计数依赖后端；主题已预留 twikoo 接入（`comment_provider: twikoo`），列表卡片的评论数由 `source/js/comment-count.js` 批量取回。
3. **喜欢/收藏计数**（`wp_vt_star` 表）：已改由 zan（BookShelf-Box）提供，卡片与文章页的点赞数都是真实值；不配置 zan 时回落 0。
4. **搜索**：搜索表单结构与 WP 一致（GET `?s=`），需自行接入 hexo-generator-search 等插件提供结果页。
5. **浏览量自增、广告展示统计、SMTP 邮件**：无后端，不生效。
6. **`get_num_queries()/timer_stop()`**：静态站恒为 0。

## 六、新增功能（Hexo 版扩展，原 WP 主题无对应配置）

1. **板块统一配置 `sections`**——原主题各板块的标题是固定文案、也没有板块开关和分页判断（`/page/2/` 起每页都重复输出幻灯片与公告栏）。Hexo 版把首页 5 个板块 + 侧栏 4 个小工具的全部可调项集中到 `_config.yml` 末尾的一个块里，字段含义：

   | 字段 | 含义 |
   |---|---|
   | `show` | `true` 显示 / `false` 关闭（全站隐藏，首页第 1 页也不输出） |
   | `paged_hide` | `true` 仅首页第 1 页显示（`/page/2/` 起隐藏）/ `false` 每页都显示 |
   | `title` | 板块标题 |
   | `icon` | FontAwesome 6 图标类名（如 `fa-solid fa-fire`），留空只显示文字 |
   | `num` | 调用条数（`0` = 不限制 / 显示全部） |

   ```yaml
   sections:
     slider:   { show: true, paged_hide: true }                       # 幻灯片 + 右侧推荐位
     notices:  { show: true, paged_hide: true }                       # 公告栏
     hot:      { show: true, paged_hide: true, title: 热门文章, icon: fa-solid fa-fire, num: 6 }
     last:     { show: true, paged_hide: false }                      # 文章列表（含分页，勿关）
     links:    { show: true, paged_hide: false, title: 友情链接, icon: fa-solid fa-link }
     popular:  { title: 热门,     icon: fa-solid fa-ranking-star,        num: 4 }   # 侧栏
     recent:   { title: 最新文章, icon: fa-solid fa-clock-rotate-left,   num: 4 }
     tags:     { title: 标签,     icon: fa-solid fa-tags,                num: 20 }
     category: { title: 文章分类, icon: fa-solid fa-folder-tree,         num: 0  }
   ```

   - **首页显示顺序 = 5 个首页板块的书写顺序**，整段移动即可调整；`home_layout.enabled` 作为 WP 原版字段保留，仅在 `sections` 缺失时兜底。
   - **向后兼容**：旧的扁平写法（`hot_title` / `hot_icon` / `hot_num` / `popular_*` / `recent_*` / `tags_*` / `category_*` / `links_title` / `links_icon` / `home_paged_exclude`）依然有效，且**优先级高于 `sections`**——`scripts/helpers.js` 的 `vt_get_config` 会先查扁平键、再查 `sections`，模板与旧配置无需改动。
2. **默认导航栏目**——原主题 `menu` 默认为空，现预置「首页 / 分类 / 标签 / 归档」四个 Hexo 必定生成的栏目，可直接增删改（子菜单用 `children`）。
3. **友情链接演示数据**——`links_data` 预置两条示例友链（含图片与描述文字），替换为自己的链接即可。
4. **侧栏文章分类列表**——原版 CategoryWidget 只认「侧边栏菜单」，菜单未配置时仅输出一条“请创建菜单”提示；Hexo 版在 `side_menu` 为空时自动调用站点文章分类（支持父子分类、右侧显示文章数、箭头折叠），标题/图标/条数见 `sections.category`。`sidebar.default-sidebar` 与 `posts-sidebar` 已预置该小工具；若配置了 `side_menu` 则仍按 WP 原行为输出菜单。
5. **热门文章序号徽章 5~10 条配色**——原版仅前 4 条有颜色，第 5 条起回落灰色；`bookshelf-extra.css` 补足到第 10 条（5 紫 / 6 青 / 7 粉 / 8 靛 / 9 蓝绿 / 10 玫红）。
6. **SEO：按页面类型分源输出 + 补 `<title>`**——原版 `templates/seo.php` 只输出 keywords/description，`<title>` 由 WP 的 `title-tag` 交给核心输出；Hexo 无此机制，转写时若只搬 `seo.php` 会导致**页面完全没有标题**。现由 `layout/_partial/seo.ejs` 统一输出，并按 WP 分支映射到 Hexo 数据源：

   | 页面 | 数据来源（`_config.yml` 末尾 `seo` 块） |
   |---|---|
   | 首页 | `seo.keywords` / `seo.description`，留空则取站点 `_config.yml` 的 `title` / `description` / `keywords`；第 2 页起标题带「第 N 页」 |
   | 分类页 | `seo.categories[分类名]`；未配置则自动生成「XX分类下的全部文章，共 N 篇」 |
   | 标签页 | `seo.tags[标签名]`；未配置则自动生成 |
   | 文章 / 页面 | front-matter `description` / `keywords` → 手动摘要 → 正文自动提取（对应 `get_the_excerpt()`） |
   | 归档 | 按 `page.year` / `page.month` 统计篇数自动生成 |

   ```yaml
   seo:
     keywords: ""                 # 留空 = 用站点配置
     description: ""
     auto_generate: true          # 未单独配置的分类/标签/归档自动生成描述
     post_use_taxonomy: true      # 文章关键词是否纳入标签与分类
     categories:                  # 键 = 分类名
       民俗传说:
         keywords: "民俗传说,传统节日,春节习俗"
         description: "分类页的搜索描述……"
     tags: {}                     # 键 = 标签名，写法同上
   ```

   **为什么分类描述要写在 yml**：WP 的分类描述存在 `wp_termmeta`（后台分类编辑页的输入框），Hexo 的分类只是文章 front-matter 聚合出的名字，既不是文件也没有 front-matter，无处存放。`seo.categories` 就是它的等价替代。
   关键词长度仍按原版截 200 字；描述按页面类型分开控制：**文章 / 单页 120 字，首页 / 分类 / 标签 / 归档 160 字**，超出时优先在句末标点处收尾（不硬切半个句子），找不到标点才加「…」。分类/标签页的关键词只取自身名称与配置值，不混拼站点关键词（避免稀释）。

## 七、静态资源目录

WP 原版 `assets/` 已按需求调整：`css` → `style` 重命名，`style / images / js / lib` 四个目录直接位于主题 `source/` 下，生成后 URL 为 `/style/...`、`/images/...`、`/js/...`、`/lib/...`（CSS/JS 内部均为相对引用，自动生效）。

## 八、转写中修复/调整的点（均已在代码注释中标注）

1. WP `add_heading_ids_to_content` 中 `</h2>` 硬编码笔误（原 bug）：Hexo 渲染器已为标题生成 id，TOC 优先沿用已有 id。
2. `lib/notyf/README.md`、`LICENSE.md`、`lib/swiper/README.md` 三个第三方文档文件在 Hexo 中会被误渲染为 HTML，重命名为无扩展名 `README` / `LICENSE`（内容不变）。
3. Hexo i18n 以 `.` 为层级分隔符，含点号词条无法命中；主题按 WP 语义覆盖 `__` 助手，从 `languages/zh-CN.yml` 做**完整 msgid 精确匹配**，未命中原样输出英文（与 WP 行为一致）。
4. WP 版首页 latest 模块和分类页存在**重复 class 属性**（`class="main-container" class="..."`），为保持 100% 还原未修正，浏览器行为与 WP 版一致。

## 九、验证

- `hexo generate` 全量通过：首页 / 文章 / 独立页 / 分类 / 标签 / 归档 / 404 全部产出，122+ 文件。
- Edge 无头浏览器截图核对：首页（幻灯片、公告、热门、最新、友链、SNS 底栏）与文章页（meta、版权、打赏栏、上/下一篇、评论表单、推荐、侧栏用户卡片）布局与 WP 版一致。
