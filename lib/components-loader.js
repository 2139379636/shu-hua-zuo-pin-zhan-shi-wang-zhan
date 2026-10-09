/* ==========================================================================
   组件配置加载器 + 应用器 — 异步 fetch data/components.json
   加载完成后立即应用：
     · 所有 [data-components-field] 元素的 src/img 字段
     · 重写 window.getFeaturedArtworks() / getLandscapeArtworks() / getPortraitArtworks()
       让它们基于 admin-v2 配置返回作品列表
   ========================================================================== */
(function(){
  'use strict';

  const ENDPOINT = 'data/components.json';
  let cached = null;

  async function loadComponents(){
    const res = await fetch(ENDPOINT + '?_t=' + Date.now(), { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    cached = deepClone(data);
    try {
      window.dispatchEvent(new CustomEvent('hgm-components-loaded', { detail: { components: cached } }));
    } catch (e) {}
    applyComponentsToUI(cached);
    return cached;
  }

  function deepClone(obj){
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepClone);
    const out = {};
    for (const k of Object.keys(obj)) out[k] = deepClone(obj[k]);
    return out;
  }

  /** 给定 slots 列表，解析为 art 对象数组（支持 id 或 路径两种）
   *  - 空字符串/null/undefined → 返回 null（前端可跳过）
   *  - 数字字符串 + artworkLibrary 有 → 标准化 art（带 title/seal）
   *  - 任意字符串（路径） → 包装为伪 art，image/thumb 用该路径，title 用文件名
   */
  function resolveArtworks(ids){
    if (!cached || !Array.isArray(ids)) return [];
    const lib = cached.artworkLibrary || {};
    return ids.map(value => {
      if (!value && value !== 0) return null;
      const strVal = String(value);
      // case 1: 数字 id
      if (/^\d+$/.test(strVal) && lib[strVal]){
        const art = lib[strVal];
        return Object.assign({}, art, {
          thumb: art.thumb || art.image,
          image: art.image || art.thumb,
        });
      }
      // case 2: 路径字符串
      if (/\.(jpe?g|png|webp|avif)$/i.test(strVal)){
        const filename = strVal.split('/').pop() || strVal;
        const title = filename.replace(/\.\w+$/, '');
        return {
          id: null,
          title: title || '作品',
          image: strVal,
          thumb: strVal,
          seal: '',
        };
      }
      // case 3: 未知类型，忽略
      return null;
    }).filter(Boolean);
  }

  /** 应用到 DOM：所有 [data-components-field] 元素的 src 或 textContent */
  function applyComponentsToUI(c){
    if (!c || !c.components) return;

    // 1) data-components-field（如 hero.blankImage）
    document.querySelectorAll('[data-components-field]').forEach(el => {
      const path = el.dataset.componentsField; // e.g. "hero.blankImage"
      let v = c.components;
      for (const p of path.split('.')){
        v = v && v[p];
      }
      if (!v) return;
      // img src
      if (el.tagName === 'IMG' && el.src !== v) {
        el.src = v;
      }
    });

    // 2) 重写 getFeaturedArtworks() → 用 components.gallery.featured
    if (!window.getFeaturedArtworks || window.getFeaturedArtworks.__hgmComponent) {
      window.getFeaturedArtworks = function(){
        const ids = (c.components && c.components.gallery && c.components.gallery.featured) || [];
        const arts = resolveArtworks(ids);
        if (!arts.length) return window.ARTWORKS_DATA || [];
        // resolveArtworks 已返回完整 art 对象（含 image/thumb/title/seal）
        return arts;
      };
      window.getFeaturedArtworks.__hgmComponent = true;
    }

    // 3) 重写 getLandscapeArtworks() → 用 marqueeLandscape.slots
    if (!window.getLandscapeArtworks || window.getLandscapeArtworks.__hgmComponent) {
      window.getLandscapeArtworks = function(){
        const ids = (c.components && c.components.marqueeLandscape && c.components.marqueeLandscape.slots) || [];
        const arts = resolveArtworks(ids);
        return arts;
      };
      window.getLandscapeArtworks.__hgmComponent = true;
    }

    // 4) 重写 getMarqueeRow1() → 用 marqueeRow1.slots（6 张竖向）
    if (!window.getMarqueeRow1 || window.getMarqueeRow1.__hgmComponent) {
      window.getMarqueeRow1 = function(){
        const ids = (c.components && c.components.marqueeRow1 && c.components.marqueeRow1.slots) || [];
        const arts = resolveArtworks(ids);
        return arts;
      };
      window.getMarqueeRow1.__hgmComponent = true;
    }

    // 5) 重写 getMarqueeRow2() → 用 marqueeRow2.slots（6 张横向）
    if (!window.getMarqueeRow2 || window.getMarqueeRow2.__hgmComponent) {
      window.getMarqueeRow2 = function(){
        const ids = (c.components && c.components.marqueeRow2 && c.components.marqueeRow2.slots) || [];
        const arts = resolveArtworks(ids);
        return arts;
      };
      window.getMarqueeRow2.__hgmComponent = true;
    }

    // 6) 兼容旧代码：getPortraitArtworks() 等同于 row1
    if (!window.getPortraitArtworks || window.getPortraitArtworks.__hgmComponent) {
      window.getPortraitArtworks = window.getMarqueeRow1;
      window.getPortraitArtworks.__hgmComponent = true;
    }

    // 5) 暴露给 artist-page.js：代 slot 列表查代表作
    window.HGM_REP_SLOTS = function(){
      return (c.components && c.components.artistRepresentatives && c.components.artistRepresentatives.slots) || [];
    };
  }

  function findInArtworksData(id){
    if (!window.ARTWORKS_DATA) return {};
    const a = window.ARTWORKS_DATA.find(x => String(x.id) === String(id));
    return a || {};
  }

  function getCached(){ return cached ? deepClone(cached) : null; }

  window.HGM_LOAD_COMPONENTS = loadComponents;
  window.HGM_COMPONENTS = null;
  window.HGM_COMPONENTS_GET = getCached;
  window.HGM_COMPONENTS_RESOLVE_ARTWORKS = resolveArtworks;

  // 自动启动加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadComponents().then(c => { window.HGM_COMPONENTS = c; }).catch(() => {});
    });
  } else {
    loadComponents().then(c => { window.HGM_COMPONENTS = c; }).catch(() => {});
  }
})();
