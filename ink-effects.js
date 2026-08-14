/* ==========================================================================
   ink-effects.js — 黄桂明网站主动画模块
   - 模块 A: Hero 鼠标遮罩
   - 模块 B: ScrollStory (Lock + Scrub)
   - 模块 C: Marquee (双行反向)
   - 模块 D: Verse 入场
   - 模块 E: Curtain 页间过场
   - 模块 F: Loader
   依赖：window.SCROLL_CAPABILITY（来自 lib/smooth-scroll.js）
   ========================================================================== */
(function(){
  'use strict';

  const cap = window.SCROLL_CAPABILITY || { Gsap:false, ScrollTrigger:false, marqueeOK:false, scrollStoryOK:false };

  // ====== 调试日志开关：URL 加 ?debug=1 时输出，默认静默 ======
  const DEBUG = /[?&]debug=1\b/.test(location.search);
  function log(){
    if (DEBUG) console.log.apply(console, arguments);
  }

  // ====== 工具：rAF 节流 ======
  function rafThrottle(fn){
    let ticking = false;
    return function(...args){
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => { fn.apply(this, args); ticking = false; });
      }
    };
  }

  // =================================================================
  // 模块 A: Hero 鼠标遮罩（Task 10）
  // =================================================================
  function bootHero(){
    const hero = document.getElementById('hero');
    const heroReveal = document.getElementById('heroReveal');
    if (!hero || !heroReveal) return;

    const dot = document.getElementById('heroCursorDot');

    const updateCursor = rafThrottle(function(e){
      const rect = hero.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      heroReveal.style.setProperty('--mx', xPct + '%');
      heroReveal.style.setProperty('--my', yPct + '%');

      if (dot) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        dot.style.left = x + 'px';
        dot.style.top  = y + 'px';
      }
    });

    hero.addEventListener('mousemove', updateCursor);

    // 移动端触摸揭示
    hero.addEventListener('touchmove', function(e){
      const t = e.touches[0];
      const rect = hero.getBoundingClientRect();
      const xPct = ((t.clientX - rect.left) / rect.width) * 100;
      const yPct = ((t.clientY - rect.top) / rect.height) * 100;
      heroReveal.style.setProperty('--mx', xPct + '%');
      heroReveal.style.setProperty('--my', yPct + '%');
    }, { passive: true });

    hero.addEventListener('mouseenter', () => { if (dot) dot.style.opacity = '1'; });
    hero.addEventListener('mouseleave', () => {
      if (dot) dot.style.opacity = '0';
      // 修复：mouseleave 后把 mask 中心重置到 hero 几何中心 (50% 50%)，
      // 避免 --mx/--my 永久停在 hero 边缘，导致画面出现"灰色带状异常色块"（用户报告的 bug）。
      heroReveal.style.setProperty('--mx', '50%');
      heroReveal.style.setProperty('--my', '50%');
    });
    // 触屏：touchend 同样重置（避免 touch 离开后 mask 中心卡住）
    hero.addEventListener('touchend', function(){
      heroReveal.style.setProperty('--mx', '50%');
      heroReveal.style.setProperty('--my', '50%');
    }, { passive: true });

    log('[Hero] booted');
  }

  // =================================================================
  // 模块 B: ScrollStory (Task 11 — ScrollTrigger.pin + scrub)
  // =================================================================
  // 帧数自适应：优先探测实际帧数，避免硬编码错位
  const FRAME_PATH  = '素材/视频切割/frame_';
  const FRAME_EXT   = '.jpg';
  const FRAME_PAD   = 5;
  let   FRAME_COUNT = 249;  // 默认，与素材实际帧数一致（frame_00001 ~ frame_00249）

  function bootScrollStory(){
    const scrollStory = document.getElementById('scroll-story');
    const scrollCanvas = document.getElementById('scrollStoryCanvas');
    if (!scrollStory || !scrollCanvas) return;

    // 声明前置：避免 TDZ ReferenceError
    const frames = new Array(FRAME_COUNT);
    let loadedCount = 0;
    const PROBE_CEILING = 512;  // 二分上界，仅在素材数量超出默认值时才会用到

    /** 单帧存在性探测 */
    function frameExists(i){
      return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = FRAME_PATH + String(i).padStart(FRAME_PAD, '0') + FRAME_EXT;
      });
    }

    /**
     * 探测实际帧数。策略：
     * 1. 先验证默认值 FRAME_COUNT 存在且 FRAME_COUNT+1 不存在 —— 命中则仅 2 次请求、0 次 404 之外的浪费
     * 2. 否则用倍增 + 二分定位上界，请求数为 O(log n) 而非线性扫描
     * @returns {Promise<number>} 实际帧数，全部失败时返回 0
     */
    async function detectFrameCount(){
      // 快路径：默认值正确（当前素材 249 帧即走这里）
      if (await frameExists(FRAME_COUNT)) {
        if (!(await frameExists(FRAME_COUNT + 1))) return FRAME_COUNT;
        // 素材变多了，从默认值开始倍增找上界
        let lo = FRAME_COUNT + 1;
        let hi = Math.min(lo * 2, PROBE_CEILING);
        while (hi < PROBE_CEILING && await frameExists(hi)) {
          lo = hi;
          hi = Math.min(hi * 2, PROBE_CEILING);
        }
        return await binarySearchLast(lo, hi);
      }

      // 慢路径：默认值偏大，在 [1, FRAME_COUNT) 内二分
      if (!(await frameExists(1))) return 0;
      return await binarySearchLast(1, FRAME_COUNT);
    }

    /** 在 [known, unknown] 区间二分出最后一个存在的帧号 */
    async function binarySearchLast(known, unknown){
      let lo = known, hi = unknown;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (await frameExists(mid)) lo = mid; else hi = mid;
      }
      return lo;
    }

    if (!cap.scrollStoryOK) {
      // 降级：显示静态中间帧
      console.warn('[ScrollStory] capability missing, fallback to static');
      scrollStory.classList.add('is-active');
      detectFrameCount().then(max => {
        const midFrame = max > 0 ? Math.floor(max / 2) : 1;
        const fallback = new Image();
        fallback.src = FRAME_PATH + String(midFrame).padStart(FRAME_PAD, '0') + FRAME_EXT;
        fallback.onload = function(){
          // 降级路径：canvas 用 frame 比例（contain 模式）显示中间帧
          const ctx = scrollCanvas.getContext('2d');
          const ratio = fallback.naturalWidth / fallback.naturalHeight;
          const cw = window.innerWidth;
          const ch = cw / ratio;
          scrollCanvas.style.width  = cw + 'px';
          scrollCanvas.style.height = ch + 'px';
          scrollCanvas.width  = Math.floor(cw);
          scrollCanvas.height = Math.floor(ch);
          ctx.fillStyle = '#1A1A1A';
          ctx.fillRect(0, 0, cw, ch);
          // contain 模式绘制
          const cratio = cw / ch;
          let dw, dh, dx, dy;
          if (ratio > cratio) { dw = cw; dh = dw / ratio; dx = 0; dy = (ch - dh) / 2; }
          else { dh = ch; dw = dh * ratio; dx = (cw - dw) / 2; dy = 0; }
          ctx.drawImage(fallback, dx, dy, dw, dh);
        };
      });
      return;
    }

    const ctx = scrollCanvas.getContext('2d', { alpha: true });
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let canvasW = 0, canvasH = 0;
    let currentFrame = 0;
    let actualFrameCount = FRAME_COUNT;  // 探测后更新
    // frame 真实宽高比（默认 16:9，第一帧加载后用真实值更新）
    let FRAME_RATIO = 16 / 9;

    function resizeCanvas(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      // 主体动画缩小策略：canvas 外尺寸由 CSS 控制（max-width: 1200px +
      // aspect-ratio: 16/9），这里读 CSS 渲染后的实际 clientWidth/clientHeight，
      // 同步到 canvas 内部 bitmap 尺寸（高 DPI 清晰）。这样 frame 永远
      // 完整 16:9 显示，且不会撑爆视口。
      canvasW = Math.round(scrollCanvas.clientWidth);
      canvasH = Math.round(scrollCanvas.clientHeight);
      // 不再设 style.width/height — 由 CSS 控制（max-width + aspect-ratio）
      scrollCanvas.width  = Math.floor(canvasW * dpr);
      scrollCanvas.height = Math.floor(canvasH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (frames[0] && frames[0].complete) drawFrame(currentFrame);
    }

    function drawFrame(i){
      const img = frames[i];
      if (!img || !img.complete || img.naturalWidth === 0) return;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = canvasW / canvasH;
      // v5.14 — contain 模式：frame 完整显示在 canvas 内（不裁切），多余空间透明
      // 让 scroll-story section 的纯黑 #000000 背景透出，frame 黑边与背景融为一体，
      // 实现"动画填满屏幕 + 画作不变形 + 视觉无 letterbox"效果。
      let dw, dh, dx, dy;
      if (imgRatio > canvasRatio) {
        // image 更宽（更扁）→ 宽度填满 canvas，高度按比例（上下可能留黑边）
        dw = canvasW; dh = dw / imgRatio; dx = 0; dy = (canvasH - dh) / 2;
      } else {
        // image 更高（更窄）→ 高度填满 canvas，宽度按比例（左右可能留黑边）
        dh = canvasH; dw = dh * imgRatio; dx = (canvasW - dw) / 2; dy = 0;
      }
      ctx.clearRect(0, 0, canvasW, canvasH);
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    function preloadFrame(index){
      return new Promise(resolve => {
        const img = new Image();
        img.onload = function(){
          frames[index] = img;
          loadedCount++;
          // 第一帧加载后：用真实 frame 比例重新计算 canvas + 绘制
          if (index === 0) {
            const newRatio = img.naturalWidth / img.naturalHeight;
            if (Math.abs(newRatio - FRAME_RATIO) > 0.001) {
              FRAME_RATIO = newRatio;
              resizeCanvas();   // 用真实比例重新设 canvas 尺寸
            }
            drawFrame(0);
          }
          // v20260814 — 更新全局帧计数，让 bootLoader 准确计算进度
          window.SCROLL_STORY_LOADED_FRAMES = loadedCount;
          window.SCROLL_STORY_FRAME_COUNT = actualFrameCount;
          const loaderBar = document.getElementById('loaderBar');
          const loaderCount = document.getElementById('loaderCount');
          if (loaderBar) loaderBar.style.width = Math.min(100, Math.round((loadedCount / actualFrameCount) * 100)) + '%';
          if (loaderCount) loaderCount.textContent = Math.min(100, Math.round((loadedCount / actualFrameCount) * 100));
          resolve(img);
        };
        img.onerror = function(){ resolve(null); };
        img.src = FRAME_PATH + String(index + 1).padStart(FRAME_PAD, '0') + FRAME_EXT;
      });
    }

    async function preloadAll(){
      // 先探测实际帧数
      const max = await detectFrameCount();
      // 兜底 Math.max(1, ...)：避免 actualFrameCount 为 0 时进度计算出 NaN%
      actualFrameCount = Math.max(1, max > 0 ? max : FRAME_COUNT);

      // ===== 优化：分批加载，闭 loader 早 =====
      // 只先加载前 30 张（够看到首屏画面），其余在后台按需加载
      const PRIORITY = Math.min(30, actualFrameCount);
      const BATCH = 10;

      for (let i = 0; i < PRIORITY; i += BATCH) {
        const ps = [];
        for (let j = i; j < Math.min(i + BATCH, PRIORITY); j++) ps.push(preloadFrame(j));
        await Promise.all(ps);
      }

      // 首批帧到位后激活 ScrollStory（之前只有降级分支会加 is-active，
      // 导致 GSAP 分支首屏仍处于 opacity: 0，用户看到的是空白）
      scrollStory.classList.add('is-active');

      // v20260814 — 移除"关 loader"逻辑，统一由 bootLoader 控制进度和关闭时机

      // 后台异步加载其余帧（不阻塞 UI）
      setTimeout(async () => {
        for (let i = PRIORITY; i < actualFrameCount; i += BATCH) {
          const ps = [];
          for (let j = i; j < Math.min(i + BATCH, actualFrameCount); j++) ps.push(preloadFrame(j));
          await Promise.all(ps);
        }
        log('[ScrollStory] all frames loaded');
      }, 1000);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    preloadAll();

    // 触屏设备跳过 ScrollTrigger.pin — iOS/Android 上 pin + 触摸滚动兼容性差，
    // 直接走下方 native scrub 兜底（已存在）。桌面端不受影响。
    const isMobile = window.matchMedia('(hover: none), (pointer: coarse)').matches ||
                     (navigator.maxTouchPoints > 0);

    // ====== 主方案：ScrollTrigger pin + scrub (仅桌面) ======
    if (cap.scrollStoryOK && !isMobile) {
      gsap.context(() => {
        ScrollTrigger.create({
          trigger: '#scroll-story',
          start: 'top top',
          // pin 段 = section 高度 × 3（让用户有足够时间看完所有 249 帧，
          // 滚动距离自适应 viewport — 桌面 1440px ≈ 1620px 滚动，移动 390px ≈ 440px 滚动）
          end: () => `+=${scrollStory.offsetHeight * 3}`,
          pin: true,
          scrub: 0.5,
          invalidateOnRefresh: true,   // section 高度变化时重计算
          onUpdate: (self) => {
            const max = actualFrameCount;
            const frame = Math.floor(self.progress * (max - 1));
            if (frame !== currentFrame) {
              currentFrame = frame;
              drawFrame(frame);
            }
            // 进度广播给所有订阅者（序幕 + 3 组卡片）
            if (window.SCROLL_STORY_PROGRESS) {
              window.SCROLL_STORY_PROGRESS.set(self.progress);
            }
            // 兼容：旧调用方仍可走 INTRO_OVERLAY.update
            if (window.INTRO_OVERLAY) {
              window.INTRO_OVERLAY.update(self.progress);
            }
          },
        });
      });
    }

    // ====== 兜底方案：原生 window scroll 监听（不依赖 Lenis/GSAP）======
    // 任何时候 window.scroll 变化都根据 section 位置绘制对应帧
    // 这样即使 GSAP / Lenis 完全失效，滚轮仍能控制动画
    //
    // 注意：Lenis 1.x 在每次内部 lerp 后都会触发原生 scroll 事件（一次 wheel 可能触发
    // 几十次）。如果与 ScrollTrigger.onUpdate 并存，两边都会改写 currentFrame / drawFrame，
    // canvas 会在 ScrollTrigger 的"正确帧"和 nativeScrub 的"近似帧"之间抖动（卡顿）。
    //
    // 因此：仅在 ScrollTrigger 不可用时才挂载 nativeScrub，避免冲突。
    const scrollTriggers = (window.ScrollTrigger && ScrollTrigger.getAll) ? ScrollTrigger.getAll() : [];
    const scrollTriggerAlive = scrollTriggers.length > 0;
    if (!scrollTriggerAlive) {
      function nativeScrub(){
        const rect = scrollStory.getBoundingClientRect();
        const sectionTop = rect.top + window.scrollY;
        const sectionHeight = scrollStory.offsetHeight;
        const vh = window.innerHeight;
        // 进度：从 section 顶部到达 viewport 顶部开始，到 section 底部离开 viewport 底部结束
        const progress = Math.max(0, Math.min(1,
          (window.scrollY + vh - sectionTop) / (sectionHeight + vh - 100)
        ));
        const max = actualFrameCount;
        const frame = Math.floor(progress * (max - 1));
        if (frame !== currentFrame) {
          currentFrame = frame;
          drawFrame(frame);
        }
      }
      window.addEventListener('scroll', rafThrottle(nativeScrub), { passive: true });
      // 立即跑一次（页面初始位置）
      setTimeout(nativeScrub, 100);
    }

    log('[ScrollStory] booted (ScrollTrigger + native scroll fallback)' + (isMobile ? ' [mobile path]' : ''));
  }

  // =================================================================
  // 模块 C: Marquee (Task 12 — 双行反向，独立组件控制)
  //
  // 行分两组（仅放竖向作品）：
  //   row1: 竖向 7 张（id 1,2,3,5,7,8,9，剔除 4/6）— 向左滚
  //   row2: 竖向 6 张（id 10,11,12,14,15,18，剔除 13/16/17/19）— 向右滚
  // 横向 6 张（id 4,6,13,16,17,19）由 bootLandscapeMarquee() 单独一行展示，
  // 避免在竖向长卷里"矮胖"看不清细节。
  // =================================================================
  function bootMarquee(){
    if (!window.createMarqueeRow) {
      console.warn('[Marquee] createMarqueeRow 未加载');
      return;
    }
    const row1 = document.getElementById('marqueeRow1');
    const row2 = document.getElementById('marqueeRow2');
    if (!row1 || !row2) {
      console.warn('[Marquee] row 元素不存在 (#marqueeRow1 / #marqueeRow2)');
      return;
    }

    // 仅取竖向作品（lib/artworks-data.js 提供 getPortraitArtworks）
    const portraits = (typeof window.getPortraitArtworks === 'function')
      ? window.getPortraitArtworks()
      : (window.ARTWORKS_DATA || []).filter(a => a.image);
    const row1Arts = portraits.filter(a => a.id >= 1  && a.id <= 9);
    const row2Arts = portraits.filter(a => a.id >= 10 && a.id <= 19);
    if (!row1Arts.length || !row2Arts.length) {
      console.warn('[Marquee] 竖向作品数据不全', { row1: row1Arts.length, row2: row2Arts.length });
      return;
    }

    // 触屏：动画速度降至 ~55%（px/s 在窄屏视觉感受更快，桌面不变）
    const isMobile = window.matchMedia('(hover: none), (pointer: coarse)').matches ||
                     (navigator.maxTouchPoints > 0);
    const row1Speed = isMobile ? 30 : 55;
    const row2Speed = isMobile ? 25 : 45;

    // 各自独立实例：自己的数据、自己的方向/速度、自己的 hover 监听
    // 速度用 px/s 表示（之前 CSS 是 60s/80s 滚动 50% ≈ 50-60px/s）
    window.createMarqueeRow({
      arts: row1Arts,
      container: row1,
      direction: 'left',
      speed: row1Speed,
    });
    window.createMarqueeRow({
      arts: row2Arts,
      container: row2,
      direction: 'right',
      speed: row2Speed,
    });

    log(`[Marquee] booted (row1=${row1Arts.length} + row2=${row2Arts.length} portrait tiles, independent components)`);
  }

  // =================================================================
  // 模块 C2: Landscape Grid — 横向作品静态网格展示（非对称布局）
  //
  // 设计动机：横向作品（宽>高，比例 1.86-2.17）在滚动长卷里观感差，
  // 改成静态网格直观展示。客户指定布局：
  //   ┌─────────────────┐
  //   │  Image #3       │  ← 第 1 行：最上方居中（跨列）
  //   ├──────┬──────┤
  //   │  ?   │  ?   │  ← 第 2 行：左右对齐
  //   ├──────┼──────┤
  //   │  ?   │  ?   │  ← 第 3 行：左右对齐
  //   ├──────┴──────┤
  //   │  Image #2       │  ← 第 4 行：最下方居中（跨列）
  //   └─────────────────┘
  //
  // 布局由 LANDSCAPE_LAYOUT 数组驱动 —— 调整顺序或跨列只需改这一处。
  // 桌面 2 列、移动 1 列；tile 高度由 lib/image-fit.js 按原图 aspect-ratio
  // 动态设置（数据交叉验证每张都是 1862-1920 宽 × 885-1011 高）。
  // =================================================================

  // 用户定制布局（Image #3 = id=17 诗意"江岸奇峰耸"关联）
  // 如需调整：改 id 即可，wide=true 表示跨列居中（最上方/最下方）
  const LANDSCAPE_LAYOUT = [
    { id: 17, wide: true  },  // Image #3 - 最上方居中
    { id: 4,  wide: false },  // 左
    { id: 13, wide: false },  // 右
    { id: 16, wide: false },  // 左
    { id: 19, wide: false },  // 右
    { id: 6,  wide: true  },  // Image #2 - 最下方居中
  ];

  function tileHTML(art, wide){
    // 首页点击作品改为 lightbox 全屏展示，不跳转。
    // 缩略图取素材/thumbs/{id}.jpg，lightbox 用素材/{id}.jpg 原图。
    const thumbSrc = `素材/thumbs/${art.id}.jpg`;
    const fullSrc = `素材/${art.id}.jpg`;
    const esc = window.HGM_ESCAPE_HTML || ((s) => String(s));
    const wideCls = wide ? ' marquee__tile--wide' : '';
    return `
      <button type="button" class="marquee__tile${wideCls}" data-id="${esc(art.id)}"
              data-wide="${wide ? '1' : '0'}"
              data-thumb="${esc(thumbSrc)}" data-full="${esc(fullSrc)}"
              data-title="${esc(art.title)}" data-seal="${esc(art.seal)}"
              data-fit="true" aria-label="放大查看《${esc(art.title)}》">
        <img src="${esc(thumbSrc)}" alt="${esc(art.title)}" decoding="async" loading="lazy" />
        <span class="marquee__seal">${esc(art.seal)}</span>
      </button>
    `;
  }

  /** 按 LANDSCAPE_LAYOUT 顺序 + wide 标记重新组织作品数组 */
  function layoutLandscapes(arts){
    const byId = new Map(arts.map(a => [a.id, a]));
    const out = [];
    for (const item of LANDSCAPE_LAYOUT) {
      const art = byId.get(item.id);
      if (!art) continue;
      out.push({ art, wide: !!item.wide });
    }
    return out;
  }

  function bootLandscapeMarquee(){
    // 函数名保留 bootLandscapeMarquee 是为了不破坏 bootAll() 调用，
    // 但行为已改为静态网格（命名升级在下一版本考虑）。
    const grid = document.getElementById('landscapeGrid');
    if (!grid) return;     // 仅首页有此元素，其他页面静默跳过

    const landscapes = (typeof window.getLandscapeArtworks === 'function')
      ? window.getLandscapeArtworks()
      : [];
    if (!landscapes.length) {
      console.warn('[LandscapeGrid] 无横向作品');
      return;
    }

    const layout = layoutLandscapes(landscapes);
    grid.innerHTML = layout.map(({ art, wide }) => tileHTML(art, wide)).join('');

    // 触发 lib/image-fit.js 重新扫描新插入的容器（设置 aspect-ratio）
    if (window.HGM_FIT_IMAGE && typeof window.HGM_FIT_IMAGE.scan === 'function') {
      window.HGM_FIT_IMAGE.scan(grid);
    }

    // 点击 grid tile → 打开 lightbox（首页不跳转作品页）
    const onGridClick = (e) => {
      const tile = e.target.closest('.marquee__tile');
      if (!tile || !grid.contains(tile)) return;
      e.preventDefault();
      const full = tile.getAttribute('data-full') || tile.querySelector('img')?.src || '';
      const title = tile.getAttribute('data-title') || tile.querySelector('img')?.alt || '';
      const seal = tile.getAttribute('data-seal') || '';
      const caption = title + (seal && seal !== '·' ? ' · ' + seal : '');
      if (window.HGM_LIGHTBOX && typeof window.HGM_LIGHTBOX.open === 'function') {
        window.HGM_LIGHTBOX.open(full, title, caption, { sourceTile: tile });
      }
    };
    grid.addEventListener('click', onGridClick);

    const wideCount = layout.filter(x => x.wide).length;
    log(`[LandscapeGrid] rendered ${layout.length} tiles (${wideCount} wide), order=[${layout.map(x=>x.art.id).join(',')}]`);
  }

  // =================================================================
  // 模块 D: Verse + 入场 (Task 13)
  // =================================================================
  function bootVerse(){
    const targets = document.querySelectorAll('.story, .verse, .cta-section, .footer');
    if (!targets.length || !('IntersectionObserver' in window)) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-page-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -10% 0px' });

    targets.forEach(el => obs.observe(el));

    // 选诗填充：按句读切分后两句一行，句数不足时自动降级，不再假设恰好 4 段
    const verseSection = document.querySelector('.verse .verse__text');
    const poems = window.POEMS;
    if (verseSection && Array.isArray(poems) && poems.length) {
      const poem = poems[poems.length - 1];
      const text = (poem && poem.text) || '';
      // 保留标点：把每个句读连同其后的标点作为一段
      const clauses = text.match(/[^，。；！？]+[，。；！？]?/g) || [];
      if (clauses.length) {
        const rows = [];
        for (let i = 0; i < clauses.length; i += 2) {
          rows.push(clauses.slice(i, i + 2).join(''));
        }
        // textContent 逐行写入 + <br>，避免 innerHTML 注入
        verseSection.textContent = '';
        rows.forEach((row, i) => {
          if (i > 0) verseSection.appendChild(document.createElement('br'));
          verseSection.appendChild(document.createTextNode(row));
        });
      }
    }
  }

  // =================================================================
  // 模块 D2: Ink Reveal — 给 [data-ink-reveal] 加 .ink-revealed
  // styles.css 定义了 mask 位移动画，但此前没有任何代码触发它
  // =================================================================
  function bootInkReveal(){
    const targets = document.querySelectorAll('[data-ink-reveal]');
    if (!targets.length) return;

    // 无 IntersectionObserver 时直接显示，避免标题永久隐藏
    if (!('IntersectionObserver' in window)) {
      targets.forEach(el => el.classList.add('ink-revealed'));
      return;
    }

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('ink-revealed');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -5% 0px' });

    targets.forEach(el => obs.observe(el));
  }

  // =================================================================
  // 模块 E: Curtain (Task 14 — 200+100+200=500ms 两段)
  // =================================================================
  function bootCurtain(){
    const curtain = document.getElementById('curtain');
    if (!curtain) return;

    const STATE_KEY = 'curtain_state';
    const DURATION_FALL = 200;
    const DURATION_HOLD = 100;
    const DURATION_RISE = 200;

    // === 新页面进入：处理升起 ===
    function consumeState(){
      let state = null;
      try { state = sessionStorage.getItem(STATE_KEY); } catch (e) {}
      if (state === 'closing') {
        curtain.classList.add('is-closing');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            curtain.classList.add('is-opening');
            setTimeout(() => {
              curtain.classList.remove('is-closing', 'is-opening');
              try { sessionStorage.removeItem(STATE_KEY); } catch (e) {}
            }, DURATION_RISE);
          });
        });
      }
    }
    consumeState();

    // === 跨页点击：触发落下 + 跳转 ===
    document.addEventListener('click', function(e){
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (!href) return;
      if (href.startsWith('#')) return;
      if (a.target === '_blank') return;
      const isHtml = /\.html(\?|#|$)/.test(href);
      if (!isHtml) return;

      e.preventDefault();
      try { sessionStorage.setItem(STATE_KEY, 'closing'); } catch (e) {}
      curtain.classList.add('is-closing');

      setTimeout(() => {
        location.href = href;
      }, DURATION_FALL + DURATION_HOLD);
    });

    log('[Curtain] booted (two-stage 500ms)');
  }

  // =================================================================
  // 模块 F: Loader (Task 15) — 准确进度条版本
  // 进度条追踪：
  //   · Hero 两张大图（留白.png + 有画.png）— 首屏必需
  //   · ScrollStory 前 30 帧 — 首屏第一帧可见
  //   · Google Fonts — 文字字体
  //   · GSAP — 滚动动画
  // 全部加载完才关闭 loader
  // =================================================================
  function bootLoader(){
    const loaderEl = document.getElementById('loader');
    if (!loaderEl) return;
    if (loaderEl.classList.contains('is-removed')) return;

    const bar = document.getElementById('loaderBar');
    const count = document.getElementById('loaderCount');

    function ready(){
      if (loaderEl.classList.contains('is-removed')) return;
      // 确保进度条显示 100% 后再关闭（视觉一致性）
      if (bar) bar.style.width = '100%';
      if (count) count.textContent = '100';
      // 直接 is-removed（display:none），跳过 is-hiding 中转过渡 + 600ms 等待，
      // 满足"网页准备好后立刻进入"的预期。
      loaderEl.classList.add('is-removed');
      document.body.classList.add('is-ready');
      log('[Loader] hidden');
    }

    // 资源队列：每个资源有 weight（贡献到总进度）
    const resources = [];

    // 1. Hero 两张大图（高权重）
    document.querySelectorAll('.hero__layer').forEach(img => {
      resources.push({ el: img, weight: 30, name: 'hero:' + (img.alt || '?').slice(0, 20) });
    });

    // 2. ScrollStory 前 30 帧（首屏必需 — 与 ScrollStory 的 PRIORITY 一致）
    const FRAME_TOTAL = 30;
    resources.push({
      type: 'scrollstory-frames',
      weight: 30,
      name: 'scrollstory frames',
    });

    // 3. Google Fonts（中权重）
    resources.push({
      type: 'fonts',
      weight: 10,
      name: 'google-fonts',
    });

    function isFontLoaded(){
      // document.fonts.ready 是 Promise
      return !document.fonts || document.fonts.status === 'loaded';
    }

    function update(){
      let loaded = 0;
      let total = 0;
      for (let i = 0; i < resources.length; i++){
        const r = resources[i];
        total += r.weight;
        if (r.el) {
          // 图片资源
          if (r.el.complete && r.el.naturalWidth > 0) loaded += r.weight;
        } else if (r.type === 'fonts') {
          // 字体资源
          if (isFontLoaded()) loaded += r.weight;
        } else if (r.type === 'scrollstory-frames') {
          // ScrollStory 帧：按已加载/30 计算（30 帧为首屏必需）
          const frameLoaded = window.SCROLL_STORY_LOADED_FRAMES || 0;
          const ratio = Math.min(1, frameLoaded / FRAME_TOTAL);
          loaded += r.weight * ratio;
        }
      }
      const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
      if (bar) bar.style.width = pct + '%';
      if (count) count.textContent = String(pct);
      return pct;
    }

    // 初始更新一次（让用户看到 0%）
    update();

    // 每 100ms 更新进度
    const tickId = setInterval(() => {
      const pct = update();
      if (pct >= 100) {
        clearInterval(tickId);
        ready();                  // 进度到 100% 立即关闭（移除原 200ms 等待）
      }
    }, 100);

    // 兜底：15 秒强制关闭（防止网络异常永久 loading）
    setTimeout(() => {
      clearInterval(tickId);
      log('[Loader] timeout fallback');
      ready();
    }, 15000);
  }

  // =================================================================
  // 启动顺序：等待 window.load（确保所有 defer CDN 已就绪），
  // 但 loader 立即启动（不等 CDN）
  // =================================================================
  function bootAll(){
    // 重新读取 SCROLL_CAPABILITY（如果 bootAll 触发晚于 smooth-scroll.js 注册 cap）
    const liveCap = window.SCROLL_CAPABILITY || cap;
    log('[ink-effects] booting with capability:', liveCap);
    bootHero();
    bootScrollStory();
    bootMarquee();
    bootLandscapeMarquee();
    bootVerse();
    bootInkReveal();
    bootCurtain();
    // bootLoader 单独启动（不等 CDN）
  }

  function bootWhenReady(){
    if (window.SCROLL_CAPABILITY && window.SCROLL_CAPABILITY.Gsap) {
      // 一切就绪，立即启动
      bootAll();
    } else if (window.SCROLL_CAPABILITY && !window.SCROLL_CAPABILITY.Gsap) {
      // GSAP 加载失败，立刻启动（fallback 已就位）
      console.warn('[ink-effects] GSAP 不可用，将使用 fallback');
      bootAll();
    } else {
      // lib/smooth-scroll.js 还没跑，等 100ms 重试
      setTimeout(bootWhenReady, 100);
    }
  }

  // Loader 立即启动（不等任何东西）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootLoader);
  } else {
    bootLoader();
  }

  // 动画模块：等 SCROLL_CAPABILITY 就绪后启动
  bootWhenReady();
})();
