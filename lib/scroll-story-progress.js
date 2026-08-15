/* ==========================================================================
   ScrollStory 进度源 — 单一订阅源
   依赖：window.ScrollTrigger（来自 ink-effects.js）
   调用：
     window.SCROLL_STORY_PROGRESS.subscribe(fn)  // fn(progress 0..1)
     window.SCROLL_STORY_PROGRESS.set(p)         // 由 ink-effects ScrollTrigger.onUpdate 调用
   兜底：原生 scroll 监听自算 progress；ScrollTrigger 可用时优先使用其值

   设计动机：
     旧实现中 intro-overlay.js 自己监听 window.scroll 计算 progress；
     新加 3 组卡片如果再各自监听，会双驱动打架。统一一处发布。
   ========================================================================== */
(function(){
  'use strict';

  const subscribers = new Set();
  let lastP = 0;
  let stAlive = false;        // ScrollTrigger 实例是否已激活
  let lastStP = -1;           // 上次 ST 报告的 progress（去重）

  // 范围检测：ScrollTrigger 优先；否则用 scroll-story 元素的当前位置 + (offsetHeight - vh)
  // v5.23 — 切到 CSS sticky 方案后，section 高度 = 100vh + 300vh = 400vh，
  // sticky 滚动区间 = offsetHeight - innerHeight = 300vh。这里必须与
  // ink-effects.js 的 ScrollTrigger.end / nativeScrub 公式一致，
  // 否则订阅者（intro-overlay / 3 组数据卡）的 progress 区间会与 canvas 帧绘制错位。
  function getRange(){
    const st = (window.ScrollTrigger && window.ScrollTrigger.getAll)
      ? window.ScrollTrigger.getAll().find(t => t.trigger && t.trigger.id === 'scroll-story')
      : null;
    if (st) {
      stAlive = true;
      return { start: st.start, end: st.end };
    }
    const el = document.getElementById('scroll-story');
    if (!el) return null;
    // v5.23 — 与 CSS sticky 几何一致：滚动距离 = section.outerHeight - viewportHeight
    const vh = window.innerHeight;
    return { start: el.offsetTop, end: el.offsetTop + (el.offsetHeight - vh) };
  }

  function emit(p){
    lastP = p;
    for (const fn of subscribers) {
      try { fn(p); } catch (e) { console.error('[SCROLL_STORY_PROGRESS] subscriber error:', e); }
    }
  }

  // ===== 公共 API =====
  const api = {
    /** 订阅进度变化（0..1）。返回取消订阅函数。 */
    subscribe(fn){
      if (typeof fn !== 'function') return () => {};
      subscribers.add(fn);
      // 立即推一次最新值（订阅者能拿到当前状态）
      try { fn(lastP); } catch (e) { console.error(e); }
      return () => subscribers.delete(fn);
    },

    /** 由 ScrollTrigger.onUpdate 调用。 */
    set(p){
      if (typeof p !== 'number' || !isFinite(p)) return;
      p = Math.max(0, Math.min(1, p));
      if (p === lastStP) return;
      lastStP = p;
      stAlive = true;
      emit(p);
    },

    /** 调试用：当前进度。 */
    get current(){ return lastP; },

    /** 调试用：ScrollTrigger 是否已接管。 */
    get hasScrollTrigger(){ return stAlive; },
  };
  window.SCROLL_STORY_PROGRESS = api;

  // ===== 兜底：原生 scroll 监听 =====
  // ScrollTrigger 不可用或尚未初始化时，self-driven
  // 注意：ScrollTrigger 接管后，onUpdate 会同步调 api.set，
  // 原生 driver 的 emit 会和 ST 的 emit 互相覆盖——但因为两边都基于
  // window.scrollY 计算，progress 几乎一致，不会闪。这里不互斥，因为
  // ST create 之前必须靠原生驱动，ST 起来后也只是冗余而非冲突。
  function nativeTick(){
    const r = getRange();
    if (!r) return;
    const dist = r.end - r.start;
    if (dist <= 0) return;
    const p = Math.max(0, Math.min(1, (window.scrollY - r.start) / dist));
    // ST 已接管：跳过原生 emit，避免和 api.set 重复触发订阅者
    if (stAlive) return;
    emit(p);
  }

  let raf = null;
  function scheduleTick(){
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      nativeTick();
    });
  }

  function boot(){
    window.addEventListener('scroll', scheduleTick, { passive: true });
    // 初始跑一次
    nativeTick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
