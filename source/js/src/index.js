/**
 * JavaScript 项目主文件
 */

import __ from './i18n.js';
// 将翻译函数挂载到全局 window 对象,供其他模块使用
window.__ = __;

import './notyf.js';

// 幻灯片
import swiper from './swiper';
swiper();

import bar from './bar';
bar();

import { lazyLoad } from './lazy-load';
lazyLoad();

import single from './single.js';
single();

import { darkModeInit } from './dark-mode';
darkModeInit();

import headerMobile from "./header-mobile";
headerMobile();

import headerPc from "./header-pc";
headerPc();

import home from './home';
home.homeInit();

import login from './login.js';
login();

import comments from './comments.js';
comments();

import widget from './widget.js';
widget.sideMenuInit();

/*
 * 原版此处有一段 vt_footer_check()：页面 load 后查找 a[copyright]，
 * 找不到或文字不是 "BookShelf" 就把 document.body.innerHTML 整个替换成
 * 一行提示文字。这是主题作者的「删署名就毁站」防拆逻辑。
 *
 * 删除原因：
 *   1) 部分虚拟主机 / CDN 的 HTML 压缩优化会把这个非标准布尔属性
 *      copyright 当非法属性剥掉，导致线上整站白屏只剩一行提示文字；
 *   2) 主题已改名 bookshelf，这段署名锁定不再有意义，且一旦页脚文案
 *      调整（改成站名等）就会误伤；
 *   3) 页脚署名本身保留在 layout/_partial/footer.ejs，不依赖运行时校验。
 * 如需恢复，请勿再直接清空 body —— 改成 console.warn 之类的软提示。
 */
