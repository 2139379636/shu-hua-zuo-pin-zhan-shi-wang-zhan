/* ==========================================================================
   Gallery 渲染 — 从 ARTWORKS_DATA 动态填充 9 张精选 + 4 分类筛选
   ========================================================================== */
(function(){
  'use strict';

  // 共享工具：HGM_ESCAPE_HTML 由 lib/escape-html.js 在脚本加载顺序中前置注入
  const escapeHtml = window.HGM_ESCAPE_HTML;
  if (typeof escapeHtml !== 'function') {
    throw new Error('[gallery-render.js] 缺少 lib/escape-html.js，请检查 HTML 脚本加载顺序');
  }

  /** 价格格式化：与 lib/cart.js 一致 */
  function formatPrice(price){
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) return '咨询';
    return n.toLocaleString();
  }

  function renderGallery(){
    const grid = document.getElementById('galleryGrid');
    if (!grid || !window.ARTWORKS_DATA) return;

    const featured = window.getFeaturedArtworks();

    grid.innerHTML = featured.map(a => `
      <a href="artwork.html?id=${encodeURIComponent(a.id)}" class="art-card" data-id="${escapeHtml(a.id)}" data-category="${escapeHtml((a.category || []).join(' '))}">
        <div class="art-card__media" data-fit="true">
          <img src="${escapeHtml(a.thumb || a.image)}" alt="${escapeHtml(a.title)}" class="art-card__img" loading="lazy"
               onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'art-card__placeholder',textContent:'图未备',style:'width:100%;height:100%;background:var(--color-paper-warm);display:flex;align-items:center;justify-content:center;color:var(--color-ink-mute)'}))">
          <span class="art-card__seal">${escapeHtml(a.seal)}</span>
        </div>
        <h3 class="art-card__title">${escapeHtml(a.title)}</h3>
        <div class="art-card__meta">
          <span>${escapeHtml(a.material || '水墨')} · ${escapeHtml(a.size || '—')}</span>
          <span class="art-card__price">¥ ${formatPrice(a.price)}</span>
        </div>
      </a>
    `).join('');
  }

  // 入场动画（IntersectionObserver）
  function animateCardsIn(){
    if (!('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.art-card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(24px)';
      card.style.transition = `opacity 600ms var(--ease-out-expo, ease) ${i * 60}ms, transform 600ms var(--ease-out-expo, ease) ${i * 60}ms`;
      obs.observe(card);
    });
  }

  function init(){
    renderGallery();
    animateCardsIn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 监听 data/artworks.json 异步加载完成 → 重新渲染（fetch 兜底场景）
  window.addEventListener('hgm-artworks-loaded', () => {
    init();
  });
  // v5.20 — GitHub 同步后 30s 轮询派发的事件，作品有更新就重新渲染
  window.addEventListener('hgm-artworks-updated', () => {
    init();
  });
})();
