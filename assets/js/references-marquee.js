/* References Marquee — continuous auto-scroll driven by
   requestAnimationFrame over a native scroll container (the
   card list is duplicated once so the loop point is seamless),
   pausing on hover/focus, with arrow buttons that nudge the
   scroll position and briefly pause autoplay. */
(function () {
  "use strict";

  function init(root) {
    var viewport = root.querySelector(".rm-viewport");
    var track = root.querySelector(".rm-track");
    var prevBtn = root.querySelector(".rm-arrow-prev");
    var nextBtn = root.querySelector(".rm-arrow-next");

    // Duplicate the card set once so looping back is seamless
    track.innerHTML += track.innerHTML;

    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var halfWidth = 0;
    function measure() {
      halfWidth = track.scrollWidth / 2;
    }
    measure();
    window.addEventListener("resize", measure);

    var speed = 0.45; // px per frame, ~27px/s at 60fps
    var paused = false;
    var pauseTimer;
    // Track true (fractional) scroll position ourselves — the browser
    // rounds/quantizes the scrollLeft property on read and write, so
    // accumulating a sub-pixel "speed" directly on viewport.scrollLeft
    // gets rounded away every frame and the marquee never visibly moves.
    var pos = viewport.scrollLeft;

    function frame() {
      if (!paused && !reduced) {
        pos += speed;
        if (pos >= halfWidth) {
          pos -= halfWidth;
        }
        viewport.scrollLeft = pos;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function pauseThenResume(ms) {
      paused = true;
      clearTimeout(pauseTimer);
      pauseTimer = setTimeout(function () {
        // Resync our tracked position with wherever the user/arrow
        // scroll left things, so autoplay resumes smoothly from there.
        pos = viewport.scrollLeft;
        paused = false;
      }, ms || 2200);
    }

    root.addEventListener("mouseenter", function () { paused = true; });
    root.addEventListener("mouseleave", function () {
      clearTimeout(pauseTimer);
      pos = viewport.scrollLeft;
      paused = false;
    });

    function nudge(dir) {
      pauseThenResume();
      var card = track.querySelector(".rm-card");
      var cardWidth = card ? card.getBoundingClientRect().width + 18 : 220;
      var target = viewport.scrollLeft + dir * cardWidth * 2;
      // Keep the loop point consistent whichever direction we nudge.
      if (target < 0) target += halfWidth;
      if (target >= halfWidth) target -= halfWidth;
      viewport.scrollTo({ left: target, behavior: "smooth" });
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { nudge(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { nudge(1); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".rm-wrap").forEach(init);
  });
})();
