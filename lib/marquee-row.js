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
    //      桌面：mousedown 立即打开（防 tile 被 animation 移走导致 click 错位）。
    //      触屏：touchend（松手）才打开，捕获的 tile 即使被移走也对得上；
    //            手指向下滑 ≥ TOUCH_SCROLL_THRESHOLD px 视为页面滚动手势，
    //            吞掉、不打开 lightbox。
    //      触屏路径通过 e.preventDefault() 抑制紧随其后的合成 mousedown / click，
    //            避免桌面路径被重复触发。
    let wasPausedBeforeClick = false;     // 记录点击前是否已暂停（hover 状态）
    let touchTile = null;                 // touchstart 捕获的 tile
    let touchStartY = 0;                  // touch 起始 Y
    let touchMaxY = 0;                    // touch 期间 Y 的最大值（用来判下滑）
    let touchStartTime = 0;               // touch 起始时间戳（用来判长按）
    const TOUCH_SCROLL_THRESHOLD = 10;    // 手指向下滑超过此像素 → 视为页面滚动
    const LONG_PRESS_MS = 500;            // 长按阈值：超过此时间视为长按，不触发 lightbox
    // 触屏结束后浏览器会合成 mousedown/mouseup/click，
    // 若不拦截会触发 onMouseDown 提前打开 lightbox（用户感知"按下就触发"）。
    // 在 touchstart 设个时间戳，mousedown 看见自己恰在触屏带尾巴里就跳过。
    let blockMouseUntil = 0;              // Date.now() 时间戳，期内合成 mousedown 被忽略
    const SYNTH_MOUSE_BLOCK_MS = 700;     // 触屏结束后 700ms 内的合成 mousedown 都吞掉

    function openLightboxForTile(tile){
      if (!tile) return;
      wasPausedBeforeClick = paused;
      setPaused(true);
      const full = tile.getAttribute('data-full') || tile.querySelector('img')?.src || '';
      const title = tile.getAttribute('data-title') || tile.querySelector('img')?.alt || '';
      const seal = tile.getAttribute('data-seal') || '';
      const caption = title + (seal && seal !== '·' ? ' · ' + seal : '');
      if (window.HGM_LIGHTBOX && typeof window.HGM_LIGHTBOX.open === 'function') {
        window.HGM_LIGHTBOX.open(full, title, caption, { sourceTile: tile });
      }
    }

    // 桌面：mousedown 立即打开（但要先检查是否被触屏尾巴覆盖）
    const onMouseDown = (e) => {
      if (Date.now() < blockMouseUntil) return;   // 触屏合成 mousedown，跳过
      const tile = e.target.closest('.marquee__tile');
      if (!tile || !container.contains(tile)) return;
      e.preventDefault();
      openLightboxForTile(tile);
    };

    // 触屏：touchstart 只捕获 tile + 记录起点（不暂停、不开 lightbox）
    const onTouchStart = (e) => {
      const tile = e.target.closest('.marquee__tile');
      if (!tile || !container.contains(tile)) {
        touchTile = null;
        return;
      }
      touchTile = tile;
      touchStartY = e.touches[0].clientY;
      touchMaxY = touchStartY;
      touchStartTime = Date.now();
      // 进入触屏带：阻断后续合成 mousedown 700ms
      blockMouseUntil = Date.now() + SYNTH_MOUSE_BLOCK_MS;
    };

    // 触屏：touchmove 记录 Y 最大值（用来分辨 tap / 下滑 / 上滑）
    const onTouchMove = (e) => {
      if (touchTile === null) return;
      const currentY = e.touches[0].clientY;
      if (currentY > touchMaxY) touchMaxY = currentY;
    };

    // 触屏：touchend（松手）才决定是否开 lightbox
    const onTouchEnd = (e) => {
      if (touchTile === null) return;
      const tile = touchTile;
      const wasPageScroll = (touchMaxY - touchStartY) > TOUCH_SCROLL_THRESHOLD;
      const heldMs = Date.now() - touchStartTime;
      touchTile = null;
      touchMaxY = 0;
      touchStartTime = 0;
      // 吞掉合成 mousedown / click（不论是否打开 lightbox），避免桌面路径双触发
      e.preventDefault();
      if (wasPageScroll) return;          // 手指下滑：页面滚动意图，不开 lightbox
      if (heldMs >= LONG_PRESS_MS) return; // 长按：只触发浏览/复制，不开 lightbox
      openLightboxForTile(tile);
    };

    // 触屏被打断（来电、通知等）：清状态
    const onTouchCancel = () => {
      touchTile = null;
      touchMaxY = 0;
    };

    // 监听 lightbox 关闭 → 恢复原 paused 状态（如果原本在滚动）
    const onLightboxClose = () => {
      if (!wasPausedBeforeClick) setPaused(false);
      wasPausedBeforeClick = false;
    };
    window.addEventListener('hgm-lightbox-close', onLightboxClose);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchCancel, { passive: true });

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
        container.removeEventListener('touchstart', onTouchStart);
        container.removeEventListener('touchmove', onTouchMove);
        container.removeEventListener('touchend', onTouchEnd);
        container.removeEventListener('touchcancel', onTouchCancel);
        window.removeEventListener('hgm-lightbox-close', onLightboxClose);
        container.innerHTML = '';
        container.style.animation = '';
        container.style.transform = '';
      },
    };
  }

  window.createMarqueeRow = createMarqueeRow;
})();
