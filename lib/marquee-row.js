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
    const { arts, container, direction = 'left', speed: initialSpeed = 50 } = opts;
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
    //    - speed 可变（setSpeed 调用时更新）
    const animName = direction === 'right' ? 'marqueeScrollRight' : 'marqueeScrollLeft';
    let speed = initialSpeed;
    let halfWidth = container.scrollWidth / 2;
    // 声明提前到 applyAnimation 之前（避免 TDZ：syncPlayState 内部访问 userPaused）
    let paused = false;
    let userPaused = false;
    let animationInitialized = false;  // 区分首次设置和后续更新
    function syncPlayState(){
      container.style.animationPlayState = (paused || userPaused) ? 'paused' : 'running';
    }
    const setPaused = (v) => {
      // v5.45：只改内部 paused，不再调 syncPlayState
      // 让 hover 和按钮操作完全独立，避免互相覆盖
      paused = v;
      // syncPlayState 不调——按钮直接改 DOM，hover 只标记状态
    };
    const setUserPaused = (v) => {
      // 同样：只改内部 userPaused，不调 syncPlayState
      userPaused = v;
    };
    function applyAnimation(){
      // 重新读 scrollWidth（resize 后容器宽度会变）
      halfWidth = container.scrollWidth / 2;
      const durationSec = halfWidth / Math.max(1, Math.abs(speed));
      if (!animationInitialized) {
        // 首次：设置完整 animation string（含 animation-name，否则 keyframe 不绑定）
        container.style.animation = `${animName} ${durationSec.toFixed(1)}s linear infinite`;
        animationInitialized = true;
      } else {
        // 后续：只改 animationDuration，不重设 string（避免从头开始 → "跳一下"）
        container.style.animationDuration = `${durationSec.toFixed(1)}s`;
      }
      // 同步 paused 状态
      syncPlayState();
    }
    applyAnimation();

    // 3) Hover 暂停：v5.45 关键修复——只改内部 paused 状态，**不调 syncPlayState**
    //    让 hover 和按钮完全独立：
    //      - hover 只标记 paused=true/false（不实际改 animationPlayState）
    //      - 按钮 click 直接改 marquee__track.style.animationPlayState
    //    这样电脑端 hover 时点按钮不会被 hover 覆盖（之前是 hover 永久 paused，
    //    按钮的 toggle 被合并 OR 屏蔽）
    //    注意：牺牲了"hover 自动暂停 marquee"的体验，但换来了按钮 100% 可靠
    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    container.addEventListener('mouseenter', onEnter);
    container.addEventListener('mouseleave', onLeave);

    // 3.5) 点击 tile → 暂停 + 打开 lightbox（首页不跳转作品页）
    //      桌面：mousedown 立即打开（防 tile 被 animation 移走导致 click 错位）。
    //      触屏：touchend（松手）才打开，捕获的 tile 即使被移走也对得上；
    //            手指向下滑 ≥ TOUCH_SCROLL_THRESHOLD px 视为页面滚动手势，
    //            吞掉、不打开 lightbox。
    //      触屏路径通过 e.preventDefault() 抑制紧随其后的合成 mousedown / click，
    //            避免桌面路径被重复触发。
    //
    //      触屏手势矩阵：
    //      ┌──────────────────┬──────────────────────┐
    //      │ 手势              │ 是否开 lightbox       │
    //      ├──────────────────┼──────────────────────┤
    //      │ 快速 tap (<500ms) │ ✅ 开                  │
    //      │ 长按 ≥ 500ms      │ ❌ 不开（让位 OS 菜单）│
    //      │ 任意方向位移 ≥10px│ ❌ 不开（滚动意图）   │
    //      │ 触屏合成 mousedown│ ❌ 700ms 窗口内吞掉   │
    //      └──────────────────┴──────────────────────┘
    //      桌面鼠标：mousedown 立即开（行为不变）
    let wasPausedBeforeClick = false;     // 记录点击前是否已暂停（hover 状态）
    // 触屏状态：单次触摸周期内的所有数据，touchstart 写入、touchmove 更新极值、
    // touchend 整组清掉。`touch === null` 表示"无活跃触摸"。
    let touch = {
      tile: null,        // touchstart 捕获的 tile
      startX: 0, startY: 0,         // 起始坐标
      maxX: 0, minX: 0, maxY: 0, minY: 0,  // 期间 X/Y 极值（用于判滚动意图，Y 双向）
      startTime: 0,       // 起始时间戳（用于判长按）
    };
    const TOUCH_SCROLL_THRESHOLD = 10;  // 任意方向位移 > 阈值 → 滚动意图
    const LONG_PRESS_MS = 500;          // 长按阈值
    // 触屏结束后浏览器会合成 mousedown/mouseup/click，
    // 若不拦截会触发 onMouseDown 提前打开 lightbox（用户感知"按下就触发"）。
    // 在 touchstart 设个时间戳，mousedown 看见自己恰在触屏带尾巴里就跳过。
    let blockMouseUntil = 0;            // Date.now() 时间戳，期内合成 mousedown 被忽略
    // 实测 Chrome ~200ms / Safari iOS 17 前 ~400ms 触发合成 mousedown，
    // 700ms 是带 buffer 的保守值，慢设备 / 旧浏览器也覆盖。
    const SYNTH_MOUSE_BLOCK_MS = 700;   // 触屏结束后 700ms 内的合成 mousedown 都吞掉

    // Issue#5 修复：桌面 mousedown 即触发会导致 CSS animation 持续移动下
    // 用户感知"点 A 开 B"（hit-test 落到 B 的 DOM 上）。改为 mouseup 校验：
    // 仅当 mousedown 与 mouseup 在同一 tile + 鼠标位移 < 5px + 时长 < 500ms
    // 才打开 lightbox。触屏路径已用 touchend 校验（touch.js:159-173），此处镜像。
    let mouse = {
      tile: null,        // mousedown 捕获的 tile
      startX: 0, startY: 0,
      startTime: 0,
    };
    const MOUSE_DRAG_THRESHOLD = 5;     // 鼠标位移 > 阈值 → 拖拽意图，不开
    const MOUSE_HOLD_MS = 500;          // 长按阈值（与触屏 LONG_PRESS_MS 一致）

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

    // 桌面：mousedown 只捕获 tile + 记录起点，不暂停、不开 lightbox
    // （校验逻辑搬到 onMouseUp，避免 CSS animation 持续移动下 hit-test 错位）
    const onMouseDown = (e) => {
      if (Date.now() < blockMouseUntil) return;   // 触屏合成 mousedown，跳过
      const tile = e.target.closest('.marquee__tile');
      if (!tile || !container.contains(tile)) {
        mouse.tile = null;
        return;
      }
      mouse = { tile, startX: e.clientX, startY: e.clientY, startTime: Date.now() };
    };

    // 桌面：mouseup 校验后才决定是否开 lightbox
    // 校验：1) 同一 tile（DOM 引用相等）；2) 位移 < 5px；3) 时长 < 500ms
    const onMouseUp = (e) => {
      if (!mouse.tile) return;
      const m = mouse;
      mouse = { tile: null, startX: 0, startY: 0, startTime: 0 };
      // 校验位移
      const dx = Math.abs(e.clientX - m.startX);
      const dy = Math.abs(e.clientY - m.startY);
      const dist = Math.max(dx, dy);
      if (dist > MOUSE_DRAG_THRESHOLD) return;          // 拖拽/大幅移动意图
      // 校验时长
      if (Date.now() - m.startTime >= MOUSE_HOLD_MS) return; // 长按
      e.preventDefault();                               // 抑制 click 重复触发
      openLightboxForTile(m.tile);                      // 用 mousedown 时刻的 tile
    };

    // 鼠标离开容器：取消未完成 click（避免 mouseup 落在别处误判）
    const onMouseLeaveContainer = () => {
      mouse.tile = null;
    };

    // 触屏：touchstart 只捕获 tile + 记录起点（不暂停、不开 lightbox）
    const onTouchStart = (e) => {
      const tile = e.target.closest('.marquee__tile');
      if (!tile || !container.contains(tile)) {
        touch = null;
        return;
      }
      const x = e.touches[0].clientX, y = e.touches[0].clientY;
      touch = { tile, startX: x, startY: y, maxX: x, minX: x, maxY: y, minY: y, startTime: Date.now() };
      // 进入触屏带：阻断后续合成 mousedown 700ms
      blockMouseUntil = Date.now() + SYNTH_MOUSE_BLOCK_MS;
    };

    // 触屏：touchmove 记录 Y/X 极值（用来分辨 tap / 滑移）
    const onTouchMove = (e) => {
      if (!touch) return;
      const x = e.touches[0].clientX, y = e.touches[0].clientY;
      if (y > touch.maxY) touch.maxY = y;
      if (y < touch.minY) touch.minY = y;
      if (x > touch.maxX) touch.maxX = x;
      if (x < touch.minX) touch.minX = x;
    };

    // 触屏：touchend（松手）才决定是否开 lightbox
    const onTouchEnd = (e) => {
      if (!touch) return;
      const t = touch;
      touch = null;                          // 先清状态，再 preventDefault + 决策
      // 滚动意图判定：X/Y 任一方向超过阈值都视为滚动（Y 双向：上下滑都不触发）
      const deltaY = Math.max(t.maxY - t.startY, t.startY - t.minY);
      const deltaX = Math.max(t.maxX - t.startX, t.startX - t.minX);
      const wasPageScroll = deltaY > TOUCH_SCROLL_THRESHOLD || deltaX > TOUCH_SCROLL_THRESHOLD;
      const heldMs = Date.now() - t.startTime;
      // 吞掉合成 mousedown / click（不论是否打开 lightbox），避免桌面路径双触发
      e.preventDefault();
      if (wasPageScroll) return;          // 任意方向位移 > 阈值：滚动意图，不开 lightbox
      if (heldMs >= LONG_PRESS_MS) return; // 长按：只触发浏览/复制，不开 lightbox
      openLightboxForTile(t.tile);
    };

    // 触屏被打断（来电、通知等）：清状态
    const onTouchCancel = () => {
      touch = null;
    };

    // 监听 lightbox 关闭 → 恢复原 paused 状态（如果原本在滚动）
    const onLightboxClose = () => {
      if (!wasPausedBeforeClick) setPaused(false);
      wasPausedBeforeClick = false;
    };
    window.addEventListener('hgm-lightbox-close', onLightboxClose);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseLeaveContainer);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchCancel, { passive: true });

    // 4) 减少动效：CSS 媒体查询会把 animation-duration 设为 0.01ms 导致内容静止。
    //    用 JS rAF 手动驱动 transform，保证视觉连续 + hover 仍可暂停。
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = null;
    let pos = direction === 'right' ? -halfWidth : 0;
    function getStep(){
      // 60fps 假设（实际帧率可能略低，但够用）
      return direction === 'right' ? speed / 60 : -speed / 60;
    }

    function tick(){
      // v5.46 — reduced-motion 兼容：rAF 接管时也要读 paused/userPaused
      // 之前：tick() 不读暂停状态，按钮改 animationPlayState 完全无效（rAF 路径没有 animation 可以暂停）
      // 现在：paused || userPaused 时跳过 transform 更新，但 RAF 链不中断
      //      （保持下次状态变化时无缝继续；用户感知不到 RAF 在跑）
      if (paused || userPaused) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      pos += getStep();
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
      get isPaused(){ return paused || userPaused; },
      // v5.37 — 单独暴露用户主动暂停状态（不受 hover 干扰）
      // 按钮 handler 用这个 toggle，避免 hover paused 让按钮看起来"无效"
      get isUserPaused(){ return userPaused; },
      // v5.33 — pause/resume 调的是 setUserPaused（用户主动），不会被 hover 覆盖
      pause(){ setUserPaused(true); },
      resume(){ setUserPaused(false); },
      toggle(){
        if (userPaused) { setUserPaused(false); return false; }
        setUserPaused(true);
        return true;
      },
      // v5.33 — 暴露动态调速方法（加速按钮调用）
      setSpeed(newSpeed){
        if (typeof newSpeed !== 'number' || !isFinite(newSpeed) || newSpeed <= 0) return;
        speed = newSpeed;
        if (reduced) {
          // rAF 路径：getStep() 每帧读 speed，无需重设
          if (!rafId) {
            container.style.transform = `translate3d(${pos}px,0,0)`;
            rafId = requestAnimationFrame(tick);
          }
        } else {
          applyAnimation();
        }
      },
      getSpeed(){ return speed; },
      destroy(){
        if (rafId) cancelAnimationFrame(rafId);
        container.removeEventListener('mouseenter', onEnter);
        container.removeEventListener('mouseleave', onLeave);
        container.removeEventListener('mousedown', onMouseDown);
        container.removeEventListener('mouseup', onMouseUp);
        container.removeEventListener('mouseleave', onMouseLeaveContainer);
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
