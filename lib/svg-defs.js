/* ==========================================================================
   共享 SVG 滤镜定义 — 5 页共用，避免在每个 HTML 里重复同一段 <defs>
   提供：#ink-edge（水墨晕染边缘，被 styles.css 的 .art-card:hover 引用）
   ========================================================================== */
(function(){
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function injectDefs(){
    // 已存在则跳过（避免重复注入导致 id 冲突）
    if (document.getElementById('ink-edge')) return;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'svg-defs');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = `
      <defs>
        <filter id="ink-edge" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022"
                        numOctaves="3" seed="7" result="inkNoise"/>
          <feDisplacementMap in="SourceGraphic" in2="inkNoise" scale="5"
                             xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>`;
    document.body.insertBefore(svg, document.body.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectDefs);
  } else {
    injectDefs();
  }
})();
