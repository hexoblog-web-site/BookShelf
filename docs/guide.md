# BookShelf 使用说明

只想把博客跑起来，看这一篇就够。想知道每个配置项对应 WordPress 后台的哪一格，去看 [README](../README.md)。

---

## 一、需要什么

| 项目 | 要求 |
|---|---|
| Hexo | 6.0 以上（本主题在 8.1.2 上开发） |
| Node.js | 18 以上 |
| 模板引擎 | 站点需装 `hexo-renderer-ejs`（Hexo 默认自带） |
| 评论（可选） | twikoo 服务地址 |
| 点赞 / 阅读数（可选） | 一套 [Sugar-Box](https://github.com/hexoblog-web-site/Sugar-Box) 服务 |

---

## 二、三步装好

**1. 放进主题目录**

```bash
cd 你的站点目录
git clone https://github.com/hexoblog-web-site/BookShelf.git themes/bookshelf
```

**2. 改站点根目录的 `_config.yml`**

```yaml
theme: bookshelf
language: zh-CN
```

**3. 跑起来**

```bash
hexo clean && hexo server
```

打开 http://localhost:4000 就能看到首页。此时点赞、阅读数、评论数都是 0，属于正常——它们要接服务才有数据，见第五节。

---

## 三、站点配置最少要改这几项

站点根目录的 `_config.yml`：

| 字段 | 作用 | 示例 |
|---|---|---|
| `title` / `subtitle` / `author` | 站点名、副标题、作者，会出现在页头和 SEO 里 | `老刘博客` |
| `url` | 站点正式地址，影响 sitemap、分享链接、og:image | `https://www.example.com` |
| `permalink` | 文章地址格式，**建站后别随意改**，否则已收录的链接全废 | `:year/:month/:title.html` |
| `asset_version` | 主题 js/css 的版本号，改过前端就 +1，见第八节 | `'20261106'` |
| `index_generator.per_page` | 首页每页文章数 | `10` |

---

## 四、主题配置常改的五处

注意：这里说的是 `themes/bookshelf/_config.yml`，**不是**站点根目录那个。

**1. 主色调**

```yaml
basic_style: "#f45d1d"
```

**2. 暗黑模式**

```yaml
dark_mode_type: "1"    # 0 关闭 / 1 开启（右上角有切换按钮）/ 2 跟随系统
```

**3. 首页板块**

文件末尾的 `sections:` 一个块管全部，**键的先后顺序就是显示顺序**，想调位置把整段挪一挪即可：

```yaml
sections:
  slider:        # 幻灯片
    show: true
    paged_hide: true   # 翻页后是否隐藏
  notices:       # 公告栏
    show: true
  hot:           # 图文推荐
    show: true
    title: "图文推荐"
    icon: "fa-solid fa-fire"
    num: 5
  last:          # 文章列表（建议保持 true）
    show: true
  links:         # 友情链接
    show: true
```

**4. 侧栏小工具**

同在 `sections:` 里，`popular`（热门）、`recent`（最新）、`tags`（标签）、`categories`（分类）等，改 `title` 换标题、改 `num` 换条数、`show: false` 关掉。

**5. 文章页阅读数**

```yaml
post_views:
  enable: true
  provider: "zan"        # 不接服务可以先留空或不启用
  label: "次阅读"
  min_display: 1         # 少于 1 次不显示
```

---

## 五、接真实数据（可选）

### 5.1 点赞 + 阅读数：zan（Sugar-Box）

服务端部署见 [Sugar-Box 仓库](https://github.com/hexoblog-web-site/Sugar-Box)。装好后在主题配置里填：

```yaml
zan:
  enable: true
  server: "https://zan.example.com"                       # 末尾不要带斜杠
  js: "https://zan.example.com/api/js/zan.js?v=2.0.7"     # 服务端升级后改版本号
  path: ""                                                # 留空用文章路径，一般不用填
  once: true                                              # 点过就锁住，同一访客不重复计数
```

`server` 填了之后，文章页的「喜欢」按钮和列表卡片的三个数字（浏览 / 点赞 / 评论）会自动接上。

**两个常见坑：**

- `server` **别带尾斜杠**。`https://zan.example.com/` 和 `https://zan.example.com` 在服务端是两条不同的白名单记录，填错会报跨域，表现为「点了提示网络错误，但刷新后数字又 +1 了」。
- 服务端的允许来源白名单里要写上博客域名，`www` 和裸域算两个不同的来源，都要加。

### 5.2 评论：twikoo

```yaml
comment_provider: "twikoo"
twikoo:
  enable: true
  env_id: "https://twikoo.example.com"   # 自建填服务地址，末尾不带斜杠
  lang: "zh-CN"
  js: "/lib/twikoo/twikoo.min.js"
  visitor: false                          # 已经用 zan 统计阅读数，这里保持 false
```

列表卡片上的评论数由 `source/js/comment-count.js` 读取，一次请求问完本页所有文章，5 分钟内不重复请求。

---

## 六、四个数据驱动的页面

有四个页面不用写正文，内容全部来自站点的 `source/_data/*.yml`。改文案只动 yml，模板和主题配置都不用碰。

| 页面 | 地址 | 模板 | 数据文件 |
|---|---|---|---|
| 关于 | `/about/` | `layout/about.ejs` | `about.yml` |
| 友情链接 | `/links/` | `layout/links.ejs` | `link.yml` |
| 推荐 | `/recommend/` | `layout/recommend.ejs` | `recommend.yml` |
| 装备 | `/equipment/` | `layout/equipment.ejs` | `equipment.yml` |

每个页面对应站点里一个只有路由的 Markdown，例如 `source/about/index.md`：

```yaml
---
title: 关于           # 仅作兜底，实际标题读 about.yml
layout: about
permalink: /about/
---
```

**数据文件必须放在站点的 `source/_data/` 下**（不是主题目录里）。主题本身不带这四个文件——`git clone` 下来后自己新建，或者从别处复制一份改。文件不存在时页面不报错，只是对应区块或整页显示空占位。

字段说明写在每个 yml 文件的开头（几十行注释），照着现有条目复制一条最快。最小可用骨架：

**`about.yml`** —— 十一段都可以整段删，删了对应区块就不显示；文章数、分类数、标签数、运行天数、里程碑点亮都是自动算的。

```yaml
title: 关于我
subtitle: 一句话副标题
profile:
  avatar: /images/avatar.jpg
  name: 站长
  desc: 一段自我介绍
story:
  title: 关于我
  paragraphs:
    - 第一段正文
ten_years:
  start: "2025-01-01"   # 十年之约的起算日，影响天数和进度
  years: 10
```

**`link.yml`** —— 沿用 Butterfly 的友链格式，一组一段，`link_list` 里逐条加。

```yaml
- class_name: 朋友们
  flink_style: flexcard
  link_list:
    - name: Hexo
      link: https://hexo.io/
      avatar: /images/avatar.jpg   # 不写就用默认图
      descr: 快速、简单且强大的博客框架
```

**`recommend.yml`** —— 推荐页主打「自动取文」，不用手写文章列表。

```yaml
- class_name: 本站精选
  auto: true
  mode: latest     # featured 取 featured: true 的文章 / category 按分类取
  limit: 4
```

**`equipment.yml`** —— 商品清单，每组 `good_things → equipment_list` 下逐条写。

```yaml
- class_name: 桌面数码
  description: 桌面上用得着的东西
  good_things:
    - equipment_list:
        - name: 某件商品
          platform: other      # tb / jd / pdd / other
          reason: 一句话推荐理由
          price: "99"
          link: https://example.com/item
```

三个页面（links / recommend / equipment）在数据全空时都会显示一行提示，告诉你去哪个文件里填。

---

## 七、目录里都是什么

```
layout/      EJS 模板，一个页面一个文件，_partial/ 是公共片段
scripts/     Hexo 生成期脚本（404、搜索索引、标题锚点、注入等）
source/      静态资源：style / js / images / lib
languages/   语言包，目前只有 zh-CN.yml
_config.yml  主题配置（WordPress 后台选项的 1:1 对应）
```

要改样式，优先写在自己站点的 `source/css/custom.css` 里覆盖，别直接改主题——升级时会冲突。

---

## 八、发布前检查

**改过主题的 js 或 css，必须把 `asset_version` 加一。** 浏览器对 `style.css`、`index.js` 有 12 小时强缓存，文件名不变就永远拿旧文件，改了也看不到效果。

```yaml
# 站点 _config.yml
asset_version: '20261106'   # 每次改前端资源就换个值，随便什么字符串
```

**保留页脚署名。** 主题里有个完整性检查：页面加载后若发现页脚 `BookShelf` 署名被删掉或改掉，会把整页替换成一行提示。想加自己的版权信息请写在它旁边，不要动那一段。

---

## 九、常见问题

| 现象 | 原因 | 怎么办 |
|---|---|---|
| 整站白屏，只有一行字 | 页脚署名被改，完整性检查触发 | 恢复页脚「基于 BookShelf 主题」那段 |
| 改了 css/js 没变化 | 12 小时缓存 | `asset_version` 加一，再 `hexo clean && hexo g` |
| 卡片数字全是 0 | 没配 zan / twikoo，或接口没通 | 浏览器 F12 → Network 看 `zan.php` 与 twikoo 请求是否 200 |
| 点赞提示网络错误，刷新数字却 +1 | 服务端白名单里 `server` 带了尾斜杠，或漏了 `www` / 裸域 | 参见 5.1 的两个坑 |
| 评论数一直是 0 | `comment_provider` 不是 `twikoo`，或 `env_id` 填的是腾讯云环境 ID | 自建服务填完整 `https://` 地址 |
| 阅读数打开文章不涨 | 服务端统计口径选了「独立访客」，同一浏览器当天只算一次 | 后台改成「浏览次数」 |
| 首页卡片阅读数是构建时的旧值 | 静态渲染的占位，JS 拿到接口数据后会覆盖 | 正常现象，等接口返回即可 |

---

## 十、更新主题

```bash
cd themes/bookshelf
git pull
```

然后 `hexo clean && hexo generate`。升级前建议先备份你自己的定制：**样式放 `custom.css`、脚本放 `source/js/` 下自建文件**，这样 `git pull` 不会冲突。

---

## 许可

GPL-2.0，见 [LICENSE](../LICENSE)。主题源自 WordPress 主题 Mirage v3.12.0（vtheme.cn）的 Hexo 转写版，原作者署名与许可一并保留。
