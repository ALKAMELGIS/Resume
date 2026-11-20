/* Services 3D icons — a single Three.js scene, procedurally built (no
   models, no images), whose "icon" group is swapped for each sector
   and whose canvas is moved into whichever card is currently active.
   Inspired by the same box/cylinder/material-helper approach as the
   "Agentic Factory" three.js demo, adapted into six small GIS-sector
   icons instead of one large machine. */
import * as THREE from "three";

(function () {
  "use strict";

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function supportsWebGL() {
    try {
      var canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  }

  // ---------------------------------------------------------------
  // Small helpers, same spirit as the reference prompt's box()/cyl()/
  // ball() utilities: one line per primitive, parented and positioned.
  // ---------------------------------------------------------------
  var PALETTE = {
    amber: 0xe2a948,
    navy: 0x1c2d4a,
    ivory: 0xf3efe6,
    chrome: 0xcdd4d9,
    steel: 0x62707f,
    dark: 0x12171d,
  };

  function mat(color, metalness, roughness, extra) {
    var params = { color: color, metalness: metalness, roughness: roughness };
    if (extra) for (var k in extra) params[k] = extra[k];
    return new THREE.MeshStandardMaterial(params);
  }

  var M = {
    amber: mat(PALETTE.amber, 0.45, 0.35),
    navy: mat(PALETTE.navy, 0.3, 0.55),
    ivory: mat(PALETTE.ivory, 0.08, 0.6),
    chrome: mat(PALETTE.chrome, 0.85, 0.22),
    steel: mat(PALETTE.steel, 0.55, 0.4),
    dark: mat(PALETTE.dark, 0.35, 0.55),
    glass: mat(0x8fb3cf, 0.2, 0.15, { transparent: true, opacity: 0.35 }),
    glow: mat(PALETTE.amber, 0.2, 0.3, {
      emissive: PALETTE.amber,
      emissiveIntensity: 1.5,
    }),
    glowWhite: mat(0xfff3d7, 0.1, 0.3, {
      emissive: 0xfff0d0,
      emissiveIntensity: 1.6,
    }),
    leaf: mat(0x8fae6b, 0.1, 0.55),
  };

  function box(parent, w, h, d, x, y, z, m) {
    var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || M.ivory);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }

  function cyl(parent, rt, rb, h, x, y, z, m, segments) {
    var o = new THREE.Mesh(
      new THREE.CylinderGeometry(rt, rb, h, segments || 24),
      m || M.chrome
    );
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }

  function ball(parent, r, x, y, z, m) {
    var o = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m || M.chrome);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }

  function ring(parent, r, tube, x, y, z, m) {
    var o = new THREE.Mesh(
      new THREE.TorusGeometry(r, tube, 8, 36),
      m || M.amber
    );
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }

  // A thin expanding ring used as a "scan pulse" / "radar sweep". Call
  // the returned function each frame with an elapsed time to animate it.
  function pulse(parent, x, y, z, color, periodSeconds, rotateFlat) {
    var m = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    var o = new THREE.Mesh(new THREE.RingGeometry(0.01, 0.05, 28), m);
    o.position.set(x, y, z);
    if (rotateFlat) o.rotation.x = -Math.PI / 2;
    parent.add(o);
    return function (t) {
      var phase = (t % periodSeconds) / periodSeconds;
      var scale = 0.15 + phase * 1.6;
      o.scale.set(scale, scale, scale);
      m.opacity = Math.max(0, 0.55 * (1 - phase));
    };
  }

  // ---------------------------------------------------------------
  // Six builders, one per service sector (same order as the Services
  // data-items). Each returns a THREE.Group centred near the origin;
  // group.userData.update(t), if set, animates the moving parts.
  // ---------------------------------------------------------------

  // 0 — Government & Municipalities: a small domed civic building.
  function buildGovernment() {
    var g = new THREE.Group();
    box(g, 2.5, 0.16, 1.7, 0, -0.55, 0, M.chrome);
    box(g, 2.1, 0.14, 1.35, 0, -0.42, 0, M.ivory);
    box(g, 1.75, 1.05, 1.05, 0, 0.08, 0, M.ivory);
    for (var i = 0; i < 5; i++) {
      cyl(g, 0.065, 0.065, 1.0, -0.66 + i * 0.33, 0.08, 0.57, M.chrome, 12);
    }
    box(g, 1.95, 0.12, 1.2, 0, 0.62, 0, M.navy);
    ball(g, 0.46, 0, 0.98, 0, M.amber);
    cyl(g, 0.03, 0.03, 0.26, 0, 1.46, 0, M.chrome, 8);
    ball(g, 0.06, 0, 1.6, 0, M.glow);
    return g;
  }

  // 1 — Oil & Gas: a nodding-donkey pump jack with a slowly rocking beam.
  function buildOilGas() {
    var g = new THREE.Group();
    box(g, 1.6, 0.12, 1.1, 0, -0.55, 0, M.steel);
    box(g, 0.22, 1.3, 0.22, -0.55, 0.05, 0, M.dark);
    box(g, 0.22, 1.3, 0.22, 0.1, 0.05, 0.32, M.dark);
    var pivot = new THREE.Group();
    pivot.position.set(-0.2, 0.68, 0.1);
    g.add(pivot);
    var beam = box(pivot, 1.9, 0.12, 0.16, 0.25, 0, 0, M.navy);
    beam.position.set(0.25, 0, 0);
    box(pivot, 0.4, 0.3, 0.26, -0.85, -0.08, 0, M.dark);
    box(pivot, 0.3, 0.22, 0.2, 1.1, -0.1, 0, M.amber);
    cyl(pivot, 0.05, 0.05, 0.9, 1.1, -0.55, 0, M.chrome, 10);
    var crank = cyl(g, 0.28, 0.28, 0.14, -0.55, 0.14, 0.32, M.amber, 24);
    crank.rotation.x = Math.PI / 2;
    var pin = ball(crank, 0.05, 0.2, 0, 0.09, M.chrome);
    return Object.assign(g, {
      userData: {
        update: function (t) {
          pivot.rotation.z = Math.sin(t * 1.8) * 0.22;
          crank.rotation.z = t * 1.8;
        },
      },
    });
  }

  // 2 — AI Detection Models: a quadcopter drone with spinning rotors
  // and an expanding scan pulse underneath.
  function buildAI() {
    var g = new THREE.Group();
    box(g, 0.55, 0.22, 0.4, 0, 0.1, 0, M.navy);
    ball(g, 0.1, 0, -0.08, 0.22, M.glow);
    var rotors = [];
    var arms = [
      [0.55, 0.55],
      [0.55, -0.55],
      [-0.55, 0.55],
      [-0.55, -0.55],
    ];
    arms.forEach(function (p) {
      box(g, 0.78, 0.05, 0.05, p[0] * 0.5, 0.1, p[1] * 0.5, M.steel);
      var hub = new THREE.Group();
      hub.position.set(p[0], 0.14, p[1]);
      g.add(hub);
      cyl(hub, 0.05, 0.05, 0.08, 0, 0, 0, M.dark, 10);
      box(hub, 0.5, 0.015, 0.06, 0, 0.05, 0, M.chrome);
      box(hub, 0.06, 0.015, 0.5, 0, 0.05, 0, M.chrome);
      rotors.push(hub);
    });
    var sweep = pulse(g, 0, -0.5, 0, PALETTE.amber, 2.2, true);
    return Object.assign(g, {
      userData: {
        update: function (t) {
          g.position.y = Math.sin(t * 1.4) * 0.07;
          rotors.forEach(function (hub, i) {
            hub.rotation.y = t * (10 + i * 0.6);
          });
          sweep(t);
        },
      },
    });
  }

  // 3 — Infrastructure & Utilities: a lattice transmission tower with
  // a light pulse travelling along the power line.
  function buildInfrastructure() {
    var g = new THREE.Group();
    var legs = [
      [-0.45, -0.45],
      [0.45, -0.45],
      [-0.45, 0.45],
      [0.45, 0.45],
    ];
    legs.forEach(function (p) {
      cyl(g, 0.035, 0.07, 1.7, p[0] * 0.55, 0.1, p[1] * 0.55, M.steel, 8);
    });
    [0.4, 0.75, 1.0].forEach(function (y) {
      var s = 0.9 - y * 0.35;
      box(g, s, 0.03, 0.03, 0, y, s / 2, M.steel);
      box(g, s, 0.03, 0.03, 0, y, -s / 2, M.steel);
      box(g, 0.03, 0.03, s, s / 2, y, 0, M.steel);
      box(g, 0.03, 0.03, s, -s / 2, y, 0, M.steel);
    });
    box(g, 1.3, 0.07, 0.08, 0, 1.08, 0, M.navy);
    [-0.6, 0.6].forEach(function (x) {
      cyl(g, 0.03, 0.045, 0.16, x, 0.98, 0, M.dark, 10);
      ball(g, 0.04, x, 0.9, 0, M.ivory);
    });
    var beacon = ball(g, 0.045, 0, 1.18, 0, M.glow);
    var anchors = [
      new THREE.Vector3(-0.6, 0.9, 0),
      new THREE.Vector3(0.6, 0.9, 0),
    ];
    var wireDrop = new THREE.Vector3(0, 0.55, 0);
    var spark = ball(g, 0.035, 0, 0, 0, M.glowWhite);
    return Object.assign(g, {
      userData: {
        update: function (t) {
          beacon.material.emissiveIntensity = 1.1 + Math.sin(t * 3) * 0.5;
          var phase = (t * 0.6) % 1;
          var p =
            phase < 0.5
              ? anchors[0].clone().lerp(wireDrop, phase * 2)
              : wireDrop.clone().lerp(anchors[1], (phase - 0.5) * 2);
          spark.position.copy(p);
        },
      },
    });
  }

  // 4 — Disaster Management & Risk: a scanning radar dish with a radar
  // sweep pulse and a blinking alert beacon.
  function buildDisaster() {
    var g = new THREE.Group();
    cyl(g, 0.3, 0.36, 0.14, 0, -0.56, 0, M.steel, 20);
    cyl(g, 0.06, 0.06, 1.0, 0, -0.1, 0, M.dark, 10);
    var head = new THREE.Group();
    head.position.set(0, 0.48, 0);
    g.add(head);
    var dish = cyl(head, 0.55, 0.1, 0.1, 0, 0, 0, M.navy, 28);
    dish.rotation.x = Math.PI / 2.6;
    var beacon = ball(head, 0.07, 0, 0.32, 0.12, M.glow);
    var sweep = pulse(g, 0, -0.55, 0, PALETTE.amber, 2.6, true);
    return Object.assign(g, {
      userData: {
        update: function (t) {
          head.rotation.y = Math.sin(t * 0.9) * 0.9;
          beacon.material.emissiveIntensity = 1 + Math.abs(Math.sin(t * 5)) * 1.2;
          sweep(t);
        },
      },
    });
  }

  // 5 — Environment & Agriculture: a wind turbine over small crop rows.
  function buildEnvironment() {
    var g = new THREE.Group();
    for (var i = 0; i < 3; i++) {
      box(g, 1.3, 0.05, 0.14, 0, -0.5 + i * 0.12, 0.35 - i * 0.18, M.leaf);
    }
    cyl(g, 0.045, 0.09, 1.7, 0.35, -0.1, -0.2, M.ivory, 12);
    box(g, 0.22, 0.16, 0.16, 0.35, 0.78, -0.2, M.navy);
    var hub = new THREE.Group();
    hub.position.set(0.35, 0.78, -0.02);
    g.add(hub);
    for (var b = 0; b < 3; b++) {
      var bladePivot = new THREE.Group();
      bladePivot.rotation.z = (b / 3) * Math.PI * 2;
      hub.add(bladePivot);
      box(bladePivot, 0.1, 0.62, 0.02, 0, 0.34, 0, M.ivory);
    }
    ball(g, 0.11, -0.75, 0.9, -0.6, M.glow);
    return Object.assign(g, {
      userData: {
        update: function (t) {
          hub.rotation.z = t * 2.4;
        },
      },
    });
  }

  var builders = [
    buildGovernment,
    buildOilGas,
    buildAI,
    buildInfrastructure,
    buildDisaster,
    buildEnvironment,
  ];

  function disposeGeometries(object) {
    object.traverse(function (child) {
      if (child.geometry) child.geometry.dispose();
    });
  }

  // ---------------------------------------------------------------
  // One shared renderer/scene/camera per .svc-switcher instance. The
  // canvas is reparented into whichever card is currently active.
  // ---------------------------------------------------------------
  function init(root) {
    if (!supportsWebGL()) return;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    // Wider FOV + a lookAt point raised toward the taller models' (the
    // government dome, the transmission tower) middle, so every model
    // fits inside the frame top-to-bottom with room to spare, even on a
    // wide/short card.
    var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.set(2.7, 1.95, 3.45);
    camera.lookAt(0, 0.3, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    var key = new THREE.DirectionalLight(0xfff1d8, 1.7);
    key.position.set(-3, 5, 4);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xbfd0ea, 1.0);
    rim.position.set(3, 2, -4);
    scene.add(rim);

    var iconGroup = new THREE.Group();
    scene.add(iconGroup);

    var reduceMotion = prefersReducedMotion();
    var currentUpdate = null;
    var visible = false;
    var running = false;
    var clock = new THREE.Clock(false);

    function showIcon(index) {
      while (iconGroup.children.length) {
        var child = iconGroup.children[iconGroup.children.length - 1];
        iconGroup.remove(child);
        disposeGeometries(child);
      }
      var builder = builders[index % builders.length];
      var group = builder();
      iconGroup.add(group);
      currentUpdate = (group.userData && group.userData.update) || null;
      renderFrame(clock.running ? clock.getElapsedTime() : 0);
    }

    function resize(container) {
      var w = container.clientWidth || 1;
      var h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    function renderFrame(t) {
      iconGroup.rotation.y = t * 0.22;
      if (currentUpdate) currentUpdate(t);
      renderer.render(scene, camera);
    }

    function loop() {
      if (!running) return;
      requestAnimationFrame(loop);
      renderFrame(clock.getElapsedTime());
    }

    function startLoop() {
      if (reduceMotion || !visible || running) return;
      running = true;
      clock.start();
      requestAnimationFrame(loop);
    }

    function stopLoop() {
      running = false;
      clock.stop();
    }

    root.addEventListener("svc:active-change", function (e) {
      var photoEl = e.detail && e.detail.photoEl;
      if (!photoEl) return;
      photoEl.appendChild(renderer.domElement);
      resize(photoEl);
      showIcon(e.detail.index || 0);
    });

    window.addEventListener("resize", function () {
      if (renderer.domElement.parentElement) {
        resize(renderer.domElement.parentElement);
        renderFrame(clock.running ? clock.getElapsedTime() : 0);
      }
    });

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            visible = entry.isIntersecting;
            if (visible) startLoop();
            else stopLoop();
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(root);
    } else {
      visible = true;
      startLoop();
    }
  }

  function boot() {
    document.querySelectorAll(".svc-switcher").forEach(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
