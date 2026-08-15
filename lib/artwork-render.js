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

          <!-- v5.48 — 联系方式区（替代购买渠道）
               作品集站不展示标价，所有作品默认为非卖品；如有意收藏，请致电联系。
               电话从 window.BRAND.phone 读取（lib/artworks-data.js 集中配置），
               tel: 链接在手机端可一键拨打。 -->
          ${(() => {
            const phone = (window.BRAND && window.BRAND.phone) ? window.BRAND.phone : '';
            if (!phone) return '';
            return `
              <aside class="artwork__contact" aria-label="联系方式">
                <span class="eyebrow eyebrow--seal">Contact · 联系方式</span>
                <h2 class="artwork__contact-title">如有意收藏或咨询</h2>
                <p class="artwork__contact-text">
                  每一幅皆为原创孤品，不设公开标价，不在线售卖。
                  欢迎致电垂询收藏事宜，亲自看画、品画，更合笔墨之缘。
                </p>
                <a href="tel:${escapeHtml(phone)}" class="artwork__contact-phone">
                  <svg viewBox="0 0 24 24" aria-hidden="true" class="artwork__contact-icon">
                    <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.27.36-.66.25-1.01C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" fill="currentColor"/>
                  </svg>
                  <span>${escapeHtml(phone)}</span>
                </a>

                <!-- v5.49 — 微信同号行：与手机号相同（客户要求），提供复制按钮
                     因为微信没有标准 URL 协议（不像 tel:），只能让用户手动添加好友，
                     所以提供一个"复制"按钮提升体验：navigator.clipboard 复制微信号。 -->
                <div class="artwork__contact-wechat">
                  <svg viewBox="0 0 24 24" aria-hidden="true" class="artwork__contact-icon artwork__contact-icon--wechat">
                    <path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.81 1 3.44 2.59 4.53L4 17l2.71-1.41c.59.18 1.22.31 1.88.38-.13-.46-.2-.94-.2-1.43 0-3.31 3.13-6 7-6 .18 0 .36.01.53.03C15.39 5.83 12.74 4 9.5 4zm-2.5 5a1 1 0 110-2 1 1 0 010 2zm5 0a1 1 0 110-2 1 1 0 010 2zM16.5 10c-3.59 0-6.5 2.46-6.5 5.5S12.91 21 16.5 21c.61 0 1.2-.08 1.76-.23L20 22l-.5-1.86C21.05 19.16 22 17.66 22 16c0-3.04-2.91-5.5-5.5-5.5zm-2 4a.75.75 0 110-1.5.75.75 0 010 1.5zm4 0a.75.75 0 110-1.5.75.75 0 010 1.5z" fill="currentColor"/>
                  </svg>
                  <span class="artwork__contact-wechat-label">微信同号</span>
                  <span class="artwork__contact-wechat-id">${escapeHtml(phone)}</span>
                  <button type="button" class="artwork__contact-copy" data-copy="${escapeHtml(phone)}" aria-label="复制微信号">
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="artwork__contact-icon">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/>
                    </svg>
                    <span class="artwork__contact-copy-text">复制</span>
                  </button>
                </div>

                <p class="artwork__contact-hint">点击拨打 · 工作日 9:00-18:00</p>
              </aside>
            `;
          })()}
        </div>
      </div>
    `;

    document.title = `${title} · 黄桂明作品集`;

    bindContactCopy();
    renderRelated(artwork);
  }

  /** v5.49 — 绑定微信同号复制按钮
   *  用事件委托挂在 #artworkRoot 上，每次 renderArtwork 后 innerHTML 被覆盖，
   *  但 #artworkRoot 元素本身不变，监听一次就够。 */
  function bindContactCopy(){
    const root = document.getElementById('artworkRoot');
    if (!root || root.__contactCopyBound) return;
    root.__contactCopyBound = true;
    root.addEventListener('click', async (e) => {
      const btn = e.target.closest('.artwork__contact-copy');
      if (!btn) return;
      e.preventDefault();
      const text = btn.getAttribute('data-copy') || '';
      const label = btn.querySelector('.artwork__contact-copy-text');
      if (!text) return;
      let ok = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          ok = true;
        } else {
          // 老浏览器/非安全上下文：临时 textarea + execCommand fallback
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          root.appendChild(ta);
          ta.select();
          ok = document.execCommand('copy');
          root.removeChild(ta);
        }
      } catch (err) {
        ok = false;
      }
      if (label) label.textContent = ok ? '已复制' : '复制失败';
      btn.classList.toggle('is-copied', ok);
      setTimeout(() => {
        if (label) label.textContent = '复制';
        btn.classList.remove('is-copied');
      }, 2000);
    });
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
