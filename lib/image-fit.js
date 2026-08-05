/* ==========================================================================
   图片原比例自适应 — 让组件以图片原始宽高比呈现，完整显示不裁切

   使用方式：图片容器添加 data-fit="true"
     <div class="xxx-media" data-fit="true">
       <img src="..." alt="..." />
     </div>

   工作流程：
     1. 启动时扫描所有 data-fit 容器
     2. 监听容器内 img 的 load 事件
     3. 读 naturalWidth / naturalHeight → 设置容器 aspect-ratio
     4. MutationObserver 兜底：处理动态注入的卡片（如 admin 列表）

   必须配套的 CSS：
     .xxx-media 移除 aspect-ratio
     .xxx-media img 设置 object-fit: contain / width:100% / height:100%

   设计动机（来自用户的明确要求）：
     "现在的图片素材都是非卖品的展示画，所以一定要显示完整"
     "组件不能统一大小，要以画的大小而定，整个项目都是"
   ========================================================================== */
(function(){
  'use strict';

  function updateAspect(container, img){
    if (!container || !img) return;
    if (!img.naturalWidth || !img.naturalHeight) return;
    container.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight;
  }

  function bind(container){
    if (container._fitBound) return;
    container._fitBound = true;
    const img = container.querySelector('img');
    if (!img) return;
    if (img.complete && img.naturalWidth) {
      updateAspect(container, img);
    } else {
      img.addEventListener('load', function(){
        updateAspect(container, img);
      }, { once: true });
      img.addEventListener('error', function(){
        // 失败兜底：保持 1:1，避免布局塌陷
        container.style.aspectRatio = '1 / 1';
      }, { once: true });
    }
  }

  function scan(root){
    root = root || document;
    const nodes = root.querySelectorAll('[data-fit]');
    for (let i = 0; i < nodes.length; i++) bind(nodes[i]);
  }

  // 暴露 API
  window.HGM_FIT_IMAGE = {
    bind,
    scan,
    update: updateAspect,
  };

  function boot(){
    scan();
    // 兜底：监听 DOM 变化，处理动态渲染的卡片
    if ('MutationObserver' in window) {
      const obs = new MutationObserver(function(mutations){
        for (let i = 0; i < mutations.length; i++) {
          const added = mutations[i].addedNodes;
          for (let j = 0; j < added.length; j++) {
            const n = added[j];
            if (n.nodeType !== 1) continue;
            if (n.matches && n.matches('[data-fit]')) bind(n);
            if (n.querySelectorAll) {
              const inner = n.querySelectorAll('[data-fit]');
              for (let k = 0; k < inner.length; k++) bind(inner[k]);
            }
          }
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();