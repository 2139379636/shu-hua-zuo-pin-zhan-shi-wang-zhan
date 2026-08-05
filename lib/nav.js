/* ==========================================================================
   公共导航 — 自动注入 nav DOM + 当前页 active 标记 + scroll-state 切换
   调用：window.NAV_BOOT({ homepage: false })
     - 客户端：window.NAV_BOOT({ homepage: false })
     - 首页：  window.NAV_BOOT({ homepage: true })
   ========================================================================== */
(function(){
  'use strict';

  window.NAV_BOOT = function(opts){
    opts = opts || {};
    const isHome = !!opts.homepage;
    const host = document.getElementById('nav');
    if (!host) return;

    // 决定当前页（从 URL 推断）
    const path = location.pathname.split('/').pop() || 'index.html';
    const isActive = (name) => path === name;

    // 首页 brand 链接到 index.html；二级页链接到 index.html（含 hash）
    const brandHref = isHome ? '#hero' : 'index.html';

    // 构建 nav DOM
    host.className = 'nav' + (isHome ? ' nav--hero' : ' nav--scrolled');
    host.id = 'nav';
    host.innerHTML = `
      <div class="nav__inner">
        <a href="${brandHref}" class="nav__brand">
          <span class="nav__brand-mark">${(window.BRAND && window.BRAND.navMark) || '黄'}</span>
          <span>${(window.BRAND && window.BRAND.name) || '黄桂明'}</span>
        </a>
        <ul class="nav__menu">
          <li><a href="index.html" class="nav__link ${isActive('index.html') ? 'nav__link--active' : ''}">首页</a></li>
          <li><a href="gallery.html" class="nav__link ${isActive('gallery.html') ? 'nav__link--active' : ''}">作品</a></li>
          <li><a href="artist.html"  class="nav__link ${isActive('artist.html')  ? 'nav__link--active' : ''}">艺术家</a></li>
        </ul>
      </div>
    `;

    // scroll-state 切换（仅首页需要）
    if (isHome) {
      // rAF 节流：Lenis 平滑滚动会把一次滚轮放大成几十次 native scroll 事件，
      // 未节流时每次都调 getBoundingClientRect() 强制同步 layout
      let ticking = false;
      let wasScrolled = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const hero = document.getElementById('hero');
          if (hero) {
            const scrolled = hero.getBoundingClientRect().bottom < 80;
            // 仅在状态翻转时写 DOM，避免每帧重复 classList 操作
            if (scrolled !== wasScrolled) {
              host.classList.toggle('nav--scrolled', scrolled);
              wasScrolled = scrolled;
            }
          }
          ticking = false;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();  // 初始化：处理带 hash 直接进入页面中部的情况
    }
  };
})();
