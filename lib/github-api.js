/* ==========================================================================
   GitHub Contents API 封装 — admin 同步作品数据到仓库
   - 通过 PUT /repos/{owner}/{repo}/contents/{path} 直接 commit data/artworks.json
   - 部署在 Vercel/Netlify/CloudFlare Pages 之一时，git push 触发自动重新部署
   - 用户配置存 localStorage（不暴露在源码），含 repo + token + branch
   - 依赖：window.HGM_ESCAPE_HTML (lib/escape-html.js)
   ========================================================================== */
(function(){
  'use strict';

  const STORAGE_KEY = 'hgm_github_config';

  function safeRead(key, fallback){
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function safeWrite(key, value){
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  }

  function getConfig(){
    return safeRead(STORAGE_KEY, null) || { repo: '', token: '', branch: 'main', proxy: '' };
  }

  function setConfig(cfg){
    return safeWrite(STORAGE_KEY, {
      repo: (cfg.repo || '').trim(),
      token: (cfg.token || '').trim(),
      branch: (cfg.branch || 'main').trim() || 'main',
      proxy: (cfg.proxy || '').trim(),
    });
  }

  function clearConfig(){
    try { localStorage.removeItem(STORAGE_KEY); return true; }
    catch (e) { return false; }
  }

  function isConfigured(){
    const c = getConfig();
    return !!(c.repo && c.token);
  }

  /** 如果配置了 CORS 代理，把 api.github.com 替换为代理 URL；否则直连 */
  function resolveBase(){
    const c = getConfig();
    if (c.proxy) {
      return c.proxy.replace(/\/+$/, '');
    }
    return 'https://api.github.com';
  }

  /** 构造完整 URL：代理模式下用 proxy 域 + 路径，否则 github api + 路径 */
  function buildUrl(path, query){
    const base = resolveBase();
    const baseUrl = new URL(base);
    // GitHub path 以 / 开头，移除重复 /
    const cleanPath = path.replace(/^\/+/, '');
    let url;
    if (c.proxy) {
      // 代理模式：path 直接拼接到 base 后（base 已经是 worker URL）
      // 如 https://hgm-proxy.workers.dev + repos/owner/repo/contents/x
      url = baseUrl.origin + baseUrl.pathname.replace(/\/+$/, '') + '/' + cleanPath;
    } else {
      url = baseUrl.origin + '/' + cleanPath;
    }
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        url += (url.includes('?') ? '&' : '?') + encodeURIComponent(k) + '=' + encodeURIComponent(v);
      }
    }
    return url;
  }

  function b64encode(str){
    // Unicode-safe base64
    return btoa(unescape(encodeURIComponent(str)));
  }

  /** 拉取文件当前内容（含 SHA），用于更新前先 GET */
  async function getContents(path){
    const c = getConfig();
    if (!c.repo) throw new Error('GitHub 仓库未配置');
    const url = buildUrl(`repos/${c.repo}/contents/${path}`, { ref: c.branch });
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${c.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GET ${path} 失败 ${res.status}: ${body.slice(0, 200)}`);
    }
    return await res.json();
  }

  /** 创建或更新文件内容；create=true 时 sha 可省略（用于新增空文件） */
  async function putContents(path, content, message, sha){
    const c = getConfig();
    if (!c.repo) throw new Error('GitHub 仓库未配置');
    const url = buildUrl(`repos/${c.repo}/contents/${path}`);
    const body = {
      message: message || `update ${path} via admin`,
      content: b64encode(content),
      branch: c.branch,
    };
    if (sha) body.sha = sha;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${c.token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`PUT ${path} 失败 ${res.status}: ${errBody.slice(0, 200)}`);
    }
    return await res.json();
  }

  /** 测试当前配置：拉取 data/artworks.json，能成功就说明 token 有效且仓库可写 */
  async function testConnection(){
    const c = getConfig();
    if (!c.repo) throw new Error('GitHub 仓库未配置');
    const url = buildUrl(`repos/${c.repo}`);
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${c.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`仓库 ${c.repo} 访问失败 ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    return {
      repo: data.full_name,
      defaultBranch: data.default_branch,
      private: data.private,
      usingProxy: !!c.proxy,
    };
  }

  /**
   * 把完整作品数据推送到 GitHub：
   * 1. GET 拿到 data/artworks.json 当前 sha
   * 2. PUT 新内容（用 sha 更新）
   * 失败抛错让 admin 兜底到 localStorage 导出
   */
  async function pushArtworks(payload){
    const path = 'data/artworks.json';
    const content = JSON.stringify(payload, null, 2);
    const existing = await getContents(path);
    const sha = existing ? existing.sha : undefined;
    return await putContents(path, content, `update artworks via admin (${new Date().toISOString()})`, sha);
  }

  window.HGM_GITHUB = {
    getConfig, setConfig, clearConfig, isConfigured,
    testConnection, getContents, putContents, pushArtworks,
  };
})();
