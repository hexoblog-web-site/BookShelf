import toast from "./toast";

export default function () {
  pcSearch();
  nav();
  avatarShow();
  initHeaderScrollBehavior();
}


/**
 * PC端向下滑动时隐藏header，向上滑动时显示header
 * 参考移动端实现，保持跨平台交互一致性
 * 仅在body有sticky-header属性时启用
 */
function initHeaderScrollBehavior() {
  // 只在sticky-header模式下启用
  if (!document.body.hasAttribute('sticky-header')) return;
  
  const header = document.querySelector('.header.pc');
  if (!header) return;

  let lastScrollY = window.scrollY;
  let ticking = false;

  function updateHeader() {
    const currentScrollY = window.scrollY;
    
    // 向下滑动且滚动距离超过50px时隐藏
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      header.classList.add('header-hidden');
    } 
    // 向上滑动时显示
    else if (currentScrollY < lastScrollY) {
      header.classList.remove('header-hidden');
    }
    
    lastScrollY = currentScrollY;
    ticking = false;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });
}

/* PC 端搜索 */
function pcSearch() {
  var searchToggleButton = document.querySelector('.header.pc .search-toggle-button');
  if(searchToggleButton){
    searchToggleButton.addEventListener('click', function(e){
      this.classList.toggle('active');
      if(this.classList.contains('active')){
        document.querySelector('.header.pc .search-widget').classList.add('show');
        var input = document.querySelector('.header.pc .search-widget .keyword');
        var text = input.value;
        input.value = '';
        input.focus();
        input.value = text;
      }else{
        document.querySelector('.header.pc .search-widget').classList.remove('show');
      }
    });
  }
  
  var closeSearchButton = document.querySelector('.header.pc .close-widget a');
  if(closeSearchButton ){
    closeSearchButton.addEventListener('click', ()=>{
      document.querySelector('.header.pc .search-widget').classList.remove('show');
      searchToggleButton.classList.remove('active');
    });
  }

  var searchButton = document.querySelector(".header.pc .search .button");
  if (searchButton) {
    searchButton.addEventListener("click", function (e) {
      e.preventDefault();
      if (!document.querySelector(".keyword").value) {
        toast.open({ title: "请输入关键词" });
        return false;
      } else {
        document.querySelector(".search").submit();
      }
    });
  }
}

/* 导航 */
function nav(){
  var items = document.querySelectorAll(".header.pc .menu-item-has-children");
  if(!items) return;
  
  items.forEach(function(i){
    i.addEventListener('mouseenter', function(e){
      if(i.querySelector('.child-menu')){
          i.classList.add('active');
      }
    });
    
    i.addEventListener('mouseleave', function(e){
      if(i.querySelector('.child-menu')){
          i.classList.remove('active');
      }
    });
  });
}


function avatarShow(){
  var btn = document.querySelector('.header-top-avatar');
  var widget = document.querySelector('.user-widget');
  var timer = null;
  
  if(!btn || !widget) return;
  
  var show = function(){
    clearTimeout(timer);
    widget.classList.add('show');
  };
  
  var hide = function(){
    timer = setTimeout(function(){
      widget.classList.remove('show');
    }, 200);
  };
  
  btn.onmouseenter = show;
  btn.onmouseleave = hide;
  widget.onmouseenter = show;
  widget.onmouseleave = hide;
}
