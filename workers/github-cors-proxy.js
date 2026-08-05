/* ==========================================================================
   Cloudflare Worker — GitHub API CORS 代理
   部署步骤：
   1. 登录 https://dash.cloudflare.com → Workers & Pages → Create
   2. 命名 worker（如 hgm-github-proxy），选择 HTTP handler
   3. 粘贴本文件全部内容到编辑器，点 Deploy
   4. 获得 worker URL，例如 https://hgm-github-proxy.your-name.workers.dev
   5. 回到 admin.html GitHub 配置面板，把 URL 填入「CORS 代理」字段

   安全：本 worker 接受任意路径转发到 api.github.com（认证头透传）。
   鉴权在 GitHub Token 端完成（仅本仓库 Contents 写权限）。
   ========================================================================== */

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, content-type, accept, x-github-api-version',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    // 路径透传到 api.github.com
    const target = 'https://api.github.com' + url.pathname + url.search;

    const headers = new Headers();
    // 透传关键请求头
    for (const [k, v] of request.headers) {
      if (['authorization', 'accept', 'content-type', 'x-github-api-version', 'if-match'].includes(k.toLowerCase())) {
        headers.set(k, v);
      }
    }
    // 强制带 Accept 头（GitHub v3）
    if (!headers.has('Accept')) headers.set('Accept', 'application/vnd.github+json');
    if (!headers.has('X-GitHub-Api-Version')) headers.set('X-GitHub-Api-Version', '2022-11-28');
    // GitHub REST API 强制要求 User-Agent header（缺则 403 forbidden）
    headers.set('User-Agent', request.headers.get('User-Agent') || 'hgm-gallery-admin/1.0');

    const init = {
      method: request.method,
      headers,
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
    }

    const res = await fetch(target, init);

    // 构造带 CORS 头的响应
    const outHeaders = new Headers(res.headers);
    outHeaders.set('Access-Control-Allow-Origin', '*');
    outHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    outHeaders.set('Access-Control-Allow-Headers', 'authorization, content-type, accept, x-github-api-version');

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: outHeaders,
    });
  },
};
