/* Moments gallery — continuous auto-scroll over a native scroll
   container (card set duplicated once for a seamless loop), same
   float-accumulator technique as the References marquee (writing
   sub-pixel speeds straight to scrollLeft gets rounded away by the
   browser every frame, so we track position ourselves). Pauses on
   hover/focus; arrow buttons nudge and briefly pause autoplay. */
(function () {
  "use strict";

  function init(root) {
    var rail = root.querySelector(".mo-rail");
    var track = root.querySelector(".mo-track");
    var prevBtn = root.querySelector(".mo-arrow-prev");
    var nextBtn = root.querySelector(".mo-arrow-next");
    if (!rail || !track) return;

    track.innerHTML += track.innerHTML;

    var reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var halfWidth = 0;
    function measure() {
      halfWidth = track.scrollWidth / 2;
    }
    measure();
    window.addEventListener("resize", measure);

    var speed = 0.6; // px per frame, ~36px/s at 60fps
    var paused = false;
    var pauseTimer;
    var pos = rail.scrollLeft;

    function frame() {
      if (!paused && !reduced) {
        pos += speed;
        if (pos >= halfWidth) {
          pos -= halfWidth;
        }
        rail.scrollLeft = pos;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function pauseThenResume(ms) {
      paused = true;
      clearTimeout(pauseTimer);
      pauseTimer = setTimeout(function () {
        pos = rail.scrollLeft;
        paused = false;
      }, ms || 2200);
    }

    root.addEventListener("mouseenter", function () { paused = true; });
    root.addEventListener("mouseleave", function () {
      clearTimeout(pauseTimer);
      pos = rail.scrollLeft;
      paused = false;
    });

    function nudge(dir) {
      pauseThenResume();
      var card = track.querySelector(".mo-card");
      var cardWidth = card ? card.getBoundingClientRect().width + 44 : 260;
      var target = rail.scrollLeft + dir * cardWidth * 2;
      if (target < 0) target += halfWidth;
      if (target >= halfWidth) target -= halfWidth;
      rail.scrollTo({ left: target, behavior: "smooth" });
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { nudge(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { nudge(1); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".mo-wrap").forEach(init);
  });
})();
