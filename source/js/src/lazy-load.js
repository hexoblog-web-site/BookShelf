/**
 * 图片懒加载
 * 使用Intersection Observer API实现现代浏览器支持
 * 降级使用传统的滚动监听方式兼容老旧浏览器
 */

// 配置参数
// enabled 由 _config.yml 的 lazy_load_enabled 决定：
// footer.ejs 在 index.js 之前注入 window.vtLazyLoad = true/false
const LAZY_LOAD_CONFIG = {
    enabled: (typeof window !== 'undefined' && typeof window.vtLazyLoad === 'boolean')
        ? window.vtLazyLoad
        : true,
    offset: 100,   // 预加载偏移量(px)
    rootMargin: '100px 0px 100px 0px' // 视口边距
};

/**
 * 检测浏览器是否支持Intersection Observer API
 * @returns {boolean} 是否支持
 */
function isIntersectionObserverSupported() {
    return 'IntersectionObserver' in window;
}

/**
 * 现代浏览器实现：使用Intersection Observer API
 */
function modernLazyLoad() {
    const images = document.querySelectorAll('.lazyload-img');
    
    if (!images.length) return;

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                loadImage(img);
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: LAZY_LOAD_CONFIG.rootMargin
    });

    images.forEach(img => {
        if (!img.classList.contains('loaded')) imageObserver.observe(img);
    });
}

/**
 * 传统浏览器实现：使用滚动监听
 */
function legacyLazyLoad() {
    const images = document.querySelectorAll('.lazyload-img');
    
    if (!images.length) return;

    function loadVisibleImages() {
        images.forEach(img => {
            if (isElementInViewport(img, LAZY_LOAD_CONFIG.offset)) {
                loadImage(img);
            }
        });
    }

    // 初始加载
    loadVisibleImages();

    // 滚动监听
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                loadVisibleImages();
                ticking = false;
            });
            ticking = true;
        }
    });
}

/**
 * 检查元素是否在视口中
 * @param {Element} element - 要检查的元素
 * @param {number} offset - 偏移量
 * @returns {boolean} 是否在视口中
 */
function isElementInViewport(element, offset = 0) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top <= (window.innerHeight + offset) &&
        rect.bottom >= -offset
    );
}

/**
 * 加载单张图片
 * @param {Element} img - 图片元素
 */
function loadImage(img) {
    if (!img || img.classList.contains('loaded')) return;

    const src = img.dataset.src;
    if (!src) return;

    // 添加加载状态类
    img.classList.add('loading');

    const newImg = new Image();
    newImg.onload = function() {
        img.src = src;
        img.classList.remove('loading');
        img.classList.add('loaded');
    };

    newImg.onerror = function() {
        img.classList.remove('loading');
        img.classList.add('load-error');
    };

    newImg.src = src;
}

/**
 * 初始化懒加载功能
 */
export function lazyLoad() {
    // 检查是否启用懒加载
    if (!LAZY_LOAD_CONFIG.enabled) {
        /* 关闭时模板已直接输出真实 src；这里再兜一层，
           防止缓存里的旧 HTML（仍带 data-src）出现永远不加载的图 */
        document.querySelectorAll('img[data-src]').forEach(function (img) {
            img.src = img.dataset.src;
        });
        return;
    }

    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLazyLoad);
    } else {
        initLazyLoad();
    }
}

/**
 * 初始化懒加载
 */
function initLazyLoad() {
    if (!LAZY_LOAD_CONFIG.enabled) return;
    if (isIntersectionObserverSupported()) {
        modernLazyLoad();
    } else {
        legacyLazyLoad();
    }
}

// 自动加载（无限滚动）追加新卡片后要重新接管，暴露到全局
if (typeof window !== 'undefined') {
    window.vtReinitLazyLoad = initLazyLoad;
}

/**
 * 重新初始化懒加载（用于动态内容）
 */
export function reinitLazyLoad() {
    initLazyLoad();
}

// 导出默认函数
export default lazyLoad;