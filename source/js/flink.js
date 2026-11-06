/* ============================================================
 * 友链随机排序（flink.js）
 *
 * 由主题 _config.yml 的 inject.bottom 引入，全站加载，
 * 但只在友链页才真正执行，其他页面直接返回，开销是一次选择器查询。
 *
 * 为什么随机：
 *   友链页最常见的尴尬是「排在前面的永远是那几家」。
 *   每次刷新打乱顺序，每个朋友都会被轮着看到。
 *
 * 兼容两代页面结构：
 *   1) Butterfly flink（现行）：.flink > .flink-list > .flink-list-item
 *      —— 受 _config.yml 的 flink.random 控制，模板会给 .flink 输出
 *         data-shuffle="true"，没有这个属性就不打乱。
 *   2) WordPress 遗留（page-links.ejs）：.links-widget > .link-item
 *      —— 只要页面上有就一直打乱。
 *
 * 想改成按名称排序：把 shuffle() 换成 sort 即可，见文末注释。
 * ============================================================ */
(function () {
    'use strict';

    /* Fisher-Yates 洗牌，原地打乱 */
    function shuffle(list) {
        for (var i = list.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = list[i];
            list[i] = list[j];
            list[j] = t;
        }
        return list;
    }

    /* 取容器的直接子级中指定类名的元素（不深入嵌套容器） */
    function ownItems(box, cls) {
        var out = [];
        var children = box.children;
        for (var i = 0; i < children.length; i++) {
            if (children[i].classList && children[i].classList.contains(cls)) {
                out.push(children[i]);
            }
        }
        return out;
    }

    /* 原地重排：appendChild 会移动已有节点，等于按新顺序重插一遍 */
    function reorder(box, items) {
        var frag = document.createDocumentFragment();
        for (var i = 0; i < items.length; i++) {
            frag.appendChild(items[i]);
        }
        box.appendChild(frag);
    }

    function run() {
        /* ① Butterfly flink：只有 .flink 带 data-shuffle="true" 才打乱 */
        var flinkLists = document.querySelectorAll('.main-container .flink .flink-list');
        for (var i = 0; i < flinkLists.length; i++) {
            var listBox = flinkLists[i];
            var flink = listBox.closest('.flink');
            if (!flink || flink.getAttribute('data-shuffle') !== 'true') continue;

            var listItems = ownItems(listBox, 'flink-list-item');
            if (listItems.length < 2) continue;
            reorder(listBox, shuffle(listItems));
        }

        /* ② WordPress 遗留结构：保持原来的「一直打乱」 */
        var legacyBoxes = document.querySelectorAll('.main-container .link-items, .main-container .links-widget');
        for (var k = 0; k < legacyBoxes.length; k++) {
            var box = legacyBoxes[k];
            var items = ownItems(box, 'link-item');
            if (items.length < 2) continue;
            reorder(box, shuffle(items));
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();

/* ------------------------------------------------------------
 * 改成按名称排序（A→Z 或按拼音），把 run() 里的 shuffle(items)
 * 换成下面这一段即可（两个分支同理）：
 *
 *   items.sort(function (a, b) {
 *       var na = (a.querySelector('.flink-item-name, .link-title') || {}).textContent || '';
 *       var nb = (b.querySelector('.flink-item-name, .link-title') || {}).textContent || '';
 *       return na.localeCompare(nb, 'zh-Hans-CN');
 *   });
 * ------------------------------------------------------------ */
