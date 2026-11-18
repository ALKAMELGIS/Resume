/* Stack Gallery — a lightweight fanned photo-stack carousel.
   Three plain <img> cards, offset and rotated like a stack of
   prints, sit directly on the page background (no dark canvas).
   Navigating cross-fades the front photo while the two cards
   behind it quietly update, and the caption lives in its own
   block under the stack instead of over the image. */
(function () {
  "use strict";

  function wrapIndex(i, n) {
    if (n <= 0) return 0;
    return ((i % n) + n) % n;
  }

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function init(root) {
    var items;
    try {
      items = JSON.parse(root.getAttribute("data-items") || "[]");
    } catch (err) {
      items = [];
    }
    if (!items.length) return;

    var n = items.length;
    var active = 0;
    var autoplayMs = parseInt(root.getAttribute("data-autoplay"), 10) || 0;
    var wrap = root.closest(".mw-wrap") || root.parentNode;

    var stage = root.querySelector(".ms-stage");
    var titleEl = wrap.querySelector(".ms-title");
    var descEl = wrap.querySelector(".ms-desc");
    var openEl = root.querySelector(".ms-open");
    var prevBtn = root.querySelector(".ms-arrow-prev");
    var nextBtn = root.querySelector(".ms-arrow-next");

    var slots = [0, 1, 2].map(function (depth) {
      var card = document.createElement("div");
      card.className = "ms-card ms-depth-" + depth;
      var img = document.createElement("img");
      img.alt = "";
      card.appendChild(img);
      stage.appendChild(card);
      return card;
    });

    function setCardImage(card, item) {
      var img = card.querySelector("img");
      if (img.getAttribute("data-src") === item.img) return;
      img.setAttribute("data-src", item.img);
      img.classList.remove("is-loaded");
      var next = new Image();
      next.onload = function () {
        if (img.getAttribute("data-src") !== item.img) return;
        img.src = item.img;
        requestAnimationFrame(function () {
          img.classList.add("is-loaded");
        });
      };
      next.onerror = function () {
        img.classList.add("is-loaded");
      };
      next.src = item.img;
    }

    function render() {
      for (var d = 0; d < 3; d++) {
        var item = items[wrapIndex(active + d, n)];
        setCardImage(slots[d], item);
      }

      var current = items[active];
      if (titleEl) titleEl.textContent = current.title || "";
      if (descEl) descEl.textContent = current.desc || "";
      if (openEl) {
        var href = current.href || current.img;
        openEl.setAttribute("href", href);
      }

      if (prevBtn) prevBtn.disabled = n <= 1;
      if (nextBtn) nextBtn.disabled = n <= 1;
    }

    function pulseFront() {
      var front = slots[0];
      front.classList.add("ms-pulse");
      window.setTimeout(function () {
        front.classList.remove("ms-pulse");
      }, 260);
    }

    function goTo(index) {
      var target = wrapIndex(index, n);
      if (target === active) return;
      active = target;
      render();
      if (!prefersReducedMotion()) pulseFront();
      restartAutoplay();
    }

    function next() {
      goTo(active + 1);
    }

    function prev() {
      goTo(active - 1);
    }

    if (prevBtn) prevBtn.addEventListener("click", prev);
    if (nextBtn) nextBtn.addEventListener("click", next);

    // Keyboard navigation.
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        prev();
      } else if (e.key === "ArrowRight") {
        next();
      }
    });

    // Pointer swipe.
    var pointerStartX = null;
    root.addEventListener("pointerdown", function (e) {
      pointerStartX = e.clientX;
    });
    root.addEventListener("pointerup", function (e) {
      if (pointerStartX === null) return;
      var delta = e.clientX - pointerStartX;
      pointerStartX = null;
      if (Math.abs(delta) < 48) return;
      if (delta < 0) {
        next();
      } else {
        prev();
      }
    });

    // Autoplay, paused on hover/focus/hidden tab/reduced motion.
    var autoplayTimer = null;
    var autoplayPaused = false;

    function startAutoplay() {
      if (!autoplayMs || n <= 1 || prefersReducedMotion()) return;
      stopAutoplay();
      autoplayTimer = window.setInterval(function () {
        if (!autoplayPaused && !document.hidden) next();
      }, autoplayMs);
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        window.clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    function restartAutoplay() {
      if (autoplayTimer) startAutoplay();
    }

    root.addEventListener("mouseenter", function () {
      autoplayPaused = true;
    });
    root.addEventListener("mouseleave", function () {
      autoplayPaused = false;
    });
    root.addEventListener("focusin", function () {
      autoplayPaused = true;
    });
    root.addEventListener("focusout", function () {
      autoplayPaused = false;
    });

    render();
    startAutoplay();
  }

  function boot() {
    var roots = document.querySelectorAll(".ms-root");
    roots.forEach(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
