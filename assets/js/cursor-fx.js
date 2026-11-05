/* Cursor FX — lerped ring + dot cursor with magnetic pull on
   primary buttons/nav icons/cards. Desktop fine-pointer only,
   off for touch devices and prefers-reduced-motion, and capped
   to 1-2 focal interactions per the project's own UX guidance
   (sidebar nav icons + primary CTAs + showcase cards only). */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (reduced || !canHover) return;

  document.documentElement.classList.add("has-cursor-fx", "cfx-hidden");

  var dot = document.createElement("div");
  dot.className = "cfx-dot";
  var ring = document.createElement("div");
  ring.className = "cfx-ring";
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  var mouseX = window.innerWidth / 2;
  var mouseY = window.innerHeight / 2;
  var ringX = mouseX;
  var ringY = mouseY;
  var visible = false;

  document.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!visible) {
      visible = true;
      document.documentElement.classList.remove("cfx-hidden");
    }
  });

  document.addEventListener("mouseleave", function () {
    document.documentElement.classList.add("cfx-hidden");
  });

  function tick() {
    dot.style.transform = "translate(" + mouseX + "px," + mouseY + "px) translate(-50%,-50%)";
    // lerp the ring for a soft trailing feel
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.transform = "translate(" + ringX + "px," + ringY + "px) translate(-50%,-50%)";
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Ring grows + tints over interactive focal elements
  var interactive = document.querySelectorAll(
    "a, button, .nav-menu a, .mw-card, input, textarea"
  );
  interactive.forEach(function (el) {
    el.addEventListener("mouseenter", function () {
      document.documentElement.classList.add("cfx-active");
    });
    el.addEventListener("mouseleave", function () {
      document.documentElement.classList.remove("cfx-active");
    });
  });

  // Restrained magnetic pull — only the hero's "Read More" link,
  // the sidebar nav icons, and the contact submit button, so it
  // stays to a couple of focal spots rather than the whole page.
  var magnets = document.querySelectorAll(
    ".mh-text-left > a, .nav-menu a, .php-email-form button[type='submit']"
  );
  magnets.forEach(function (el) {
    el.classList.add("cfx-magnetic");
    el.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      var relX = (e.clientX - r.left - r.width / 2) * 0.28;
      var relY = (e.clientY - r.top - r.height / 2) * 0.28;
      el.style.transform = "translate(" + relX + "px," + relY + "px)";
    });
    el.addEventListener("mouseleave", function () {
      el.style.transform = "translate(0,0)";
    });
  });
})();
