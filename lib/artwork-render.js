/* ==========================================================================
   Artwork 详情渲染 — 从 URL ?id=N 读取作品，字段缺失自动隐藏
   ========================================================================== */
(function(){
  'use strict';

  // 共享工具：HGM_ESCAPE_HTML 由 lib/escape-html.js 在脚本加载顺序中前置注入
  const escapeHtml = window.HGM_ESCAPE_HTML;
  if (typeof escapeHtml !== 'function') {
    throw new Error('[artwork-render.js] 缺少 lib/escape-html.js，请检查 HTML 脚本加载顺序');
  }

  function renderArtwork(){
    const params = new URLSearchParams(location.search);
    const id = params.get('id') || '1';
    const artwork = window.getArtworkById(id);
    const poem = artwork && artwork.poemId ? window.getPoemById(artwork.poemId) : null;
    const root = document.getElementById('artworkRoot');
    if (!root) return;

    if (!artwork) {
      root.innerHTML = `
        <div style="text-align:center;padding:128px 0;">
          <h1 style="font-family:var(--font-serif);margin-bottom:16px;">此作品尚未备档</h1>
          <p style="color:var(--color-ink-soft);margin-bottom:32px;">可能的原因：编号不存在或作品尚未收录。</p>
          <a href="gallery.html" class="btn btn--ghost-dark">← 返回作品集</a>
        </div>
      `;
      document.title = '作品未找到 · 黄桂明作品集';
      return;
    }

    const title = escapeHtml(artwork.title);
    const year = escapeHtml(artwork.year);
    // 注意：不能命名为 location —— 会在整个函数作用域遮蔽全局 location，
    // 导致第 14 行的 location.search 触发 TDZ ReferenceError
    const placeName = escapeHtml(artwork.location);
    const size = escapeHtml(artwork.size);
    const format = escapeHtml(artwork.format);
    const material = escapeHtml(artwork.material);
    const styleTxt = (artwork.style || []).join(' · ');

    // 字段显示规则：有数据才显示行
    const specs = [];
    if (size)     specs.push({ label: '尺寸', value: size });
    if (format)   specs.push({ label: '形制', value: format });
    if (material) specs.push({ label: '材质', value: material });
    if (styleTxt) specs.push({ label: '风格', value: styleTxt });
    if (year || placeName) {
      specs.push({ label: '创作', value: [year, placeName].filter(Boolean).join(' · ') });
    }

    root.innerHTML = `
      <div style="margin-bottom:32px;">
        <a href="gallery.html" class="featured__more" style="font-size:0.875rem;">← 返回作品集</a>
      </div>

      <div class="artwork__grid">
        <div class="artwork__media" data-fit="true">
          <img src="${escapeHtml(artwork.image)}" alt="${title}" class="artwork__img" loading="eager"
               onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'artwork__img-placeholder',textContent:'图未备',style:'width:100%;height:100%;background:var(--color-paper-warm);display:flex;align-items:center;justify-content:center;color:var(--color-ink-mute);font-family:var(--font-serif);font-size:1.5rem'}))">
          <div class="artwork__seal-badge">${escapeHtml(artwork.seal)}</div>
        </div>

        <div class="artwork__info">
          <div class="artwork__eyebrow">No. ${escapeHtml(artwork.seal)} · ${(artwork.category || []).join(' · ')}</div>
          <h1 class="artwork__title">${title}</h1>
          <p class="artwork__artist">—— 黄桂明 · 桂林山水</p>

          ${poem ? `
            <blockquote style="margin:32px 0;padding:24px;border-left:2px solid var(--color-seal);background:var(--color-paper-warm);">
              <p style="font-family:var(--font-serif);font-size:1.125rem;line-height:2;letter-spacing:0.1em;color:var(--color-ink);">${escapeHtml(poem.text)}</p>
            </blockquote>
          ` : ''}

          ${artwork.description ? `<p class="artwork__desc">${escapeHtml(artwork.description)}</p>` : ''}

          ${specs.length ? `
            <ul class="artwork__specs">
              ${specs.map(s => `
                <li class="artwork__spec">
                  <span class="artwork__spec-label">${escapeHtml(s.label)}</span>
                  <span class="artwork__spec-value">${escapeHtml(s.value)}</span>
                </li>
              `).join('')}
            </ul>
          ` : ''}

          <!-- 价格区已永久移除：作品集站不展示标价，所有作品默认为非卖品 -->
        </div>
      </div>
    `;

    document.title = `${title} · 黄桂明作品集`;

    renderRelated(artwork);
  }

  /** 相似作品：同类目优先，排除自身与占位数据 */
  function renderRelated(current){
    const wrap = document.getElementById('relatedGrid');
    if (!wrap) return;

    const all = (window.ARTWORKS_DATA || []).filter(a => a.featured && a.id !== current.id);
    const cats = current.category || [];
    const sameCat = all.filter(a => (a.category || []).some(c => cats.includes(c)));
    const picks = sameCat.concat(all.filter(a => !sameCat.includes(a))).slice(0, 3);

    if (!picks.length) {
      wrap.closest('section')?.remove();
      return;
    }

    wrap.innerHTML = picks.map(a => `
      <a href="artwork.html?id=${a.id}" class="art-card" data-id="${a.id}">
        <div class="art-card__media">
          <img src="${escapeHtml(a.thumb || a.image)}" alt="${escapeHtml(a.title)}"
               class="art-card__img" loading="lazy">
        </div>
        <div class="art-card__body">
          <h3 class="art-card__title">${escapeHtml(a.title)}</h3>
          <p class="art-card__meta">${escapeHtml((a.category || []).join(' · '))}</p>
        </div>
      </a>
    `).join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderArtwork);
  } else {
    renderArtwork();
  }

  // 监听 data/artworks.json 异步加载完成 → 重新渲染（fetch 兜底场景）
  window.addEventListener('hgm-artworks-loaded', renderArtwork);
  // v5.20 — GitHub 同步后 30s 轮询派发的事件，作品有更新就重新渲染
  window.addEventListener('hgm-artworks-updated', renderArtwork);
})();
