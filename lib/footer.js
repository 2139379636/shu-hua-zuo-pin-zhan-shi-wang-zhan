/* ==========================================================================
   公共页脚 — 注入 footer DOM + 统一品牌信息
   调用：window.FOOTER_BOOT()
   依赖：window.BRAND（来自 lib/artworks-data.js）
   ========================================================================== */
(function(){
  'use strict';

  window.FOOTER_BOOT = function(){
    const host = document.getElementById('footer');
    if (!host) return;

    const b = window.BRAND || {
      name: '黄桂明',
      tagline: '诗情画意 · 桂林山水',
      email: 'huang.guiming@art.com',
      phone: '+86 771 8000 0000',
      location: '桂林',
      navMark: '黄',
    };
    const year = new Date().getFullYear();

    host.className = 'footer';
    host.innerHTML = `
      <div class="container">
        <div class="footer__grid">
          <div class="footer__brand">
            <div class="footer__brand-name">
              <span style="display:inline-block;width:24px;height:24px;background:var(--color-seal);color:var(--color-paper);text-align:center;line-height:24px;font-size:0.875rem;margin-right:8px;transform:rotate(-3deg);">墨</span>
              ${b.name} · 个人作品集
            </div>
            <p class="footer__text">
              一位独立艺术家，与他的桂林山水。<br>
              所有作品均为原创，含亲笔题诗、签名与钤印。
            </p>
          </div>
          <div>
            <h4 class="footer__heading">作品</h4>
            <ul class="footer__list">
              <li><a href="gallery.html" class="footer__link">全部作品</a></li>
              <li><a href="artist.html#selected" class="footer__link">十年精选</a></li>
            </ul>
          </div>
          <div>
            <h4 class="footer__heading">关于</h4>
            <ul class="footer__list">
              <li><a href="artist.html" class="footer__link">艺术家</a></li>
              <li><a href="index.html#scroll-story" class="footer__link">绘画过程</a></li>
              <li><a href="artist.html#chronology" class="footer__link">创作年表</a></li>
            </ul>
          </div>
          <div class="footer__manage">
            <h4 class="footer__heading footer__heading--subtle">管理</h4>
            <ul class="footer__list">
              <li><a href="admin.html" class="footer__link footer__link--subtle" title="进入后台（需输入管理员口令）">管理入口 →</a></li>
            </ul>
            <p class="footer__note">点击进入后台，输入口令即可</p>
          </div>
        </div>
        <div class="footer__bottom">
          <span>© ${year} ${b.name} · 个人作品集</span>
          <span>画于${b.location}</span>
        </div>
      </div>
    `;
    if (/[?&]debug=1\b/.test(location.search)) console.log('[footer] booted');
  };
})();
