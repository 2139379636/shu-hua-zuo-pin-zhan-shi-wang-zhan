/* ==========================================================================
   作品 Lightbox — 首页点击作品全屏展示，不跳转
   - 点击首页 marquee/landscape tile → 弹出全屏展示
   - 关闭：右上角 × / 点击背景 / 按 Esc
   - 图片保持原比例，最大宽 90vw × 高 80vh
   - 印章+标题作为 caption
   - 滚动位置精确保持：open 时保存 scrollY + body position:fixed，
     close 时恢复 scrollY。规避 overflow:hidden + Lenis 平滑滚动导致的漂移。
   - 焦点管理：open 时保存原激活元素，close 时焦点回原元素（a11y）。
   暴露：window.HGM_LIGHTBOX = { open(src, alt, caption?), close() }
   ========================================================================== */
(function(){
  'use strict';

  let domReady = false;
  let savedScrollY = 0;
  let savedFocus = null;

  function ensureDOM(){
    if (domReady) return document.getElementById('hgmLightbox');

    const div = document.createElement('div');
    div.id = 'hgmLightbox';
    div.className = 'lightbox';
    div.setAttribute('aria-hidden', 'true');
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-label', '作品全貌');
    div.innerHTML = `
      <button type="button" class="lightbox__close" aria-label="关闭" title="关闭 (Esc)">×</button>
      <figure class="lightbox__figure">
        <img class="lightbox__img" src="" alt="" />
        <figcaption class="lightbox__caption"></figcaption>
      </figure>
    `;
    document.body.appendChild(div);

    // 事件绑定
    div.querySelector('.lightbox__close').addEventListener('click', close);
    // 点击背景关闭（图片/figure 不算）
    div.addEventListener('click', function(e){
      if (e.target === div) close();
    });
    // Esc 关闭
    document.addEventListener('keydown', function onEsc(e){
      if (e.key === 'Escape' && div.classList.contains('is-open')) close();
    });

    domReady = true;
    return div;
  }

  function open(src, alt, caption, opts){
    const lb = ensureDOM();
    const img = lb.querySelector('.lightbox__img');
    const cap = lb.querySelector('.lightbox__caption');
    if (!src) return;
    img.src = src;
    img.alt = alt || '';
    cap.textContent = caption || alt || '';

    // 1) 保存当前滚动位置 + 激活元素（用于关闭时恢复）
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    savedFocus = document.activeElement && document.activeElement !== document.body
      ? document.activeElement
      : null;
    if (opts && opts.sourceTile) savedFocus = opts.sourceTile;

    // 2) 停止 Lenis（让 GSAP ticker 暂停 Lenis 的 raf 循环）
    if (window.LENIS_INSTANCE && typeof window.LENIS_INSTANCE.stop === 'function') {
      const l = window.LENIS_INSTANCE;
      if ('animatedScroll' in l) l.animatedScroll = savedScrollY;
      if ('targetScroll' in l) l.targetScroll = savedScrollY;
      l.stop();
    }

    // 3) 锁定 body 滚动：用 position:fixed + top:-scrollY 模式
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    // 4) 显示 + 焦点
    void lb.offsetWidth;     // 强制 reflow 让 transition 生效
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    lb.querySelector('.lightbox__close').focus();
  }

  function close(){
    const lb = document.getElementById('hgmLightbox');
    if (!lb) return;
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');

    // 1) 解除 body 锁定
    //    解除 fixed 后浏览器会重计算 page layout，scrollY 暂时变 0。
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';

    // 2) 精确恢复滚动位置 — 必须按顺序处理 Lenis 状态：
    //    a. Lenis.reset() — 清零 lastVelocity / pending wheel（lightbox 期间累积的）
    //    b. 同步 animatedScroll/targetScroll = savedScrollY
    //    c. Lenis.start() — 重新启动
    //    d. window.scrollTo(0, savedScrollY) — 让浏览器视觉跳到目标位置
    //    反过来的顺序（先 scrollTo 再 start）会让 Lenis 把页面拉回 0。
    if (savedScrollY && window.LENIS_INSTANCE) {
      const l = window.LENIS_INSTANCE;
      try { if (typeof l.reset === 'function') l.reset(); } catch (e) {}
      if ('animatedScroll' in l) l.animatedScroll = savedScrollY;
      if ('targetScroll' in l) l.targetScroll = savedScrollY;
      if (typeof l.start === 'function') l.start();
      window.scrollTo(0, savedScrollY);
    } else if (savedScrollY) {
      window.scrollTo(0, savedScrollY);
    }

    // 3) 焦点回到原 tile（a11y：让用户能继续浏览）
    if (savedFocus && typeof savedFocus.focus === 'function') {
      try { savedFocus.focus({ preventScroll: true }); } catch (e) { savedFocus.focus(); }
    }

    // 4) 重置（让 savedScrollY 不影响下一次打开）
    savedScrollY = 0;
    savedFocus = null;

    // 5) 通知订阅者（如 marquee-row.js）lightbox 已关闭，可恢复 paused 状态
    try { window.dispatchEvent(new CustomEvent('hgm-lightbox-close')); } catch (e) {}
  }

  window.HGM_LIGHTBOX = { open, close };
})();