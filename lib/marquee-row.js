/* ==========================================================================
   Marquee 单行工厂 — 每行一个独立实例
   依赖：window.HGM_ESCAPE_HTML（来自 lib/escape-html.js）
   调用：
     const row = createMarqueeRow({
       arts,         // [{id, title, seal, ...}] —— 该行展示的作品列表
       container,    // DOM 元素（必填）
       direction,    // 'left' | 'right'，滚动方向
       speed,        // px/s，正数 = 内容左移 / 负数 = 内容右移
     });
     // 组件自动：渲染 + 启动动画 + hover 暂停/恢复 + 销毁清理

   设计动机：
     旧实现把两行视为同一组件的子节点，用 CSS :nth-of-type 区分方向，
     共享"hover 整个 .marquee 暂停全部"的行为——一行 hover 影响另一行。
     本工厂让每行完全自包含：自己的数据、自己的动画、自己的 hover 监听。

   无障碍：
     prefers-reduced-motion 时切换到 JS rAF 驱动（CSS keyframe 会被全局
     media query 把 duration 设为 0.01ms，行为消失）；rAF 路径下 hover
     仍可暂停。
   ========================================================================== */
(function(){
  'use strict';

  function tileHTML(art){
    // 首页点击作品改为 lightbox 全屏展示，不跳转。
    // 缩略图取素材/thumbs/{id}.jpg（原图在 lightbox 加载时按需切换 src）
    const src = `素材/thumbs/${art.id}.jpg`;
    const fullSrc = `素材/${art.id}.jpg`;     // lightbox 用原图（更高清）
    const esc = window.HGM_ESCAPE_HTML || (s => String(s));
    return `
      <button type="button" class="marquee__tile" data-id="${esc(art.id)}"
              data-thumb="${esc(src)}" data-full="${esc(fullSrc)}"
              data-title="${esc(art.title)}" data-seal="${esc(art.seal)}"
              data-fit="true" aria-label="放大查看《${esc(art.title)}》">
        <img src="${esc(src)}" alt="${esc(art.title)}" decoding="async" loading="lazy" />
        <span class="marquee__seal">${esc(art.seal)}</span>
      </button>
    `;
  }

  function createMarqueeRow(opts){
    const { arts, container, direction = 'left', speed = 50 } = opts;
    if (!container) throw new Error('[marquee-row] container 必填');
    if (!arts || !arts.length) {
      container.innerHTML = '';
      return { destroy(){} };
    }

    // 1) 渲染：复制一份实现无缝循环（CSS keyframe translateX(-50%) 需要 2× 内容宽）
    const tiles = arts.map(tileHTML).join('');
    container.innerHTML = tiles + tiles;

    // 2) 设置动画方向 + 速度
    //    - direction='left'：内容向左移（keyframe from 0 to -50%）
    //    - direction='right'：内容向右移（keyframe from -50% to 0）
    const animName = direction === 'right' ? 'marqueeScrollRight' : 'marqueeScrollLeft';
    // 50% 距离 = 一份 tile 宽 = scrollWidth/2
    // duration = 距离 / speed → px / (px/s) = s
    const halfWidth = container.scrollWidth / 2;
    const durationSec = halfWidth / Math.max(1, Math.abs(speed));
    container.style.animation = `${animName} ${durationSec.toFixed(1)}s linear infinite`;

    // 3) Hover 暂停（只暂停本行，不影响其他行）
    let paused = false;
    const setPaused = (v) => {
      paused = v;
      container.style.animationPlayState = v ? 'paused' : 'running';
    };
    const onEnter = () => setPaused(true);
    const onLeave = () => setPaused(false);
    container.addEventListener('mouseenter', onEnter);
    container.addEventListener('mouseleave', onLeave);

    // 3.5) 点击 tile → 暂停 + 打开 lightbox（首页不跳转作品页）
    //      关键：用 mousedown 而非 click！
    //      原因：CSS animation 让 tile 持续移动，若监听 click（mouseup 触发），
    //            tile 已在 pointer 位置移走，触发错位 tile。改为 mousedown 后
    //            立即暂停 animation + 打开 lightbox，pointer 与 tile 始终一致。
    //      触屏同理（pointerdown 同步触发 mousedown）。
    let wasPausedBeforeClick = false;     // 记录点击前是否已暂停（hover 状态）
    const onMouseDown = (e) => {
      const tile = e.target.closest('.marquee__tile');
      if (!tile || !container.contains(tile)) return;
      e.preventDefault();
      // 记录点击前 paused 状态 + 强制暂停
      wasPausedBeforeClick = paused;
      setPaused(true);
      const full = tile.getAttribute('data-full') || tile.querySelector('img')?.src || '';
      const title = tile.getAttribute('data-title') || tile.querySelector('img')?.alt || '';
      const seal = tile.getAttribute('data-seal') || '';
      const caption = title + (seal && seal !== '·' ? ' · ' + seal : '');
      if (window.HGM_LIGHTBOX && typeof window.HGM_LIGHTBOX.open === 'function') {
        window.HGM_LIGHTBOX.open(full, title, caption, { sourceTile: tile });
      }
    };
    // 监听 lightbox 关闭 → 恢复原 paused 状态（如果原本在滚动）
    const onLightboxClose = () => {
      if (!wasPausedBeforeClick) setPaused(false);
      wasPausedBeforeClick = false;
    };
    window.addEventListener('hgm-lightbox-close', onLightboxClose);
    container.addEventListener('mousedown', onMouseDown);
    // 触屏：pointerdown 是 pointer 事件，单独监听兜底
    container.addEventListener('touchstart', onMouseDown, { passive: true });

    // 4) 减少动效：CSS 媒体查询会把 animation-duration 设为 0.01ms 导致内容静止。
    //    用 JS rAF 手动驱动 transform，保证视觉连续 + hover 仍可暂停。
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = null;
    let pos = direction === 'right' ? -halfWidth : 0;
    const step = direction === 'right' ? speed / 60 : -speed / 60;  // px/frame @ 60fps

    function tick(){
      pos += step;
      if (direction === 'right' && pos >= 0) pos -= halfWidth;       // 无缝循环
      if (direction === 'left'  && -pos >= halfWidth) pos += halfWidth;
      container.style.transform = `translate3d(${pos.toFixed(2)}px,0,0)`;
      rafId = requestAnimationFrame(tick);
    }
    if (reduced) {
      // 关闭 CSS 动画，用 rAF 接管
      container.style.animation = 'none';
      // 立刻同步 transform（避免初始跳变）
      container.style.transform = `translate3d(${pos}px,0,0)`;
      rafId = requestAnimationFrame(tick);
    }

    return {
      element: container,
      get isPaused(){ return paused; },
      destroy(){
        if (rafId) cancelAnimationFrame(rafId);
        container.removeEventListener('mouseenter', onEnter);
        container.removeEventListener('mouseleave', onLeave);
        container.removeEventListener('mousedown', onMouseDown);
        container.removeEventListener('touchstart', onMouseDown);
        window.removeEventListener('hgm-lightbox-close', onLightboxClose);
        container.innerHTML = '';
        container.style.animation = '';
        container.style.transform = '';
      },
    };
  }

  window.createMarqueeRow = createMarqueeRow;
})();
