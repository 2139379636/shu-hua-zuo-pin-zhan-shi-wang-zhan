/* ==========================================================================
   艺术家页脚本 — nav/footer 引导 + 代表作 3 张渲染
   v2026-10-09 v2.4：代表作从 HGM_REP_SLOTS() + resolveArtworks 拿，支持 id 或路径
   ========================================================================== */
(function(){
  'use strict';

  const escapeHtml = window.HGM_ESCAPE_HTML;
  if (typeof escapeHtml !== 'function') {
    throw new Error('[artist-page.js] 缺少 lib/escape-html.js');
  }

  function formatPrice(price){
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) return '咨询';
    return n.toLocaleString();
  }

  function renderRepresentative(){
    const grid = document.getElementById('artistRepresentativeGrid');
    if (!grid) return;

    // 优先用 admin 后台 components.artistRepresentatives.slots
    let featured = [];
    if (typeof window.HGM_REP_SLOTS === 'function'){
      const slots = window.HGM_REP_SLOTS();
      if (slots && slots.length){
        // 用 components-loader 暴露的解析器（支持 id 或路径）
        if (typeof window.HGM_COMPONENTS_RESOLVE_ARTWORKS === 'function'){
          featured = window.HGM_COMPONENTS_RESOLVE_ARTWORKS(slots);
        }
      }
    }
    // 回退
    if (!featured.length){
      if (typeof window.getFeaturedArtworks === 'function'){
        featured = window.getFeaturedArtworks().slice(0, 3);
      }
    }
    if (!featured.length) return;

    grid.innerHTML = featured.map(a => {
      const hasDetail = a.id != null;
      const href = hasDetail ? `artwork.html?id=${encodeURIComponent(a.id)}` : '#';
      return `
      <a href="${href}" class="art-card"${hasDetail ? '' : ' onclick="return false;"'}>
        <div class="art-card__media" data-fit="true">
          <img src="${escapeHtml(a.thumb || a.image)}" alt="${escapeHtml(a.title)}"
               class="art-card__img" loading="lazy"
               onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'art-card__placeholder',textContent:'图未备',style:'width:100%;height:100%;background:var(--color-paper-warm);display:flex;align-items:center;justify-content:center;color:var(--color-ink-mute)'}))">
          <span class="art-card__seal">${escapeHtml(a.seal || '')}</span>
        </div>
        <h3 class="art-card__title">${escapeHtml(a.title)}</h3>
        <div class="art-card__meta">
          ${hasDetail
            ? `<span>${escapeHtml(a.size || '—')}</span><span class="art-card__price">¥ ${formatPrice(a.price)}</span>`
            : '<span>·</span>'}
        </div>
      </a>
    `}).join('');
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

  // 监听 data/components.json 异步加载完成 → 重新渲染
  window.addEventListener('hgm-components-loaded', renderRepresentative);
})();
