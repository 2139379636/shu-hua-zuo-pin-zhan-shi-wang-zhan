/* ==========================================================================
   平滑滚动初始化模块
   依赖 CDN 加载顺序：Lenis → GSAP → ScrollTrigger
   ========================================================================== */
(function(){
  'use strict';

  // 检测 CDN 加载状态
  const LenisOK = typeof Lenis !== 'undefined';
  const GsapOK  = typeof gsap  !== 'undefined';
  const ScrollTriggerOK = typeof ScrollTrigger !== 'undefined';

  // 暴露能力状态（供 ink-effects.js 决策是否启用 ScrollStory 与 Marquee）
  window.SCROLL_CAPABILITY = {
    Lenis: LenisOK,
    Gsap: GsapOK,
    ScrollTrigger: ScrollTriggerOK,
    // 派生能力：ScrollStory 需要 ScrollTrigger；Marquee 仅需 GSAP
    scrollStoryOK: GsapOK && ScrollTriggerOK,
    marqueeOK: GsapOK,
    smoothScrollOK: LenisOK,
  };

  if (!GsapOK) {
    console.warn('[smooth-scroll] GSAP 加载失败，仅启用浏览器原生滚动');
    return;
  }

  // 注册 ScrollTrigger 插件（即使 GSAP 在但 ScrollTrigger 没加载也跳过）
  if (ScrollTriggerOK) {
    gsap.registerPlugin(ScrollTrigger);
  } else {
    console.warn('[smooth-scroll] ScrollTrigger 未加载，ScrollStory 降级为静态');
  }

  // Lenis 平滑滚动：仅用 gsap.ticker.add（GSAP ticker 已与 ScrollTrigger 集成，
  // 同时避免手写 rAF 循环造成的每帧双调用抖动）
  if (LenisOK && GsapOK && ScrollTriggerOK) {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // Lenis 滚动 → ScrollTrigger 同步
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    window.LENIS_INSTANCE = lenis;
  }

  if (/[?&]debug=1\b/.test(location.search)) console.log('[smooth-scroll] capability:', window.SCROLL_CAPABILITY);
})();
