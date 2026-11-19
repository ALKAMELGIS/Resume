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

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
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

    var cards = items.map(function (item, index) {
      var card = document.createElement("div");
      card.className = "svc-card icon-box " + (item.variant || "svc-dark");

      var photo = document.createElement("div");
      photo.className = "svc-card-photo";

      var scrim = document.createElement("div");
      scrim.className = "svc-card-scrim";
      scrim.setAttribute("aria-hidden", "true");

      var badge = document.createElement("span");
      badge.className = "svc-badge";
      var dot = document.createElement("span");
      dot.className = "svc-dot";
      badge.appendChild(dot);
      badge.appendChild(document.createTextNode("GIS • RS • AI"));

      var icon = document.createElement("div");
      icon.className = "svc-card-icon";
      var iconI = document.createElement("i");
      iconI.className = item.icon || "";
      icon.appendChild(iconI);

      var footer = document.createElement("div");
      footer.className = "svc-card-footer";
      var chip = document.createElement("span");
      chip.className = "svc-chip";
      chip.textContent = pad(index + 1) + " • " + (item.tag || "").toUpperCase();
      var tagline = document.createElement("p");
      tagline.className = "svc-tagline";
      tagline.textContent = item.desc || "";
      footer.appendChild(chip);
      footer.appendChild(tagline);

      card.appendChild(photo);
      card.appendChild(scrim);
      card.appendChild(badge);
      card.appendChild(icon);
      card.appendChild(footer);
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
