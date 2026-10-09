/* ==========================================================================
   Admin v2 — 极简真后端（无草稿、无 localStorage、无状态栏）
   - 每个槽位操作：[📤 上传新图] [✕ 移除]
   - 上传图片：选文件 → base64 → 直接 PUT 到 GitHub `素材/{slotKey}.webp`
   - 移除图片：清空槽位（components.json 中 slotKey 设为 ''）
   - 顶部一个 [💾 保存 components.json] 按钮：当前 draft 整体 PUT 到 data/components.json
   - 依赖：window.HGM_GITHUB（lib/github-api.js）+ window.HGM_GITHUB_CONFIG（localStorage）
   ========================================================================== */
(function(){
  'use strict';

  const escapeHtml = window.HGM_ESCAPE_HTML;
  if (typeof escapeHtml !== 'function') {
    throw new Error('[admin-v2.js] 缺少 lib/escape-html.js');
  }

  const TABS = [
    { id: 'marqueeLandscape',     label: '横幅',                section: 'components.marqueeLandscape' },
    { id: 'marqueeRow1',          label: '自动滚动 · 上排（竖）', section: 'components.marqueeRow1' },
    { id: 'marqueeRow2',          label: '自动滚动 · 下排（横）', section: 'components.marqueeRow2' },
    { id: 'gallery',              label: '全部作品',            section: 'components.gallery' },
    { id: 'artistRepresentatives',label: '十年精选',            section: 'components.artistRepresentatives' },
  ];

  let loadedComponents = null; // 远程初始值（data/components.json）
  let draft = null;             // 用户当前修改
  let currentTabId = 'marqueeLandscape';

  // ---------- Tabs 渲染 ----------
  function renderTabs(){
    const root = document.getElementById('adminTabs');
    if (!root) return;
    root.innerHTML = TABS.map(t => `
      <button type="button" class="admin-v2__tab ${t.id === currentTabId ? 'is-active' : ''}"
              data-tab="${t.id}">${t.label}</button>
    `).join('');
    root.querySelectorAll('button[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTabId = btn.dataset.tab;
        renderTabs();
        renderTabBody();
      });
    });
  }

  // ---------- 每个槽位的渲染 ----------
  function thumbnailCell(artOrUrl){
    if (!artOrUrl) return '<div class="admin-v2__slot__thumb admin-v2__slot__thumb--empty">（空槽）</div>';
    if (typeof artOrUrl === 'string') {
      return `<div class="admin-v2__slot__thumb"><img src="${escapeHtml(artOrUrl)}" alt=""></div>`;
    }
    const src = artOrUrl.thumb || artOrUrl.image || '';
    if (!src) return '<div class="admin-v2__slot__thumb admin-v2__slot__thumb--empty">（空槽）</div>';
    return `<div class="admin-v2__slot__thumb"><img src="${escapeHtml(src)}" alt="${escapeHtml(artOrUrl.title || '')}"></div>`;
  }

  // 多槽位 Tab（marqueeRow1/2/landscape/gallery/artist）
  function slotGridTab(tabId, slotKey){
    // 通用槽位 Tab：slots 是数组（作品 id 或者图片路径）
    // 槽位数 = slots.length（动态）；可点 [+ 添加一个槽位] 扩展
    const sec = draft && draft.components && draft.components[tabId];
    if (!sec) return '<div class="admin-v2__error">配置缺失</div>';
    const slots = sec[slotKey] || [];
    const cells = [];
    for (let i = 0; i < slots.length; i++){
      const value = slots[i];
      const isEmpty = (value === undefined || value === null || value === '');
      // 解析预览图：可能是 id（从 artworkLibrary 取）或 路径字符串
      let preview = null;
      if (typeof value === 'string' && /^\d+$/.test(value) && loadedComponents && loadedComponents.artworkLibrary){
        preview = loadedComponents.artworkLibrary[value];
      } else if (typeof value === 'string'){
        preview = value; // 路径字符串
      }
      cells.push(`
        <div class="admin-v2__slot" data-tab="${tabId}" data-key="${slotKey}" data-idx="${i}">
          <div class="admin-v2__slot__label">槽位 ${i + 1} / ${slots.length}</div>
          ${thumbnailCell(preview)}
          <div class="admin-v2__slot__title">${preview ? (preview.title || escapeHtml(value || '')) : '（空槽）'}</div>
          <div class="admin-v2__slot__value">${escapeHtml(String(value || '（空）'))}</div>
          <div class="admin-v2__slot__actions">
            <button type="button" class="btn btn--ghost-dark btn--small" data-act="upload-new">📤 上传新图</button>
            <button type="button" class="btn btn--ghost-dark btn--small" data-act="remove-image" ${isEmpty ? 'disabled' : ''}>✕ 移除</button>
          </div>
          <input type="file" accept="image/*" class="admin-v2__file-input" style="display:none;">
        </div>
      `);
    }
    cells.push(`
      <div class="admin-v2__slot admin-v2__slot--add">
        <button type="button" class="admin-v2__add-slot" data-act="add-slot">＋ 添加一个槽位<br><small>(当前 ${slots.length})</small></button>
      </div>
    `);
    return `<div class="admin-v2__slot-grid admin-v2__slot-grid--3">${cells.join('')}</div>`;
  }

  function renderTabBody(){
    const root = document.getElementById('adminTabBody');
    if (!root || !draft) return;
    let html = '';
    switch (currentTabId){
      case 'marqueeLandscape':   html = slotGridTab('marqueeLandscape', 'slots'); break;
      case 'marqueeRow1':        html = slotGridTab('marqueeRow1', 'slots'); break;
      case 'marqueeRow2':        html = slotGridTab('marqueeRow2', 'slots'); break;
      case 'gallery':           html = slotGridTab('gallery', 'featured'); break;
      case 'artistRepresentatives': html = slotGridTab('artistRepresentatives', 'slots'); break;
    }
    root.innerHTML = html;
  }

  // ---------- 操作 ----------
  // 检查 GitHub 配置
  function ensureGithubConfig(){
    const cfg = (window.HGM_GITHUB && window.HGM_GITHUB.getConfig && window.HGM_GITHUB.getConfig()) || {};
    if (!cfg.repo || !cfg.token){
      alert('尚未配置 GitHub 仓库与 Token。\n请先访问 admin.html 配置，或在 admin-v2 顶部输入仓库 + Token。');
      return null;
    }
    return cfg;
  }

  // 文件 → base64
  function fileToBase64(file){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result || '');
        // 去掉 data:image/...;base64, 前缀
        const idx = s.indexOf(',');
        resolve(idx >= 0 ? s.slice(idx + 1) : s);
      };
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  // 文件 → webp（client-side）—— 用 canvas 简单转换
  async function fileToWebpBase64(file, maxKb){
    const img = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => { resolve(im); URL.revokeObjectURL(url); };
      im.onerror = reject;
      im.src = url;
    });
    // 按 maxKb 自动选 quality
    let quality = 0.85;
    let blob;
    for (let attempt = 0; attempt < 4; attempt++){
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      blob = await new Promise(res => canvas.toBlob(res, 'image/webp', quality));
      if (!blob) break;
      const kb = blob.size / 1024;
      if (kb <= maxKb || quality <= 0.4) break;
      quality -= 0.15;
    }
    if (!blob) throw new Error('WebP 转换失败');
    return blobToBase64(blob);
  }
  function blobToBase64(blob){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result || '');
        const idx = s.indexOf(',');
        resolve(idx >= 0 ? s.slice(idx + 1) : s);
      };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  // Get existing file's SHA（更新前先 GET）
  async function getFileSha(path, cfg){
    if (!window.HGM_GITHUB || !window.HGM_GITHUB.getContents) return undefined;
    try {
      const res = await window.HGM_GITHUB.getContents(path);
      return res && res.sha;
    } catch (e) { return undefined; }
  }

  // 推送单个图片文件到 GitHub
  async function pushImageToGithub(slotIdx, tabId, slotKey, file){
    const cfg = ensureGithubConfig();
    if (!cfg) return null;
    const isHeroSize = false; // 暂定 800px 长边，200KB 上限
    const base64 = await fileToWebpBase64(file, 250);
    // 命名：素材/{tabId}-{slotKey}-{idx}.webp（避免重名）
    const path = `素材/${tabId}-${slotKey}-${slotIdx}.webp`;
    const sha = await getFileSha(path, cfg);
    const message = `admin: upload ${path} via admin-v2`;
    const result = await window.HGM_GITHUB.putContents(path, base64, message, sha);
    return path; // 返回新路径，前端更新槽位
  }

  async function pushComponentsToGithub(){
    const cfg = ensureGithubConfig();
    if (!cfg) return false;
    // 步骤 1: GET data/components.json 拿 SHA
    let sha;
    try {
      const cur = await window.HGM_GITHUB.getContents('data/components.json');
      sha = cur && cur.sha;
    } catch (e) { sha = undefined; }
    const content = JSON.stringify(draft, null, 2);
    const b64 = (function(){
      return btoa(unescape(encodeURIComponent(content)));
    })();
    const result = await window.HGM_GITHUB.putContents('data/components.json', b64, 'admin: 更新 components.json via admin-v2', sha);
    return result;
  }

  function setInDraftArray(tabId, slotKey, idx, newValue){
    const arr = (draft.components[tabId][slotKey] || []).slice();
    while (arr.length < idx + 1) arr.push('');
    arr[idx] = newValue;
    draft.components[tabId][slotKey] = arr;
    renderTabBody();
  }

  // ---------- 操作绑定（每个槽位）----------
  function bindActions(){
    const body = document.getElementById('adminTabBody');
    if (!body) return;
    body.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const slotEl = btn.closest('.admin-v2__slot');
      if (!slotEl) return;
      const tabId = slotEl.dataset.tab;
      const slotKey = slotEl.dataset.key;
      const idx = parseInt(slotEl.dataset.idx, 10);

      if (btn.dataset.act === 'upload-new'){
        const fileInput = slotEl.querySelector('.admin-v2__file-input');
        fileInput.click();
        fileInput.onchange = async (ev) => {
          const file = ev.target.files && ev.target.files[0];
          if (!file) return;
          if (file.size > 10 * 1024 * 1024){ alert('图片超过 10MB，请压缩'); return; }
          // 检查 GitHub 配置
          const cfg = ensureGithubConfig();
          if (!cfg) return;
          const oldLabel = btn.textContent;
          btn.disabled = true;
          btn.textContent = '上传中…';
          try {
            const path = await pushImageToGithub(idx, tabId, slotKey, file);
            setInDraftArray(tabId, slotKey, idx, path);
            btn.textContent = '✓ 已上传';
            setTimeout(() => { btn.textContent = oldLabel; btn.disabled = false; renderTabBody(); }, 1500);
          } catch (err) {
            btn.textContent = '✕ 失败';
            setTimeout(() => { btn.textContent = oldLabel; btn.disabled = false; }, 2000);
            alert('上传失败：' + (err.message || err));
          }
        };
        return;
      }
      if (btn.dataset.act === 'remove-image'){
        if (!confirm('确认清除这个槽位的图片？')) return;
        setInDraftArray(tabId, slotKey, idx, '');
        return;
      }
      if (btn.dataset.act === 'add-slot'){
        // 追加一个空槽位
        const arr = (draft.components[tabId][slotKey] || []).slice();
        arr.push('');
        draft.components[tabId][slotKey] = arr;
        renderTabBody();
        return;
      }
    });
  }

  // ---------- 顶部按钮：保存 components.json ----------
  function bindSaveComponents(){
    const btn = document.getElementById('adminSaveBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const cfg = ensureGithubConfig();
      if (!cfg) return;
      if (!confirm('确认保存？会把 components.json 推送到 GitHub。\n（CF Pages 会自动 rebuild，访客 30-60s 后看到新内容）')) return;
      const oldLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = '推送中…';
      try {
        const result = await pushComponentsToGithub();
        const sha = result && result.commit && result.commit.sha;
        btn.textContent = '✓ 已保存 ' + (sha ? sha.slice(0, 7) : 'OK');
        setTimeout(() => { btn.textContent = oldLabel; btn.disabled = false; }, 2500);
      } catch (err) {
        btn.textContent = '✕ 失败';
        setTimeout(() => { btn.textContent = oldLabel; btn.disabled = false; }, 2500);
        alert('保存失败：' + (err.message || err));
      }
    });
  }

  // ---------- 顶部提示 ----------
  function renderHeader(){
    const el = document.getElementById('adminHeaderHint');
    const cfg = (window.HGM_GITHUB && window.HGM_GITHUB.getConfig && window.HGM_GITHUB.getConfig()) || {};
    if (el) el.textContent = cfg.repo
      ? `已连接仓库：${cfg.repo} · 上传图片 = 直接推到 素材/· 顶部"保存"推到 data/components.json · CF Pages 30-60s 后自动部署`
      : '⚠️ 尚未配置 GitHub 仓库与 Token（先访问 admin.html 配置，或在下方输入）';
  }

  function bindGitHubQuickConfig(){
    const btn = document.getElementById('adminSetGithub');
    const dlg = document.getElementById('githubQuickConfig');
    if (!btn || !dlg) return;
    btn.addEventListener('click', () => {
      const cfg = (window.HGM_GITHUB && window.HGM_GITHUB.getConfig && window.HGM_GITHUB.getConfig()) || {};
      dlg.elements.repo.value = cfg.repo || '';
      dlg.elements.branch.value = cfg.branch || 'main';
      dlg.elements.token.value = '';
      dlg.elements.proxy.value = cfg.proxy || '';
      dlg.style.display = 'block';
    });
    dlg.addEventListener('submit', (e) => {
      e.preventDefault();
      const cur = (window.HGM_GITHUB && window.HGM_GITHUB.getConfig && window.HGM_GITHUB.getConfig()) || {};
      window.HGM_GITHUB.setConfig({
        repo: dlg.elements.repo.value.trim(),
        branch: (dlg.elements.branch.value.trim() || 'main'),
        token: (dlg.elements.token.value.trim() || cur.token || ''),
        proxy: (dlg.elements.proxy.value.trim() || ''),
      });
      dlg.style.display = 'none';
      renderHeader();
      renderTabBody();
    });
    const cancelBtn = document.getElementById('githubQuickCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { dlg.style.display = 'none'; });
  }

  // ---------- 启动 ----------
  async function init(){
    renderTabs();
    renderHeader();
    try {
      const data = await window.HGM_LOAD_COMPONENTS();
      loadedComponents = JSON.parse(JSON.stringify(data));
      draft = JSON.parse(JSON.stringify(loadedComponents));
    } catch (e) {
      document.getElementById('adminTabBody').innerHTML =
        '<div class="admin-v2__error">加载 data/components.json 失败：' +
        escapeHtml(String(e.message || e)) + '</div>';
      return;
    }
    renderTabBody();
    bindActions();
    bindSaveComponents();
    bindGitHubQuickConfig();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
