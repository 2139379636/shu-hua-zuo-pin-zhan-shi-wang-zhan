/* ==========================================================================
   Story Reveal — .story / .cta-section / .footer 入场动画
   适用于未加载 ink-effects.js 的页面（artist.html, gallery.html）
   ========================================================================== */
(function(){
  'use strict';

  function boot(){
    var targets = document.querySelectorAll('.story, .cta-section, .footer');
    if (!targets.length) return;

    // 不支持 IntersectionObserver → 直接显示，避免永久隐藏
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function(el){ el.classList.add('is-page-visible'); });
      return;
    }

    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add('is-page-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -10% 0px' });

    targets.forEach(function(el){ obs.observe(el); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();