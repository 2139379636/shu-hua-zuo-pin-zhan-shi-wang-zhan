/* ==========================================================================
   黄桂明作品数据 + BRAND 品牌常量
   注：IIFE 暴露 window 全局，不使用 ESM
   ========================================================================== */
(function(){
  'use strict';

  // ---------- 题画诗库（3 首） ----------
  const POEMS = [
    { id: 1, text: '清江一曲绕山流',                                  author: '黄桂明', usage: 'hero-banner' },
    { id: 2, text: '江岸奇峰耸，行舟顺水流。风吟诗意绕，一路画中游。',  author: '黄桂明', usage: 'detail-citation' },
    { id: 3, text: '奇峰迎晓日，清渡载行舟。客望千山翠，诗成韵自悠。',  author: '黄桂明', usage: 'verse-section' },
  ];

  // ---------- 19 张作品 ----------
  const ARTWORKS = [
    // ===== 9 张精选（featured: true）=====
    { id:1,  title:'清江一曲绕山流',         seal:'壹', image:'素材/1.jpg',  thumb:'素材/1.jpg',  category:['漓江','山水'], featured:true,  size:'100 × 50 cm', format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:1, citation:'清江一曲绕山流', description:'', price:6800, inStock:true },
    { id:2,  title:'一山未绝一山迎',         seal:'贰', image:'素材/2.jpg',  thumb:'素材/2.jpg',  category:['漓江','山水'], featured:true,  size:'100 × 50 cm', format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:6800, inStock:true },
    { id:3,  title:'画尽黄山忆徐霞客',       seal:'叁', image:'素材/3.jpg',  thumb:'素材/3.jpg',  category:['奇峰','山水'], featured:true,  size:'100 × 50 cm', format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:7200, inStock:true },
    { id:4,  title:'春雪大可看雪山大雪',     seal:'肆', image:'素材/4.jpg',  thumb:'素材/4.jpg',  category:['四季','山水'], featured:true,  size:'68 × 46 cm',  format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:4800, inStock:true },
    { id:5,  title:'万山迎日·千里画春',      seal:'伍', image:'素材/5.jpg',  thumb:'素材/5.jpg',  category:['奇峰','四季'], featured:true,  size:'68 × 34 cm',  format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:3800, inStock:true },
    { id:6,  title:'雨意湿濛山山色',         seal:'陆', image:'素材/6.jpg',  thumb:'素材/6.jpg',  category:['漓江','烟雨'], featured:true,  size:'100 × 50 cm', format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:6200, inStock:true },
    { id:7,  title:'坚不可摧',               seal:'柒', image:'素材/7.jpg',  thumb:'素材/7.jpg',  category:['漓江','四季'], featured:true,  size:'100 × 50 cm', format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:7600, inStock:true },
    { id:8,  title:'江上春秋',               seal:'捌', image:'素材/8.jpg',  thumb:'素材/8.jpg',  category:['漓江','四季'], featured:true,  size:'68 × 45 cm',  format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:4200, inStock:true },
    { id:9,  title:'红霞映归远·山影晚波轻',  seal:'玖', image:'素材/9.jpg',  thumb:'素材/9.jpg',  category:['奇峰','烟雨'], featured:true,  size:'100 × 50 cm', format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:6400, inStock:true },
    // ===== 余下 10 张（featured: false，占位）=====
    { id:10, title:'作品 10',                 seal:'拾',   image:'素材/10.jpg', thumb:'素材/10.jpg', category:['漓江'], featured:false, size:'',     format:'',     material:'',     year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:11, title:'作品 11',                 seal:'拾壹', image:'素材/11.jpg', thumb:'素材/11.jpg', category:['漓江'], featured:false, size:'',     format:'',     material:'',     year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:12, title:'作品 12',                 seal:'拾贰', image:'素材/12.jpg', thumb:'素材/12.jpg', category:['奇峰'], featured:false, size:'',     format:'',     material:'',     year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:13, title:'作品 13',                 seal:'拾叁', image:'素材/13.jpg', thumb:'素材/13.jpg', category:['奇峰'], featured:false, size:'',     format:'',     material:'',     year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:14, title:'作品 14',                 seal:'拾肆', image:'素材/14.jpg', thumb:'素材/14.jpg', category:['烟雨'], featured:false, size:'',     format:'',     material:'',     year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:15, title:'作品 15',                 seal:'拾伍', image:'素材/15.jpg', thumb:'素材/15.jpg', category:['四季'], featured:false, size:'',     format:'',     material:'',     year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:16, title:'作品 16',                 seal:'拾陆', image:'素材/16.jpg', thumb:'素材/16.jpg', category:['漓江'], featured:false, size:'',     format:'',     material:'',     year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:17, title:'作品 17',                 seal:'拾柒', image:'素材/17.jpg', thumb:'素材/17.jpg', category:['烟雨'], featured:false, size:'',     format:'',     material:'',     year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:18, title:'作品 18',                 seal:'拾捌', image:'素材/18.jpg', thumb:'素材/18.jpg', category:['奇峰'], featured:false, size:'',     format:'',     material:'',     year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:19, title:'作品 19',                 seal:'拾玖', image:'素材/19.jpg', thumb:'素材/19.jpg', category:['漓江'], featured:false, size:'',     format:'',     material:'',     year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
  ];

  // ---------- BRAND 品牌常量 ----------
  const BRAND = {
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

  // ---------- 作品方向分类（按真实图片宽高比识别）----------
  // 6 张横向（宽>高）的作品在竖向长卷里显得矮胖、细节不清，
  // 因此首页 Marquee 只滚动竖向作品；横向作品在 .marquee-landscape
  // 单独一行慢速展示。注意 id=6 的宽高比 1.008 接近正方形，
  // 这里仍按"宽>高"标准归入横向，让它在更宽的容器中呼吸。
  const LANDSCAPE_IDS = [4, 6, 13, 16, 17, 19];

  function isLandscape(art){
    return LANDSCAPE_IDS.indexOf(art.id) !== -1;
  }

  // ---------- 作品页占位开关 ----------
  // 首页（index.html）的 19 张作品是非卖品，仅作展示，永久保留。
  // 作品页（gallery/artwork/artist）的作品来源：
  //   1. localStorage（admin.html 管理后保存的数据）— 同一浏览器永久
  //   2. data/artworks.json（fetch 兜底，跨浏览器/部署可见）
  //   3. PLACEHOLDER_ARTS（占位池，初始/重置后默认）
  // 数据流由 admin.html 控制：增/删/改 → localStorage → 作品页立刻可见；
  //                                  → 导出 JSON → 用户放到 data/artworks.json → 部署
  // 注意：
  //   - getPortraitArtworks() / getLandscapeArtworks() 不受开关影响，
  //     它们仅被首页 ink-effects.js 调用，确保首页真实作品正常展示。
  //   - 调整作品页"默认内容"：只改 PLACEHOLDER_ARTS。
  const PLACEHOLDER_ONLY = true;

  // 占位 art（id 用负数避免与真实 id 冲突；6 张足够填充 gallery 网格）
  function makePlaceholderArt(num){
    return {
      id: -100 + num,
      title: '即将上架',
      seal: '·',
      image: '',           // 空 image → gallery-render.js onerror 显示"图未备"
      thumb: '',
      category: [],
      featured: false,
      size: '', format: '', material: '', year: '', location: '', style: [],
      poemId: null, citation: '', description: '', price: 0, inStock: false,
    };
  }
  const PLACEHOLDER_ARTS = Array.from({length: 6}, (_, i) => makePlaceholderArt(i + 1));

  // ---------- 作品页数据源解析 ----------
  const ADMIN_STORAGE_KEY = 'hgm_admin_artworks';
  const META_STORAGE_KEY = 'hgm_admin_meta';

  /** 同步读取 admin 在 localStorage 中保存的作品列表 */
  function readFromLocalStorage(){
    try {
      const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  /** 同步读取 meta（exportedAt 时间戳） */
  function readMetaFromLocalStorage(){
    try {
      const raw = localStorage.getItem(META_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  /** 异步从 data/artworks.json 读取（跨浏览器/部署持久化）
   *  返回 { payload, exportedAt }，exporter 写入时间戳可与本地 meta 对比判断是否需要更新 */
  async function readFromDataJson(){
    try {
      const res = await fetch('data/artworks.json?_t=' + Date.now(), { cache: 'no-cache' });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        payload: data,
        exportedAt: data && data.exportedAt ? String(data.exportedAt) : null,
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * 作品页当前作品列表（同步版）：
   *   localStorage 已有 → 直接用 admin 编辑后的数据
   *   否则            → 占位池（用户首次访问或重置后）
   * 异步版 tryLoadFromDataJson() 会额外尝试 fetch data/artworks.json，
   * 加载成功则写入 localStorage（之后同步版就能读到）。
   */
  window.getActiveArtworks = function(){
    const ls = readFromLocalStorage();
    if (ls && ls.length > 0) return ls;
    return PLACEHOLDER_ARTS.slice();
  };

  /** 异步 fetch data/artworks.json（部署跨浏览器场景）
   *  若 exportedAt 较新，覆写 localStorage 并派发 'hgm-artworks-updated' 事件 */
  window.tryLoadFromDataJson = async function(){
    const result = await readFromDataJson();
    if (result && result.payload) {
      const arts = Array.isArray(result.payload) ? result.payload : (Array.isArray(result.payload.artworks) ? result.payload.artworks : null);
      if (arts && Array.isArray(arts)) {
        try {
          localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(arts));
          if (result.exportedAt) {
            localStorage.setItem(META_STORAGE_KEY, JSON.stringify({ exportedAt: result.exportedAt, version: result.payload.version || 'unknown' }));
          }
        } catch (e) {}
        try {
          window.dispatchEvent(new CustomEvent('hgm-artworks-updated', { detail: { source: 'fetch', exportedAt: result.exportedAt } }));
        } catch (e) {}
        return true;
      }
    }
    return false;
  };

  /**
   * 启动 GitHub 同步后的轮询：每 intervalMs 毫秒重新拉一次 data/artworks.json，
   * 若 exportedAt 较新就更新 localStorage 并派发 'hgm-artworks-updated' 事件。
   * 浏览器多个标签页只需启动一次；重复调用是幂等的。
   */
  window.startArtworksPolling = function(intervalMs){
    intervalMs = intervalMs || 30000;
    if (window.__hgmPollingStarted) return;
    window.__hgmPollingStarted = true;
    setInterval(async function(){
      try { await window.tryLoadFromDataJson(); }
      catch (e) { /* swallow — 下次重试 */ }
    }, intervalMs);
  };

  // ---------- 辅助函数 ----------
  window.getArtworkById = function(id){
    if (PLACEHOLDER_ONLY) {
      const n = parseInt(id, 10);
      return window.getActiveArtworks().find(a => a.id === n) || null;
    }
    const n = parseInt(id, 10);
    return ARTWORKS.find(a => a.id === n) || null;
  };
  window.getPoemById = function(id){
    const n = parseInt(id, 10);
    return POEMS.find(p => p.id === n) || null;
  };
  window.getFeaturedArtworks = function(){
    if (PLACEHOLDER_ONLY) return window.getActiveArtworks();
    return ARTWORKS.filter(a => a.featured);
  };
  /** 仅返回有图片的竖向作品（首页双行 Marquee 用，不受占位开关影响） */
  window.getPortraitArtworks = function(){
    return ARTWORKS.filter(a => a.image && !isLandscape(a));
  };
  /** 仅返回有图片的横向作品（首页单独一行 Marquee 用，不受占位开关影响） */
  window.getLandscapeArtworks = function(){
    return ARTWORKS.filter(a => a.image && isLandscape(a));
  };

  // ---------- 暴露 ----------
  window.POEMS = POEMS;
  window.ARTWORKS_DATA = ARTWORKS;
  window.BRAND = BRAND;
  window.LANDSCAPE_IDS = LANDSCAPE_IDS;
  window.PLACEHOLDER_ONLY = PLACEHOLDER_ONLY;

  // ---------- 启动：尝试 fetch data/artworks.json 兜底 + 启动轮询 ----------
  // 仅作品页（PLACEHOLDER_ONLY=true）才需要 fetch。
  // 加载成功：写入 localStorage + 触发 'hgm-artworks-loaded' 事件，
  //           监听此事件的脚本（gallery-render.js 等）会重新渲染。
  // 加载失败：什么都不做，下次 getActiveArtworks() 自然 fallback 占位。
  // v5.20 — GitHub 同步后启动轮询：每 30s 重拉一次 data/artworks.json，
  //        若 exportedAt 变化则更新 localStorage + 派发 'hgm-artworks-updated'。
  function bootDataJsonFetch(){
    if (!PLACEHOLDER_ONLY) return;        // 首页不需要
    if (!window.tryLoadFromDataJson) return;
    window.tryLoadFromDataJson().then(loaded => {
      if (loaded) {
        try {
          window.dispatchEvent(new CustomEvent('hgm-artworks-loaded'));
        } catch (e) {}
      }
    });
    // 启动 30s 轮询（仅一个标签页生效，幂等）
    if (typeof window.startArtworksPolling === 'function') {
      window.startArtworksPolling(30000);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootDataJsonFetch);
  } else {
    bootDataJsonFetch();
  }
})();
