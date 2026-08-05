/* ==========================================================================
   ScrollStory 3 组横向卡片 — 渲染 + 进度驱动
   依赖：
     window.SCROLL_STORY_CARDS_DATA   (lib/scroll-story-cards-data.js)
     window.SCROLL_STORY_PROGRESS     (lib/scroll-story-progress.js)
   调用：DOMContentLoaded 时自动 boot；订阅 SCROLL_STORY_PROGRESS
   无障碍：
     reduce-motion：去掉 translateX 位移，保留 opacity 渐变
     aria-hidden 根据卡片是否处于可见期切换
   ========================================================================== */
(function(){
  'use strict';

  if (!window.SCROLL_STORY_CARDS_DATA) {
    throw new Error('[scroll-story-cards.js] window.SCROLL_STORY_CARDS_DATA 缺失');
  }
  if (!window.SCROLL_STORY_PROGRESS) {
    throw new Error('[scroll-story-cards.js] window.SCROLL_STORY_PROGRESS 缺失');
  }

  function fit(x, a, b, c, d){
    if (a === b) return c;
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return c + (d - c) * t;
  }

  function boot(){
    const root = document.getElementById('scrollStoryCards');
    if (!root) return;

    const { GROUPS, cardWindow } = window.SCROLL_STORY_CARDS_DATA;
    root.innerHTML = GROUPS.map(g => {
      const isSingle = g.cards.length === 1;
      return `
        <div class="ssc__group${isSingle ? ' ssc__group--single' : ''}" data-ssc-group="${g.id}" role="list">
          ${g.cards.map((c, i) => `
            <article class="ssc__card" role="listitem" data-ssc-card="${i}" aria-hidden="true">
              <span class="ssc__rule" aria-hidden="true"></span>
              <div class="ssc__line">
                <span class="ssc__num">${c.num}</span>
                <span class="ssc__unit">${c.unit}</span>
              </div>
              <p class="ssc__desc">${c.desc}</p>
            </article>
          `).join('')}
        </div>
      `;
    }).join('');

    const motionQuery = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    // 收集每张卡片的 ref + 自身窗口
    const cards = [];
    for (const g of GROUPS) {
      const groupEl = root.querySelector(`[data-ssc-group="${g.id}"]`);
      const cardEls = groupEl.querySelectorAll('.ssc__card');
      for (let i = 0; i < cardEls.length; i++) {
        cards.push({
          el: cardEls[i],
          w: cardWindow(g, i),
        });
      }
    }

    function update(progress){
      const p = Math.max(0, Math.min(1, progress));
      const reduced = motionQuery ? motionQuery.matches : false;

      // 整组 root：所有卡片全不可见时 root 自身也可隐藏
      let anyVisible = false;

      for (const c of cards) {
        const inOp   = fit(p, c.w.in,     c.w.hold, 0, 1);
        const outOp  = fit(p, c.w.out,    c.w.outEnd, 1, 0);
        const op = inOp * outOp;

        // 位移 + scale：进从右滑入（8px）+ 从 0.96 缩放到 1.0；出反向
        // L 契约：transform 必须含 scale
        const inTx   = fit(p, c.w.in,  c.w.hold, 8, 0);
        const outTx  = fit(p, c.w.out, c.w.outEnd, 0, -8);
        const inSc   = fit(p, c.w.in,  c.w.hold, 0.96, 1.0);
        const outSc  = fit(p, c.w.out, c.w.outEnd, 1.0, 0.96);
        const tx = reduced ? 0 : (inTx + outTx);
        const sc = reduced ? 1.0 : (inSc * outSc);

        c.el.style.opacity = op.toFixed(3);
        if (reduced) {
          c.el.style.transform = 'none';
        } else {
          c.el.style.transform = `translateX(${tx.toFixed(2)}px) scale(${sc.toFixed(3)})`;
        }
        c.el.setAttribute('aria-hidden', op < 0.01 ? 'true' : 'false');

        if (op > 0.01) anyVisible = true;
      }

      // 整组容器：避免屏幕阅读器朗读隐藏组
      root.setAttribute('aria-hidden', anyVisible ? 'false' : 'true');
    }

    window.SCROLL_STORY_PROGRESS.subscribe(update);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
