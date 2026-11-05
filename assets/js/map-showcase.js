/* Map Work Showcase — vanilla-JS fanned card stack.
   Rebuilt from a React/Framer-Motion "card stack" concept into
   plain JS/CSS so it runs in this static HTML site. */
(function () {
  "use strict";

  function wrap(n, len) {
    return ((n % len) + len) % len;
  }

  function signedOffset(i, active, len) {
    var raw = i - active;
    var alt = raw > 0 ? raw - len : raw + len;
    return Math.abs(alt) < Math.abs(raw) ? alt : raw;
  }

  function init(root) {
    var items = JSON.parse(root.getAttribute("data-items"));
    var stage = root.querySelector(".mw-stage");
    var dotsWrap = root.querySelector(".mw-dots");
    var linkWrap = root.querySelector(".mw-open-link-wrap");
    var len = items.length;
    var active = 0;
    var maxOffset = 3;
    var spacing = 92;
    var stepDeg = 10;

    var cardEls = items.map(function (item, i) {
      var el = document.createElement("div");
      el.className = "mw-card";
      el.innerHTML =
        '<img src="' + item.img + '" alt="' + item.title + '">' +
        '<div class="mw-card-info">' +
          '<p class="mw-card-title">' + item.title + "</p>" +
          '<p class="mw-card-desc">' + item.desc + "</p>" +
        "</div>";
      el.addEventListener("click", function (e) {
        if (el.classList.contains("is-active")) return;
        setActive(i);
      });
      stage.appendChild(el);
      return el;
    });

    var dotEls = items.map(function (item, i) {
      var dot = document.createElement("button");
      dot.className = "mw-dot";
      dot.setAttribute("aria-label", "Go to " + item.title);
      dot.addEventListener("click", function () {
        setActive(i);
      });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function render() {
      cardEls.forEach(function (el, i) {
        var off = signedOffset(i, active, len);
        var abs = Math.abs(off);
        var isActive = off === 0;

        if (abs > maxOffset) {
          el.style.display = "none";
          return;
        }
        el.style.display = "block";

        var x = off * spacing;
        var rotate = off * stepDeg;
        var y = abs * 6;
        var scale = isActive ? 1.04 : 1 - abs * 0.045;
        var lift = isActive ? -16 : 0;
        var z = 100 - abs;

        el.style.zIndex = z;
        el.style.transform =
          "translateX(" + x + "px) translateY(" + (y + lift) + "px) rotate(" + rotate + "deg) scale(" + scale + ")";
        el.classList.toggle("is-active", isActive);
      });

      dotEls.forEach(function (dot, i) {
        dot.classList.toggle("is-on", i === active);
      });

      if (linkWrap) {
        var href = items[active].href;
        if (href) {
          linkWrap.style.display = "inline-flex";
          linkWrap.querySelector("a").setAttribute("href", href);
        } else {
          linkWrap.style.display = "none";
        }
      }
    }

    function setActive(i) {
      active = wrap(i, len);
      render();
    }

    function prev() {
      setActive(active - 1);
    }
    function next() {
      setActive(active + 1);
    }

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    });

    // Drag / swipe on the active card
    var dragging = false;
    var startX = 0;

    stage.addEventListener("pointerdown", function (e) {
      var card = e.target.closest(".mw-card");
      if (!card || !card.classList.contains("is-active")) return;
      dragging = true;
      startX = e.clientX;
      card.setPointerCapture(e.pointerId);
    });

    stage.addEventListener("pointerup", function (e) {
      if (!dragging) return;
      dragging = false;
      var travel = e.clientX - startX;
      var threshold = 70;
      if (travel > threshold) prev();
      else if (travel < -threshold) next();
    });

    stage.addEventListener("pointercancel", function () {
      dragging = false;
    });

    // gentle autoplay, pauses on hover
    var hovering = false;
    root.addEventListener("mouseenter", function () { hovering = true; });
    root.addEventListener("mouseleave", function () { hovering = false; });

    var timer = setInterval(function () {
      if (hovering) return;
      next();
    }, 3200);

    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".mw-root").forEach(init);
  });
})();
