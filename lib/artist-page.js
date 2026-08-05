/* ==========================================================================
   艺术家页脚本 — 从 artist.html 内联脚本抽出
   职责：nav/footer 引导 + 代表作 3 张渲染
   ========================================================================== */
(function(){
  'use strict';

  // 共享工具：HGM_ESCAPE_HTML 由 lib/escape-html.js 在脚本加载顺序中前置注入
  const escapeHtml = window.HGM_ESCAPE_HTML;
  if (typeof escapeHtml !== 'function') {
    throw new Error('[artist-page.js] 缺少 lib/escape-html.js，请检查 HTML 脚本加载顺序');
  }

  /** 价格格式化：与 lib/cart.js 一致 */
  function formatPrice(price){
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) return '咨询';
    return n.toLocaleString();
  }

  function renderRepresentative(){
    const grid = document.getElementById('artistRepresentativeGrid');
    if (!grid || typeof window.getFeaturedArtworks !== 'function') return;

    const featured = window.getFeaturedArtworks().slice(0, 3);
    if (!featured.length) return;

    grid.innerHTML = featured.map(a => `
      <a href="artwork.html?id=${encodeURIComponent(a.id)}" class="art-card">
        <div class="art-card__media" data-fit="true">
          <img src="${escapeHtml(a.thumb || a.image)}" alt="${escapeHtml(a.title)}"
               class="art-card__img" loading="lazy"
               onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'art-card__placeholder',textContent:'图未备',style:'width:100%;height:100%;background:var(--color-paper-warm);display:flex;align-items:center;justify-content:center;color:var(--color-ink-mute)'}))">
          <span class="art-card__seal">${escapeHtml(a.seal)}</span>
        </div>
        <h3 class="art-card__title">${escapeHtml(a.title)}</h3>
        <div class="art-card__meta">
          <span>${escapeHtml(a.size || '—')}</span>
          <span class="art-card__price">¥ ${formatPrice(a.price)}</span>
        </div>
      </a>
    `).join('');
  }

  function boot(){
    if (typeof window.NAV_BOOT === 'function') window.NAV_BOOT({ homepage: false });
    if (typeof window.FOOTER_BOOT === 'function') window.FOOTER_BOOT();
    renderRepresentative();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // 监听 data/artworks.json 异步加载完成 → 重新渲染（fetch 兜底场景）
  window.addEventListener('hgm-artworks-loaded', renderRepresentative);
})();
