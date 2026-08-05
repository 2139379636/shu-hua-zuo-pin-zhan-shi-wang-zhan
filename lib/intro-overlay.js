/* ==========================================================================
   ScrollStory 序幕（艺术家介绍卡片） — 黄桂明
   依赖：window.BRAND（来自 lib/artworks-data.js）
         window.SCROLL_STORY_PROGRESS（lib/scroll-story-progress.js）

   形态：序幕现在是一张左对齐大卡片（与下方 3 组数据卡同视觉系统），
         整张卡片作为一个整体淡入淡出（卡片内 name/line 不再错位）。
   无障碍：prefers-reduced-motion 只关位移+缩放，不关透明度

   时间轴（progress 0..1）：
     序幕卡  0.02-0.13 进 + 0.13-0.20 实体 + 0.20-0.30 出
     归零 ≤0.30，组 1 卡片 0.35 进入 —— 空档 0.05 缓冲

   回归测试：tests/test_intro_overlay_sync.py
   ========================================================================== */
(function(){
  'use strict';

  if (!window.BRAND || !window.BRAND.intro) {
    throw new Error('[intro-overlay.js] window.BRAND.intro 缺失，请检查 lib/artworks-data.js');
  }
  if (!window.SCROLL_STORY_PROGRESS) {
    throw new Error('[intro-overlay.js] window.SCROLL_STORY_PROGRESS 缺失');
  }

  function fit(x, a, b, c, d){
    if (a === b) return c;
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return c + (d - c) * t;
  }

  function boot(){
    const root = document.getElementById('introOverlay');
    if (!root) return;
    // 整张卡片：现在 root 内部只有一张 .ssc__card
    const cardEl = root.querySelector('.ssc__card');
    if (!cardEl) return;
    const nameEl = cardEl.querySelector('[data-intro="name"]');
    const lineEl = cardEl.querySelector('[data-intro="line"]');
    if (!nameEl || !lineEl) return;

    nameEl.textContent = window.BRAND.intro.name;
    lineEl.textContent = window.BRAND.intro.line;

    const motionQuery = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    boot.elems = { root, cardEl, motionQuery };
    // 兜底：#scroll-story 离开视口时整组隐藏（避免 fixed 浮层遮 Marquee/Verse）
    installScrollVisibility(root);
    window.SCROLL_STORY_PROGRESS.subscribe(update);
  }

  function installScrollVisibility(root){
    const target = document.getElementById('scroll-story');
    if (!target || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        root.style.visibility = entry.isIntersecting ? 'visible' : 'hidden';
      }
    }, { rootMargin: '0px' });
    obs.observe(target);
    const rect = target.getBoundingClientRect();
    root.style.visibility = (rect.top < window.innerHeight && rect.bottom > 0)
      ? 'visible' : 'hidden';
  }

  function update(progress){
    const els = boot.elems;
    if (!els) return;
    const p = Math.max(0, Math.min(1, progress));
    const { root, cardEl, motionQuery } = els;
    const reduced = motionQuery ? motionQuery.matches : false;

    // 整张卡片同步：0.02-0.13 进, 0.13-0.20 实体, 0.20-0.30 出
    const cardIn  = fit(p, 0.02, 0.13, 0, 1);
    const cardOp  = cardIn * fit(p, 0.20, 0.30, 1, 0);

    // 入场：与数据卡同语义（translateX 8 + scale 0.96 → 0/1）
    const inTx  = fit(p, 0.02, 0.13, 8, 0);
    const outTx = fit(p, 0.20, 0.30, 0, -8);
    const inSc  = fit(p, 0.02, 0.13, 0.96, 1.0);
    const outSc = fit(p, 0.20, 0.30, 1.0, 0.96);
    const tx = reduced ? 0 : (inTx + outTx);
    const sc = reduced ? 1.0 : (inSc * outSc);

    cardEl.style.opacity = cardOp.toFixed(3);
    if (reduced) {
      cardEl.style.transform = 'none';
    } else {
      cardEl.style.transform = `translateX(${tx.toFixed(2)}px) scale(${sc.toFixed(3)})`;
    }
    cardEl.setAttribute('aria-hidden', cardOp < 0.01 ? 'true' : 'false');

    // 整组 root：仅在卡片完全不可见时隐藏（与卡片同步）
    root.style.opacity = cardOp > 0.01 ? '1' : '0';
    root.setAttribute('aria-hidden', cardOp < 0.01 ? 'true' : 'false');
  }

  // 兼容保留：旧测试/旧调用方仍可走 INTRO_OVERLAY.update(p)
  window.INTRO_OVERLAY = {
    boot,
    update,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
