/**
 * 幻灯片
 */

/**
 * 解析 data-autoplay：兼容 WP 的 1/0 写法，也接受毫秒数
 *   true / 1 / yes        → 默认 5000ms
 *   8000（或 "8000"）      → 8000ms
 *   false / 0 / 空 / 其他   → 不自动播放
 */
function parseAutoplay(raw) {
  if (raw === undefined || raw === null) return false;
  const v = String(raw).trim().toLowerCase();
  if (!v || v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return 5000;
  const n = parseInt(v, 10);
  return n > 0 ? n : false;
}

export default function () {
  const swiperContainer = document.querySelector('.swiper-container');
  if (!swiperContainer) return;

  // 根据 data-autoplay 属性决定是否自动播放
  const delay = parseAutoplay(swiperContainer.dataset.autoplay);
  const effect = swiperContainer.dataset.effect;

  let swiperMain = new Swiper('.swiper-container', {
    pagination: {
      el: '.swiper-pagination',
    },
    // 根据 delay 决定是否启用自动播放
    autoplay: delay ? {
      delay: delay,
      disableOnInteraction: false,
    } : false,
    loop: true,
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    effect: effect
  });
}
