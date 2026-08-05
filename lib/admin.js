/* ==========================================================================
   admin.html 隐藏管理入口
   - 口令校验：URL ?key=xxx → sha256 比对内置 hash
   - 数据存储：localStorage（仅当前浏览器）
   - 操作：列表 / 编辑 / 添加 / 真删除 / 导出 JSON / 导入 JSON / 恢复默认

   安全边界：客户端纯静态方案，无法保证防篡改。安全底线由"客户只看不想改"承担。
   ========================================================================== */
(function(){
  'use strict';

  const escapeHtml = window.HGM_ESCAPE_HTML;
  if (typeof escapeHtml !== 'function') {
    throw new Error('[admin.js] 缺少 lib/escape-html.js，请检查 admin.html 脚本加载顺序');
  }

  // ---------- 管理员口令（生产部署时替换为真实口令的 sha256 hash） ----------
  // ⚠️ 部署前必须修改：把字符串替换为您希望的明文口令的 sha256 hash
  //    工具（浏览器 console）：
  //      crypto.subtle.digest('SHA-256', new TextEncoder().encode('您的口令'))
  //        .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')))
  //    当前管理员口令: "<您的管理员口令>"（请用上面 hash 对应的明文口令访问 admin）
  //    hash 来源：lib/admin-config.js（保持单一来源，部署时仅改一处）
  //    fallback hash 与 admin-config.js 同步，避免脚本加载顺序异常时回退到旧口令
  const ADMIN_KEY_HASH =
    (typeof window.HGM_ADMIN_KEY_HASH === 'string' && window.HGM_ADMIN_KEY_HASH) ||
    '1216dafe4869f6c77b720ffaae0a91582d50c67b9978d3f2b6d0e21c049cf6a2'; // 内置 fallback（向后兼容）

  // ---------- 默认数据（admin 管理的是作品页 — 与首页 19 张作品解耦） ----------
  // 决策：
  //   首页（index.html）的 19 张作品是非卖品，仅展示，与 admin 解耦。
  //   admin 仅管理作品页（gallery/artwork/artist）的可上架作品。
  //   用户首次进入 admin（无 localStorage）→ 看到"暂无作品，点击 + 添加"。
  //   这是清晰起跑线：让用户明确知道 admin 管的是作品页，不是首页。
  const DEFAULT_ARTWORKS = [];

  const DEFAULT_POEMS = [
    { id: 1, text: '清江一曲绕山流',                                  author: '黄桂明', usage: 'hero-banner' },
    { id: 2, text: '江岸奇峰耸，行舟顺水流。风吟诗意绕，一路画中游。',  author: '黄桂明', usage: 'detail-citation' },
    { id: 3, text: '奇峰迎晓日，清渡载行舟。客望千山翠，诗成韵自悠。',  author: '黄桂明', usage: 'verse-section' },
  ];

  const DEFAULT_BRAND = {
    name: '黄桂明',
    shortName: '桂明',
    tagline: '诗情画意 · 桂林山水',
    email: 'huang.guiming@art.com',
    phone: '+86 771 8000 0000',
    location: '桂林',
    navMark: '黄',
    intro: {
      name: '黄桂明 · 桂林山水',
      line: '清江一曲绕山流 · 江岸奇峰耸',
    },
  };

  // ---------- localStorage 持久化 ----------
  const STORAGE_KEYS = {
    artworks: 'hgm_admin_artworks',
    poems:    'hgm_admin_poems',
    brand:    'hgm_admin_brand',
    meta:     'hgm_admin_meta',
  };

  function safeRead(key, fallback){
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function safeWrite(key, value){
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      showToast('localStorage 写入失败：' + (e.message || '容量不足'));
      return false;
    }
  }

  // ---------- sha256 hash（Web Crypto API） ----------
  async function sha256(text){
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ---------- 状态 ----------
  let state = {
    artworks: [],
    poems: [],
    brand: null,
    editingId: null,  // 当前编辑中的作品 id（null = 新增）
  };

  function loadState(){
    state.artworks = safeRead(STORAGE_KEYS.artworks, null) || JSON.parse(JSON.stringify(DEFAULT_ARTWORKS));
    state.poems = safeRead(STORAGE_KEYS.poems, null) || JSON.parse(JSON.stringify(DEFAULT_POEMS));
    state.brand = safeRead(STORAGE_KEYS.brand, null) || JSON.parse(JSON.stringify(DEFAULT_BRAND));
  }

  function saveArtworks(){
    safeWrite(STORAGE_KEYS.artworks, state.artworks);
    safeWrite(STORAGE_KEYS.meta, { exportedAt: new Date().toISOString(), version: '2026-07-31' });
  }

  /**
   * 把当前 state 推送到 GitHub（如果已配置）。失败抛错让 UI 兜底。
   * localStorage 始终先写，UI 立即生效；GitHub 推送是 best-effort。
   */
  async function pushToGitHub(){
    if (!window.HGM_GITHUB || !window.HGM_GITHUB.isConfigured()) {
      return { skipped: true, reason: 'GitHub 未配置' };
    }
    const payload = {
      version: '2026-08-04',
      exportedAt: new Date().toISOString(),
      artworks: state.artworks,
      poems: state.poems,
      brand: state.brand,
    };
    const result = await window.HGM_GITHUB.pushArtworks(payload);
    return { skipped: false, commitSha: (result && result.commit && result.commit.sha) || null };
  }

  function nextId(){
    const max = state.artworks.reduce((m, a) => Math.max(m, a.id || 0), 0);
    return max + 1;
  }

  // ---------- Toast ----------
  function showToast(msg, isError){
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.background = isError ? 'var(--color-seal, #A8332C)' : 'var(--color-ink, #1A1A1A)';
    el.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove('is-visible'), 2400);
  }

  // ---------- 入口校验 ----------
  async function bootAuth(){
    const auth = document.getElementById('authGate');
    const panel = document.getElementById('adminPanel');
    if (!auth || !panel) return;

    const params = new URLSearchParams(location.search);
    const key = params.get('key') || '';

    if (!key) {
      // 显示表单，让用户输入
      auth.style.display = 'block';
      panel.style.display = 'none';
      wireAuthForm();
      return;
    }

    // URL 直接带 key，验证后进入
    const hash = await sha256(key);
    if (hash === ADMIN_KEY_HASH) {
      auth.style.display = 'none';
      panel.style.display = 'block';
      bootPanel();
    } else {
      auth.style.display = 'block';
      panel.style.display = 'none';
      document.getElementById('authError').textContent = '口令错误';
      wireAuthForm();
    }
  }

  function wireAuthForm(){
    const form = document.getElementById('authForm');
    const input = document.getElementById('authKey');
    if (!form || form._wired) return;
    form._wired = true;
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      const key = input.value.trim();
      if (!key) {
        document.getElementById('authError').textContent = '请输入口令';
        return;
      }
      const hash = await sha256(key);
      if (hash === ADMIN_KEY_HASH) {
        document.getElementById('authError').textContent = '';
        document.getElementById('authGate').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        bootPanel();
      } else {
        document.getElementById('authError').textContent = '口令错误';
      }
    });
  }

  // ---------- 列表渲染 ----------
  function renderList(){
    const list = document.getElementById('artworkList');
    if (!list) return;
    if (state.artworks.length === 0) {
      list.innerHTML = '<div class="admin-empty">暂无作品。点击「＋ 添加作品」开始。</div>';
      return;
    }
    list.innerHTML = state.artworks.map(a => {
      const priceText = a.price > 0 ? '¥ ' + Number(a.price).toLocaleString() : '（未定价）';
      const yearText = a.year || '—';
      const catText = (a.category || []).join(' / ') || '—';
      const poemText = a.citation ? '题画诗：' + escapeHtml(a.citation) : '';
      const featuredBadge = a.featured ? ' <span style="color:var(--color-seal);font-size:12px;">[精选]</span>' : '';
      return `
        <div class="admin-row" data-id="${escapeHtml(String(a.id))}">
          <div class="admin-row__thumb" data-fit="true">
            <img src="${escapeHtml(a.thumb || a.image)}" alt="${escapeHtml(a.title)}"
                 onerror="this.parentElement.classList.add('admin-row__thumb--placeholder');this.outerHTML='<span>图未备</span>'">
          </div>
          <div>
            <div><strong>id=${escapeHtml(String(a.id))}</strong> ${escapeHtml(a.title)}${featuredBadge}</div>
            <div class="admin-row__meta">${priceText} · ${escapeHtml(yearText)} · ${escapeHtml(catText)}</div>
            ${poemText ? '<div class="admin-row__poem">' + poemText + '</div>' : ''}
          </div>
          <div class="admin-row__actions">
            <button type="button" class="btn btn--ghost-dark btn--small" data-act="edit">编辑</button>
            <button type="button" class="btn btn--ghost-dark btn--small" data-act="delete" style="color:var(--color-seal);">删除</button>
          </div>
        </div>
      `;
    }).join('');

    // 事件委托
    list.addEventListener('click', function onListClick(e){
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const row = btn.closest('.admin-row');
      const id = parseInt(row.dataset.id, 10);
      if (btn.dataset.act === 'edit') openEditor(id);
      else if (btn.dataset.act === 'delete') openDeleteModal(id);
    });
  }

  // ---------- 编辑器 ----------
  function openEditor(id){
    state.editingId = id;
    const drawer = document.getElementById('editorDrawer');
    const title = document.getElementById('editorTitle');
    const form = document.getElementById('editorForm');
    if (id === null) {
      title.textContent = '添加新作品';
      form.reset();
      // 默认值
      form.elements.category.value = '桂林山水';
      form.elements.material.value = '宣纸 · 水墨';
      form.elements.inStock.value = 'true';
      clearImageUpload();
    } else {
      const a = state.artworks.find(x => x.id === id);
      if (!a) return;
      title.textContent = '编辑作品：' + (a.title || ('id=' + id));
      form.elements.title.value = a.title || '';
      form.elements.citation.value = a.citation || '';
      form.elements.category.value = (a.category || []).join(', ');
      form.elements.description.value = a.description || '';
      form.elements.year.value = a.year || '';
      form.elements.location.value = a.location || '';
      form.elements.price.value = a.price || '';
      form.elements.size.value = a.size || '';
      form.elements.format.value = a.format || '';
      form.elements.material.value = a.material || '宣纸 · 水墨';
      form.elements.inStock.value = a.inStock === false ? 'false' : 'true';
      // 图片
      setImageUpload(a.image || '');
    }
    document.getElementById('editorError').textContent = '';
    drawer.style.pointerEvents = '';
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
  }

  function closeEditor(){
    const drawer = document.getElementById('editorDrawer');
    drawer.classList.remove('is-open');
    drawer.style.pointerEvents = 'none';
    drawer.setAttribute('aria-hidden', 'true');
    state.editingId = null;
  }

  /** id → 印章：1-10 用壹/贰/.../拾，11+ 用拾壹/拾贰/... */
  function idToSeal(id){
    const cn = ['零','壹','贰','叁','肆','伍','陆','柒','捌','玖','拾'];
    if (id <= 10) return cn[id];
    if (id < 20) return '拾' + cn[id - 10];
    if (id < 100){
      const t = Math.floor(id / 10);
      const o = id % 10;
      return cn[t] + '拾' + (o ? cn[o] : '');
    }
    return String(id);
  }

  /** 当前表单里的 image 实际值（可能是 data URL 或路径） */
  function getCurrentImageValue(){
    return document.getElementById('imageFinalValue').value || '';
  }

  function setImageUpload(value){
    const preview = document.getElementById('imageUploadPreview');
    const status = document.getElementById('imageUploadStatus');
    const hidden = document.getElementById('imageFinalValue');
    const urlInput = document.getElementById('imageUploadUrl');
    if (value && value.length > 0) {
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = value;
      img.alt = '预览';
      preview.appendChild(img);
      preview.classList.add('has-image');
      hidden.value = value;
      // 如果是远程 URL，填到 URL 框里
      if (/^https?:\/\//.test(value)) urlInput.value = value;
      status.textContent = value.startsWith('data:') ? '已选文件（本地预览）' : '已加载图片';
    } else {
      clearImageUpload();
    }
  }

  function clearImageUpload(){
    const preview = document.getElementById('imageUploadPreview');
    const status = document.getElementById('imageUploadStatus');
    const hidden = document.getElementById('imageFinalValue');
    const urlInput = document.getElementById('imageUploadUrl');
    preview.innerHTML = '<span class="image-upload__hint">点击选择图片 / 拖入文件 / 粘贴 URL</span>';
    preview.classList.remove('has-image');
    hidden.value = '';
    urlInput.value = '';
    status.textContent = '未选图';
  }

  /**
   * 把用户选的文件转 base64 data URL 暂存。
   * 若 GitHub 已配，把文件 PUT 到 素材/{artworkId}.jpg 后用相对路径代替 data URL。
   * 不阻塞 UI。
   */
  async function handleFileSelected(file){
    if (!file || !file.type.startsWith('image/')) {
      showToast('请选择图片文件', true);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('图片超过 10MB，请压缩后再上传', true);
      return;
    }
    const status = document.getElementById('imageUploadStatus');
    status.textContent = '读取中…';
    const reader = new FileReader();
    reader.onload = async function(){
      const dataUrl = reader.result;
      setImageUpload(dataUrl);
      // 如果已配 GitHub + 已有 id：上传到 素材/ 目录
      if (window.HGM_GITHUB && window.HGM_GITHUB.isConfigured() && state.editingId !== null) {
        status.textContent = '上传到 GitHub…';
        try {
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
          const path = `素材/${state.editingId}.${ext}`;
          const sha = await getExistingSha(path);
          await window.HGM_GITHUB.putContents(path, await blobToBase64(file), `upload ${path} via admin`, sha);
          const finalUrl = path;
          setImageUpload(finalUrl);
          status.textContent = `✓ 已上传到 ${path}`;
        } catch (e) {
          console.error(e);
          status.textContent = 'GitHub 上传失败：' + (e.message || '未知错误');
        }
      } else {
        status.textContent = '已选文件（仅本地预览，保存后写入 localStorage）';
      }
    };
    reader.readAsDataURL(file);
  }

  function blobToBase64(blob){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        // data URL → 去前缀
        const s = String(r.result || '');
        resolve(s.split(',')[1] || '');
      };
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  async function getExistingSha(path){
    try {
      const c = (window.HGM_GITHUB && window.HGM_GITHUB.getConfig()) || {};
      const url = window.HGM_GITHUB && (window.HGM_GITHUB._buildUrl
        ? window.HGM_GITHUB._buildUrl(`repos/${c.repo}/contents/${path}`, { ref: c.branch })
        : `https://api.github.com/repos/${c.repo}/contents/${path}?ref=${c.branch}`);
      const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + c.token, 'Accept': 'application/vnd.github+json' } });
      if (res.status === 404) return undefined;
      if (!res.ok) return undefined;
      const data = await res.json();
      return data.sha;
    } catch (e) { return undefined; }
  }

  function saveFromForm(){
    const form = document.getElementById('editorForm');
    const errEl = document.getElementById('editorError');
    errEl.textContent = '';

    const image = getCurrentImageValue();
    if (!form.elements.title.value.trim()) { errEl.textContent = '标题不能为空'; return false; }
    if (!image) { errEl.textContent = '请选择或粘贴图片'; return false; }

    // 自动判断格式（用户留空时根据文件名猜测）
    let format = form.elements.format.value;
    if (!format && image && /\.(jpe?g|png|webp)$/i.test(image) === false){
      // 没有扩展名信息，留空让渲染端用 aspect-ratio 自动判断
    }

    const data = {
      title: form.elements.title.value.trim(),
      citation: form.elements.citation.value.trim(),
      image: image,
      thumb: image,                 // thumb 默认同 image
      category: form.elements.category.value.split(',').map(s => s.trim()).filter(Boolean),
      description: form.elements.description.value.trim(),
      year: form.elements.year.value.trim(),
      location: form.elements.location.value.trim(),
      price: parseInt(form.elements.price.value, 10) || 0,
      size: form.elements.size.value.trim(),
      format: format,
      material: form.elements.material.value || '宣纸 · 水墨',
      inStock: form.elements.inStock.value === 'true',
      // 自动字段
      featured: true,
      style: [],
      poemId: null,
    };

    if (state.editingId === null) {
      const newId = nextId();
      data.id = newId;
      data.seal = idToSeal(newId);
      state.artworks.push(data);
      showToast('已添加：' + data.title);
    } else {
      const idx = state.artworks.findIndex(a => a.id === state.editingId);
      if (idx === -1) { errEl.textContent = '作品不存在'; return false; }
      data.id = state.editingId;
      data.seal = state.artworks[idx].seal || idToSeal(state.editingId);
      state.artworks[idx] = Object.assign({}, state.artworks[idx], data);
      showToast('已保存：' + data.title);
    }

    saveArtworks();
    renderList();
    closeEditor();
    pushToGitHub().then(r => {
      if (r.skipped) return;
      showToast('已同步到 GitHub：' + (r.commitSha ? r.commitSha.slice(0, 7) : 'ok'));
    }).catch(err => {
      console.error('[admin] GitHub 推送失败：', err);
      showToast('已存本地，GitHub 推送失败：' + (err.message || '未知错误'), true);
    });
    return true;
  }

  // ---------- 删除确认 ----------
  let deleteTargetId = null;
  function openDeleteModal(id){
    const a = state.artworks.find(x => x.id === id);
    if (!a) return;
    deleteTargetId = id;
    document.getElementById('deleteTarget').textContent = 'id=' + id + ' · ' + a.title;
    document.getElementById('deleteModal').classList.add('is-open');
  }
  function closeDeleteModal(){
    deleteTargetId = null;
    document.getElementById('deleteModal').classList.remove('is-open');
  }
  function confirmDelete(){
    if (deleteTargetId === null) return;
    const a = state.artworks.find(x => x.id === deleteTargetId);
    state.artworks = state.artworks.filter(x => x.id !== deleteTargetId);
    saveArtworks();
    renderList();
    showToast('已永久删除：' + (a ? a.title : 'id=' + deleteTargetId));
    closeDeleteModal();
    pushToGitHub().then(r => {
      if (r.skipped) return;
      showToast('已同步删除到 GitHub：' + (r.commitSha ? r.commitSha.slice(0, 7) : 'ok'));
    }).catch(err => {
      console.error('[admin] GitHub 推送失败：', err);
      showToast('本地删除完成，GitHub 推送失败：' + (err.message || '未知错误'), true);
    });
  }

  // ---------- 导出 / 导入 / 恢复 ----------
  function exportJSON(){
    const payload = {
      version: '2026-07-31',
      exportedAt: new Date().toISOString(),
      artworks: state.artworks,
      poems: state.poems,
      brand: state.brand,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().slice(0, 10);
    a.download = `hgm-artworks-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('已导出 ' + state.artworks.length + ' 张作品');
  }

  function importJSON(file){
    const reader = new FileReader();
    reader.onload = function(e){
      try {
        const data = JSON.parse(e.target.result);
        if (!data || !Array.isArray(data.artworks)) {
          showToast('JSON 格式错误：缺少 artworks 数组', true);
          return;
        }
        // 字段校验：每个 artwork 必须有 id 和 title
        for (const a of data.artworks) {
          if (typeof a.id !== 'number' || !a.title) {
            showToast('JSON 字段错误：作品缺少 id 或 title', true);
            return;
          }
        }
        state.artworks = data.artworks;
        if (Array.isArray(data.poems)) state.poems = data.poems;
        if (data.brand && typeof data.brand === 'object') state.brand = data.brand;
        saveArtworks();
        renderList();
        showToast('已导入 ' + state.artworks.length + ' 张作品');
      } catch (err) {
        showToast('解析失败：' + (err.message || 'JSON 格式错误'), true);
      }
    };
    reader.readAsText(file);
  }

  function resetToDefault(){
    if (!confirm('恢复默认将清空当前所有改动（' + state.artworks.length + ' 张作品），恢复为源码默认 19 张。确定吗？')) return;
    state.artworks = JSON.parse(JSON.stringify(DEFAULT_ARTWORKS));
    state.poems = JSON.parse(JSON.stringify(DEFAULT_POEMS));
    state.brand = JSON.parse(JSON.stringify(DEFAULT_BRAND));
    localStorage.removeItem(STORAGE_KEYS.artworks);
    localStorage.removeItem(STORAGE_KEYS.poems);
    localStorage.removeItem(STORAGE_KEYS.brand);
    localStorage.removeItem(STORAGE_KEYS.meta);
    renderList();
    showToast('已恢复默认');
  }

  // ---------- 主面板 ----------
  function bootPanel(){
    loadState();
    renderList();

    // 顶部按钮
    document.getElementById('btnAdd').addEventListener('click', () => openEditor(null));
    document.getElementById('btnExport').addEventListener('click', exportJSON);
    document.getElementById('btnReset').addEventListener('click', resetToDefault);
    document.getElementById('btnImport').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', function(e){
      const file = e.target.files[0];
      if (file) importJSON(file);
      e.target.value = '';
    });

    // 编辑器
    document.getElementById('btnCloseEditor').addEventListener('click', closeEditor);
    document.getElementById('btnCancelEditor').addEventListener('click', closeEditor);
    document.getElementById('btnSave').addEventListener('click', function(e){
      e.preventDefault();
      saveFromForm();
    });
    // 保留 form submit 作为兜底（按 Enter 提交）
    document.getElementById('editorForm').addEventListener('submit', function(e){
      e.preventDefault();
      saveFromForm();
    });

    // 删除确认
    document.getElementById('btnCancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);

    // 图片上传区
    wireImageUpload();

    // GitHub 配置面板
    wireGithubConfig();
  }

  // ---------- 图片上传 ----------
  function wireImageUpload(){
    const upload = document.getElementById('imageUpload');
    const fileInput = document.getElementById('imageUploadFile');
    const urlInput = document.getElementById('imageUploadUrl');
    const clearBtn = document.getElementById('imageUploadClear');
    const preview = document.getElementById('imageUploadPreview');
    if (!upload || upload._wired) return;
    upload._wired = true;

    // 文件选择
    fileInput.addEventListener('change', function(){
      const f = fileInput.files && fileInput.files[0];
      if (f) handleFileSelected(f);
      fileInput.value = '';
    });
    // URL 输入
    urlInput.addEventListener('input', function(){
      const v = urlInput.value.trim();
      if (v) setImageUpload(v);
      else clearImageUpload();
    });
    // 清除
    clearBtn.addEventListener('click', clearImageUpload);
    // 点击预览区触发文件选择
    preview.addEventListener('click', function(e){
      if (e.target.tagName === 'IMG') return;
      fileInput.click();
    });
    // 拖拽
    upload.addEventListener('dragover', function(e){
      e.preventDefault();
      upload.classList.add('dragover');
    });
    upload.addEventListener('dragleave', function(){
      upload.classList.remove('dragover');
    });
    upload.addEventListener('drop', function(e){
      e.preventDefault();
      upload.classList.remove('dragover');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFileSelected(f);
    });
  }

  // ---------- GitHub 配置面板 ----------
  function fillGithubConfigForm(){
    const cfg = (window.HGM_GITHUB && window.HGM_GITHUB.getConfig()) || {};
    const form = document.getElementById('githubConfigForm');
    if (!form) return;
    form.elements.repo.value = cfg.repo || '';
    form.elements.branch.value = cfg.branch || 'main';
    // token 永远不显示（安全考虑，填过也不回显）
    form.elements.token.value = '';
    const status = document.getElementById('githubConfigStatus');
    if (status) {
      const configured = (window.HGM_GITHUB && window.HGM_GITHUB.isConfigured());
      status.textContent = configured ? '✓ 已配置' : '未配置';
      status.style.color = configured ? 'var(--color-seal)' : 'var(--color-ink-mute)';
    }
  }

  function setMsg(elId, msg, isError){
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? 'var(--color-seal, #A8332C)' : 'var(--color-ink-soft, #666)';
  }

  function wireGithubConfig(){
    const form = document.getElementById('githubConfigForm');
    if (!form || form._wired) return;
    form._wired = true;

    fillGithubConfigForm();

    form.addEventListener('submit', function(e){
      e.preventDefault();
      const repo = form.elements.repo.value.trim();
      const branch = form.elements.branch.value.trim() || 'main';
      const token = form.elements.token.value.trim();
      const existing = (window.HGM_GITHUB && window.HGM_GITHUB.getConfig()) || {};
      if (!repo) { setMsg('githubConfigError', '仓库名不能为空', true); return; }
      if (!token && !existing.token) { setMsg('githubConfigError', '请填写 Token', true); return; }
      window.HGM_GITHUB.setConfig({ repo, branch, token: token || existing.token });
      setMsg('githubConfigError', '');
      setMsg('githubConfigOk', '已保存到本浏览器 localStorage', false);
      fillGithubConfigForm();
    });

    const btnTest = document.getElementById('btnTestGithub');
    if (btnTest) btnTest.addEventListener('click', async function(){
      setMsg('githubConfigError', '');
      setMsg('githubConfigOk', '测试中…', false);
      try {
        const info = await window.HGM_GITHUB.testConnection();
        setMsg('githubConfigOk', `✓ 连接成功：${info.repo}（${info.private ? '私有' : '公开'}，默认分支 ${info.defaultBranch}）`, false);
      } catch (err) {
        setMsg('githubConfigError', '✗ ' + (err.message || '测试失败'), true);
        setMsg('githubConfigOk', '', false);
      }
    });

    const btnClear = document.getElementById('btnClearGithub');
    if (btnClear) btnClear.addEventListener('click', function(){
      if (!confirm('清除本浏览器的 GitHub 配置？Token 会被删除。')) return;
      window.HGM_GITHUB.clearConfig();
      fillGithubConfigForm();
      setMsg('githubConfigError', '');
      setMsg('githubConfigOk', '已清除', false);
    });
  }

  // ---------- 启动 ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAuth);
  } else {
    bootAuth();
  }
})();
