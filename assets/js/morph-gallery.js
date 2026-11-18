/* Morph Gallery — vanilla-JS/WebGL port of a noise-dissolve image gallery.
   One full-screen-style shader pass morphs between two photos: an fbm
   noise field gives every pixel a threshold, and the dissolve progress
   sweeps past those thresholds so the outgoing frame tears into drifting
   tatters instead of cutting or cross-fading. The threshold is biased by
   the incoming frame's luminance, so its bright areas burn through first.

   No React, no build step — plain WebGL1 driven from a data-items JSON
   attribute, matching how the rest of this site's components work. */
(function () {
  "use strict";

  function wrapIndex(i, n, loop) {
    if (n <= 0) return 0;
    return loop ? (((i % n) + n) % n) : Math.min(Math.max(i, 0), n - 1);
  }

  function easeInOutQuint(t) {
    var x = Math.min(Math.max(t, 0), 1);
    return x < 0.5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(-2 * x + 2, 5) / 2;
  }

  var VERT = [
    "attribute vec2 a_position;",
    "varying vec2 v_uv;",
    "void main() {",
    "  v_uv = a_position * 0.5 + 0.5;",
    "  gl_Position = vec4(a_position, 0.0, 1.0);",
    "}",
  ].join("\n");

  var FRAG = [
    "precision highp float;",
    "",
    "uniform sampler2D u_from;",
    "uniform sampler2D u_to;",
    "uniform float u_progress;",
    "uniform vec2 u_resolution;",
    "uniform float u_fromAspect;",
    "uniform float u_toAspect;",
    "uniform float u_scale;",
    "uniform float u_direction;",
    "uniform float u_edge;",
    "uniform float u_drift;",
    "",
    "varying vec2 v_uv;",
    "",
    "vec3 permute(vec3 x) {",
    "  return mod(((x * 34.0) + 1.0) * x, 289.0);",
    "}",
    "",
    "float snoise(vec2 v) {",
    "  const vec4 C = vec4(",
    "    0.211324865405187,",
    "    0.366025403784439,",
    "   -0.577350269189626,",
    "    0.024390243902439",
    "  );",
    "  vec2 i  = floor(v + dot(v, C.yy));",
    "  vec2 x0 = v - i + dot(i, C.xx);",
    "  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);",
    "  vec4 x12 = x0.xyxy + C.xxzz;",
    "  x12.xy -= i1;",
    "  i = mod(i, 289.0);",
    "  vec3 p = permute(",
    "    permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0)",
    "  );",
    "  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);",
    "  m = m * m;",
    "  m = m * m;",
    "  vec3 x  = 2.0 * fract(p * C.www) - 1.0;",
    "  vec3 h  = abs(x) - 0.5;",
    "  vec3 ox = floor(x + 0.5);",
    "  vec3 a0 = x - ox;",
    "  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);",
    "  vec3 g;",
    "  g.x  = a0.x  * x0.x  + h.x  * x0.y;",
    "  g.yz = a0.yz * x12.xz + h.yz * x12.yw;",
    "  return 130.0 * dot(m, g);",
    "}",
    "",
    "float fbm(vec2 v) {",
    "  float value = 0.0;",
    "  float amplitude = 0.5;",
    "  for (int i = 0; i < 5; i++) {",
    "    value += amplitude * snoise(v);",
    "    v *= 2.0;",
    "    amplitude *= 0.5;",
    "  }",
    "  return value;",
    "}",
    "",
    "vec2 mirror(vec2 uv) {",
    "  return 1.0 - abs(1.0 - mod(uv, 2.0));",
    "}",
    "",
    "// \"cover\" mapping: the image always fills the box edge-to-edge,",
    "// no background bars — the longer dimension is cropped instead.",
    "vec2 coverUV(vec2 uv, float imgAspect) {",
    "  float canvasAspect = u_resolution.x / u_resolution.y;",
    "  vec2 scale = (canvasAspect > imgAspect)",
    "    ? vec2(1.0, imgAspect / canvasAspect)",
    "    : vec2(canvasAspect / imgAspect, 1.0);",
    "  return mirror((uv - 0.5) * scale + 0.5);",
    "}",
    "",
    "void main() {",
    "  float adjusted = u_progress * (1.0 + 2.0 * u_edge) - u_edge;",
    "",
    "  float noise = fbm(v_uv * u_scale + vec2(0.0, u_progress * u_direction)) * 0.5 + 0.5;",
    "  noise = smoothstep(",
    "    0.0,",
    "    2.0,",
    "    length(texture2D(u_to, coverUV(v_uv, u_toAspect)).rgb) + noise",
    "  );",
    "",
    "  float mixFactor = 1.0 - smoothstep(adjusted - u_edge, adjusted + u_edge, noise);",
    "",
    "  vec2 fromUV = coverUV(",
    "    v_uv + vec2(0.0, noise * u_progress * u_drift * u_direction),",
    "    u_fromAspect",
    "  );",
    "  vec2 toUV = coverUV(",
    "    v_uv + vec2(0.0, noise * (1.0 - u_progress) * -0.5 * u_drift * u_direction),",
    "    u_toAspect",
    "  );",
    "",
    "  gl_FragColor = vec4(mix(texture2D(u_from, fromUV).rgb, texture2D(u_to, toUV).rgb, mixFactor), 1.0);",
    "}",
  ].join("\n");

  function compile(gl, type, src) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error("shader compile failed: " + log);
    }
    return shader;
  }

  function link(gl, vertSrc, fragSrc) {
    var vert = compile(gl, gl.VERTEX_SHADER, vertSrc);
    var frag = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
    var program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error("program link failed: " + log);
    }
    return program;
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error("could not load " + src));
      };
      img.src = src;
    });
  }

  function init(root) {
    var items;
    try {
      items = JSON.parse(root.getAttribute("data-items"));
    } catch (e) {
      return;
    }
    if (!items || !items.length) return;

    var opts = {
      duration: parseInt(root.getAttribute("data-duration"), 10) || 1500,
      noiseScale: parseFloat(root.getAttribute("data-noise-scale")) || 3.5,
      edge: parseFloat(root.getAttribute("data-edge")) || 0.15,
      drift: parseFloat(root.getAttribute("data-drift")) || 0.5,
      autoplay: parseInt(root.getAttribute("data-autoplay"), 10) || 0,
      loop: root.getAttribute("data-loop") !== "false",
    };

    var canvas = root.querySelector(".mg-canvas");
    var titleEl = root.querySelector(".mg-title");
    var descEl = root.querySelector(".mg-desc");
    var openLink = root.querySelector(".mg-open");
    var thumbsWrap = root.querySelector(".mg-thumbs");
    var prevBtn = root.querySelector(".mg-arrow-prev");
    var nextBtn = root.querySelector(".mg-arrow-next");

    var len = items.length;
    var active = 0;
    var failed = false;

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window
      .matchMedia("(prefers-reduced-motion: reduce)")
      .addEventListener("change", function (e) {
        reduced = e.matches;
      });

    var thumbEls = items.map(function (item, i) {
      var li = document.createElement("li");
      li.className = "mg-thumb-item";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-thumb";
      btn.setAttribute("aria-label", item.title ? "Show " + item.title : "Show image " + (i + 1));
      var img = document.createElement("img");
      img.src = item.thumb || item.img;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      btn.appendChild(img);
      btn.addEventListener("click", function () {
        go(i);
      });
      li.appendChild(btn);
      thumbsWrap.appendChild(li);
      return btn;
    });

    function updateInfo() {
      var item = items[active];
      if (titleEl) titleEl.textContent = item.title || "";
      if (descEl) descEl.textContent = item.desc || "";
      if (openLink) {
        if (item.href) {
          openLink.style.display = "inline-flex";
          openLink.setAttribute("href", item.href);
        } else {
          openLink.style.display = "none";
        }
      }
      thumbEls.forEach(function (el, i) {
        el.classList.toggle("is-active", i === active);
        el.setAttribute("aria-current", i === active ? "true" : "false");
      });
      var activeThumb = thumbEls[active];
      if (activeThumb && typeof activeThumb.scrollIntoView === "function") {
        activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
      if (prevBtn) prevBtn.disabled = !opts.loop && active === 0;
      if (nextBtn) nextBtn.disabled = !opts.loop && active === len - 1;
    }

    var request = null;

    function go(next) {
      var wrapped = wrapIndex(next, len, opts.loop);
      if (wrapped === active) return;
      request = { from: active, to: wrapped };
      active = wrapped;
      updateInfo();
    }

    function showFallback() {
      failed = true;
      canvas.style.display = "none";
      var wrap = document.createElement("div");
      wrap.className = "mg-fallback";
      var imgs = items.map(function (item, i) {
        var img = document.createElement("img");
        img.src = item.img;
        img.alt = item.title || "";
        img.className = "mg-fallback-img";
        img.style.opacity = i === active ? "1" : "0";
        wrap.appendChild(img);
        return img;
      });
      root.insertBefore(wrap, canvas);
      var origUpdate = updateInfo;
      updateInfo = function () {
        origUpdate();
        imgs.forEach(function (img, i) {
          img.style.opacity = i === active ? "1" : "0";
        });
      };
      updateInfo();
    }

    var gl =
      canvas.getContext("webgl", { alpha: false, antialias: false }) ||
      canvas.getContext("experimental-webgl");

    if (!gl) {
      showFallback();
    } else {
      startWebGL(gl);
    }

    function startWebGL(gl) {
      var program = null;
      var buffer = null;
      var textures = items.map(function () {
        return null;
      });
      var aspects = items.map(function () {
        return 1;
      });
      var raf = 0;
      var disposed = false;
      var uniforms = {};

      var from = active;
      var to = active;
      var progress = 1;
      var startedAt = 0;
      var direction = 1;

      function onLost(e) {
        e.preventDefault();
        cancelAnimationFrame(raf);
      }
      canvas.addEventListener("webglcontextlost", onLost);

      function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.round(canvas.clientWidth * dpr);
        var h = Math.round(canvas.clientHeight * dpr);
        if (w === 0 || h === 0 || (canvas.width === w && canvas.height === h)) return;
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      var observer = new ResizeObserver(resize);
      observer.observe(canvas);

      function pick(i) {
        if (textures[i]) return textures[i];
        for (var k = 0; k < textures.length; k++) {
          if (textures[k]) return textures[k];
        }
        return null;
      }

      function draw() {
        if (disposed) return;

        if (request) {
          var pending = request;
          request = null;
          if (pending.from !== pending.to) {
            from = pending.from;
            to = pending.to;
            progress = 0;
            startedAt = performance.now();
            var n = len;
            var forward = opts.loop
              ? ((pending.to - pending.from + n) % n) * 2 <= n
              : pending.to > pending.from;
            direction = forward ? 1 : -1;
          }
        }

        if (progress < 1) {
          var span = reduced ? 0 : Math.max(opts.duration, 1);
          var elapsed = performance.now() - startedAt;
          progress = span === 0 ? 1 : easeInOutQuint(Math.min(elapsed / span, 1));
        }

        var fromTex = pick(from);
        var toTex = pick(to);
        if (!fromTex || !toTex) return;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fromTex);
        gl.uniform1i(uniforms.from, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, toTex);
        gl.uniform1i(uniforms.to, 1);

        gl.uniform1f(uniforms.progress, progress);
        gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
        gl.uniform1f(uniforms.fromAspect, aspects[from] || 1);
        gl.uniform1f(uniforms.toAspect, aspects[to] || 1);
        gl.uniform1f(uniforms.scale, opts.noiseScale);
        gl.uniform1f(uniforms.direction, direction);
        gl.uniform1f(uniforms.edge, Math.max(opts.edge, 0.001));
        gl.uniform1f(uniforms.drift, opts.drift);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      function frame() {
        draw();
        raf = requestAnimationFrame(frame);
      }

      (function start() {
        try {
          program = link(gl, VERT, FRAG);
          gl.useProgram(program);

          buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
          );
          var loc = gl.getAttribLocation(program, "a_position");
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

          ["from", "to", "progress", "resolution", "fromAspect", "toAspect", "scale", "direction", "edge", "drift"].forEach(
            function (name) {
              uniforms[name] = gl.getUniformLocation(program, "u_" + name);
            }
          );

          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

          var running = false;
          var refused = 0;

          items.forEach(function (item, i) {
            loadImage(item.img).then(
              function (img) {
                if (disposed) return;
                var tex = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                textures[i] = tex;
                aspects[i] = img.naturalWidth / Math.max(img.naturalHeight, 1);
                if (!running) {
                  running = true;
                  resize();
                  root.classList.add("is-ready");
                  raf = requestAnimationFrame(frame);
                }
              },
              function () {
                refused += 1;
                if (refused === items.length && !disposed) {
                  observer.disconnect();
                  canvas.removeEventListener("webglcontextlost", onLost);
                  showFallback();
                }
              }
            );
          });
        } catch (e) {
          if (!disposed) {
            observer.disconnect();
            canvas.removeEventListener("webglcontextlost", onLost);
            showFallback();
          }
        }
      })();

      root.addEventListener(
        "mg-dispose",
        function () {
          disposed = true;
          cancelAnimationFrame(raf);
          observer.disconnect();
          canvas.removeEventListener("webglcontextlost", onLost);
          textures.forEach(function (tex) {
            if (tex) gl.deleteTexture(tex);
          });
          if (buffer) gl.deleteBuffer(buffer);
          if (program) gl.deleteProgram(program);
        },
        { once: true }
      );

      updateInfo();
    }

    // ---- autoplay ----------------------------------------------------
    var paused = false;
    var hovering = false;

    function syncPaused() {
      paused = hovering || document.hidden;
    }

    if (opts.autoplay && len > 1) {
      var timer = setInterval(function () {
        syncPaused();
        if (paused || reduced) return;
        go(active + 1);
      }, Math.max(opts.autoplay, 600));
    }

    document.addEventListener("visibilitychange", syncPaused);
    root.addEventListener("mouseenter", function () {
      hovering = true;
    });
    root.addEventListener("mouseleave", function () {
      hovering = false;
    });
    root.addEventListener("focusin", function () {
      hovering = true;
    });
    root.addEventListener("focusout", function () {
      hovering = false;
    });

    // ---- pointer / keyboard -------------------------------------------
    var swipeStartX = null;
    root.addEventListener("pointerdown", function (e) {
      swipeStartX = e.clientX;
    });
    root.addEventListener("pointerup", function (e) {
      if (swipeStartX === null) return;
      var dx = e.clientX - swipeStartX;
      swipeStartX = null;
      if (Math.abs(dx) > 48) go(active + (dx < 0 ? 1 : -1));
    });

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(active - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(active + 1);
      }
    });

    if (prevBtn) prevBtn.addEventListener("click", function () { go(active - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(active + 1); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".mg-root").forEach(init);
  });
})();
