/* ==========================================================================
   Portrait Hint — 竖屏横屏提示交互
   功能：
     1. 用户点击关闭按钮 → 关闭
     2. 10 秒未操作 → 自动关闭
     3. 关闭后 sessionStorage 记忆，本会话不再显示
   关键修正（v20260814b）：
     - 10 秒倒计时从 LOADER 关闭后开始计时
     - 避免加载期间被 loader 遮挡 + 提前 dismiss 的问题
   ========================================================================== */
(function(){
  'use strict';

  const STORAGE_KEY = 'hgm-portrait-hint-dismissed';
  const AUTO_DISMISS_MS = 10000;

  function boot() {
    const hint = document.getElementById('portraitHint');
    if (!hint) return;

    // 已关闭过（同一会话）→ 直接隐藏，不显示
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') {
        hint.style.display = 'none';
        return;
      }
    } catch (_) {
      // sessionStorage 不可用时忽略
    }

    const closeBtn = document.getElementById('portraitHintClose');

    function dismiss() {
      if (closeTimer) clearTimeout(closeTimer);
      hint.classList.add('portrait-hint--dismissed');
      hint.setAttribute('aria-hidden', 'true');
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
      // 动画完成后彻底从渲染中移除
      setTimeout(function(){
        hint.style.display = 'none';
      }, 420);
    }

    let closeTimer = null;

    function startAutoDismiss(){
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(dismiss, AUTO_DISMISS_MS);
    }

    // 启动策略：等 loader 关闭后再启动 10 秒倒计时
    // 避免加载期间被 loader 遮挡时 hint 已经被自动 dismiss
    const loader = document.getElementById('loader');
    if (loader && !loader.classList.contains('is-removed')) {
      // 用 MutationObserver 监听 loader 关闭
      const obs = new MutationObserver(function(){
        if (loader.classList.contains('is-removed')) {
          obs.disconnect();
          startAutoDismiss();
        }
      });
      obs.observe(loader, { attributes: true, attributeFilter: ['class'] });
      // 兜底：12s 后 loader 还没关闭（loader 自身 15s 兜底之前），强制启动
      setTimeout(function(){
        if (!closeTimer) startAutoDismiss();
      }, 12000);
    } else {
      // 没有 loader 或 loader 已关闭 → 立即启动
      startAutoDismiss();
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', dismiss);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
