/* ==========================================================================
   共享 HTML 转义工具 — 防止 XSS，统一全站转义行为
   暴露：window.HGM_ESCAPE_HTML = function(str) -> string
   设计原则：
     - 单文件最小依赖
     - 与原四份副本行为等价（无差异），可安全替换
     - null / undefined → ''（保留原行为）
   ========================================================================== */
(function(){
  'use strict';

  const REPLACEMENTS = {
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  };

  function escapeHtml(str){
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => REPLACEMENTS[c]);
  }

  window.HGM_ESCAPE_HTML = escapeHtml;
})();
