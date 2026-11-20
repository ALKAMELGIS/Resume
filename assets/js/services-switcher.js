/* Services switcher — a vertical pill tab list on the left drives a
   stacked photo-card carousel on the right. All cards exist in the DOM
   at once; only their status class (active / prev / next / hidden)
   changes, so the browser can transition transform/opacity/filter
   smoothly between them — the same idea as an AnimatePresence stack,
   done with plain CSS transitions. */
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
    var stack = root.querySelector(".svc-stack");
    if (!stack) return;

    // Bare cards now — just a slot to host the live 3D model, no badge,
    // no caption, no scrim. The sector name/description already live in
    // the left-hand tab list, so the card itself stays undecorated.
    var cards = items.map(function (item, index) {
      var card = document.createElement("div");
      card.className = "svc-card icon-box " + (item.variant || "svc-dark");

      var photo = document.createElement("div");
      photo.className = "svc-card-photo";

      card.appendChild(photo);
      stack.appendChild(card);
      return card;
    });

    function statusFor(index) {
      var diff = index - active;
      var half = n / 2;
      if (diff > half) diff -= n;
      if (diff < -half) diff += n;
      if (diff === 0) return "active";
      if (diff === -1) return "prev";
      if (diff === 1) return "next";
      return "hidden";
    }

    function render() {
      cards.forEach(function (card, index) {
        card.classList.remove("is-active", "is-prev", "is-next", "is-hidden");
        card.classList.add("is-" + statusFor(index));
      });
      tabs.forEach(function (tab, i) {
        tab.classList.toggle("is-active", i === active);
      });
      // Let the (separately loaded) 3D icon module know which card is now
      // active, so it can move its canvas into that card's photo slot.
      root.dispatchEvent(
        new CustomEvent("svc:active-change", {
          detail: {
            index: active,
            card: cards[active],
            photoEl: cards[active].querySelector(".svc-card-photo"),
          },
        })
      );
    }

    function goTo(index) {
      if (index === active) return;
      active = index;
      render();
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

    render();
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
