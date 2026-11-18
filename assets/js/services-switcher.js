/* Services switcher — a vertical pill tab list that drives a single
   animated display card (icon + chip + tagline), cross-fading between
   services and auto-rotating, with a couple of ghost cards behind it
   for the stacked-deck look. */
(function () {
  "use strict";

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

    var tabs = Array.prototype.slice.call(root.querySelectorAll(".svc-tab"));
    var card = root.querySelector(".svc-card");
    var iconEl = card.querySelector(".svc-card-icon i");
    var chipEl = card.querySelector(".svc-chip");
    var taglineEl = card.querySelector(".svc-tagline");

    function pad(n) {
      return n < 10 ? "0" + n : "" + n;
    }

    function applyIndex(index) {
      var item = items[index];
      card.className = "svc-card icon-box " + (item.variant || "svc-dark");
      iconEl.className = item.icon;
      chipEl.textContent = pad(index + 1) + " • " + item.tag.toUpperCase();
      taglineEl.textContent = item.desc;
      tabs.forEach(function (tab, i) {
        tab.classList.toggle("is-active", i === index);
      });
    }

    function goTo(index) {
      if (index === active) return;
      active = index;
      card.classList.add("is-fading");
      window.setTimeout(function () {
        applyIndex(active);
        card.classList.remove("is-fading");
      }, 220);
      restartAutoplay();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        goTo(i);
      });
    });

    var autoplayTimer = null;
    var autoplayPaused = false;

    function startAutoplay() {
      if (!autoplayMs || n <= 1 || prefersReducedMotion()) return;
      stopAutoplay();
      autoplayTimer = window.setInterval(function () {
        if (!autoplayPaused && !document.hidden) goTo((active + 1) % n);
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

    startAutoplay();
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
