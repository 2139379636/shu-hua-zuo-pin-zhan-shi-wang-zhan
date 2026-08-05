/* ==========================================================================
   Light Rays Background — vanilla WebGL 移植
   原始来源：React Bits <LightRays /> (https://reactbits.dev)
   移植说明：
     - 保留 GLSL 着色器（vertex + fragment）逐行一致
     - 去除 React + ogl（Renderer/Program/Triangle/Mesh）依赖
     - 用全屏 quad + 原生 WebGL 绘制
     - IIFE 暴露 window.LIGHT_RAYS_BOOT()，与项目其他 IIFE 一致
   ========================================================================== */
(function(){
  'use strict';

  /** hex → normalized [r,g,b] */
  function hexToRgb(hex){
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [
      parseInt(m[1], 16) / 255,
      parseInt(m[2], 16) / 255,
      parseInt(m[3], 16) / 255
    ] : [1, 1, 1];
  }

  /** origin → 锚点 + 方向（基于 iResolution 像素坐标） */
  function getAnchorAndDir(origin, w, h){
    var outside = 0.2;
    switch (origin) {
      case 'top-left':          return { anchor: [0, -outside * h],           dir: [0, 1] };
      case 'top-right':         return { anchor: [w, -outside * h],           dir: [0, 1] };
      // v5 扩展：从动画窗口最上方边缘发出（不在 viewport 外）
      case 'top-edge-left':     return { anchor: [0, 0],                      dir: [0, 1] };
      case 'top-edge-center':   return { anchor: [0.5 * w, 0],                dir: [0, 1] };
      case 'top-edge-right':    return { anchor: [w, 0],                      dir: [0, 1] };
      case 'left':              return { anchor: [-outside * w, 0.5 * h],     dir: [1, 0] };
      case 'right':             return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
      case 'bottom-left':       return { anchor: [0, (1 + outside) * h],      dir: [0, -1] };
      case 'bottom-center':     return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
      case 'bottom-right':      return { anchor: [w, (1 + outside) * h],      dir: [0, -1] };
      default:                  return { anchor: [0.5 * w, -outside * h],     dir: [0, 1] };  // 'top-center'
    }
  }

  /**
   * @param {Object} opts
   * @param {string}  [opts.raysOrigin='top-center']  'top-center' | 'top-left' | 'top-right' | 'left' | 'right' | 'bottom-center' | 'bottom-left' | 'bottom-right'
   * @param {string}  [opts.raysColor='#5C7A6B']     hex 颜色（设计系统：远山青）
   * @param {number}  [opts.raysSpeed=1.5]           动画速度
   * @param {number}  [opts.lightSpread=0.8]         光线扩散（0=tight, 1=wide）
   * @param {number}  [opts.rayLength=1.2]           光线长度
   * @param {boolean} [opts.pulsating=false]         脉动效果
   * @param {number}  [opts.fadeDistance=1.5]        渐隐距离
   * @param {number}  [opts.saturation=0.6]          饱和度（0=灰, 1=原色）
   * @param {boolean} [opts.followMouse=true]        跟随鼠标
   * @param {number}  [opts.mouseInfluence=0.1]      鼠标影响（0-1）
   * @param {number}  [opts.noiseAmount=0.1]         噪点
   * @param {number}  [opts.distortion=0.05]         扭曲
   */
  window.LIGHT_RAYS_BOOT = function(opts){
    opts = opts || {};
    var raysOrigin     = opts.raysOrigin     || 'top-center';
    var raysColor      = opts.raysColor      || '#5C7A6B';  // 远山青淡（设计系统）
    var raysSpeed      = opts.raysSpeed      != null ? opts.raysSpeed      : 1.5;
    var lightSpread    = opts.lightSpread    != null ? opts.lightSpread    : 0.8;
    var rayLength      = opts.rayLength      != null ? opts.rayLength      : 1.2;
    var pulsating      = opts.pulsating      || false;
    var fadeDistance   = opts.fadeDistance   != null ? opts.fadeDistance   : 1.5;
    var saturation     = opts.saturation     != null ? opts.saturation     : 0.6;
    var followMouse    = opts.followMouse    != null ? opts.followMouse    : true;
    var mouseInfluence = opts.mouseInfluence != null ? opts.mouseInfluence : 0.1;
    var noiseAmount    = opts.noiseAmount    != null ? opts.noiseAmount    : 0.1;
    var distortion     = opts.distortion     != null ? opts.distortion     : 0.05;

    var container = document.getElementById('lightRaysBg');
    if (!container) {
      console.warn('[LightRays] #lightRaysBg canvas not found');
      return;
    }

    var gl = container.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true })
          || container.getContext('experimental-webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      console.warn('[LightRays] WebGL not available, skipping');
      return;
    }

    // ----------------------------------------------------------------
    // GLSL 着色器（与 React Bits <LightRays> 源一致）
    // ----------------------------------------------------------------
    var vertexShaderSrc = [
      'attribute vec2 position;',
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = position * 0.5 + 0.5;',
      '  gl_Position = vec4(position, 0.0, 1.0);',
      '}'
    ].join('\n');

    var fragmentShaderSrc = [
      'precision highp float;',
      '',
      'uniform float iTime;',
      'uniform vec2  iResolution;',
      '',
      'uniform vec2  rayPos;',
      'uniform vec2  rayDir;',
      'uniform vec3  raysColor;',
      'uniform float raysSpeed;',
      'uniform float lightSpread;',
      'uniform float rayLength;',
      'uniform float pulsating;',
      'uniform float fadeDistance;',
      'uniform float saturation;',
      'uniform vec2  mousePos;',
      'uniform float mouseInfluence;',
      'uniform float noiseAmount;',
      'uniform float distortion;',
      '',
      'varying vec2 vUv;',
      '',
      'float noise(vec2 st) {',
      '  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);',
      '}',
      '',
      'float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,',
      '                  float seedA, float seedB, float speed) {',
      '  vec2 sourceToCoord = coord - raySource;',
      '  vec2 dirNorm = normalize(sourceToCoord);',
      '  float cosAngle = dot(dirNorm, rayRefDirection);',
      '',
      '  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;',
      '  ',
      '  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));',
      '',
      '  float distance = length(sourceToCoord);',
      '  float maxDistance = iResolution.x * rayLength;',
      '  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);',
      '  ',
      '  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);',
      '  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;',
      '',
      '  float baseStrength = clamp(',
      '    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +',
      '    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),',
      '    0.0, 1.0',
      '  );',
      '',
      '  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;',
      '}',
      '',
      'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
      '  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);',
      '  ',
      '  vec2 finalRayDir = rayDir;',
      '  if (mouseInfluence > 0.0) {',
      '    vec2 mouseScreenPos = mousePos * iResolution.xy;',
      '    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);',
      '    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));',
      '  }',
      '',
      '  vec4 rays1 = vec4(1.0) *',
      '               rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);',
      '  vec4 rays2 = vec4(1.0) *',
      '               rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed);',
      '',
      '  fragColor = rays1 * 0.5 + rays2 * 0.4;',
      '',
      '  if (noiseAmount > 0.0) {',
      '    float n = noise(coord * 0.01 + iTime * 0.1);',
      '    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);',
      '  }',
      '',
      '  float brightness = 1.0 - (coord.y / iResolution.y);',
      '  fragColor.x *= 0.1 + brightness * 0.8;',
      '  fragColor.y *= 0.3 + brightness * 0.6;',
      '  fragColor.z *= 0.5 + brightness * 0.5;',
      '',
      '  if (saturation != 1.0) {',
      '    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));',
      '    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);',
      '  }',
      '',
      '  fragColor.rgb *= raysColor;',
      '',
      '  // v5.8 — 严格 mask：让左右 letterbox 区域完全透明（消除"白色三角"）',
      '  // 1) alpha gate: 非光线核心区强制 alpha=0',
      '  // 2) overall dim: 整体 alpha *0.40',
      '  // 3) vertical mask: 仅顶部 30% 有光线',
      '  // 4) horizontal mask: 中央 60% 强光区，25-35% 边缘处归零，',
      '  //    左右 letterbox (35% 之外) 完全透明',
      '  float colorStrength = max(fragColor.r, max(fragColor.g, fragColor.b));',
      '  float baseAlpha = step(0.30, colorStrength) * 0.40;',
      '  float verticalMask = 1.0 - smoothstep(0.15, 0.40, coord.y / iResolution.y);',
      '  float horizontalMask = 1.0 - smoothstep(0.15, 0.30, abs(coord.x / iResolution.x - 0.5));',
      '  fragColor.a = baseAlpha * verticalMask * horizontalMask;',
      '}',
      '',
      'void main() {',
      '  vec4 color;',
      '  mainImage(color, gl_FragCoord.xy);',
      '  gl_FragColor = color;',
      '}'
    ].join('\n');

    // ----------------------------------------------------------------
    // 编译 + 链接
    // ----------------------------------------------------------------
    function compileShader(type, src){
      var shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[LightRays] shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    var vs = compileShader(gl.VERTEX_SHADER,   vertexShaderSrc);
    var fs = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
    if (!vs || !fs) return;

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[LightRays] program link error:', gl.getProgramInfoLog(program));
      return;
    }

    // ----------------------------------------------------------------
    // 全屏 quad buffer
    // ----------------------------------------------------------------
    var positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    var positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // ----------------------------------------------------------------
    // Uniforms
    // ----------------------------------------------------------------
    var u = {
      iTime:          gl.getUniformLocation(program, 'iTime'),
      iResolution:    gl.getUniformLocation(program, 'iResolution'),
      rayPos:         gl.getUniformLocation(program, 'rayPos'),
      rayDir:         gl.getUniformLocation(program, 'rayDir'),
      raysColor:      gl.getUniformLocation(program, 'raysColor'),
      raysSpeed:      gl.getUniformLocation(program, 'raysSpeed'),
      lightSpread:    gl.getUniformLocation(program, 'lightSpread'),
      rayLength:      gl.getUniformLocation(program, 'rayLength'),
      pulsating:      gl.getUniformLocation(program, 'pulsating'),
      fadeDistance:   gl.getUniformLocation(program, 'fadeDistance'),
      saturation:     gl.getUniformLocation(program, 'saturation'),
      mousePos:       gl.getUniformLocation(program, 'mousePos'),
      mouseInfluence: gl.getUniformLocation(program, 'mouseInfluence'),
      noiseAmount:    gl.getUniformLocation(program, 'noiseAmount'),
      distortion:     gl.getUniformLocation(program, 'distortion')
    };

    // ----------------------------------------------------------------
    // Mouse tracking（仅当 followMouse）
    // ----------------------------------------------------------------
    var mouseRef        = { x: 0.5, y: 0.5 };
    var smoothMouseRef  = { x: 0.5, y: 0.5 };
    var mouseHandler = function(e){
      var rect = container.getBoundingClientRect();
      mouseRef.x = (e.clientX - rect.left) / rect.width;
      mouseRef.y = (e.clientY - rect.top)  / rect.height;
    };
    if (followMouse) {
      window.addEventListener('mousemove', mouseHandler);
    }

    // ----------------------------------------------------------------
    // Resize handler
    // ----------------------------------------------------------------
    function updatePlacement(){
      var rect = container.getBoundingClientRect();
      var dpr  = Math.min(window.devicePixelRatio || 1, 2);
      var w    = Math.max(1, Math.floor(rect.width  * dpr));
      var h    = Math.max(1, Math.floor(rect.height * dpr));
      if (container.width !== w || container.height !== h) {
        container.width  = w;
        container.height = h;
      }
      gl.viewport(0, 0, container.width, container.height);

      gl.useProgram(program);
      gl.uniform2f(u.iResolution, container.width, container.height);

      var ad = getAnchorAndDir(raysOrigin, container.width, container.height);
      gl.uniform2f(u.rayPos, ad.anchor[0], ad.anchor[1]);
      gl.uniform2f(u.rayDir, ad.dir[0],    ad.dir[1]);
    }

    window.addEventListener('resize', updatePlacement);

    // 初始化 uniforms
    gl.useProgram(program);
    var rgb = hexToRgb(raysColor);
    gl.uniform3f(u.raysColor,      rgb[0], rgb[1], rgb[2]);
    gl.uniform1f(u.raysSpeed,      raysSpeed);
    gl.uniform1f(u.lightSpread,    lightSpread);
    gl.uniform1f(u.rayLength,      rayLength);
    gl.uniform1f(u.pulsating,      pulsating ? 1.0 : 0.0);
    gl.uniform1f(u.fadeDistance,   fadeDistance);
    gl.uniform1f(u.saturation,     saturation);
    gl.uniform2f(u.mousePos,       0.5, 0.5);
    gl.uniform1f(u.mouseInfluence, mouseInfluence);
    gl.uniform1f(u.noiseAmount,    noiseAmount);
    gl.uniform1f(u.distortion,     distortion);

    updatePlacement();

    // ----------------------------------------------------------------
    // Render loop
    // ----------------------------------------------------------------
    var isVisible = true;
    var startTime = performance.now();

    document.addEventListener('visibilitychange', function(){
      isVisible = !document.hidden;
    });

    function render(now){
      if (!isVisible) {
        requestAnimationFrame(render);
        return;
      }

      gl.useProgram(program);
      gl.uniform1f(u.iTime, (now - startTime) / 1000);

      if (followMouse && mouseInfluence > 0.0) {
        var smoothing = 0.92;
        smoothMouseRef.x = smoothMouseRef.x * smoothing + mouseRef.x * (1 - smoothing);
        smoothMouseRef.y = smoothMouseRef.y * smoothing + mouseRef.y * (1 - smoothing);
        gl.uniform2f(u.mousePos, smoothMouseRef.x, smoothMouseRef.y);
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
    console.log('[LightRays] booted (origin=' + raysOrigin + ', color=' + raysColor + ', speed=' + raysSpeed + ')');
  };
})();
