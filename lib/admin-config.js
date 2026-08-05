/* ==========================================================================
   管理员配置 — 全局常量
   - 当前仅暴露口令 hash（避免在 admin.js 与其他模块重复硬编码）
   - ⚠️ 部署前必须修改：把下面字符串替换为新口令的 sha256 hash
     工具（浏览器 console）：
       crypto.subtle.digest('SHA-256', new TextEncoder().encode('您的口令'))
         .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')))
     然后同步替换：
       · 本文件 ADMIN_KEY_HASH
       · lib/footer.js 中 data-manage-hint 注释
       · README.md "默认口令" 说明
   ========================================================================== */
(function(){
  'use strict';

  // 当前管理员口令: "<您的管理员口令>"（口令不入仓，请在部署文档中查阅本地副本）
  // hash 计算（浏览器 console）：crypto.subtle.digest('SHA-256', new TextEncoder().encode('您的口令'))
  //   .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')))
  window.HGM_ADMIN_KEY_HASH = '1216dafe4869f6c77b720ffaae0a91582d50c67b9978d3f2b6d0e21c049cf6a2';
})();